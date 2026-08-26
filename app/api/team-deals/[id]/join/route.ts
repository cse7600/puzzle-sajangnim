import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSessionUser, unauthorizedResponse } from '@/lib/auth-server'

const db = supabaseAdmin as any

interface JoinResult {
  ok: boolean
  reason?: 'not_found' | 'deal_not_active' | 'deal_expired' | 'deal_full' | 'already_joined' | 'insufficient_points'
  balance?: number
  new_count?: number
  completed?: boolean
  price_paid?: number
}

const ERROR_STATUS: Record<NonNullable<JoinResult['reason']>, number> = {
  not_found: 404,
  deal_not_active: 409,
  deal_expired: 409,
  deal_full: 409,
  already_joined: 409,
  insufficient_points: 402,
}

const ERROR_MESSAGE: Record<NonNullable<JoinResult['reason']>, string> = {
  not_found: '팀구매를 찾을 수 없습니다',
  deal_not_active: '진행 중인 팀구매가 아닙니다',
  deal_expired: '마감된 팀구매입니다',
  deal_full: '이미 모집이 마감됐습니다',
  already_joined: '이미 참여한 팀구매입니다',
  insufficient_points: '포인트가 부족합니다',
}

// 잔액 확인→차감→참여 기록→카운트 증가를 join_team_deal Postgres 함수 하나로 원자 처리한다.
// (행 잠금 + advisory lock으로 마지막 자리 race·동일 유저 이중 차감 race를 DB에서 막음)
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) return unauthorizedResponse()

  const { data, error } = await db.rpc('join_team_deal', {
    p_deal_id: params.id,
    p_user_id: sessionUser.id,
  })

  if (error) {
    return NextResponse.json({ error: '팀구매 참여 처리에 실패했습니다' }, { status: 500 })
  }

  const result = data as JoinResult
  if (!result.ok) {
    const reason = result.reason ?? 'not_found'
    return NextResponse.json(
      { error: ERROR_MESSAGE[reason], reason, balance: result.balance },
      { status: ERROR_STATUS[reason] }
    )
  }

  return NextResponse.json({
    success: true,
    new_count: result.new_count,
    completed: result.completed,
    price_paid: result.price_paid,
  })
}
