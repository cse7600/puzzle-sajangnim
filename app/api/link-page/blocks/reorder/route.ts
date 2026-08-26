import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSessionUser, unauthorizedResponse } from '@/lib/auth-server'

const db = supabaseAdmin as any

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) return unauthorizedResponse()

  const body = await req.json().catch(() => ({}))
  const blockIds = body.block_ids
  if (!Array.isArray(blockIds) || blockIds.some((x: unknown) => typeof x !== 'string')) {
    return NextResponse.json({ error: 'block_ids 배열이 필요합니다' }, { status: 400 })
  }

  const { data: page } = await db
    .from('link_pages')
    .select('id')
    .eq('user_id', sessionUser.id)
    .single()
  if (!page) {
    return NextResponse.json({ error: '페이지를 찾을 수 없습니다' }, { status: 404 })
  }

  for (let i = 0; i < blockIds.length; i++) {
    const { error } = await db
      .from('link_blocks')
      .update({ position: i, updated_at: new Date().toISOString() })
      .eq('id', blockIds[i])
      .eq('link_page_id', page.id)
    if (error) {
      console.error('[link-page blocks reorder] update error:', error.message)
    }
  }

  return NextResponse.json({ success: true })
}
