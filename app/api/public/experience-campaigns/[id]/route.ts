export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { CAMPAIGN_APPLICABLE_STATUSES } from '@/lib/experience-campaigns'

const db = supabaseAdmin as any

// 승인 이후 상태(진행 중이거나 완료된 참여) — 모집 인원(capacity) 슬롯을 차지하는 상태들.
// 'applied'(승인 대기)는 아직 슬롯을 차지하지 않으므로 제외한다.
// route.ts는 표준 HTTP 메서드/설정 외의 이름을 export하면 Next.js 빌드가 실패하므로
// (app/api/public/experience-participants/.../submit/route.ts에도 동일하게 인라인 정의)
const CAPACITY_OCCUPYING_STATUSES = ['approved', 'content_submitted', 'verifying', 'verified', 'paid']

// 비로그인 참여자(크리에이터)용 공개 캠페인 조회 — active 상태가 아니면 존재 자체를 숨긴다.
// 사장님의 예산/내부 필드(budget_total, fee_rate, user_id 등)는 여기서 절대 반환하지 않는다.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params

  const { data: campaign, error } = await db
    .from('experience_campaigns')
    .select(
      'id, store_name, title, description, mission_type, creator_types, mission_conditions, payback_amount, capacity, status'
    )
    .eq('id', id)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: '캠페인 정보를 불러오지 못했습니다' }, { status: 500 })
  }
  if (!campaign || !CAMPAIGN_APPLICABLE_STATUSES.includes(campaign.status)) {
    return NextResponse.json({ error: '모집 중인 캠페인이 아닙니다' }, { status: 404 })
  }

  const { count: approvedCount, error: countError } = await db
    .from('experience_participants')
    .select('id', { count: 'exact', head: true })
    .eq('campaign_id', id)
    .in('status', CAPACITY_OCCUPYING_STATUSES)

  if (countError) {
    return NextResponse.json({ error: '캠페인 정보를 불러오지 못했습니다' }, { status: 500 })
  }

  return NextResponse.json({
    id: campaign.id,
    store_name: campaign.store_name,
    title: campaign.title,
    description: campaign.description,
    mission_type: campaign.mission_type,
    creator_types: campaign.creator_types,
    mission_conditions: campaign.mission_conditions,
    payback_amount: campaign.payback_amount,
    capacity: campaign.capacity,
    approved_count: approvedCount ?? 0,
  })
}
