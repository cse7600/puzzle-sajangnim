import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSessionUser, unauthorizedResponse } from '@/lib/auth-server'

const BLOCK_TYPES = ['text', 'link', 'image', 'program_collection', 'collection', 'calendar', 'divider'] as const

const db = supabaseAdmin as any

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) return unauthorizedResponse()

  const body = await req.json().catch(() => ({}))
  const type = body.type as string
  if (!BLOCK_TYPES.includes(type as typeof BLOCK_TYPES[number])) {
    return NextResponse.json({ error: '올바르지 않은 블록 타입입니다' }, { status: 400 })
  }

  await db
    .from('link_pages')
    .upsert({ user_id: sessionUser.id }, { onConflict: 'user_id', ignoreDuplicates: true })

  const { data: page } = await db
    .from('link_pages')
    .select('id')
    .eq('user_id', sessionUser.id)
    .single()
  if (!page) {
    return NextResponse.json({ error: '페이지를 찾을 수 없습니다' }, { status: 500 })
  }

  const payload = body.payload ?? {}

  const { data: last } = await db
    .from('link_blocks')
    .select('position')
    .eq('link_page_id', page.id)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle()
  const nextPosition = (last?.position ?? -1) + 1

  const { data: block, error: blockErr } = await db
    .from('link_blocks')
    .insert({
      link_page_id: page.id,
      type,
      payload,
      position: nextPosition,
      is_pinned: body.is_pinned === true,
      is_active: body.is_active !== false,
    })
    .select('*')
    .single()

  if (blockErr || !block) {
    console.error('[link-page blocks POST] insert error:', blockErr?.message)
    return NextResponse.json({ error: '블록 생성에 실패했습니다' }, { status: 500 })
  }

  return NextResponse.json({ block }, { status: 201 })
}
