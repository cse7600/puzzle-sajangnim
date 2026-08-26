export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSessionUser, unauthorizedResponse } from '@/lib/auth-server'
import { isUuid } from '@/lib/admin-users'

const db = supabaseAdmin as any

const NOT_MEMBER_ERROR = '이 팀구매에 참여한 사장님만 설문을 작성할 수 있습니다'

interface SurveyQuestionRow {
  id: string
  position: number
  question_type: 'text' | 'link' | 'image'
  label: string
  required: boolean
}

async function loadMyMember(dealId: string, userId: string) {
  const { data, error } = await db
    .from('team_deal_members')
    .select('id, status')
    .eq('deal_id', dealId)
    .eq('user_id', userId)
    .maybeSingle()
  return { member: data as { id: string; status: string } | null, error }
}

async function loadQuestions(dealId: string): Promise<SurveyQuestionRow[]> {
  const { data } = await db
    .from('team_deal_survey_questions')
    .select('id, position, question_type, label, required')
    .eq('deal_id', dealId)
    .order('position', { ascending: true })
  return (data ?? []) as SurveyQuestionRow[]
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) return unauthorizedResponse()
  if (!isUuid(params.id)) {
    return NextResponse.json({ error: '팀구매를 찾을 수 없습니다' }, { status: 404 })
  }
  if (!isUuid(sessionUser.id)) {
    return NextResponse.json({ error: NOT_MEMBER_ERROR }, { status: 403 })
  }

  const { member, error: memberError } = await loadMyMember(params.id, sessionUser.id)
  if (memberError) {
    return NextResponse.json({ error: '참여 정보를 확인하지 못했습니다' }, { status: 500 })
  }
  if (!member) {
    return NextResponse.json({ error: NOT_MEMBER_ERROR }, { status: 403 })
  }

  const { data: deal } = await db.from('team_deals').select('id, title').eq('id', params.id).maybeSingle()
  if (!deal) {
    return NextResponse.json({ error: '팀구매를 찾을 수 없습니다' }, { status: 404 })
  }

  const questions = await loadQuestions(params.id)
  const { data: responseRows } = await db
    .from('team_deal_survey_responses')
    .select('question_id, value')
    .eq('member_id', member.id)
  const responses: Record<string, string> = {}
  for (const row of responseRows ?? []) responses[row.question_id] = row.value

  return NextResponse.json({
    deal,
    member_id: member.id,
    member_status: member.status,
    questions,
    responses,
  })
}

interface AnswerInput {
  question_id?: string
  value?: string
}

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function validateAnswers(
  answers: AnswerInput[],
  questionById: Map<string, SurveyQuestionRow>
): { error: string } | { rows: { question_id: string; value: string }[] } {
  const rows: { question_id: string; value: string }[] = []
  for (const answer of answers) {
    const question = answer.question_id ? questionById.get(answer.question_id) : undefined
    if (!question) {
      return { error: '설문 문항을 찾을 수 없습니다. 새로고침 후 다시 시도해주세요' }
    }
    const value = typeof answer.value === 'string' ? answer.value.trim() : ''
    if (value.length === 0) {
      return { error: `"${question.label}" 답변 내용을 입력해주세요` }
    }
    if (question.question_type === 'link' && !isValidHttpUrl(value)) {
      return { error: `"${question.label}" 답변은 http:// 또는 https://로 시작하는 주소여야 합니다` }
    }
    rows.push({ question_id: question.id, value })
  }
  return { rows }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) return unauthorizedResponse()
  if (!isUuid(params.id) || !isUuid(sessionUser.id)) {
    return NextResponse.json({ error: NOT_MEMBER_ERROR }, { status: 403 })
  }

  let body: { answers?: AnswerInput[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: '요청 본문이 올바른 JSON 형식이 아닙니다' }, { status: 400 })
  }
  if (!Array.isArray(body.answers) || body.answers.length === 0) {
    return NextResponse.json({ error: '저장할 답변이 없습니다' }, { status: 400 })
  }

  const { member, error: memberError } = await loadMyMember(params.id, sessionUser.id)
  if (memberError) {
    return NextResponse.json({ error: '참여 정보를 확인하지 못했습니다' }, { status: 500 })
  }
  if (!member) {
    return NextResponse.json({ error: NOT_MEMBER_ERROR }, { status: 403 })
  }
  if (member.status !== 'joined') {
    return NextResponse.json(
      { error: '환불되었거나 취소된 신청 건은 설문을 수정할 수 없습니다' },
      { status: 409 }
    )
  }

  const questions = await loadQuestions(params.id)
  const validation = validateAnswers(body.answers, new Map(questions.map(q => [q.id, q])))
  if ('error' in validation) {
    return NextResponse.json({ error: validation.error }, { status: 400 })
  }

  const now = new Date().toISOString()
  const { error: upsertError } = await db
    .from('team_deal_survey_responses')
    .upsert(
      validation.rows.map(row => ({ ...row, member_id: member.id, updated_at: now })),
      { onConflict: 'member_id,question_id' }
    )
  if (upsertError) {
    return NextResponse.json({ error: '답변 저장에 실패했습니다. 잠시 후 다시 시도해주세요' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, saved: validation.rows.length })
}
