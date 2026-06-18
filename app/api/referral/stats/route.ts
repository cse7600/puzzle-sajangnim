export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { DEMO_USER_ID } from '@/lib/auth'

const db = supabaseAdmin as any
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://puzzle.kr'

type ProfileData = {
  name?: string
  business_name?: string
  referral_code?: string
  referred_by?: string
}

type FriendNode = {
  id: string
  name: string
  business_name: string
  joined_at: string
}

const EMPTY = {
  referral_code: '',
  referral_link: '',
  friends: [] as FriendNode[],
  friend_count: 0,
  total_earned: 0,
  unpaid_earned: 0,
  paid_earned: 0,
}

function mapFriend(row: { id: string; profile_data: ProfileData | null; created_at: string }): FriendNode {
  const profile = row.profile_data ?? {}
  return {
    id: row.id,
    name: profile.name ?? '이름 미등록',
    business_name: profile.business_name ?? '',
    joined_at: row.created_at,
  }
}

function sumEarnings(rows: { earned_amount: number | null; is_paid: boolean }[]) {
  let total = 0
  let unpaid = 0
  let paid = 0
  for (const row of rows) {
    const amount = row.earned_amount ?? 0
    total += amount
    if (row.is_paid) paid += amount
    else unpaid += amount
  }
  return { total, unpaid, paid }
}

export async function GET() {
  const { data: me } = await db
    .from('users')
    .select('profile_data')
    .eq('id', DEMO_USER_ID)
    .single()

  const referralCode = (me?.profile_data as ProfileData | null)?.referral_code ?? ''

  const { data: friendRows, error: friendError } = await db
    .from('users')
    .select('id, profile_data, created_at')
    .eq('profile_data->>referred_by', DEMO_USER_ID)
    .order('created_at', { ascending: false })

  if (friendError) return NextResponse.json(EMPTY, { status: 200 })

  const friends: FriendNode[] = (friendRows ?? []).map(mapFriend)

  const { data: earningRows, error: earningError } = await db
    .from('referral_earnings')
    .select('earned_amount, is_paid')
    .eq('referrer_id', DEMO_USER_ID)

  if (earningError) {
    return NextResponse.json(
      { ...EMPTY, referral_code: referralCode, referral_link: `${APP_URL}/r/${referralCode}`, friends, friend_count: friends.length },
      { status: 200 }
    )
  }

  const { total, unpaid, paid } = sumEarnings(earningRows ?? [])

  return NextResponse.json({
    referral_code: referralCode,
    referral_link: referralCode ? `${APP_URL}/r/${referralCode}` : '',
    friends,
    friend_count: friends.length,
    total_earned: total,
    unpaid_earned: unpaid,
    paid_earned: paid,
  })
}
