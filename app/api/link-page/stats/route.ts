import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSessionUser, unauthorizedResponse } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

const db = supabaseAdmin as any

export async function GET() {
  const sessionUser = await getSessionUser()
  if (!sessionUser) return unauthorizedResponse()

  const { data: page } = await db
    .from('link_pages')
    .select('id')
    .eq('user_id', sessionUser.id)
    .maybeSingle()

  if (!page) {
    return NextResponse.json({ views: { realtime: 0, today: 0, total: 0 }, blocks: [] })
  }

  const todayKst = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' })

  const [{ data: stats }, { data: blocks }] = await Promise.all([
    db
      .from('link_daily_stats')
      .select('block_id, date, views, clicks')
      .eq('link_page_id', page.id),
    db
      .from('link_blocks')
      .select('id, type')
      .eq('link_page_id', page.id),
  ])

  const rows = stats || []
  const blockList = blocks || []

  let totalViews = 0
  let todayViews = 0
  const clicksByBlock = new Map<string, number>()

  for (const r of rows) {
    if (r.block_id === null) {
      totalViews += r.views || 0
      if (r.date === todayKst) todayViews += r.views || 0
    } else {
      clicksByBlock.set(r.block_id, (clicksByBlock.get(r.block_id) || 0) + (r.clicks || 0))
    }
  }

  const blockStats = blockList.map((b: { id: string; type: string }) => ({
    block_id: b.id,
    type: b.type,
    clicks: clicksByBlock.get(b.id) || 0,
  }))

  return NextResponse.json({
    views: { realtime: todayViews, today: todayViews, total: totalViews },
    blocks: blockStats,
  })
}
