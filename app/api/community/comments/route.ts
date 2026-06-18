export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { DEMO_USER_ID } from '@/lib/auth'
import { awardPoints } from '@/lib/points'

const db = supabaseAdmin as any
const COMMENT_POINTS = 100

async function findBannedWord(text: string): Promise<string | null> {
  const { data } = await db.from('puzl_banned_words').select('word')
  const words: string[] = (data ?? []).map((row: { word: string }) => row.word)
  return words.find(word => text.includes(word)) ?? null
}

export async function GET(req: Request) {
  const postId = new URL(req.url).searchParams.get('post_id')
  if (!postId) return NextResponse.json({ error: 'post_id가 필요합니다.' }, { status: 400 })

  const { data, error } = await db
    .from('puzl_community_comments')
    .select('id,post_id,body,created_at')
    .eq('post_id', postId)
    .eq('is_filtered', false)
    .order('created_at', { ascending: true })

  if (error || !data) return NextResponse.json([])
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const { post_id, body } = await req.json()
  if (!post_id || !body || !body.trim()) {
    return NextResponse.json({ error: '댓글 내용을 입력해주세요.' }, { status: 400 })
  }

  const banned = await findBannedWord(body)
  if (banned) {
    return NextResponse.json(
      { error: '등록이 불가합니다. 금지 단어가 포함되어 있습니다.', word: banned },
      { status: 409 }
    )
  }

  const { data: comment, error } = await db
    .from('puzl_community_comments')
    .insert({ post_id, user_id: DEMO_USER_ID, body: body.trim() })
    .select('id,post_id,body,created_at')
    .single()

  if (error || !comment) {
    return NextResponse.json({ error: '댓글 등록 중 오류가 발생했습니다.' }, { status: 500 })
  }

  const { awarded } = await awardPoints({
    userId: DEMO_USER_ID,
    requestedAmount: COMMENT_POINTS,
    type: 'community',
    description: '댓글 작성',
    referenceId: comment.id,
  })

  return NextResponse.json({ comment, points_awarded: awarded }, { status: 201 })
}
