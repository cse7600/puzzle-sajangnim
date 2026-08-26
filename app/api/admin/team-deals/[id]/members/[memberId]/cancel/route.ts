export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSessionUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-server'
import { isUuid } from '@/lib/admin-users'

const db = supabaseAdmin as any

interface CancelResult {
  ok: boolean
  reason?: 'not_found' | 'already_processed'
  status?: string
  refunded?: number
  refund_transaction_id?: string
  new_count?: number
}

// 상태 전환·환불 원장 기록·카운트 감소는 cancel_team_deal_member RPC가 원자 처리한다 (migration 018).
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; memberId: string } }
) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) return unauthorizedResponse()
  if (!sessionUser.isAdmin) return forbiddenResponse()
  if (!isUuid(params.id) || !isUuid(params.memberId)) {
    return NextResponse.json({ error: '신청 내역을 찾을 수 없습니다' }, { status: 404 })
  }

  const { data: member } = await db
    .from('team_deal_members')
    .select('id, deal_id')
    .eq('id', params.memberId)
    .maybeSingle()
  if (!member || member.deal_id !== params.id) {
    return NextResponse.json({ error: '이 팀구매의 신청 내역이 아닙니다' }, { status: 404 })
  }

  const { data, error } = await db.rpc('cancel_team_deal_member', { p_member_id: params.memberId })
  if (error) {
    return NextResponse.json({ error: '신청 취소 처리에 실패했습니다' }, { status: 500 })
  }

  const result = data as CancelResult
  if (!result.ok) {
    if (result.reason === 'already_processed') {
      return NextResponse.json({ error: '이미 취소되었거나 환불된 신청입니다' }, { status: 409 })
    }
    return NextResponse.json({ error: '신청 내역을 찾을 수 없습니다' }, { status: 404 })
  }

  return NextResponse.json({
    success: true,
    refunded: result.refunded,
    refund_transaction_id: result.refund_transaction_id,
    new_count: result.new_count,
  })
}
