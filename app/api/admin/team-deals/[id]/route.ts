export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSessionUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-server'
import { isUuid } from '@/lib/admin-users'
import { validateDealPatch } from '@/lib/admin-team-deals'

const db = supabaseAdmin as any

interface DealRow {
  id: string
  original_price: number
  deal_price: number
  current_count: number
  status: string
}

async function fetchDeal(dealId: string): Promise<DealRow | null> {
  const { data } = await db
    .from('team_deals')
    .select('id, original_price, deal_price, current_count, status')
    .eq('id', dealId)
    .maybeSingle()
  return data ?? null
}

// joined 전원 개별취소 RPC(환불 원장 기록 포함) 순회 후 딜을 cancelled로 마감한다.
async function cancelDeal(deal: DealRow) {
  const { data: members } = await db
    .from('team_deal_members')
    .select('id')
    .eq('deal_id', deal.id)
    .eq('status', 'joined')

  let refunded = 0
  for (const member of members ?? []) {
    const { data: cancelResult, error } = await db.rpc('cancel_team_deal_member', { p_member_id: member.id })
    if (!error && cancelResult?.ok) refunded += 1
  }

  const { error } = await db.from('team_deals').update({ status: 'cancelled' }).eq('id', deal.id)
  if (error) {
    return NextResponse.json({ error: '딜 상태 변경에 실패했습니다' }, { status: 500 })
  }
  return NextResponse.json({ success: true, cancelled: true, refunded_members: refunded })
}

async function editDeal(deal: DealRow, body: Record<string, unknown>) {
  const checked = validateDealPatch(body)
  if ('error' in checked) {
    return NextResponse.json({ error: checked.error }, { status: 400 })
  }
  const values = checked.values

  if (values.target_count !== undefined && values.target_count < deal.current_count) {
    return NextResponse.json(
      { error: `목표 수량은 현재 참여 수량(${deal.current_count}) 미만으로 줄일 수 없습니다` },
      { status: 400 }
    )
  }
  const nextDealPrice = values.deal_price ?? deal.deal_price
  const nextOriginalPrice = values.original_price ?? deal.original_price
  if (nextDealPrice > nextOriginalPrice) {
    return NextResponse.json({ error: '딜 가격은 정가를 초과할 수 없습니다' }, { status: 400 })
  }

  const { data, error } = await db.from('team_deals').update(values).eq('id', deal.id).select().single()
  if (error || !data) {
    return NextResponse.json({ error: '팀구매 수정에 실패했습니다' }, { status: 500 })
  }
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) return unauthorizedResponse()
  if (!sessionUser.isAdmin) return forbiddenResponse()
  if (!isUuid(params.id)) {
    return NextResponse.json({ error: '팀구매를 찾을 수 없습니다' }, { status: 404 })
  }

  const deal = await fetchDeal(params.id)
  if (!deal) {
    return NextResponse.json({ error: '팀구매를 찾을 수 없습니다' }, { status: 404 })
  }

  const body = await req.json().catch(() => ({}))
  if (body.action === 'cancel') {
    if (deal.status === 'cancelled' || deal.status === 'failed') {
      return NextResponse.json({ error: '이미 취소·실패 처리된 팀구매입니다' }, { status: 409 })
    }
    return cancelDeal(deal)
  }
  return editDeal(deal, body)
}
