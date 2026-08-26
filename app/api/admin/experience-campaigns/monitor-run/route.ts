export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSessionUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-server'
import { monitorBlogParticipant } from '@/lib/experience-blog-monitor'

const db = supabaseAdmin as any

const BATCH_SIZE = 10

interface CampaignRow {
  id: string
  store_name: string
}

interface ParticipantRow {
  id: string
  campaign_id: string
  channel_handle: string
  approved_at: string | null
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size))
  return chunks
}

// 실제 크론 인프라가 없어 어드민이 수동으로 트리거하는 버튼용 엔드포인트.
// active 캠페인의 블로그 참여자(승인됨, 콘텐츠 미제출)를 전부 폴링해 신규 언급 글을 찾는다.
export async function POST() {
  const sessionUser = await getSessionUser()
  if (!sessionUser) return unauthorizedResponse()
  if (!sessionUser.isAdmin) return forbiddenResponse()

  const { data: campaignRows, error: campaignError } = await db
    .from('experience_campaigns')
    .select('id, store_name')
    .eq('status', 'active')

  if (campaignError) {
    return NextResponse.json({ error: '캠페인 목록을 불러오지 못했습니다' }, { status: 500 })
  }

  const campaigns = (campaignRows ?? []) as CampaignRow[]
  if (campaigns.length === 0) {
    return NextResponse.json({ checked: 0, detected: 0 })
  }
  const storeNameByCampaign = new Map(campaigns.map((c) => [c.id, c.store_name]))

  const { data: participantRows, error: participantError } = await db
    .from('experience_participants')
    .select('id, campaign_id, channel_handle, approved_at')
    .in('campaign_id', campaigns.map((c) => c.id))
    .eq('creator_type', 'blog')
    .eq('status', 'approved')

  if (participantError) {
    return NextResponse.json({ error: '참여자 목록을 불러오지 못했습니다' }, { status: 500 })
  }

  const participants = (participantRows ?? []) as ParticipantRow[]
  let detected = 0

  for (const batch of chunk(participants, BATCH_SIZE)) {
    const results = await Promise.all(
      batch.map((participant) =>
        monitorBlogParticipant({
          channelHandle: participant.channel_handle,
          storeName: storeNameByCampaign.get(participant.campaign_id) ?? '',
          approvedAtIso: participant.approved_at,
        }).then((match) => ({ participant, match }))
      )
    )

    for (const { participant, match } of results) {
      if (!match.matched) continue
      const { error: updateError } = await db
        .from('experience_participants')
        .update({
          status: 'content_submitted',
          content_url: match.url ?? null,
          content_match_snippet: match.snippet ?? null,
          content_detected_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', participant.id)
      if (!updateError) detected += 1
    }
  }

  return NextResponse.json({ checked: participants.length, detected })
}
