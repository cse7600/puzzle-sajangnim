export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSessionUser, unauthorizedResponse } from '@/lib/auth-server'
import { isUuid } from '@/lib/admin-users'

const db = supabaseAdmin as any

interface MyMemberRow {
  id: string
  deal_id: string
  quantity: number
  price_paid: number
  status: string
  joined_at: string
}

interface SurveyQuestionRow {
  id: string
  deal_id: string
  required: boolean
}

interface SurveyResponseRow {
  member_id: string
  question_id: string
}

export interface MySurveySummary {
  total: number
  required_total: number
  answered: number
  required_answered: number
  status: 'none' | 'pending' | 'partial' | 'done'
}

// 어드민 members API와 동일 규칙: 질문 0개 none / 응답 0건 pending / 필수 전부 응답 done / 그 외 partial
function summarizeSurvey(
  questions: SurveyQuestionRow[],
  answeredQuestionIds: Set<string>
): MySurveySummary {
  const total = questions.length
  const requiredQuestions = questions.filter(q => q.required)
  const answered = questions.filter(q => answeredQuestionIds.has(q.id)).length
  const requiredAnswered = requiredQuestions.filter(q => answeredQuestionIds.has(q.id)).length

  let status: MySurveySummary['status'] = 'partial'
  if (total === 0) status = 'none'
  else if (answered === 0) status = 'pending'
  else if (requiredAnswered === requiredQuestions.length) status = 'done'

  return {
    total,
    required_total: requiredQuestions.length,
    answered,
    required_answered: requiredAnswered,
    status,
  }
}

async function loadSurveyContext(dealIds: string[], memberIds: string[]) {
  const [{ data: questions }, { data: responses }] = await Promise.all([
    db.from('team_deal_survey_questions').select('id, deal_id, required').in('deal_id', dealIds),
    db.from('team_deal_survey_responses').select('member_id, question_id').in('member_id', memberIds),
  ])
  return {
    questions: (questions ?? []) as SurveyQuestionRow[],
    responses: (responses ?? []) as SurveyResponseRow[],
  }
}

export async function GET() {
  const sessionUser = await getSessionUser()
  if (!sessionUser) return unauthorizedResponse()
  // 관리자 입장 쿠키 전용 세션(sentinel id)은 신청 내역이 없다
  if (!isUuid(sessionUser.id)) return NextResponse.json([])

  const { data: members, error } = await db
    .from('team_deal_members')
    .select('id, deal_id, quantity, price_paid, status, joined_at')
    .eq('user_id', sessionUser.id)
    .order('joined_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: '내 팀구매 신청 내역을 불러오지 못했습니다' }, { status: 500 })
  }

  const memberRows = (members ?? []) as MyMemberRow[]
  if (memberRows.length === 0) return NextResponse.json([])

  const dealIds = Array.from(new Set(memberRows.map(m => m.deal_id)))
  const { data: deals } = await db
    .from('team_deals')
    .select('id, title, thumbnail_url, category, deal_price, status')
    .in('id', dealIds)
  const dealById = new Map((deals ?? []).map((d: { id: string }) => [d.id, d]))

  const { questions, responses } = await loadSurveyContext(dealIds, memberRows.map(m => m.id))
  const questionsByDeal = new Map<string, SurveyQuestionRow[]>()
  for (const q of questions) {
    const list = questionsByDeal.get(q.deal_id) ?? []
    list.push(q)
    questionsByDeal.set(q.deal_id, list)
  }
  const answeredByMember = new Map<string, Set<string>>()
  for (const r of responses) {
    const set = answeredByMember.get(r.member_id) ?? new Set<string>()
    set.add(r.question_id)
    answeredByMember.set(r.member_id, set)
  }

  const entries = memberRows.map(m => ({
    member_id: m.id,
    quantity: m.quantity,
    price_paid: m.price_paid,
    status: m.status,
    joined_at: m.joined_at,
    deal: dealById.get(m.deal_id) ?? null,
    survey: summarizeSurvey(
      questionsByDeal.get(m.deal_id) ?? [],
      answeredByMember.get(m.id) ?? new Set()
    ),
  }))

  return NextResponse.json(entries)
}
