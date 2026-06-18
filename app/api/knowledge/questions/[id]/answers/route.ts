import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const DEMO_USER_ID = 'demo-user-001'
const ANSWER_DAILY_LIMIT = 1000
const db = supabase as any

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

  const today = new Date().toISOString().split('T')[0]
  const { data: daily } = await db
    .from('knowledge_daily_points')
    .select('answer_points_earned')
    .eq('user_id', DEMO_USER_ID)
    .eq('date', today)
    .single()

  let pointsEarned = 0
  if (!daily || daily.answer_points_earned < ANSWER_DAILY_LIMIT) {
    pointsEarned = ANSWER_DAILY_LIMIT
    await db.from('knowledge_daily_points').upsert(
      { user_id: DEMO_USER_ID, date: today, answer_points_earned: ANSWER_DAILY_LIMIT },
      { onConflict: 'user_id,date' }
    )
    await db.from('points').insert({
      user_id: DEMO_USER_ID,
      amount: pointsEarned,
      source_type: 'bonus',
      description: '지식 거래소 답변 작성 포인트',
    })
  }

  return NextResponse.json({ ...(answer as object), points_earned: pointsEarned }, { status: 201 })
}
