export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { DEMO_USER_ID } from '@/lib/auth'

const db = supabaseAdmin as any

const SOURCE_LABELS: Record<string, string> = {
  receipt: '영수증',
  payback: '광고 페이백',
  knowledge: '지식 거래소',
}

type EarningRow = {
  id: string
  referee_id: string
  source_type: string
  source_amount: number | null
  earned_amount: number | null
  earning_rate: number | null
  is_paid: boolean
  created_at: string
}

async function buildRefereeNameMap(refereeIds: string[]): Promise<Map<string, string>> {
  const names = new Map<string, string>()
  if (refereeIds.length === 0) return names

  const { data: refereeRows } = await db
    .from('users')
    .select('id, profile_data')
    .in('id', refereeIds)

  for (const row of refereeRows ?? []) {
    const profile = row.profile_data as { name?: string } | null
    names.set(row.id, profile?.name ?? '이름 미등록')
  }
  return names
}

export async function GET() {
  const { data: earningRows, error } = await db
    .from('referral_earnings')
    .select('id, referee_id, source_type, source_amount, earned_amount, earning_rate, is_paid, created_at')
    .eq('referrer_id', DEMO_USER_ID)
    .order('created_at', { ascending: false })
    .limit(30)

  if (error) return NextResponse.json([], { status: 200 })

  const rows: EarningRow[] = earningRows ?? []
  const refereeIds = Array.from(new Set(rows.map((row) => row.referee_id)))
  const names = await buildRefereeNameMap(refereeIds)

  const earnings = rows.map((row) => ({
    id: row.id,
    referee_name: names.get(row.referee_id) ?? '이름 미등록',
    source_label: SOURCE_LABELS[row.source_type] ?? row.source_type,
    source_amount: row.source_amount ?? 0,
    earned_amount: row.earned_amount ?? 0,
    earning_rate: row.earning_rate ?? 0,
    is_paid: row.is_paid,
    created_at: row.created_at,
  }))

  return NextResponse.json(earnings)
}
