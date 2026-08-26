import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { resolveHandlePage } from '@/lib/link-page-public'

const db = supabaseAdmin as any

export async function POST(
  req: NextRequest,
  { params }: { params: { handle: string } },
) {
  try {
    const { handle } = params
    const body = await req.json().catch(() => ({}))
    const blockId = typeof body.block_id === 'string' ? body.block_id : null

    const resolved = await resolveHandlePage(supabaseAdmin, handle)
    if (!resolved) {
      return NextResponse.json({ ok: true })
    }

    let effectiveBlockId: string | null = null
    if (blockId) {
      const { data: block } = await db
        .from('link_blocks')
        .select('id, type')
        .eq('id', blockId)
        .eq('link_page_id', resolved.pageId)
        .maybeSingle()
      if (!block) return NextResponse.json({ ok: true })
      effectiveBlockId = blockId
    }

    const { error: rpcErr } = await db.rpc('increment_link_page_stat', {
      p_link_page_id: resolved.pageId,
      p_block_id: effectiveBlockId,
    })
    if (rpcErr) console.error('[link-page click] rpc error:', rpcErr.message)

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[link-page click] error:', error)
    return NextResponse.json({ ok: true })
  }
}
