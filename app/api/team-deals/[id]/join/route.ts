import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const DEMO_USER_ID = 'demo-user-001'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    // 딜 현황 조회
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

    // 카운트 업데이트
    await supabase.from('team_deals').update({
      current_count: newCount,
      status: isCompleted ? 'completed' : 'active',
    }).eq('id', params.id)

    // 멤버 추가
    await supabase.from('team_deal_members').insert({
      deal_id: params.id,
      user_id: DEMO_USER_ID,
      is_leader: false,
      price_paid: deal.deal_price,
    })

    return NextResponse.json({
      success: true,
      new_count: newCount,
      target_count: deal.target_count,
      status: isCompleted ? 'completed' : 'active',
      price_paid: deal.deal_price,
    })
  } catch (err) {
    // DB 없으면 목 응답
    return NextResponse.json({ success: true, new_count: 3, target_count: 5, status: 'active', price_paid: 297000 })
  }
}
