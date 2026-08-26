export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSessionUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-server'
import { usersReadOnlyAdmin, resolveBusinessName } from '@/lib/admin-users'
import type { CampaignStatus } from '@/lib/experience-campaigns'

const db = supabaseAdmin as any

const CAMPAIGN_LIST_COLUMNS =
  'id, user_id, store_name, title, mission_type, creator_types, payback_amount, capacity, budget_total, fee_rate, fee_amount, budget_available, budget_reserved, setup_mode, status, start_date, end_date, created_at, updated_at'

const VALID_STATUSES: CampaignStatus[] = [
  'draft',
  'pending_setup',
  'pending_approval',
  'change_requested',
  'active',
  'paused',
  'closed',
  'settled',
  'rejected',
]

interface ParticipantCountRow {
  campaign_id: string
  status: string
}

// 목록 카드에 표시할 참여자 현황(신청/승인/검증완료/지급완료)을 캠페인별로 집계한다.
async function attachParticipantStats(campaigns: Record<string, unknown>[]) {
  if (campaigns.length === 0) return campaigns

  const campaignIds = campaigns.map((c) => c.id as string)
  const { data } = await db
    .from('experience_participants')
    .select('campaign_id, status')
    .in('campaign_id', campaignIds)

  const rows = (data ?? []) as ParticipantCountRow[]
  const statsByCampaign = new Map<
    string,
    { applied: number; approved: number; verified: number; paid: number }
  >()
  for (const row of rows) {
    const stats =
      statsByCampaign.get(row.campaign_id) ?? { applied: 0, approved: 0, verified: 0, paid: 0 }
    stats.applied += 1
    if (row.status !== 'applied' && row.status !== 'rejected' && row.status !== 'expired') {
      stats.approved += 1
    }
    if (row.status === 'verified' || row.status === 'paid') stats.verified += 1
    if (row.status === 'paid') stats.paid += 1
    statsByCampaign.set(row.campaign_id, stats)
  }

  return campaigns.map((c) => ({
    ...c,
    participant_stats:
      statsByCampaign.get(c.id as string) ?? { applied: 0, approved: 0, verified: 0, paid: 0 },
  }))
}

// 캠페인 목록에 사장님 이메일/상호를 붙인다. users는 다른 프로덕트와 공유하는 읽기전용 테이블이라
// usersReadOnlyAdmin(전용 클라이언트)로 조회한다.
async function attachOwnerInfo(campaigns: Record<string, unknown>[]) {
  if (campaigns.length === 0) return campaigns

  const userIds = Array.from(new Set(campaigns.map((c) => c.user_id as string).filter(Boolean)))
  if (userIds.length === 0) return campaigns

  const { data: users } = await usersReadOnlyAdmin
    .from('users')
    .select('id, email, profile_data')
    .in('id', userIds)

  const ownerById = new Map(
    (users ?? []).map((user) => [
      user.id,
      { owner_email: user.email, owner_business_name: resolveBusinessName(user) },
    ])
  )

  return campaigns.map((c) => ({
    ...c,
    ...(ownerById.get(c.user_id as string) ?? { owner_email: '', owner_business_name: '' }),
  }))
}

export async function GET(req: NextRequest) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) return unauthorizedResponse()
  if (!sessionUser.isAdmin) return forbiddenResponse()

  const statusParam = req.nextUrl.searchParams.get('status')
  let query = db
    .from('experience_campaigns')
    .select(CAMPAIGN_LIST_COLUMNS)
    .order('created_at', { ascending: false })

  if (statusParam && VALID_STATUSES.includes(statusParam as CampaignStatus)) {
    query = query.eq('status', statusParam)
  }

  const { data, error } = await query
  if (error) {
    return NextResponse.json({ error: '한끼 체험단 목록을 불러오지 못했습니다' }, { status: 500 })
  }

  const withOwner = await attachOwnerInfo(data ?? [])
  const withStats = await attachParticipantStats(withOwner)
  return NextResponse.json(withStats)
}
