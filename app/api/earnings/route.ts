export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { DEMO_USER_ID } from '@/lib/auth'

const db = supabaseAdmin as any

type EarningItem = {
  label: string
  amount: number
  date: string
}

type EarningSection = {
  key: string
  label: string
  amount: number
  items: EarningItem[]
}

type EarningsResponse = {
  tab: string
  total: number
  sections: EarningSection[]
}

const EMPTY = (tab: string): EarningsResponse => ({ tab, total: 0, sections: [] })

function buildSection(
  key: string,
  label: string,
  items: EarningItem[]
): EarningSection {
  const amount = items.reduce((sum, row) => sum + (row.amount ?? 0), 0)
  return { key, label, amount, items }
}

async function fetchPaybacks(status: 'pending' | 'paid'): Promise<EarningItem[]> {
  const { data } = await db
    .from('paybacks')
    .select('amount, period, created_at')
    .eq('user_id', DEMO_USER_ID)
    .eq('status', status)
    .order('created_at', { ascending: false })
  return (data ?? []).map((row: { amount: number; period: string | null; created_at: string }) => ({
    label: `광고 페이백 ${row.period ?? ''}`.trim(),
    amount: Math.round(row.amount ?? 0),
    date: row.created_at,
  }))
}

async function fetchReceipts(status: 'pending' | 'approved'): Promise<EarningItem[]> {
  const { data } = await db
    .from('receipts')
    .select('store_name, points_earned, created_at')
    .eq('user_id', DEMO_USER_ID)
    .eq('status', status)
    .order('created_at', { ascending: false })
  return (data ?? []).map((row: { store_name: string | null; points_earned: number; created_at: string }) => ({
    label: `영수증 적립 · ${row.store_name ?? '미상 매장'}`,
    amount: Math.round(row.points_earned ?? 0),
    date: row.created_at,
  }))
}

async function fetchReferrals(isPaid: boolean): Promise<EarningItem[]> {
  const { data } = await db
    .from('referral_earnings')
    .select('source_type, earned_amount, created_at')
    .eq('referrer_id', DEMO_USER_ID)
    .eq('is_paid', isPaid)
    .order('created_at', { ascending: false })
  return (data ?? []).map((row: { source_type: string | null; earned_amount: number; created_at: string }) => ({
    label: `추천 수익 · ${row.source_type ?? '결제'}`,
    amount: Math.round(row.earned_amount ?? 0),
    date: row.created_at,
  }))
}

async function fetchRewards(): Promise<EarningItem[]> {
  const { data } = await db
    .from('point_transactions')
    .select('description, amount, created_at')
    .eq('user_id', DEMO_USER_ID)
    .eq('type', 'reward')
    .order('created_at', { ascending: false })
  return (data ?? []).map((row: { description: string | null; amount: number; created_at: string }) => ({
    label: row.description ?? '리워드 적립',
    amount: Math.round(row.amount ?? 0),
    date: row.created_at,
  }))
}

async function buildExpected(): Promise<EarningSection[]> {
  const [payback, receipt, referral] = await Promise.all([
    fetchPaybacks('pending'),
    fetchReceipts('pending'),
    fetchReferrals(false),
  ])
  return [
    buildSection('payback', '광고 페이백 (예상)', payback),
    buildSection('receipt', '영수증 포인트 (대기)', receipt),
    buildSection('referral', '추천인 미정산', referral),
  ]
}

async function buildConfirmed(): Promise<EarningSection[]> {
  const [payback, receipt, referral] = await Promise.all([
    fetchPaybacks('paid'),
    fetchReceipts('approved'),
    fetchReferrals(true),
  ])
  return [
    buildSection('payback', '광고 페이백 (지급 완료)', payback),
    buildSection('receipt', '영수증 포인트 (승인)', receipt),
    buildSection('referral', '추천인 정산 완료', referral),
  ]
}

async function buildRewards(): Promise<EarningSection[]> {
  const rewards = await fetchRewards()
  return [buildSection('reward', '리워드 적립', rewards)]
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const tab = searchParams.get('tab') ?? 'expected'

  try {
    let sections: EarningSection[]
    if (tab === 'confirmed') sections = await buildConfirmed()
    else if (tab === 'rewards') sections = await buildRewards()
    else sections = await buildExpected()

    const total = sections.reduce((sum, section) => sum + section.amount, 0)
    const body: EarningsResponse = { tab, total, sections }
    return NextResponse.json(body, {
      headers: { 'Cache-Control': 'private, max-age=10, stale-while-revalidate=20' },
    })
  } catch {
    return NextResponse.json(EMPTY(tab))
  }
}
