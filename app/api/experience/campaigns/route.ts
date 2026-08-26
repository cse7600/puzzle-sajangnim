export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSessionUser, unauthorizedResponse, actorUserId } from '@/lib/auth-server'
import { DEFAULT_FEE_RATE, validateCampaignCreateInput } from '@/lib/experience-campaigns'

const db = supabaseAdmin as any

const CAMPAIGN_LIST_COLUMNS =
  'id, store_name, title, mission_type, creator_types, payback_amount, capacity, budget_total, fee_rate, fee_amount, budget_available, budget_reserved, setup_mode, status, start_date, end_date, created_at, updated_at'

interface ParticipantCountRow {
  campaign_id: string
  status: string
}

// 캠페인 카드에 표시할 참여자 카운트(신청/승인/지급완료)를 한 번에 붙인다.
async function attachParticipantStats(campaigns: Record<string, unknown>[]) {
  if (campaigns.length === 0) return campaigns

  const campaignIds = campaigns.map((c) => c.id as string)
  const { data } = await db
    .from('experience_participants')
    .select('campaign_id, status')
    .in('campaign_id', campaignIds)

  const rows = (data ?? []) as ParticipantCountRow[]
  const statsByCampaign = new Map<string, { applied: number; approved: number; paid: number }>()
  for (const row of rows) {
    const stats = statsByCampaign.get(row.campaign_id) ?? { applied: 0, approved: 0, paid: 0 }
    stats.applied += 1
    if (row.status !== 'applied' && row.status !== 'rejected' && row.status !== 'expired') {
      stats.approved += 1
    }
    if (row.status === 'paid') stats.paid += 1
    statsByCampaign.set(row.campaign_id, stats)
  }

  return campaigns.map((c) => ({
    ...c,
    participant_stats: statsByCampaign.get(c.id as string) ?? { applied: 0, approved: 0, paid: 0 },
  }))
}

export async function GET() {
  const sessionUser = await getSessionUser()
  if (!sessionUser) return unauthorizedResponse()

  const { data, error } = await db
    .from('experience_campaigns')
    .select(CAMPAIGN_LIST_COLUMNS)
    .eq('user_id', sessionUser.id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: '한끼 체험단 목록을 불러오지 못했습니다' }, { status: 500 })
  }

  const campaigns = await attachParticipantStats(data ?? [])
  return NextResponse.json(campaigns)
}

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) return unauthorizedResponse()

  const ownerId = actorUserId(sessionUser)
  if (!ownerId) {
    return NextResponse.json({ error: '캠페인을 등록할 수 없는 계정입니다' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const validation = validateCampaignCreateInput(body)
  if ('error' in validation) {
    return NextResponse.json({ error: validation.error }, { status: 400 })
  }

  const input = validation.data
  const status = input.setup_mode === 'requested' ? 'pending_setup' : 'pending_approval'

  const { data, error } = await db
    .from('experience_campaigns')
    .insert({
      user_id: ownerId,
      place_registration_id: input.place_registration_id,
      store_name: input.store_name,
      naver_place_id: input.naver_place_id,
      title: input.title,
      description: input.description ?? null,
      mission_type: input.mission_type,
      creator_types: input.creator_types,
      mission_conditions: input.mission_conditions,
      payback_amount: input.payback_amount,
      capacity: input.capacity,
      budget_total: input.budget_total,
      fee_rate: DEFAULT_FEE_RATE,
      fee_amount: 0,
      budget_available: 0,
      budget_reserved: 0,
      setup_mode: input.setup_mode,
      status,
      start_date: input.start_date,
      end_date: input.end_date,
    })
    .select(CAMPAIGN_LIST_COLUMNS)
    .single()

  if (error) {
    return NextResponse.json({ error: '캠페인 등록에 실패했습니다' }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
