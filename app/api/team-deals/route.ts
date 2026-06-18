import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const DEMO_USER_ID = 'demo-user-001'

// 목 데이터 (DB 없을 때 폴백)
const MOCK_DEALS = [
  {
    id: 'deal-1',
    creator_id: DEMO_USER_ID,
    title: 'AI 블로그 프리미엄 6개월',
    description: '키워드 자동화 + 원클릭 발행 포함',
    category: 'blog',
    original_price: 594000,
    deal_price: 297000,
    leader_price: 240000,
    target_count: 5,
    current_count: 4,
    deadline: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
    status: 'active',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'deal-2',
    creator_id: 'other-user',
    title: '플레이스 순위관리 12개월',
    description: '매일 순위 추적 + AI 개선 리포트',
    category: 'place',
    original_price: 1200000,
    deal_price: 720000,
    leader_price: 600000,
    target_count: 3,
    current_count: 2,
    deadline: new Date(Date.now() + 11 * 60 * 60 * 1000 + 58 * 60 * 1000).toISOString(),
    status: 'active',
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'deal-3',
    creator_id: 'other-user-2',
    title: '미니 체험단 패키지 3개월',
    description: '동네 크리에이터 5인 매칭 보장',
    category: 'experience',
    original_price: 450000,
    deal_price: 270000,
    leader_price: 220000,
    target_count: 4,
    current_count: 1,
    deadline: new Date(Date.now() + 23 * 60 * 60 * 1000).toISOString(),
    status: 'active',
    created_at: new Date().toISOString(),
  },
]

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('team_deals')
      .select('*, team_deal_members(user_id, is_leader)')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
    if (error) throw error
    return NextResponse.json(data?.length ? data : MOCK_DEALS)
  } catch {
    return NextResponse.json(MOCK_DEALS)
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { title, description, category, original_price, deal_price, leader_price, target_count, deadline_hours = 24 } = body

  const deadline = new Date(Date.now() + deadline_hours * 60 * 60 * 1000).toISOString()

  const newDealInsert = {
    creator_id: DEMO_USER_ID,
    title,
    description,
    category,
    original_price: Number(original_price),
    deal_price: Number(deal_price),
    leader_price: Number(leader_price),
    target_count: Number(target_count),
    deadline,
    status: 'active' as const,
  }

  const newDealFallback = { ...newDealInsert, current_count: 1, id: `deal-${Date.now()}`, created_at: new Date().toISOString() }

  try {
    const { data, error } = await supabase.from('team_deals').insert(newDealInsert).select().single()
    if (error) throw error
    // 방장 자동 참여
    await supabase.from('team_deal_members').insert({
      deal_id: data.id,
      user_id: DEMO_USER_ID,
      is_leader: true,
      price_paid: Number(leader_price),
    })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json(newDealFallback)
  }
}
