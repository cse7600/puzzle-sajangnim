export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSessionUser, unauthorizedResponse } from '@/lib/auth-server'
import { awardPoints } from '@/lib/points'

const ANSWER_DAILY_LIMIT = 1000
const ANSWER_MIN = 55
const db = supabaseAdmin as any

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) return unauthorizedResponse()

  const { data, error } = await db
    .from('knowledge_answers')
    .select('*')
    .eq('question_id', params.id)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json([], { status: 200 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) return unauthorizedResponse()

  const { body } = await req.json()
  if (!body) return NextResponse.json({ error: '답변 내용을 입력해주세요' }, { status: 400 })
  if (String(body).trim().length < ANSWER_MIN) {
    return NextResponse.json({ error: `답변은 최소 ${ANSWER_MIN}자 이상 입력해주세요` }, { status: 400 })
  }

  const { data: answer, error } = await db
    .from('knowledge_answers')
    .insert({ question_id: params.id, user_id: sessionUser.id, body })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const pointsEarned = await grantAnswerPoints(sessionUser.id, answer.id)
  return NextResponse.json({ ...(answer as object), points_earned: pointsEarned }, { status: 201 })
}

// 하루 1회 1000P (knowledge_daily_points 1일 제한 + 통합 point_transactions 기록)
async function grantAnswerPoints(userId: string, answerId: string): Promise<number> {
  const today = new Date().toISOString().split('T')[0]
  const { data: daily } = await db
    .from('knowledge_daily_points')
    .select('answer_points_earned')
    .eq('user_id', userId)
    .eq('date', today)
    .maybeSingle()

  if (daily && daily.answer_points_earned >= ANSWER_DAILY_LIMIT) return 0

  await db.from('knowledge_daily_points').upsert(
    { user_id: userId, date: today, answer_points_earned: ANSWER_DAILY_LIMIT },
    { onConflict: 'user_id,date' }
  )
  const { awarded } = await awardPoints({
    userId,
    requestedAmount: ANSWER_DAILY_LIMIT,
    type: 'knowledge_answer',
    description: '오호라 답변 작성 포인트',
    referenceId: answerId,
  })
  return awarded
}
