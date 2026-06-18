import { NextResponse } from 'next/server'

const DEMO_USER_ID = 'demo-user-001'

export async function GET() {
  // 이번 달 페이백 내역
  const mock = [
    {
      id: 'pb-1',
      user_id: DEMO_USER_ID,
      ad_account_id: 'mock-1',
      amount: 19000,
      period: '2024-06',
      status: 'confirmed',
      processed_at: '2024-07-05T00:00:00Z',
      created_at: '2024-07-01T00:00:00Z',
      ad_accounts: {
        platform: 'naver',
        account_name: '을지로 쌈밥 철수네',
        monthly_spend: 380000,
        payback_rate: 5.0,
      },
    },
    {
      id: 'pb-2',
      user_id: DEMO_USER_ID,
      ad_account_id: 'mock-2',
      amount: 8400,
      period: '2024-06',
      status: 'pending',
      processed_at: null,
      created_at: '2024-07-01T00:00:00Z',
      ad_accounts: {
        platform: 'meta',
        account_name: '인스타그램 광고',
        monthly_spend: 210000,
        payback_rate: 4.0,
      },
    },
  ]

  return NextResponse.json(mock)
}
