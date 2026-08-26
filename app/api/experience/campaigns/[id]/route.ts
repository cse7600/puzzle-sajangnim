export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSessionUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-server'
import { isUuid } from '@/lib/admin-users'
import { CAMPAIGN_EDITABLE_STATUSES, validateCampaignCreateInput } from '@/lib/experience-campaigns'

const db = supabaseAdmin as any

const CAMPAIGN_DETAIL_COLUMNS = '*'

interface CampaignRow {
  id: string
  user_id: string
  status: string
}

async function loadOwnedCampaign(campaignId: string, userId: string) {
  const { data, error } = await db
    .from('experience_campaigns')
    .select(CAMPAIGN_DETAIL_COLUMNS)
    .eq('id', campaignId)
    .maybeSingle()
  return { campaign: data as (CampaignRow & Record<string, unknown>) | null, error }
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) return unauthorizedResponse()
  if (!isUuid(params.id)) {
    return NextResponse.json({ error: '캠페인을 찾을 수 없습니다' }, { status: 404 })
  }

  const { campaign, error } = await loadOwnedCampaign(params.id, sessionUser.id)
  if (error) {
    return NextResponse.json({ error: '캠페인 정보를 불러오지 못했습니다' }, { status: 500 })
  }
  if (!campaign) {
    return NextResponse.json({ error: '캠페인을 찾을 수 없습니다' }, { status: 404 })
  }
  if (campaign.user_id !== sessionUser.id) return forbiddenResponse()

  const [{ data: participants }, { data: ledger }, { data: comments }] = await Promise.all([
    db
      .from('experience_participants')
      .select('*')
      .eq('campaign_id', params.id)
      .order('applied_at', { ascending: false }),
    db
      .from('experience_campaign_ledger')
      .select('*')
      .eq('campaign_id', params.id)
      .order('created_at', { ascending: false }),
    db
      .from('experience_campaign_comments')
      .select('*')
      .eq('campaign_id', params.id)
      .order('created_at', { ascending: true }),
  ])

  return NextResponse.json({
    campaign,
    participants: participants ?? [],
    ledger: ledger ?? [],
    comments: comments ?? [],
  })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) return unauthorizedResponse()
  if (!isUuid(params.id)) {
    return NextResponse.json({ error: '캠페인을 찾을 수 없습니다' }, { status: 404 })
  }

  const { campaign, error: loadError } = await loadOwnedCampaign(params.id, sessionUser.id)
  if (loadError) {
    return NextResponse.json({ error: '캠페인 정보를 불러오지 못했습니다' }, { status: 500 })
  }
  if (!campaign) {
    return NextResponse.json({ error: '캠페인을 찾을 수 없습니다' }, { status: 404 })
  }
  if (campaign.user_id !== sessionUser.id) return forbiddenResponse()

  if (!CAMPAIGN_EDITABLE_STATUSES.includes(campaign.status as never)) {
    return NextResponse.json(
      { error: '지금은 캠페인 내용을 수정할 수 없는 상태입니다' },
      { status: 400 }
    )
  }

  const body = await req.json().catch(() => ({}))
  const validation = validateCampaignCreateInput(body)
  if ('error' in validation) {
    return NextResponse.json({ error: validation.error }, { status: 400 })
  }

  const input = validation.data
  const nextStatus = campaign.status === 'change_requested' ? 'pending_approval' : campaign.status

  const { data, error } = await db
    .from('experience_campaigns')
    .update({
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
      setup_mode: input.setup_mode,
      status: nextStatus,
      start_date: input.start_date,
      end_date: input.end_date,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.id)
    .select(CAMPAIGN_DETAIL_COLUMNS)
    .single()

  if (error) {
    return NextResponse.json({ error: '캠페인 수정에 실패했습니다' }, { status: 500 })
  }

  return NextResponse.json(data)
}
