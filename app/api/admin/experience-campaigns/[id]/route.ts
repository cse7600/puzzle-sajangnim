export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSessionUser, unauthorizedResponse, forbiddenResponse, actorUserId } from '@/lib/auth-server'
import { isUuid, usersReadOnlyAdmin, resolveBusinessName } from '@/lib/admin-users'
import { validateCampaignCreateInput, type CampaignStatus } from '@/lib/experience-campaigns'

const db = supabaseAdmin as any

interface CampaignRow {
  id: string
  user_id: string
  status: CampaignStatus
  setup_mode: 'self' | 'requested'
}

// 어드민이 pending_setup/draft/change_requested 상태의 캠페인 필드를 직접 채워넣을 수 있는 상태.
// 사장님 쪽 CAMPAIGN_EDITABLE_STATUSES(draft/change_requested)보다 pending_setup이 추가된다 —
// 세팅 대행 요청이 들어오면 캠페인은 pending_setup 상태로 대기하고, 이 상태에서 어드민이 필드를 채운다.
const ADMIN_SETUP_EDITABLE_STATUSES: CampaignStatus[] = ['draft', 'pending_setup', 'change_requested']

// 승인(activate) 버튼을 누를 수 있는 상태 — 세팅 완료 대기 또는 승인 대기 상태에서만 허용.
const APPROVABLE_STATUSES: CampaignStatus[] = ['pending_setup', 'pending_approval']

// 반려/수정요청은 승인 검토 흐름에 있는 캠페인에만 허용한다.
const REVIEWABLE_STATUSES: CampaignStatus[] = ['pending_setup', 'pending_approval']

const CLOSABLE_STATUSES: CampaignStatus[] = ['active', 'paused']

async function loadCampaign(campaignId: string): Promise<{ campaign: CampaignRow | null; error: unknown }> {
  const { data, error } = await db
    .from('experience_campaigns')
    .select('*')
    .eq('id', campaignId)
    .maybeSingle()
  return { campaign: data as CampaignRow | null, error }
}

async function attachOwnerInfo(campaign: Record<string, unknown>) {
  const { data: user } = await usersReadOnlyAdmin
    .from('users')
    .select('id, email, profile_data')
    .eq('id', campaign.user_id as string)
    .maybeSingle()
  if (!user) return { ...campaign, owner_email: '', owner_business_name: '' }
  return { ...campaign, owner_email: user.email, owner_business_name: resolveBusinessName(user) }
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) return unauthorizedResponse()
  if (!sessionUser.isAdmin) return forbiddenResponse()
  if (!isUuid(params.id)) {
    return NextResponse.json({ error: '캠페인을 찾을 수 없습니다' }, { status: 404 })
  }

  const { campaign, error } = await loadCampaign(params.id)
  if (error) {
    return NextResponse.json({ error: '캠페인 정보를 불러오지 못했습니다' }, { status: 500 })
  }
  if (!campaign) {
    return NextResponse.json({ error: '캠페인을 찾을 수 없습니다' }, { status: 404 })
  }

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

  const campaignWithOwner = await attachOwnerInfo(campaign as unknown as Record<string, unknown>)

  return NextResponse.json({
    campaign: campaignWithOwner,
    participants: participants ?? [],
    ledger: ledger ?? [],
    comments: comments ?? [],
  })
}

async function handleUpdateSetup(campaign: CampaignRow, body: Record<string, unknown>) {
  if (!ADMIN_SETUP_EDITABLE_STATUSES.includes(campaign.status)) {
    return NextResponse.json(
      { error: '지금 상태에서는 캠페인 세팅을 수정할 수 없습니다' },
      { status: 400 }
    )
  }

  const validation = validateCampaignCreateInput(body)
  if ('error' in validation) {
    return NextResponse.json({ error: validation.error }, { status: 400 })
  }

  const input = validation.data
  // setup_mode는 명시적으로 self/requested를 보낸 경우에만 반영한다 — 안 보내면
  // 세팅 대행 요청 여부(requested)가 실수로 self로 덮어써지는 것을 막는다.
  const setup_mode =
    body.setup_mode === 'self' || body.setup_mode === 'requested' ? body.setup_mode : campaign.setup_mode

  const { data, error } = await db
    .from('experience_campaigns')
    .update({
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
      setup_mode,
      start_date: input.start_date,
      end_date: input.end_date,
      updated_at: new Date().toISOString(),
    })
    .eq('id', campaign.id)
    .select('*')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: '캠페인 세팅 저장에 실패했습니다' }, { status: 500 })
  }
  return NextResponse.json(data)
}

