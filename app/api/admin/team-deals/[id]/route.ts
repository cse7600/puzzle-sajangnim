export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSessionUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-server'
import { isUuid } from '@/lib/admin-users'
import { validateDealPatch, hasDealPatchField } from '@/lib/admin-team-deals'
import { parseQuestionSet, saveQuestionSet, IncomingQuestion } from '@/lib/admin-team-deal-questions'

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

function validateEditValues(deal: DealRow, body: Record<string, unknown>) {
  if (!hasDealPatchField(body)) return { values: {} as Record<string, unknown> }
  const checked = validateDealPatch(body)
  if ('error' in checked) return checked
  const values = checked.values

  if (values.target_count !== undefined && values.target_count < deal.current_count) {
    return { error: `목표 수량은 현재 참여 수량(${deal.current_count}) 미만으로 줄일 수 없습니다` }
  }
  const nextDealPrice = values.deal_price ?? deal.deal_price
  const nextOriginalPrice = values.original_price ?? deal.original_price
  if (nextDealPrice > nextOriginalPrice) {
    return { error: '딜 가격은 정가를 초과할 수 없습니다' }
  }
  return { values: values as Record<string, unknown> }
}

// 오픈 전제조건 불변식: 문항 0개인 딜은 active가 될 수 없다.
// draft 딜이 문항을 갖추고 저장되면 여기서만 active로 자동 전환한다(전환 경로 일원화).
async function editDeal(deal: DealRow, body: Record<string, unknown>) {
  let questions: IncomingQuestion[] | null = null
  if (body.questions !== undefined) {
    const parsed = parseQuestionSet(body.questions)
    if ('error' in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 })
    }
    if (deal.status === 'active' && parsed.questions.length === 0) {
      return NextResponse.json(
        { error: '모집중인 딜의 요청서 문항은 전부 삭제할 수 없습니다. 딜을 취소하거나 문항을 남겨주세요' },
        { status: 400 }
      )
    }
    questions = parsed.questions
  }

  const checked = validateEditValues(deal, body)
  if ('error' in checked) {
    return NextResponse.json({ error: checked.error }, { status: 400 })
  }
  if (questions === null && Object.keys(checked.values).length === 0) {
    return NextResponse.json({ error: '수정할 항목이 없습니다' }, { status: 400 })
  }

  if (questions !== null) {
    const saveError = await saveQuestionSet(deal.id, questions)
    if (saveError) {
      return NextResponse.json({ error: saveError }, { status: 500 })
    }
  }

  const values = { ...checked.values }
  if (deal.status === 'draft') {
    const { count } = await db
      .from('team_deal_survey_questions')
      .select('id', { count: 'exact', head: true })
      .eq('deal_id', deal.id)
    if ((count ?? 0) >= 1) values.status = 'active'
  }

  const { data, error } =
    Object.keys(values).length > 0
      ? await db.from('team_deals').update(values).eq('id', deal.id).select().single()
      : await db.from('team_deals').select().eq('id', deal.id).single()
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
