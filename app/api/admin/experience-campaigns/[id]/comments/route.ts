export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSessionUser, unauthorizedResponse, forbiddenResponse, actorUserId } from '@/lib/auth-server'
import { isUuid } from '@/lib/admin-users'

const db = supabaseAdmin as any

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) return unauthorizedResponse()
  if (!sessionUser.isAdmin) return forbiddenResponse()
  if (!isUuid(params.id)) {
    return NextResponse.json({ error: '캠페인을 찾을 수 없습니다' }, { status: 404 })
  }

  const { data: campaign } = await db
    .from('experience_campaigns')
    .select('id')
    .eq('id', params.id)
    .maybeSingle()
  if (!campaign) {
    return NextResponse.json({ error: '캠페인을 찾을 수 없습니다' }, { status: 404 })
  }

  const body = await req.json().catch(() => ({}))
  const commentBody = typeof body.body === 'string' ? body.body.trim() : ''
  if (!commentBody) {
    return NextResponse.json({ error: '코멘트 내용을 입력해주세요' }, { status: 400 })
  }

  const { data, error } = await db
    .from('experience_campaign_comments')
    .insert({
      campaign_id: params.id,
      author_role: 'admin',
      author_id: actorUserId(sessionUser),
      body: commentBody,
    })
    .select('*')
    .single()

  if (error) {
    return NextResponse.json({ error: '코멘트 등록에 실패했습니다' }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
