export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { DEMO_USER_ID } from '@/lib/auth'

const db = supabaseAdmin as any

type PointType =
  | 'receipt'
  | 'knowledge_question'
  | 'knowledge_answer'
  | 'referral'
  | 'reward'
  | 'redeem'
  | 'community'

interface BreakdownGroup {
  key: string
  label: string
  types: PointType[]
}

const GROUPS: BreakdownGroup[] = [
  { key: 'receipt', label: '영수증 적립', types: ['receipt'] },
  { key: 'knowledge', label: '지식 거래소', types: ['knowledge_question', 'knowledge_answer'] },
  { key: 'referral', label: '추천인 수익', types: ['referral'] },
  { key: 'reward', label: '이벤트 리워드', types: ['reward'] },
  { key: 'community', label: '커뮤니티', types: ['community'] },
  { key: 'redeem', label: '차감', types: ['redeem'] },
]

function buildEmptySummary() {
  return { total: 0, breakdown: [], redeemable: 0, usable: 0 }
}

export async function GET() {
  const { data, error } = await db
    .from('point_transactions')
    .select('amount, type')
    .eq('user_id', DEMO_USER_ID)

  if (error) return NextResponse.json(buildEmptySummary(), { status: 200 })

  const rows = (data ?? []) as { amount: number; type: PointType }[]
  const sumByType = new Map<PointType, number>()
  let total = 0
  for (const row of rows) {
    sumByType.set(row.type, (sumByType.get(row.type) ?? 0) + row.amount)
    total += row.amount
  }

  const breakdown = GROUPS.map((group) => ({
    key: group.key,
    label: group.label,
    amount: group.types.reduce((acc, t) => acc + (sumByType.get(t) ?? 0), 0),
  })).filter((entry) => entry.amount !== 0)

  return NextResponse.json({ total, breakdown, redeemable: total, usable: total }, {
    headers: { 'Cache-Control': 'private, max-age=10, stale-while-revalidate=20' },
  })
}
