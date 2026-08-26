export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSessionUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-server'

const db = supabaseAdmin as any

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024

// 클라이언트가 보낸 file.type은 위조될 수 있으므로 실제 업로드 전 매직 바이트로 재검증한다.
// (app/api/business-verification/route.ts와 동일한 패턴, 영수증은 이미지만 허용)
const MAGIC_SIGNATURES: { extension: string; contentType: string; matches: (buf: Buffer) => boolean }[] = [
  { extension: 'jpg', contentType: 'image/jpeg', matches: b => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { extension: 'png', contentType: 'image/png', matches: b => b.length >= 4 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  { extension: 'gif', contentType: 'image/gif', matches: b => b.length >= 4 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38 },
  { extension: 'webp', contentType: 'image/webp', matches: b => b.length >= 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP' },
]

// 영수증 금액 → 포인트 계산 (50원~500원)
function calcPoints(amount: number): number {
  if (!amount) return 100
  if (amount < 10000) return 50
  if (amount < 30000) return 100
  if (amount < 100000) return 200
  return 500
}

export async function GET(req: NextRequest) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) return unauthorizedResponse()

  const scope = req.nextUrl.searchParams.get('scope')
  if (scope === 'all' && !sessionUser.isAdmin) return forbiddenResponse()

  let query = db.from('receipts').select('*').order('created_at', { ascending: false })
  if (scope !== 'all') {
    query = query.eq('user_id', sessionUser.id)
  }
  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: '영수증 목록을 불러오지 못했습니다' }, { status: 500 })
  }
  return NextResponse.json(data ?? [])
}

function parseOcrData(raw: FormDataEntryValue | null): Record<string, unknown> | null {
  if (typeof raw !== 'string' || !raw.trim()) return null
  try {
    return JSON.parse(raw) as Record<string, unknown>
  } catch {
    return null
  }
}

function sniffFileSignature(buffer: Buffer): { extension: string; contentType: string } | null {
  const matched = MAGIC_SIGNATURES.find(sig => sig.matches(buffer))
  return matched ? { extension: matched.extension, contentType: matched.contentType } : null
}

async function readAndValidateImage(
  entry: FormDataEntryValue | null
): Promise<{ error: string } | { buffer: Buffer; extension: string; contentType: string }> {
  if (!(entry instanceof File) || entry.size === 0) {
    return { error: '영수증 사진을 첨부해주세요' }
  }
  if (entry.size > MAX_FILE_SIZE_BYTES) {
    return { error: '파일 크기는 10MB를 초과할 수 없습니다' }
  }
  const buffer = Buffer.from(await entry.arrayBuffer())
  const signature = sniffFileSignature(buffer)
  if (!signature) {
    return { error: '영수증 사진은 JPG/PNG/GIF/WEBP 이미지만 업로드할 수 있습니다' }
  }
  return { buffer, extension: signature.extension, contentType: signature.contentType }
}

// receipts 버킷은 public이므로 업로드 후 공개 URL을 바로 image_url에 저장한다.
async function uploadReceiptImage(
  userId: string,
  buffer: Buffer,
  extension: string,
  contentType: string
): Promise<{ error: string } | { storagePath: string; imageUrl: string }> {
  const storagePath = `${userId}/${Date.now()}-${randomUUID()}.${extension}`
  const { error } = await supabaseAdmin.storage
    .from('receipts')
    .upload(storagePath, buffer, { contentType, upsert: false })
  if (error) return { error: error.message }
  const { data } = supabaseAdmin.storage.from('receipts').getPublicUrl(storagePath)
  return { storagePath, imageUrl: data.publicUrl }
}

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) return unauthorizedResponse()

  const formData = await req.formData()
  const storeName = formData.get('store_name') as string
  const amount = Number(formData.get('amount') || 0)
  const points = calcPoints(amount)
  const ocrData = parseOcrData(formData.get('ocr_data'))
  const receiptDate = formData.get('receipt_date')

  const imageCheck = await readAndValidateImage(formData.get('image'))
  if ('error' in imageCheck) {
    return NextResponse.json({ error: imageCheck.error }, { status: 400 })
  }

  const uploaded = await uploadReceiptImage(sessionUser.id, imageCheck.buffer, imageCheck.extension, imageCheck.contentType)
  if ('error' in uploaded) {
    return NextResponse.json({ error: `영수증 사진 업로드에 실패했습니다: ${uploaded.error}` }, { status: 500 })
  }

  // receipt_date 전용 컬럼이 없으므로 ocr_data 안에 함께 보관
  const mergedOcr =
    typeof receiptDate === 'string' && receiptDate
      ? { ...(ocrData ?? {}), date: ocrData?.date ?? receiptDate }
      : ocrData

  const insertFields: Record<string, unknown> = {
    user_id: sessionUser.id,
    image_url: uploaded.imageUrl,
    store_name: storeName,
    amount,
    points_earned: points,
    status: 'pending',
    ocr_data: mergedOcr,
  }
  if (mergedOcr) insertFields.analyzed_at = new Date().toISOString()

  const { data, error } = await db.from('receipts').insert(insertFields).select().single()
  if (error || !data) {
    // DB 저장이 실패하면 방금 올린 이미지가 고아 파일로 남으므로 정리한다.
    await supabaseAdmin.storage.from('receipts').remove([uploaded.storagePath])
    return NextResponse.json({ error: '영수증 등록에 실패했습니다' }, { status: 500 })
  }
  return NextResponse.json(data)
}
