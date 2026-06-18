export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { DEMO_USER_ID } from '@/lib/auth'

const db = supabaseAdmin as any

export async function GET() {
  try {
    const { data, error } = await db
      .from('paybacks')
      .select('*, ad_accounts(platform, account_name, monthly_spend, payback_rate)')
      .eq('user_id', DEMO_USER_ID)
      .order('created_at', { ascending: false })
    if (error) throw error
    return NextResponse.json(data ?? [])
  } catch {
    return NextResponse.json(buildMockPaybacks())
  }
}

function buildMockPaybacks() {
  return [
    {
      id: 'pb-1',
      user_id: DEMO_USER_ID,
      ad_account_id: 'mock-1',
      amount: 19000,
      period: '2026-05',
      status: 'paid',
      processed_at: '2026-05-20T00:00:00Z',
      created_at: '2026-05-01T00:00:00Z',
      ad_accounts: {
        platform: 'naver',
        account_name: '을지로 쌈밥 철수네',
        monthly_spend: 380000,
        payback_rate: 5.0,
      },
    },
  ]
}
