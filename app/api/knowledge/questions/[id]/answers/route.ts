export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { DEMO_USER_ID } from '@/lib/auth'
import { awardPoints } from '@/lib/points'

const ANSWER_DAILY_LIMIT = 1000
const db = supabaseAdmin as any

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { data, error } = await db
    .from('knowledge_answers')
    .select('*')
    .eq('question_id', params.id)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json([], { status: 200 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { body } = await req.json()
  if (!body) return NextResponse.json({ error: '답변 내용을 입력해주세요' }, { status: 400 })

  const { data: answer, error } = await db
    .from('knowledge_answers')
    .insert({ question_id: params.id, user_id: DEMO_USER_ID, body })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const pointsEarned = await grantAnswerPoints(answer.id)
  return NextResponse.json({ ...(answer as object), points_earned: pointsEarned }, { status: 201 })
}

// 하루 1회 1000P (knowledge_daily_points 1일 제한 + 통합 point_transactions 기록)
async function grantAnswerPoints(answerId: string): Promise<number> {
  const today = new Date().toISOString().split('T')[0]
  const { data: daily } = await db
    .from('knowledge_daily_points')
    .select('answer_points_earned')
    .eq('user_id', DEMO_USER_ID)
    .eq('date', today)
    .maybeSingle()

  if (daily && daily.answer_points_earned >= ANSWER_DAILY_LIMIT) return 0

  await db.from('knowledge_daily_points').upsert(
    { user_id: DEMO_USER_ID, date: today, answer_points_earned: ANSWER_DAILY_LIMIT },
    { onConflict: 'user_id,date' }
  )
  const { awarded } = await awardPoints({
    userId: DEMO_USER_ID,
    requestedAmount: ANSWER_DAILY_LIMIT,
    type: 'knowledge_answer',
    description: '지식 거래소 답변 작성 포인트',
    referenceId: answerId,
  })
  return awarded
}
