export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSessionUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-server'
import { isUuid } from '@/lib/admin-users'
import { CAMPAIGN_EDITABLE_STATUSES } from '@/lib/experience-campaigns'

const db = supabaseAdmin as any

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) return unauthorizedResponse()
  if (!isUuid(params.id)) {
    return NextResponse.json({ error: '캠페인을 찾을 수 없습니다' }, { status: 404 })
  }

  const { data: campaign, error: loadError } = await db
    .from('experience_campaigns')
    .select('id, user_id, status')
    .eq('id', params.id)
    .maybeSingle()

  if (loadError) {
    return NextResponse.json({ error: '세팅 요청 처리에 실패했습니다' }, { status: 500 })
  }
  if (!campaign) {
    return NextResponse.json({ error: '캠페인을 찾을 수 없습니다' }, { status: 404 })
  }
  if (campaign.user_id !== sessionUser.id) return forbiddenResponse()

  if (!CAMPAIGN_EDITABLE_STATUSES.includes(campaign.status)) {
    return NextResponse.json(
      { error: '지금은 세팅 요청을 보낼 수 없는 상태입니다' },
      { status: 400 }
    )
  }

  const { data, error } = await db
    .from('experience_campaigns')
    .update({ setup_mode: 'requested', status: 'pending_setup', updated_at: new Date().toISOString() })
    .eq('id', params.id)
    .select('*')
    .single()

  if (error) {
    return NextResponse.json({ error: '세팅 요청 처리에 실패했습니다' }, { status: 500 })
  }

  return NextResponse.json(data)
}
