import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSessionUser, unauthorizedResponse } from '@/lib/auth-server'
import { attachMyMembership } from '@/lib/team-deal-membership'
import { isUuid } from '@/lib/admin-users'

export const dynamic = 'force-dynamic'

const db = supabaseAdmin as any

const DEAL_DETAIL_COLUMNS =
  'id, title, description, category, original_price, deal_price, target_count, current_count, deadline, status, thumbnail_url, content_html, created_at'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) return unauthorizedResponse()
  if (!isUuid(params.id)) {
    return NextResponse.json({ error: '팀구매를 찾을 수 없습니다' }, { status: 404 })
  }

  const { data, error } = await db
    .from('team_deals')
    .select(DEAL_DETAIL_COLUMNS)
    .eq('id', params.id)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: '팀구매 정보를 불러오지 못했습니다' }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ error: '팀구매를 찾을 수 없습니다' }, { status: 404 })
  }

  const [deal] = await attachMyMembership([data], sessionUser.id)
  return NextResponse.json(deal)
}
