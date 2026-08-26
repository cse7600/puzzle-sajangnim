export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSessionUser, unauthorizedResponse, forbiddenResponse, actorUserId } from '@/lib/auth-server'

const db = supabaseAdmin as any

interface RouteParams {
  params: { id: string }
}

interface PatchBody {
  status?: 'processing' | 'paid' | 'rejected'
  reject_reason?: string
}

interface Withdrawal {
  id: string
  payback_id: string
  status: string
}

async function loadWithdrawal(id: string): Promise<Withdrawal | null> {
  const { data } = await db.from('withdrawal_requests').select('id, payback_id, status').eq('id', id).maybeSingle()
  return data
}

// §2 상태 전이표: requested→processing, requested/processing→rejected, processing→paid.
function validateTransition(current: string, next: string): string | null {
  if (next === 'processing' && current !== 'requested') {
    return '접수(processing) 처리는 requested 상태에서만 가능합니다'
  }
  if (next === 'rejected' && current !== 'requested' && current !== 'processing') {
    return '반려는 requested 또는 processing 상태에서만 가능합니다'
  }
  if (next === 'paid' && current !== 'processing') {
    return '지급 완료는 processing 상태에서만 가능합니다'
  }
  return null
}

async function getWithdrawalDeadlineDays(): Promise<number> {
  const { data } = await db.from('settlement_settings').select('withdrawal_deadline_days').eq('id', 1).maybeSingle()
  return data?.withdrawal_deadline_days ?? 7
}

// 반려 시 사용자가 신청 기회를 잃지 않도록 출금 신청 기한을 연장한다(§10-E4).
async function extendWithdrawalDeadline(paybackId: string): Promise<void> {
  const deadlineDays = await getWithdrawalDeadlineDays()
  const deadline = new Date()
  deadline.setDate(deadline.getDate() + deadlineDays)
  await db.from('paybacks').update({ withdrawal_deadline: deadline.toISOString() }).eq('id', paybackId)
}

// ① withdrawal → paid ② payback → paid 순서로 처리. ②가 실패해도 ①은 이미 확정됐으므로
// GET 목록의 payback_sync_mismatch 플래그로 재시도를 유도한다(원자적 트랜잭션이 아님을 인정).
async function markPaidAndSyncPayback(paybackId: string): Promise<{ warning?: string }> {
  const { error } = await db
    .from('paybacks')
    .update({ status: 'paid', processed_at: new Date().toISOString() })
    .eq('id', paybackId)
  if (error) {
    return { warning: '정산 상태 동기화 실패 — 목록에서 재시도가 필요합니다' }
  }
  return {}
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) return unauthorizedResponse()
  if (!sessionUser.isAdmin) return forbiddenResponse()

  let body: PatchBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: '요청 본문이 올바른 JSON 형식이 아닙니다' }, { status: 400 })
  }
  if (!body.status || !['processing', 'paid', 'rejected'].includes(body.status)) {
    return NextResponse.json({ error: "status는 'processing' | 'paid' | 'rejected'여야 합니다" }, { status: 400 })
  }
  if (body.status === 'rejected' && !body.reject_reason) {
    return NextResponse.json({ error: '반려 사유(reject_reason)가 필요합니다' }, { status: 400 })
  }

  const withdrawal = await loadWithdrawal(params.id)
  if (!withdrawal) {
    return NextResponse.json({ error: '출금 신청을 찾을 수 없습니다' }, { status: 404 })
  }
  const transitionError = validateTransition(withdrawal.status, body.status)
  if (transitionError) {
    return NextResponse.json({ error: transitionError }, { status: 409 })
  }

  const update: Record<string, unknown> = {
    status: body.status,
    processed_by: actorUserId(sessionUser),
    processed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  if (body.status === 'rejected') update.reject_reason = body.reject_reason

  const { data, error } = await db.from('withdrawal_requests').update(update).eq('id', params.id).select().single()
  if (error || !data) {
    return NextResponse.json({ error: '출금 신청 처리에 실패했습니다' }, { status: 500 })
  }

  if (body.status === 'rejected') {
    await extendWithdrawalDeadline(withdrawal.payback_id)
    return NextResponse.json({ withdrawal: data })
  }
  if (body.status === 'paid') {
    const { warning } = await markPaidAndSyncPayback(withdrawal.payback_id)
    return NextResponse.json({ withdrawal: data, warning })
  }
  return NextResponse.json({ withdrawal: data })
}
