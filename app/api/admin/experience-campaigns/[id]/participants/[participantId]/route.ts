export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSessionUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-server'
import { isUuid } from '@/lib/admin-users'
import type { ParticipantStatus } from '@/lib/experience-campaigns'

const db = supabaseAdmin as any

interface ParticipantRow {
  id: string
  campaign_id: string
  status: ParticipantStatus
}

interface CampaignRow {
  id: string
  auto_payout: boolean
}

const VERIFIABLE_STATUSES: ParticipantStatus[] = ['content_submitted', 'verifying']
const PAYABLE_STATUSES: ParticipantStatus[] = ['content_submitted', 'verifying', 'verified']

async function loadParticipant(
  campaignId: string,
  participantId: string
): Promise<{ participant: ParticipantRow | null; error: unknown }> {
  const { data, error } = await db
    .from('experience_participants')
    .select('id, campaign_id, status')
    .eq('id', participantId)
    .maybeSingle()
  if (!error && data && data.campaign_id !== campaignId) {
    return { participant: null, error: null }
  }
  return { participant: data as ParticipantRow | null, error }
}

function messageForRpcError(error: { message?: string; code?: string } | null): string | null {
  const message = error?.message ?? ''
  if (message.includes('insufficient_budget')) return '예산이 부족합니다'
  if (message.includes('invalid_participant_status')) return '참여자 상태가 이 작업을 수행할 수 없는 상태입니다'
  if (message.includes('campaign_not_active')) return '캠페인이 운영 중 상태가 아닙니다'
  if (message.includes('participant_not_found')) return '참여자를 찾을 수 없습니다'
  if (message.includes('invalid_target_status')) return '허용되지 않는 상태 전환입니다'
  return null
}

async function handleApprove(participant: ParticipantRow) {
  const { error } = await db.rpc('experience_approve_participant', {
    p_participant_id: participant.id,
  })
  if (error) {
    const known = messageForRpcError(error)
    return NextResponse.json({ error: known ?? '참여 승인 처리에 실패했습니다' }, { status: 400 })
  }

  const { data } = await db
    .from('experience_participants')
    .select('*')
    .eq('id', participant.id)
    .single()
  return NextResponse.json(data)
}

async function handleReleaseTo(
  participant: ParticipantRow,
  newStatus: 'rejected' | 'expired',
  reason: string | null
) {
  const { error } = await db.rpc('experience_release_participant', {
    p_participant_id: participant.id,
    p_new_status: newStatus,
    p_reason: reason,
  })
  if (error) {
    const known = messageForRpcError(error)
    return NextResponse.json(
      { error: known ?? '참여자 상태 처리에 실패했습니다' },
      { status: 400 }
    )
  }

  const { data } = await db
    .from('experience_participants')
    .select('*')
    .eq('id', participant.id)
    .single()
  return NextResponse.json(data)
}

async function handlePayout(participant: ParticipantRow, note: string | null) {
  if (!PAYABLE_STATUSES.includes(participant.status)) {
    return NextResponse.json({ error: '지금 상태에서는 지급할 수 없습니다' }, { status: 400 })
  }

  const { error } = await db.rpc('experience_payout_participant', {
    p_participant_id: participant.id,
    p_note: note,
  })
  if (error) {
    if ((error as { code?: string }).code === '23505') {
      return NextResponse.json({ error: '이미 지급되었습니다' }, { status: 409 })
    }
    const known = messageForRpcError(error as { message?: string })
    return NextResponse.json({ error: known ?? '지급 처리에 실패했습니다' }, { status: 400 })
  }

  const { data } = await db
    .from('experience_participants')
    .select('*')
    .eq('id', participant.id)
    .single()
  return NextResponse.json(data)
}

// 검증완료 처리(단순 update, 돈은 안 움직임) 후 캠페인이 auto_payout이면 이어서 실지급까지 체이닝한다.
async function handleVerify(participant: ParticipantRow, note: string | null) {
  if (!VERIFIABLE_STATUSES.includes(participant.status)) {
    return NextResponse.json({ error: '지금 상태에서는 검증 완료 처리를 할 수 없습니다' }, { status: 400 })
  }

  const { data: verified, error: verifyError } = await db
    .from('experience_participants')
    .update({
      status: 'verified',
      verification_note: note,
      verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', participant.id)
    .select('*')
    .single()

  if (verifyError || !verified) {
    return NextResponse.json({ error: '검증 완료 처리에 실패했습니다' }, { status: 500 })
  }

  const { data: campaign } = await db
    .from('experience_campaigns')
    .select('id, auto_payout')
    .eq('id', participant.campaign_id)
    .single()

  if (!(campaign as CampaignRow | null)?.auto_payout) {
    return NextResponse.json(verified)
  }

  const { error: payoutError } = await db.rpc('experience_payout_participant', {
    p_participant_id: participant.id,
    p_note: note ?? '자동 검증완료 지급',
  })
  if (payoutError) {
    // 검증완료는 이미 반영됐고 지급만 실패한 상태 — 어드민이 수동 지급 버튼으로 재시도할 수 있게
    // verified 상태값은 그대로 반환하고 에러만 알린다.
    if ((payoutError as { code?: string }).code === '23505') {
      const { data: refreshed } = await db
        .from('experience_participants')
        .select('*')
        .eq('id', participant.id)
        .single()
      return NextResponse.json(refreshed)
    }
    return NextResponse.json(
      { error: '검증은 완료되었지만 자동 지급에 실패했습니다. 수동 지급을 시도해주세요' },
      { status: 500 }
    )
  }

  const { data: paid } = await db
    .from('experience_participants')
    .select('*')
    .eq('id', participant.id)
    .single()
  return NextResponse.json(paid)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; participantId: string } }
) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) return unauthorizedResponse()
  if (!sessionUser.isAdmin) return forbiddenResponse()
  if (!isUuid(params.id) || !isUuid(params.participantId)) {
    return NextResponse.json({ error: '참여자를 찾을 수 없습니다' }, { status: 404 })
  }

  const { participant, error: loadError } = await loadParticipant(params.id, params.participantId)
  if (loadError) {
    return NextResponse.json({ error: '참여자 정보를 불러오지 못했습니다' }, { status: 500 })
  }
  if (!participant) {
    return NextResponse.json({ error: '참여자를 찾을 수 없습니다' }, { status: 404 })
  }

  const body = await req.json().catch(() => ({}))
  const reason = typeof body.reason === 'string' ? body.reason.trim() : null
  const note = typeof body.note === 'string' ? body.note.trim() : null

  switch (body.action) {
    case 'approve':
      return handleApprove(participant)
    case 'reject':
      return handleReleaseTo(participant, 'rejected', reason)
    case 'expire':
      return handleReleaseTo(participant, 'expired', reason)
    case 'verify':
      return handleVerify(participant, note)
    case 'payout':
      return handlePayout(participant, note)
    default:
      return NextResponse.json({ error: '알 수 없는 요청입니다' }, { status: 400 })
  }
}
