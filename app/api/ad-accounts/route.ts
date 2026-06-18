import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// 더미 user_id (카카오 로그인 전 데모용)
const DEMO_USER_ID = 'demo-user-001'

export async function GET() {
  // 데모: Supabase에서 조회 시도, 빈 배열이면 목 데이터 반환
  try {
    const { data, error } = await supabase
      .from('ad_accounts')
      .select('*')
      .eq('user_id', DEMO_USER_ID)
      .order('created_at', { ascending: false })

    if (error) throw error

    // 데이터 없으면 목 데이터
    if (!data || data.length === 0) {
      return NextResponse.json([
        {
          id: 'mock-1',
          user_id: DEMO_USER_ID,
          platform: 'naver',
          account_id: '1234567890',
          account_name: '을지로 쌈밥 철수네 - 검색광고',
          monthly_spend: 380000,
          payback_rate: 5.00,
          status: 'active',
          verified_at: '2024-03-15T00:00:00Z',
          created_at: '2024-03-15T00:00:00Z',
        },
      ])
    }

    return NextResponse.json(data)
  } catch {
    // DB 미연결 — 목 데이터 반환
    return NextResponse.json([
      {
        id: 'mock-1',
        user_id: DEMO_USER_ID,
        platform: 'naver',
        account_id: '1234567890',
        account_name: '을지로 쌈밥 철수네 - 검색광고',
        monthly_spend: 380000,
        payback_rate: 5.00,
        status: 'active',
        verified_at: '2024-03-15T00:00:00Z',
        created_at: '2024-03-15T00:00:00Z',
      },
    ])
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { platform, account_id, account_name, monthly_spend } = body

  // 플랫폼별 페이백 요율
  const PAYBACK_RATES: Record<string, number> = {
    naver: 5.00,
    meta: 4.00,
    google: 3.50,
    kakao: 4.50,
  }

  const payback_rate = PAYBACK_RATES[platform] ?? 3.00

  try {
    const { data, error } = await supabase
      .from('ad_accounts')
      .insert({
        user_id: DEMO_USER_ID,
        platform: platform as 'naver' | 'meta' | 'google' | 'kakao',
        account_id,
        account_name,
        monthly_spend: Number(monthly_spend),
        payback_rate,
        status: 'pending' as const,
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch {
    // DB 없으면 목 응답
    return NextResponse.json({
      id: `new-${Date.now()}`,
      user_id: DEMO_USER_ID,
      platform,
      account_id,
      account_name,
      monthly_spend: Number(monthly_spend),
      payback_rate,
      status: 'pending',
      verified_at: null,
      created_at: new Date().toISOString(),
    })
  }
}
