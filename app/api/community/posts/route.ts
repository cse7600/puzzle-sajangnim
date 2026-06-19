export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { supabaseAdmin, supabaseAdminCached } from '@/lib/supabase-admin'
import { DEMO_USER_ID } from '@/lib/auth'
import { awardPoints } from '@/lib/points'

const db = supabaseAdmin as any
const dbRead = supabaseAdminCached as any
const POST_POINTS = 500
const VALID_CATEGORIES = ['general', 'business', 'success', 'question']

// 금지어 모듈 캐시 — DB 쿼리를 매 POST마다 날리지 않음
let bannedWordsCache: string[] = []
let bannedWordsCacheAt = 0
const BANNED_WORDS_TTL = 5 * 60 * 1000

async function getBannedWords(): Promise<string[]> {
  if (Date.now() - bannedWordsCacheAt < BANNED_WORDS_TTL) return bannedWordsCache
  const { data } = await db.from('puzl_banned_words').select('word')
  bannedWordsCache = (data ?? []).map((row: { word: string }) => row.word)
  bannedWordsCacheAt = Date.now()
  return bannedWordsCache
}

async function findBannedWord(text: string): Promise<string | null> {
  const words = await getBannedWords()
  return words.find(word => text.includes(word)) ?? null
}

export async function GET(req: Request) {
  const category = new URL(req.url).searchParams.get('category')

  let query = dbRead
    .from('puzl_community_posts')
    .select('id,title,body,category,likes,user_id,created_at, puzl_community_comments(count)')
    .eq('is_filtered', false)
    .order('created_at', { ascending: false })
    .limit(30)

  if (category && VALID_CATEGORIES.includes(category)) query = query.eq('category', category)

  const { data: posts, error } = await query
  if (error || !posts) return NextResponse.json([])

  const userIds = [...new Set(posts.map((p: { user_id: string }) => p.user_id))]
  const { data: authors } = await dbRead
    .from('users')
    .select('id,profile_data')
    .in('id', userIds)

  const nameById = new Map<string, string>(
    (authors ?? []).map((u: { id: string; profile_data: { name?: string } | null }) => [
      u.id,
      u.profile_data?.name ?? '익명 사장님',
    ])
  )

  return NextResponse.json(
    posts.map((post: { id: string; user_id: string; puzl_community_comments?: { count: number }[] }) => ({
      ...post,
      author_name: nameById.get(post.user_id) ?? '익명 사장님',
      comment_count: post.puzl_community_comments?.[0]?.count ?? 0,
      puzl_community_comments: undefined,
    })),
    {
      headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' },
    }
  )
}

export async function POST(req: Request) {
  const { title, body, category = 'general' } = await req.json()
  if (!body || !body.trim()) {
    return NextResponse.json({ error: '내용을 입력해주세요.' }, { status: 400 })
  }

  const banned = await findBannedWord(`${title ?? ''} ${body}`)
  if (banned) {
    return NextResponse.json(
      { error: '등록이 불가합니다. 금지 단어가 포함되어 있습니다.', word: banned },
      { status: 409 }
    )
  }

  const cleanCategory = VALID_CATEGORIES.includes(category) ? category : 'general'
  const { data: post, error } = await db
    .from('puzl_community_posts')
    .insert({ user_id: DEMO_USER_ID, title: title?.trim() || null, body: body.trim(), category: cleanCategory })
    .select('id,title,body,category,likes,created_at')
    .single()

  if (error || !post) {
    return NextResponse.json({ error: '글 등록 중 오류가 발생했습니다.' }, { status: 500 })
  }

  const { awarded, capped } = await awardPoints({
    userId: DEMO_USER_ID,
    requestedAmount: POST_POINTS,
    type: 'community',
    description: '사장님 모임 글 작성',
    referenceId: post.id,
  })

  return NextResponse.json({ post, points_awarded: awarded, capped }, { status: 201 })
}
