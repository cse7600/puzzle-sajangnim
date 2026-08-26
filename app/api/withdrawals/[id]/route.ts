export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSessionUser, unauthorizedResponse } from '@/lib/auth-server'

const db = supabaseAdmin as any

interface RouteParams {
  params: { id: string }
}

// 본인 소유 && status='requested'인 신청만 취소 가능. 조건부 UPDATE로 0행이면
// 이미 처리 중이거나 남의 건이라는 뜻이므로 409로 구분 없이 응답한다(정보 노출 방지).
export async function DELETE(req: Request, { params }: RouteParams) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) return unauthorizedResponse()

  const { data, error } = await db
    .from('withdrawal_requests')
    .update({ status: 'canceled', updated_at: new Date().toISOString() })
    .eq('id', params.id)
    .eq('user_id', sessionUser.id)
    .eq('status', 'requested')
    .select('id')
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: '출금 신청 취소에 실패했습니다' }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ error: '취소할 수 있는 신청이 아닙니다 (이미 처리 중이거나 존재하지 않음)' }, { status: 409 })
  }
  return NextResponse.json({ canceled: true })
}
