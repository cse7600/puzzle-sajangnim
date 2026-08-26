export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSessionUser, unauthorizedResponse } from '@/lib/auth-server'
import { getUserPaybacks, PaybackLineItem } from '@/lib/paybacks'
import { convertExpiredPaybacks } from '@/lib/settlement-points'

const db = supabaseAdmin as any

type SimpleItem = { id: string; label: string; amount: number; unit: 'KRW' | 'P'; date: string; statusLabel: string }
type SimpleSection = { key: string; label: string; unit: 'KRW' | 'P'; amount: number; items: SimpleItem[] }

async function fetchPendingReceipts(userId: string): Promise<SimpleSection> {
  const { data } = await db
    .from('receipts')
    .select('id, store_name, points_earned, created_at')
    .eq('user_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
  const items: SimpleItem[] = (data ?? []).map((row: { id: string; store_name: string | null; points_earned: number; created_at: string }) => ({
    id: row.id,
    label: `영수증 · ${row.store_name ?? '미상 매장'}`,
    amount: row.points_earned ?? 0,
    unit: 'P',
    date: row.created_at,
    statusLabel: '검토중',
  }))
  return { key: 'receipt', label: '영수증 환급 (검토중)', unit: 'P', amount: items.reduce((s, i) => s + i.amount, 0), items }
}

async function fetchApprovedReceipts(userId: string): Promise<SimpleSection> {
  const { data } = await db
    .from('receipts')
    .select('id, store_name, points_earned, created_at')
    .eq('user_id', userId)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
  const items: SimpleItem[] = (data ?? []).map((row: { id: string; store_name: string | null; points_earned: number; created_at: string }) => ({
    id: row.id,
    label: `영수증 · ${row.store_name ?? '미상 매장'}`,
    amount: row.points_earned ?? 0,
    unit: 'P',
    date: row.created_at,
    statusLabel: '포인트 지급',
  }))
  return { key: 'receipt', label: '영수증 포인트', unit: 'P', amount: items.reduce((s, i) => s + i.amount, 0), items }
}

// referral_earnings는 이제 생성 시점에 항상 is_paid=true(즉시 포인트 지급)라 필터 불필요.
async function fetchReferralEarnings(userId: string): Promise<SimpleSection> {
  const { data } = await db
    .from('referral_earnings')
    .select('id, source_type, earned_amount, created_at')
    .eq('referrer_id', userId)
    .order('created_at', { ascending: false })
  const items: SimpleItem[] = (data ?? []).map((row: { id: string; source_type: string | null; earned_amount: number; created_at: string }) => ({
    id: row.id,
    label: `추천 수익 · ${row.source_type ?? ''}`.trim(),
    amount: row.earned_amount ?? 0,
    unit: 'P',
    date: row.created_at,
    statusLabel: '포인트 지급',
  }))
  return { key: 'referral', label: '추천인 포인트', unit: 'P', amount: items.reduce((s, i) => s + i.amount, 0), items }
}

async function fetchPointsByType(userId: string, types: string[], key: string, label: string, statusLabel: string): Promise<SimpleSection> {
  const { data } = await db
    .from('point_transactions')
    .select('id, description, amount, created_at')
    .eq('user_id', userId)
    .in('type', types)
    .order('created_at', { ascending: false })
  const items: SimpleItem[] = (data ?? []).map((row: { id: string; description: string | null; amount: number; created_at: string }) => ({
    id: row.id,
    label: row.description ?? label,
    amount: row.amount ?? 0,
    unit: 'P',
    date: row.created_at,
    statusLabel,
  }))
  return { key, label, unit: 'P', amount: items.reduce((s, i) => s + i.amount, 0), items }
}

interface ExpectedResponse {
  tab: 'expected'
  totalPending: number
  paybacks: PaybackLineItem[]
  sections: SimpleSection[]
}

async function buildExpected(userId: string): Promise<ExpectedResponse> {
  const [paybacks, receiptSection] = await Promise.all([
    getUserPaybacks(userId, ['draft', 'review_1', 'review_2']),
    fetchPendingReceipts(userId),
  ])
  const paybackTotal = paybacks.reduce((sum, p) => sum + p.amount, 0)
  return {
    tab: 'expected',
    totalPending: paybackTotal + receiptSection.amount,
    paybacks,
    sections: [receiptSection],
  }
}

interface ConfirmedResponse {
  tab: 'confirmed'
  actionable: { totalAmount: number; nearestDeadline: string | null; paybacks: PaybackLineItem[] }
  realized: { cashTotal: number; pointTotal: number; paybacks: PaybackLineItem[]; sections: SimpleSection[] }
}

function nearestDeadline(paybacks: PaybackLineItem[]): string | null {
  const deadlines = paybacks.map(p => p.withdrawal_deadline).filter((d): d is string => Boolean(d))
  if (deadlines.length === 0) return null
  return deadlines.reduce((min, d) => (d < min ? d : min))
}

async function buildConfirmed(userId: string): Promise<ConfirmedResponse> {
  const [actionablePaybacks, realizedPaybacks, receiptSection, referralSection, knowledgeSection] = await Promise.all([
    getUserPaybacks(userId, ['confirmed']),
    getUserPaybacks(userId, ['paid', 'converted_to_points']),
    fetchApprovedReceipts(userId),
    fetchReferralEarnings(userId),
    fetchPointsByType(userId, ['knowledge_question', 'knowledge_answer'], 'knowledge', '지식 거래소 포인트', '포인트 지급'),
  ])

  const cashTotal = realizedPaybacks.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0)
  const pointFromPaybacks = realizedPaybacks.filter(p => p.status === 'converted_to_points').reduce((sum, p) => sum + p.amount, 0)
  const pointTotal = pointFromPaybacks + receiptSection.amount + referralSection.amount + knowledgeSection.amount

  return {
    tab: 'confirmed',
    actionable: {
      totalAmount: actionablePaybacks.reduce((sum, p) => sum + p.amount, 0),
      nearestDeadline: nearestDeadline(actionablePaybacks),
      paybacks: actionablePaybacks,
    },
    realized: {
      cashTotal,
      pointTotal,
      paybacks: realizedPaybacks,
      sections: [receiptSection, referralSection, knowledgeSection],
    },
  }
}

interface RewardsResponse {
  tab: 'rewards'
  total: number
  sections: SimpleSection[]
}

async function buildRewards(userId: string): Promise<RewardsResponse> {
  const [rewardSection, communitySection] = await Promise.all([
    fetchPointsByType(userId, ['reward'], 'reward', '이벤트 리워드', '포인트 지급'),
    fetchPointsByType(userId, ['community'], 'community', '커뮤니티 활동', '포인트 지급'),
  ])
  return {
    tab: 'rewards',
    total: rewardSection.amount + communitySection.amount,
    sections: [rewardSection, communitySection],
  }
}

export async function GET(req: Request) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) return unauthorizedResponse()

  await convertExpiredPaybacks(sessionUser.id)

  const { searchParams } = new URL(req.url)
  const tab = searchParams.get('tab') ?? 'expected'

  if (tab === 'confirmed') return NextResponse.json(await buildConfirmed(sessionUser.id))
  if (tab === 'rewards') return NextResponse.json(await buildRewards(sessionUser.id))
  return NextResponse.json(await buildExpected(sessionUser.id))
}
