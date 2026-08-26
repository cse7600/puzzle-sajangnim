import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSessionUser, unauthorizedResponse } from '@/lib/auth-server'
import { validateHandle } from '@/lib/link-handle'

export const dynamic = 'force-dynamic'

const db = supabaseAdmin as any

export async function GET() {
  const sessionUser = await getSessionUser()
  if (!sessionUser) return unauthorizedResponse()

  await db
    .from('link_pages')
    .upsert({ user_id: sessionUser.id }, { onConflict: 'user_id', ignoreDuplicates: true })

  const { data: page } = await db
    .from('link_pages')
    .select('*')
    .eq('user_id', sessionUser.id)
    .single()

  if (!page) {
    return NextResponse.json({ error: '페이지를 불러올 수 없습니다' }, { status: 500 })
  }

  const { data: blocks } = await db
    .from('link_blocks')
    .select('*')
    .eq('link_page_id', page.id)
    .order('is_pinned', { ascending: false })
    .order('position', { ascending: true })

  return NextResponse.json({
    page,
    blocks: blocks || [],
  })
}

export async function PUT(req: NextRequest) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) return unauthorizedResponse()

  const body = await req.json().catch(() => ({}))

  if (typeof body.link_handle === 'string') {
    const { data: currentPage } = await db
      .from('link_pages')
      .select('link_handle')
      .eq('user_id', sessionUser.id)
      .maybeSingle()

    if (body.link_handle.trim() !== (currentPage?.link_handle || '')) {
      const validation = validateHandle(body.link_handle)
      if (!validation.ok) {
        return NextResponse.json({ error: validation.error }, { status: 400 })
      }
      const handle = validation.handle

      const { data: existing } = await db
        .from('link_pages')
        .select('id')
        .ilike('link_handle', handle)
        .neq('user_id', sessionUser.id)
        .limit(1)
      if (existing && existing.length > 0) {
        return NextResponse.json({ error: '이미 사용 중인 주소입니다' }, { status: 409 })
      }

      const { error: handleErr } = await db
        .from('link_pages')
        .update({ link_handle: handle, updated_at: new Date().toISOString() })
        .eq('user_id', sessionUser.id)
      if (handleErr) {
        if (handleErr.code === '23505') {
          return NextResponse.json({ error: '이미 사용 중인 주소입니다' }, { status: 409 })
        }
        return NextResponse.json({ error: '주소 저장에 실패했습니다' }, { status: 500 })
      }
    }
  }

  const pageUpdate: Record<string, unknown> = {}
  const allowed = [
    'display_name', 'bio', 'avatar_url', 'sns_links', 'layout_preset',
    'theme_preset', 'background', 'font_preset', 'block_style', 'notice_text',
    'proposal_enabled', 'is_published',
  ]
  for (const key of allowed) {
    if (key in body) pageUpdate[key] = body[key]
  }

  if (Object.keys(pageUpdate).length > 0) {
    pageUpdate.updated_at = new Date().toISOString()
    const { error: pageErr } = await db
      .from('link_pages')
      .upsert({ user_id: sessionUser.id, ...pageUpdate }, { onConflict: 'user_id' })
    if (pageErr) {
      return NextResponse.json({ error: '페이지 저장에 실패했습니다' }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true })
}
