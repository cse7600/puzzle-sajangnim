import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSessionUser, unauthorizedResponse } from '@/lib/auth-server'

const db = supabaseAdmin as any

const VALID_STATUSES = ['new', 'read', 'replied', 'archived'] as const

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) return unauthorizedResponse()

  const { id } = params
  const body = await req.json().catch(() => ({}))
  const status = body.status as string

  if (!VALID_STATUSES.includes(status as typeof VALID_STATUSES[number])) {
    return NextResponse.json({ error: '올바르지 않은 상태 값입니다' }, { status: 400 })
  }

  const { data: proposal } = await db
    .from('business_proposals')
    .select('id, user_id')
    .eq('id', id)
    .maybeSingle()

  if (!proposal) {
    return NextResponse.json({ error: '제안을 찾을 수 없습니다' }, { status: 404 })
  }
  if (proposal.user_id !== sessionUser.id) {
    return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 })
  }

  const { error: updErr } = await db
    .from('business_proposals')
    .update({ status })
    .eq('id', id)

  if (updErr) {
    console.error('[proposals status PATCH] update error:', updErr.message)
    return NextResponse.json({ error: '상태 변경에 실패했습니다' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
