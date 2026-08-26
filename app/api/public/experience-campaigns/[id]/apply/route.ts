export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { CAMPAIGN_APPLICABLE_STATUSES, type CreatorType } from '@/lib/experience-campaigns'
import { normalizeNaverBlogId } from '@/lib/experience-blog-monitor'

const db = supabaseAdmin as any

// 모집 인원(capacity) 슬롯을 차지하는 상태들 — app/api/public/experience-campaigns/[id]/route.ts와 동일 기준.
const CAPACITY_OCCUPYING_STATUSES = ['approved', 'content_submitted', 'verifying', 'verified', 'paid']

const CREATOR_TYPES: CreatorType[] = ['blog', 'instagram', 'youtube', 'tiktok']

interface ApplyRequestBody {
  nickname?: unknown
  phone?: unknown
  creator_type?: unknown
  channel_handle?: unknown
  channel_url?: unknown
  email?: unknown
}

function validateApplyInput(body: ApplyRequestBody):
  | { error: string }
  | {
      data: {
        nickname: string
        phone: string
        creator_type: CreatorType
        channel_handle: string
        channel_url: string | null
        email: string | null
      }
    } {
  const nickname = typeof body.nickname === 'string' ? body.nickname.trim() : ''
  const phone = typeof body.phone === 'string' ? body.phone.trim() : ''
  const creatorType = body.creator_type as CreatorType
  const rawChannelHandle = typeof body.channel_handle === 'string' ? body.channel_handle.trim() : ''
  const channelUrl = typeof body.channel_url === 'string' ? body.channel_url.trim() : ''
  const email = typeof body.email === 'string' ? body.email.trim() : ''

  if (!nickname) return { error: '닉네임을 입력해주세요' }
  if (!phone) return { error: '연락처를 입력해주세요' }
  if (!CREATOR_TYPES.includes(creatorType)) return { error: '채널 유형을 선택해주세요' }
  if (!rawChannelHandle) return { error: '채널 아이디(또는 링크)를 입력해주세요' }

  const channelHandle = creatorType === 'blog' ? normalizeNaverBlogId(rawChannelHandle) : rawChannelHandle

  return {
    data: {
      nickname,
      phone,
      creator_type: creatorType,
      channel_handle: channelHandle,
      channel_url: channelUrl || null,
      email: email || null,
    },
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params

  let body: ApplyRequestBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: '요청 형식이 올바르지 않습니다' }, { status: 400 })
  }

  const validated = validateApplyInput(body)
  if ('error' in validated) {
    return NextResponse.json({ error: validated.error }, { status: 400 })
  }

  const { data: campaign, error: campaignError } = await db
    .from('experience_campaigns')
    .select('id, status, capacity')
    .eq('id', id)
    .maybeSingle()

  if (campaignError) {
    return NextResponse.json({ error: '캠페인 정보를 불러오지 못했습니다' }, { status: 500 })
  }
  if (!campaign || !CAMPAIGN_APPLICABLE_STATUSES.includes(campaign.status)) {
    return NextResponse.json({ error: '모집 중인 캠페인이 아닙니다' }, { status: 404 })
  }

  const { count: occupiedCount, error: countError } = await db
    .from('experience_participants')
    .select('id', { count: 'exact', head: true })
    .eq('campaign_id', id)
    .in('status', CAPACITY_OCCUPYING_STATUSES)

  if (countError) {
    return NextResponse.json({ error: '캠페인 정보를 불러오지 못했습니다' }, { status: 500 })
  }
  if ((occupiedCount ?? 0) >= campaign.capacity) {
    return NextResponse.json({ error: '모집이 마감되었습니다' }, { status: 400 })
  }

  const { data: inserted, error: insertError } = await db
    .from('experience_participants')
    .insert({
      campaign_id: id,
      nickname: validated.data.nickname,
      phone: validated.data.phone,
      email: validated.data.email,
      creator_type: validated.data.creator_type,
      channel_handle: validated.data.channel_handle,
      channel_url: validated.data.channel_url,
      status: 'applied',
    })
    .select('id')
    .single()

  if (insertError) {
    // UNIQUE(campaign_id, channel_handle) 위반 — 동일 채널 중복 신청
    if (insertError.code === '23505') {
      return NextResponse.json({ error: '이미 신청한 채널입니다' }, { status: 409 })
    }
    return NextResponse.json({ error: '신청 처리에 실패했습니다' }, { status: 500 })
  }

  return NextResponse.json({ participant_id: inserted.id })
}
