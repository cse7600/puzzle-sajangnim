export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { usersReadOnlyAdmin, resolveBusinessName } from '@/lib/admin-users'
import { getSessionUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-server'
import { convertExpiredPaybacks } from '@/lib/settlement-points'

const db = supabaseAdmin as any

interface WithdrawalRow {
  id: string
  user_id: string
  payback_id: string
  amount: number
  status: string
  bank_name: string
  account_number: string
  account_holder: string
  requested_at: string
  processed_at: string | null
  reject_reason: string | null
}

// "withdrawal=paid인데 payback≠paid" 불일치 건 — 어드민 출금 처리(§4)의 2단계 업데이트 중
// payback 갱신만 실패했을 가능성. 목록에 플래그로 노출해 재시도를 유도한다.
async function flagPaybackSyncMismatch(rows: WithdrawalRow[]): Promise<(WithdrawalRow & { payback_sync_mismatch: boolean })[]> {
  const paidWithdrawalIds = rows.filter(row => row.status === 'paid').map(row => row.payback_id)
  if (paidWithdrawalIds.length === 0) return rows.map(row => ({ ...row, payback_sync_mismatch: false }))

  const { data: paybacks } = await db.from('paybacks').select('id, status').in('id', paidWithdrawalIds)
  const paybackStatusById = new Map((paybacks ?? []).map((p: { id: string; status: string }) => [p.id, p.status]))

  return rows.map(row => ({
    ...row,
    payback_sync_mismatch: row.status === 'paid' && paybackStatusById.get(row.payback_id) !== 'paid',
  }))
}

async function attachAdvertiserName<T extends { user_id: string }>(rows: T[]): Promise<(T & { advertiser_name: string })[]> {
  if (rows.length === 0) return []
  const userIds = Array.from(new Set(rows.map(row => row.user_id)))
  const { data: users } = await usersReadOnlyAdmin.from('users').select('id, email, profile_data').in('id', userIds)
  const nameByUserId = new Map((users ?? []).map(u => [u.id, resolveBusinessName(u)]))
  return rows.map(row => ({ ...row, advertiser_name: nameByUserId.get(row.user_id) ?? row.user_id }))
}

export async function GET(req: Request) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) return unauthorizedResponse()
  if (!sessionUser.isAdmin) return forbiddenResponse()

  await convertExpiredPaybacks()

  const url = new URL(req.url)
  const status = url.searchParams.get('status')

  let query = db
    .from('withdrawal_requests')
    .select('id, user_id, payback_id, amount, status, bank_name, account_number, account_holder, requested_at, processed_at, reject_reason')
    .order('requested_at', { ascending: false })
  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) {
    return NextResponse.json({ error: '출금 신청 목록을 불러오지 못했습니다' }, { status: 500 })
  }

  const withMismatchFlag = await flagPaybackSyncMismatch(data ?? [])
  return NextResponse.json({ withdrawals: await attachAdvertiserName(withMismatchFlag) })
}
