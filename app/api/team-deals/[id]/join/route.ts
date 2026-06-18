import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// 유효한 UUID 형식 데모 사용자 (Auth 연동 전 시드값)
const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001'

const MOCK_DEALS: Record<string, { current_count: number; target_count: number; deal_price: number }> = {
  'deal-1': { current_count: 4, target_count: 5, deal_price: 297000 },
  'deal-2': { current_count: 2, target_count: 3, deal_price: 720000 },
  'deal-3': { current_count: 1, target_count: 4, deal_price: 270000 },
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { data: deal } = await supabase
      .from('team_deals')
      .select('*')
      .eq('id', params.id)
      .single()

    if (!deal) return NextResponse.json({ error: 'not_found' }, { status: 404 })
    if (deal.status !== 'active') return NextResponse.json({ error: 'deal_not_active' }, { status: 409 })
    if (new Date(deal.deadline) < new Date()) return NextResponse.json({ error: 'deal_expired' }, { status: 409 })

    const newCount = deal.current_count + 1
    const isCompleted = newCount >= deal.target_count

    await supabase.from('team_deals').update({
      current_count: newCount,
      status: isCompleted ? 'completed' : 'active',
    }).eq('id', params.id)

    return NextResponse.json({
      success: true,
      new_count: newCount,
      target_count: deal.target_count,
      status: isCompleted ? 'completed' : 'active',
      price_paid: deal.deal_price,
    })
  } catch {
    // DB 미연결 상태 — 목 딜에 대한 시뮬레이션
    const mock = MOCK_DEALS[params.id]
    if (!mock) return NextResponse.json({ success: false, error: 'not_found' }, { status: 404 })
    const newCount = mock.current_count + 1
    const isCompleted = newCount >= mock.target_count
    mock.current_count = newCount
    return NextResponse.json({
      success: true,
      new_count: newCount,
      target_count: mock.target_count,
      status: isCompleted ? 'completed' : 'active',
      price_paid: mock.deal_price,
    })
  }
}
