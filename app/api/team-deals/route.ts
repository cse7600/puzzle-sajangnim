import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSessionUser, unauthorizedResponse } from '@/lib/auth-server'
import { refundFailedTeamDeals } from '@/lib/team-deal-refunds'
import { attachMyMembership } from '@/lib/team-deal-membership'

export const dynamic = 'force-dynamic'

const db = supabaseAdmin as any

const DEAL_LIST_COLUMNS =
  'id, title, description, category, original_price, deal_price, target_count, current_count, deadline, status, thumbnail_url, created_at'

export async function GET() {
  const sessionUser = await getSessionUser()
  if (!sessionUser) return unauthorizedResponse()

  await refundFailedTeamDeals()

  const { data, error } = await db
    .from('team_deals')
    .select(DEAL_LIST_COLUMNS)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: '팀구매 목록을 불러오지 못했습니다' }, { status: 500 })
  }

  const deals = await attachMyMembership(data ?? [], sessionUser.id)
  return NextResponse.json(deals)
}
