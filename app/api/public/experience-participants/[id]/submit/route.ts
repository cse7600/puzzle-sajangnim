export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { readAndValidateImage } from '@/lib/image-upload'
import { analyzeReceiptImage } from '@/lib/claude'

const db = supabaseAdmin as any

interface ParticipantRow {
  id: string
  campaign_id: string
  status: string
}

interface CampaignRow {
  store_name: string
}

async function uploadReceiptImage(
  campaignId: string,
  participantId: string,
  buffer: Buffer,
  extension: string,
  contentType: string
): Promise<{ error: string } | { storagePath: string; imageUrl: string }> {
  const storagePath = `${campaignId}/${participantId}/${Date.now()}-${randomUUID()}.${extension}`
  const { error } = await supabaseAdmin.storage
    .from('experience-campaigns')
    .upload(storagePath, buffer, { contentType, upsert: false })
  if (error) return { error: error.message }
  const { data } = supabaseAdmin.storage.from('experience-campaigns').getPublicUrl(storagePath)
  return { storagePath, imageUrl: data.publicUrl }
}

function normalizeForMatch(text: string): string {
  return text.replace(/\s+/g, '').toLowerCase()
}

// OCR로 읽은 가게명과 캠페인 가게명을 완화 비교(공백제거+소문자, 부분포함)한다.
// 오탐/미탐이 있을 수 있어 최종 확정은 어드민 수동 검증이 담당한다.
function isStoreMatch(ocrStoreName: string | null, campaignStoreName: string): boolean {
  if (!ocrStoreName) return false
  const a = normalizeForMatch(ocrStoreName)
  const b = normalizeForMatch(campaignStoreName)
  if (!a || !b) return false
  return a.includes(b) || b.includes(a)
}

async function runReceiptOcr(
  buffer: Buffer,
  contentType: string
): Promise<{ store: string | null; amount: number | null; matched: boolean }> {
  try {
    const base64Image = buffer.toString('base64')
    const analysis = await analyzeReceiptImage(base64Image, contentType)
    return { store: analysis.store_name, amount: analysis.total_amount, matched: false }
  } catch (error) {
    // OCR 실패는 전체 제출을 막지 않는다 — 이미지/링크는 정상 저장하고 어드민이 수동 검증한다.
    console.error('[experience-participants submit] OCR failed:', error)
    return { store: null, amount: null, matched: false }
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params

  const { data: participant, error: participantError } = (await db
    .from('experience_participants')
    .select('id, campaign_id, status')
    .eq('id', id)
    .maybeSingle()) as { data: ParticipantRow | null; error: { message: string } | null }

  if (participantError) {
    return NextResponse.json({ error: '참여 정보를 불러오지 못했습니다' }, { status: 500 })
  }
  if (!participant) {
    return NextResponse.json({ error: '참여 신청 정보를 찾을 수 없습니다' }, { status: 404 })
  }
  if (participant.status !== 'approved') {
    const message =
      participant.status === 'applied'
        ? '아직 참여 승인 전입니다. 승인 후 다시 시도해주세요'
        : '이미 제출이 완료되었거나 제출할 수 없는 상태입니다'
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const { data: campaign, error: campaignError } = (await db
    .from('experience_campaigns')
    .select('store_name')
    .eq('id', participant.campaign_id)
    .maybeSingle()) as { data: CampaignRow | null; error: { message: string } | null }

  if (campaignError || !campaign) {
    return NextResponse.json({ error: '캠페인 정보를 불러오지 못했습니다' }, { status: 500 })
  }

  const formData = await req.formData()
  const contentUrl = formData.get('content_url')
  const normalizedContentUrl = typeof contentUrl === 'string' && contentUrl.trim() ? contentUrl.trim() : null

  const imageCheck = await readAndValidateImage(formData.get('receipt_image'), {
    missing: '영수증 사진을 첨부해주세요',
    badType: '영수증 사진은 JPG/PNG/WEBP 이미지만 업로드할 수 있습니다',
  })
  if ('error' in imageCheck) {
    return NextResponse.json({ error: imageCheck.error }, { status: 400 })
  }

  const uploaded = await uploadReceiptImage(
    participant.campaign_id,
    participant.id,
    imageCheck.buffer,
    imageCheck.extension,
    imageCheck.contentType
  )
  if ('error' in uploaded) {
    return NextResponse.json({ error: `영수증 사진 업로드에 실패했습니다: ${uploaded.error}` }, { status: 500 })
  }

  const ocrResult = await runReceiptOcr(imageCheck.buffer, imageCheck.contentType)
  const receiptMatched = isStoreMatch(ocrResult.store, campaign.store_name)

  const updateFields: Record<string, unknown> = {
    receipt_image_url: uploaded.imageUrl,
    receipt_ocr_store: ocrResult.store,
    receipt_ocr_amount: ocrResult.amount,
    receipt_ocr_at: new Date().toISOString(),
    receipt_matched: receiptMatched,
    status: 'content_submitted',
  }
  if (normalizedContentUrl) updateFields.content_url = normalizedContentUrl

  const { data: updated, error: updateError } = await db
    .from('experience_participants')
    .update(updateFields)
    .eq('id', id)
    .select('id, status')
    .single()

  if (updateError || !updated) {
    // DB 저장이 실패하면 방금 올린 이미지가 고아 파일로 남으므로 정리한다.
    await supabaseAdmin.storage.from('experience-campaigns').remove([uploaded.storagePath])
    return NextResponse.json({ error: '제출 처리에 실패했습니다' }, { status: 500 })
  }

  return NextResponse.json({ success: true, status: updated.status, receipt_matched: receiptMatched })
}

// 제출 페이지가 참여자 현재 상태를 안내하는 데 사용 (진입 시 이미 제출됐는지 등 확인).
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params

  const { data: participant, error } = await db
    .from('experience_participants')
    .select('id, status, nickname, content_url, receipt_image_url')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: '참여 정보를 불러오지 못했습니다' }, { status: 500 })
  }
  if (!participant) {
    return NextResponse.json({ error: '참여 신청 정보를 찾을 수 없습니다' }, { status: 404 })
  }

  return NextResponse.json({
    id: participant.id,
    status: participant.status,
    nickname: participant.nickname,
    content_url: participant.content_url,
    receipt_image_url: participant.receipt_image_url,
  })
}
