export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSessionUser, unauthorizedResponse } from '@/lib/auth-server'

const db = supabaseAdmin as any

interface WithdrawalRow {
  id: string
  payback_id: string
  amount: number
  status: string
  bank_name: string
  account_holder: string
  account_number: string
  requested_at: string
  processed_at: string | null
  reject_reason: string | null
}

function maskAccountNumber(accountNumber: string): string {
  if (accountNumber.length <= 4) return accountNumber
  return `${'*'.repeat(accountNumber.length - 4)}${accountNumber.slice(-4)}`
}

function toPublicWithdrawal(row: WithdrawalRow) {
  return { ...row, account_number: maskAccountNumber(row.account_number) }
}

export async function GET() {
  const sessionUser = await getSessionUser()
  if (!sessionUser) return unauthorizedResponse()

  const { data, error } = await db
    .from('withdrawal_requests')
    .select('id, payback_id, amount, status, bank_name, account_holder, account_number, requested_at, processed_at, reject_reason')
    .eq('user_id', sessionUser.id)
    .order('requested_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: '출금 신청 내역을 불러오지 못했습니다' }, { status: 500 })
  }
  return NextResponse.json({ withdrawals: (data ?? []).map(toPublicWithdrawal) })
}

interface Payback {
  id: string
  user_id: string
  status: string
  amount: number
  withdrawal_deadline: string | null
}

async function loadPayback(id: string): Promise<Payback | null> {
  const { data } = await db
    .from('paybacks')
    .select('id, user_id, status, amount, withdrawal_deadline')
    .eq('id', id)
    .maybeSingle()
  return data
}

async function loadWithdrawalMinAmount(): Promise<number> {
  const { data } = await db.from('settlement_settings').select('withdrawal_min_amount').eq('id', 1).maybeSingle()
  return data?.withdrawal_min_amount ?? 10000
}

interface BankAccount {
  bank_name: string
  account_number: string
  account_holder: string
}

async function loadBankAccount(userId: string): Promise<BankAccount | null> {
  const { data } = await db
    .from('business_verifications')
    .select('bank_name, account_number, account_holder')
    .eq('user_id', userId)
    .order('submitted_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!data?.bank_name || !data?.account_number || !data?.account_holder) return null
  return data
}

// payback 상태·기한·최소금액·계좌등록 여부를 검증한다. 통과 시 null, 실패 시 {message, status}.
async function validateWithdrawalRequest(
  payback: Payback,
  minAmount: number
): Promise<{ message: string; status: number } | null> {
  if (payback.status !== 'confirmed') {
    return { message: '확정된 정산만 출금 신청할 수 있습니다', status: 409 }
  }
  if (!payback.withdrawal_deadline || new Date(payback.withdrawal_deadline) < new Date()) {
    return { message: '출금 신청 기한이 지났습니다. 포인트로 전환됩니다', status: 409 }
  }
  if (payback.amount < minAmount) {
    return { message: `${minAmount.toLocaleString()}원 미만 정산은 포인트로만 전환됩니다`, status: 400 }
  }
  return null
}

// 신청 insert 직후 payback이 만료 sweep으로 이미 포인트 전환됐다면(경합), 방금 만든 신청을 되돌리고
// 이중 수령(현금+포인트)을 막는다. sweep은 활성 신청 목록을 신청 전에 조회하므로 아주 좁은 틈에서만 발생한다.
async function guardAgainstConcurrentConversion(withdrawalId: string, paybackId: string): Promise<boolean> {
  const { data: payback } = await db.from('paybacks').select('status').eq('id', paybackId).maybeSingle()
  if (payback?.status === 'converted_to_points') {
    await db.from('withdrawal_requests').update({ status: 'canceled' }).eq('id', withdrawalId)
    return true
  }
  return false
}

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) return unauthorizedResponse()

  let body: { payback_id?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: '요청 본문이 올바른 JSON 형식이 아닙니다' }, { status: 400 })
  }
  if (!body.payback_id) {
    return NextResponse.json({ error: 'payback_id가 필요합니다' }, { status: 400 })
  }

  const payback = await loadPayback(body.payback_id)
  if (!payback || payback.user_id !== sessionUser.id) {
    return NextResponse.json({ error: '정산 내역을 찾을 수 없습니다' }, { status: 404 })
  }

  const minAmount = await loadWithdrawalMinAmount()
  const validationError = await validateWithdrawalRequest(payback, minAmount)
  if (validationError) {
    return NextResponse.json({ error: validationError.message }, { status: validationError.status })
  }

  const bankAccount = await loadBankAccount(sessionUser.id)
  if (!bankAccount) {
    return NextResponse.json({ error: '정산 계좌를 먼저 등록해주세요' }, { status: 428 })
  }

  const { data, error } = await db
    .from('withdrawal_requests')
    .insert({
      user_id: sessionUser.id,
      payback_id: payback.id,
      amount: payback.amount,
      bank_name: bankAccount.bank_name,
      account_number: bankAccount.account_number,
      account_holder: bankAccount.account_holder,
    })
    .select('id, payback_id, amount, status, bank_name, account_holder, account_number, requested_at, processed_at, reject_reason')
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: '이미 진행 중인 출금 신청이 있습니다' }, { status: 409 })
    }
    return NextResponse.json({ error: '출금 신청에 실패했습니다' }, { status: 500 })
  }

  if (await guardAgainstConcurrentConversion(data.id, payback.id)) {
    return NextResponse.json({ error: '해당 정산이 이미 포인트로 전환됐습니다' }, { status: 409 })
  }

  return NextResponse.json({ withdrawal: toPublicWithdrawal(data) }, { status: 201 })
}
