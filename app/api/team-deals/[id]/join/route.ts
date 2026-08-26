import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSessionUser, unauthorizedResponse } from '@/lib/auth-server'
import { isUuid } from '@/lib/admin-users'

const db = supabaseAdmin as any

interface JoinResult {
  ok: boolean
  reason?: 'invalid_quantity' | 'not_found' | 'deal_not_active' | 'deal_expired' | 'deal_full' | 'already_joined' | 'insufficient_points'
  balance?: number
  remaining?: number
  new_count?: number
  completed?: boolean
  price_paid?: number
  quantity?: number
}

const ERROR_STATUS: Record<NonNullable<JoinResult['reason']>, number> = {
  invalid_quantity: 400,
  not_found: 404,
  deal_not_active: 409,
  deal_expired: 409,
  deal_full: 409,
  already_joined: 409,
  insufficient_points: 402,
}

const ERROR_MESSAGE: Record<NonNullable<JoinResult['reason']>, string> = {
  invalid_quantity: '신청 수량이 올바르지 않습니다',
  not_found: '팀구매를 찾을 수 없습니다',
  deal_not_active: '진행 중인 팀구매가 아닙니다',
  deal_expired: '마감된 팀구매입니다',
  deal_full: '남은 자리가 부족합니다',
  already_joined: '이미 참여한 팀구매입니다',
  insufficient_points: '포인트가 부족합니다',
}

// 잔액 확인→차감→참여 기록→카운트 증가를 join_team_deal Postgres 함수 하나로 원자 처리한다.
// (행 잠금 + advisory lock으로 마지막 자리 race·동일 유저 이중 차감 race를 DB에서 막음)
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) return unauthorizedResponse()
  if (!isUuid(params.id)) {
    return NextResponse.json({ error: '팀구매를 찾을 수 없습니다' }, { status: 404 })
  }

  const body = await req.json().catch(() => ({}))
  const quantity = body.quantity === undefined ? 1 : Number(body.quantity)
  if (!Number.isInteger(quantity) || quantity < 1) {
    return NextResponse.json({ error: '신청 수량이 올바르지 않습니다' }, { status: 400 })
  }

  const { data, error } = await db.rpc('join_team_deal', {
    p_deal_id: params.id,
    p_user_id: sessionUser.id,
    p_quantity: quantity,
  })

  if (error) {
    return NextResponse.json({ error: '팀구매 참여 처리에 실패했습니다' }, { status: 500 })
  }

  const result = data as JoinResult
  if (!result.ok) {
    const reason = result.reason ?? 'not_found'
    const message = reason === 'deal_full' && result.remaining !== undefined
      ? `남은 자리가 부족합니다 (잔여 ${result.remaining}개)`
      : ERROR_MESSAGE[reason]
    return NextResponse.json(
      { error: message, reason, balance: result.balance, remaining: result.remaining },
      { status: ERROR_STATUS[reason] }
    )
  }

  return NextResponse.json({
    success: true,
    new_count: result.new_count,
    completed: result.completed,
    price_paid: result.price_paid,
    quantity: result.quantity,
  })
}
