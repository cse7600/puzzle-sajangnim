export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSessionUser, unauthorizedResponse, forbiddenResponse, actorUserId } from '@/lib/auth-server'
import { isUuid } from '@/lib/admin-users'

const db = supabaseAdmin as any

async function loadOwnedCampaignId(campaignId: string, userId: string) {
  const { data, error } = await db
    .from('experience_campaigns')
    .select('id, user_id')
    .eq('id', campaignId)
    .maybeSingle()
  return { campaign: data as { id: string; user_id: string } | null, error }
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) return unauthorizedResponse()
  if (!isUuid(params.id)) {
    return NextResponse.json({ error: '캠페인을 찾을 수 없습니다' }, { status: 404 })
  }

  const { campaign, error: loadError } = await loadOwnedCampaignId(params.id, sessionUser.id)
  if (loadError) {
    return NextResponse.json({ error: '코멘트를 불러오지 못했습니다' }, { status: 500 })
  }
  if (!campaign) {
    return NextResponse.json({ error: '캠페인을 찾을 수 없습니다' }, { status: 404 })
  }
  if (campaign.user_id !== sessionUser.id) return forbiddenResponse()

  const { data, error } = await db
    .from('experience_campaign_comments')
    .select('*')
    .eq('campaign_id', params.id)
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: '코멘트를 불러오지 못했습니다' }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) return unauthorizedResponse()
  if (!isUuid(params.id)) {
    return NextResponse.json({ error: '캠페인을 찾을 수 없습니다' }, { status: 404 })
  }

  const { campaign, error: loadError } = await loadOwnedCampaignId(params.id, sessionUser.id)
  if (loadError) {
    return NextResponse.json({ error: '코멘트를 등록하지 못했습니다' }, { status: 500 })
  }
  if (!campaign) {
    return NextResponse.json({ error: '캠페인을 찾을 수 없습니다' }, { status: 404 })
  }
  if (campaign.user_id !== sessionUser.id) return forbiddenResponse()

  const body = await req.json().catch(() => ({}))
  const commentBody = typeof body.body === 'string' ? body.body.trim() : ''
  if (!commentBody) {
    return NextResponse.json({ error: '코멘트 내용을 입력해주세요' }, { status: 400 })
  }

  const { data, error } = await db
    .from('experience_campaign_comments')
    .insert({
      campaign_id: params.id,
      author_role: 'user',
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