async function handleApprove(campaign: CampaignRow) {
  if (!APPROVABLE_STATUSES.includes(campaign.status)) {
    return NextResponse.json({ error: '지금 상태에서는 승인할 수 없습니다' }, { status: 400 })
  }

  const { error } = await db.rpc('experience_activate_campaign', { p_campaign_id: campaign.id })
  if (error) {
    return NextResponse.json({ error: '캠페인 승인 처리에 실패했습니다' }, { status: 500 })
  }

  const { data } = await db.from('experience_campaigns').select('*').eq('id', campaign.id).single()
  return NextResponse.json(data)
}

async function handleReject(campaign: CampaignRow, reason: string) {
  if (!REVIEWABLE_STATUSES.includes(campaign.status)) {
    return NextResponse.json({ error: '지금 상태에서는 반려할 수 없습니다' }, { status: 400 })
  }
  if (!reason) {
    return NextResponse.json({ error: '반려 사유를 입력해주세요' }, { status: 400 })
  }

  const { data, error } = await db
    .from('experience_campaigns')
    .update({ status: 'rejected', reject_reason: reason, updated_at: new Date().toISOString() })
    .eq('id', campaign.id)
    .select('*')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: '반려 처리에 실패했습니다' }, { status: 500 })
  }
  return NextResponse.json(data)
}

async function handleRequestChange(
  campaign: CampaignRow,
  reason: string,
  adminAuthorId: string | null
) {
  if (!REVIEWABLE_STATUSES.includes(campaign.status)) {
    return NextResponse.json({ error: '지금 상태에서는 수정을 요청할 수 없습니다' }, { status: 400 })
  }
  if (!reason) {
    return NextResponse.json({ error: '수정 요청 사유를 입력해주세요' }, { status: 400 })
  }

  const { data, error } = await db
    .from('experience_campaigns')
    .update({ status: 'change_requested', reject_reason: reason, updated_at: new Date().toISOString() })
    .eq('id', campaign.id)
    .select('*')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: '수정 요청 처리에 실패했습니다' }, { status: 500 })
  }

  await db.from('experience_campaign_comments').insert({
    campaign_id: campaign.id,
    author_role: 'admin',
    author_id: adminAuthorId,
    body: `[수정 요청] ${reason}`,
  })

  return NextResponse.json(data)
}

async function handleToggleAutoPayout(campaign: CampaignRow) {
  const { data: current } = await db
    .from('experience_campaigns')
    .select('auto_payout')
    .eq('id', campaign.id)
    .single()

  const { data, error } = await db
    .from('experience_campaigns')
    .update({ auto_payout: !current?.auto_payout, updated_at: new Date().toISOString() })
    .eq('id', campaign.id)
    .select('*')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: '자동 지급 설정 변경에 실패했습니다' }, { status: 500 })
  }
  return NextResponse.json(data)
}

async function handleClose(campaign: CampaignRow) {
  if (!CLOSABLE_STATUSES.includes(campaign.status)) {
    return NextResponse.json({ error: '지금 상태에서는 마감할 수 없습니다' }, { status: 400 })
  }

  const { data, error } = await db
    .from('experience_campaigns')
    .update({ status: 'closed', updated_at: new Date().toISOString() })
    .eq('id', campaign.id)
    .select('*')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: '마감 처리에 실패했습니다' }, { status: 500 })
  }
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) return unauthorizedResponse()
  if (!sessionUser.isAdmin) return forbiddenResponse()
  if (!isUuid(params.id)) {
    return NextResponse.json({ error: '캠페인을 찾을 수 없습니다' }, { status: 404 })
  }

  const { campaign, error: loadError } = await loadCampaign(params.id)
  if (loadError) {
    return NextResponse.json({ error: '캠페인 정보를 불러오지 못했습니다' }, { status: 500 })
  }
  if (!campaign) {
    return NextResponse.json({ error: '캠페인을 찾을 수 없습니다' }, { status: 404 })
  }

  const body = await req.json().catch(() => ({}))
  const reason = typeof body.reason === 'string' ? body.reason.trim() : ''

  switch (body.action) {
    case 'update_setup':
      return handleUpdateSetup(campaign, body)
    case 'approve':
      return handleApprove(campaign)
    case 'reject':
      return handleReject(campaign, reason)
    case 'request_change':
      return handleRequestChange(campaign, reason, actorUserId(sessionUser))
    case 'toggle_auto_payout':
      return handleToggleAutoPayout(campaign)
    case 'close':
      return handleClose(campaign)
    default:
      return NextResponse.json({ error: '알 수 없는 요청입니다' }, { status: 400 })
  }
}
