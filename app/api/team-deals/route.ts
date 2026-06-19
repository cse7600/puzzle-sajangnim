import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const DEMO_USER_ID = 'demo-user-001'

const DEAL_1_HTML = `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="font-size: 20px; font-weight: 700; color: #1d1d1f; margin-bottom: 16px;">AI 블로그 프리미엄 공동구매 패키지</h2>

  <div style="background: #f0f7ff; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
    <p style="font-size: 15px; color: #0066cc; font-weight: 600; margin: 0 0 8px;">이런 분께 추천해요</p>
    <ul style="margin: 0; padding-left: 20px; color: #444; font-size: 14px; line-height: 2;">
      <li>네이버 블로그 SEO를 처음 시작하는 사장님</li>
      <li>키워드 글쓰기를 자동화하고 싶은 분</li>
      <li>혼자 하면 비싼 콘텐츠 비용을 절약하고 싶은 분</li>
    </ul>
  </div>

  <h3 style="font-size: 17px; font-weight: 700; color: #1d1d1f; margin-bottom: 12px;">패키지 구성</h3>
  <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 24px;">
    <thead>
      <tr style="background: #f5f5f7;">
        <th style="text-align: left; padding: 10px 14px; color: #6e6e73; font-weight: 600;">항목</th>
        <th style="text-align: right; padding: 10px 14px; color: #6e6e73; font-weight: 600;">내용</th>
      </tr>
    </thead>
    <tbody>
      <tr style="border-bottom: 1px solid #e0e0e0;">
        <td style="padding: 10px 14px; color: #1d1d1f;">AI 글 생성</td>
        <td style="padding: 10px 14px; text-align: right; color: #1d1d1f; font-weight: 500;">월 30편</td>
      </tr>
      <tr style="border-bottom: 1px solid #e0e0e0;">
        <td style="padding: 10px 14px; color: #1d1d1f;">키워드 리서치</td>
        <td style="padding: 10px 14px; text-align: right; color: #1d1d1f; font-weight: 500;">업종 맞춤 50개</td>
      </tr>
      <tr style="border-bottom: 1px solid #e0e0e0;">
        <td style="padding: 10px 14px; color: #1d1d1f;">원클릭 발행</td>
        <td style="padding: 10px 14px; text-align: right; color: #1d1d1f; font-weight: 500;">포함</td>
      </tr>
      <tr>
        <td style="padding: 10px 14px; color: #1d1d1f;">성과 리포트</td>
        <td style="padding: 10px 14px; text-align: right; color: #0066cc; font-weight: 600;">월 1회 제공</td>
      </tr>
    </tbody>
  </table>

  <div style="background: #fff8ec; border: 1px solid #ffd880; border-radius: 12px; padding: 16px;">
    <p style="font-size: 14px; color: #b45309; margin: 0;">
      <strong>방장 혜택:</strong> 팀을 모집하면 방장 특별가 적용 + 퍼즐 포인트 3,000P 추가 지급
    </p>
  </div>
</div>`

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
    content_html: DEAL_1_HTML,
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
    content_html: '',
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
    content_html: '',
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
    const result = data?.length ? data : MOCK_DEALS
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30' },
    })
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
