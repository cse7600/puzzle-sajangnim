export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSessionUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-server'
import { isUuid } from '@/lib/admin-users'
import { validateDealCreate } from '@/lib/admin-team-deals'
import { parseQuestionSet, saveQuestionSet } from '@/lib/admin-team-deal-questions'

const db = supabaseAdmin as any

interface MemberAggRow {
  deal_id: string
  quantity: number
  status: string
}

async function attachMemberStats<T extends { id: string }>(
  deals: T[]
): Promise<(T & { applicant_count: number; joined_quantity: number })[]> {
  if (deals.length === 0) return []
  const { data: members } = await db
    .from('team_deal_members')
    .select('deal_id, quantity, status')
    .in('deal_id', deals.map(deal => deal.id))
  const statsByDeal = new Map<string, { applicant_count: number; joined_quantity: number }>()
  for (const member of (members ?? []) as MemberAggRow[]) {
    if (member.status !== 'joined') continue
    const stats = statsByDeal.get(member.deal_id) ?? { applicant_count: 0, joined_quantity: 0 }
    stats.applicant_count += 1
    stats.joined_quantity += member.quantity
    statsByDeal.set(member.deal_id, stats)
  }
  return deals.map(deal => ({
    ...deal,
    ...(statsByDeal.get(deal.id) ?? { applicant_count: 0, joined_quantity: 0 }),
  }))
}

export async function GET() {
  const sessionUser = await getSessionUser()
  if (!sessionUser) return unauthorizedResponse()
  if (!sessionUser.isAdmin) return forbiddenResponse()

  const { data, error } = await db
    .from('team_deals')
    .select('id, title, description, category, original_price, deal_price, target_count, current_count, deadline, status, thumbnail_url, content_html, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: '팀구매 목록을 불러오지 못했습니다' }, { status: 500 })
  }
  return NextResponse.json(await attachMemberStats(data ?? []))
}

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) return unauthorizedResponse()
  if (!sessionUser.isAdmin) return forbiddenResponse()

  const body = await req.json().catch(() => ({}))
  const checked = validateDealCreate(body)
  if ('error' in checked) {
    return NextResponse.json({ error: checked.error }, { status: 400 })
  }
  const parsedQuestions = parseQuestionSet(body.questions === undefined ? [] : body.questions)
  if ('error' in parsedQuestions) {
    return NextResponse.json({ error: parsedQuestions.error }, { status: 400 })
  }

  // 오픈 전제조건 불변식: 요청서 문항이 1개 이상이어야 active가 될 수 있다.
  // 문항 저장이 끝나기 전까지는 draft로 만들어 문항 없는 딜이 고객에게 노출되는 순간을 없앤다.
  const { data, error } = await db
    .from('team_deals')
    .insert({
      ...checked.values,
      // 쿠키 전용 어드민은 id가 'admin-entry'(UUID 아님)라 uuid 컬럼에 넣으면 insert가 깨진다
      creator_id: isUuid(sessionUser.id) ? sessionUser.id : null,
      status: 'draft',
      current_count: 0,
    })
    .select()
    .single()

  if (error || !data) {
    return NextResponse.json({ error: '팀구매 생성에 실패했습니다' }, { status: 500 })
  }

  if (parsedQuestions.questions.length === 0) {
    return NextResponse.json(data)
  }

  const saveError = await saveQuestionSet(data.id, parsedQuestions.questions)
  if (saveError) {
    return NextResponse.json(
      { error: `딜은 비공개(대기) 상태로 저장했지만 요청서 문항 저장에 실패했습니다: ${saveError}` },
      { status: 500 }
    )
  }

  const { data: activated, error: activateError } = await db
    .from('team_deals')
    .update({ status: 'active' })
    .eq('id', data.id)
    .select()
    .single()
  if (activateError || !activated) {
    return NextResponse.json(
      { error: '딜과 문항은 저장했지만 오픈(모집중 전환)에 실패했습니다. 딜 편집에서 다시 저장해주세요' },
      { status: 500 }
    )
  }
  return NextResponse.json(activated)
}
