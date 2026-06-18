export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { DEMO_USER_ID } from '@/lib/auth'
import { awardPoints } from '@/lib/points'

const QUESTION_DAILY_LIMIT = 1000
const db = supabaseAdmin as any

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category')
  const tab = searchParams.get('tab') ?? 'all'

  let query = db
    .from('knowledge_questions')
    .select('*, knowledge_answers(count)')
    .order('created_at', { ascending: false })
    .limit(20)

  if (category && category !== '전체') query = query.eq('category', category)
  if (tab === 'mine') query = query.eq('user_id', DEMO_USER_ID)

  const { data, error } = await query
  if (error) return NextResponse.json([], { status: 200 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: Request) {
  const body = await req.json()
  const { category, title, body: questionBody, reward_points = 0 } = body

  if (!category || !title || !questionBody) {
    return NextResponse.json({ error: '필수 항목을 입력해주세요' }, { status: 400 })
  }

  const { data: question, error } = await db
    .from('knowledge_questions')
    .insert({ user_id: DEMO_USER_ID, category, title, body: questionBody, reward_points })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const pointsEarned = await grantQuestionPoints(question.id)
  return NextResponse.json({ ...(question as object), points_earned: pointsEarned }, { status: 201 })
}

// 하루 1회 1000P (knowledge_daily_points로 1일 1회 제한 + 통합 point_transactions 기록)
async function grantQuestionPoints(questionId: string): Promise<number> {
  const today = new Date().toISOString().split('T')[0]
  const { data: daily } = await db
    .from('knowledge_daily_points')
    .select('question_points_earned')
    .eq('user_id', DEMO_USER_ID)
    .eq('date', today)
    .maybeSingle()

  if (daily && daily.question_points_earned >= QUESTION_DAILY_LIMIT) return 0

  await db.from('knowledge_daily_points').upsert(
    { user_id: DEMO_USER_ID, date: today, question_points_earned: QUESTION_DAILY_LIMIT },
    { onConflict: 'user_id,date' }
  )
  const { awarded } = await awardPoints({
    userId: DEMO_USER_ID,
    requestedAmount: QUESTION_DAILY_LIMIT,
    type: 'knowledge_question',
    description: '지식 거래소 질문 작성 포인트',
    referenceId: questionId,
  })
  return awarded
}
