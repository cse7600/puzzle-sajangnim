import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSessionUser, unauthorizedResponse } from '@/lib/auth-server'

const db = supabaseAdmin as any

async function verifyBlockOwnership(blockId: string, userId: string): Promise<boolean> {
  const { data: block } = await db
    .from('link_blocks')
    .select('id, link_page_id')
    .eq('id', blockId)
    .maybeSingle()
  if (!block) return false

  const { data: page } = await db
    .from('link_pages')
    .select('id')
    .eq('id', block.link_page_id)
    .eq('user_id', userId)
    .maybeSingle()
  return !!page
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { blockId: string } },
) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) return unauthorizedResponse()

  const { blockId } = params
  const owned = await verifyBlockOwnership(blockId, sessionUser.id)
  if (!owned) {
    return NextResponse.json({ error: '블록을 찾을 수 없습니다' }, { status: 404 })
  }

  const body = await req.json().catch(() => ({}))
  const update: Record<string, unknown> = {}
  for (const key of ['payload', 'is_active', 'is_pinned', 'is_archived'] as const) {
    if (key in body) update[key] = body[key]
  }

  if (Object.keys(update).length > 0) {
    update.updated_at = new Date().toISOString()
    const { error: updErr } = await db
      .from('link_blocks')
      .update(update)
      .eq('id', blockId)
    if (updErr) {
      console.error('[link-page blocks PATCH] update error:', updErr.message)
      return NextResponse.json({ error: '블록 수정에 실패했습니다' }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { blockId: string } },
) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) return unauthorizedResponse()

  const { blockId } = params
  const owned = await verifyBlockOwnership(blockId, sessionUser.id)
  if (!owned) {
    return NextResponse.json({ error: '블록을 찾을 수 없습니다' }, { status: 404 })
  }

  const { error: delErr } = await db
    .from('link_blocks')
    .delete()
    .eq('id', blockId)
  if (delErr) {
    console.error('[link-page blocks DELETE] error:', delErr.message)
    return NextResponse.json({ error: '블록 삭제에 실패했습니다' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
