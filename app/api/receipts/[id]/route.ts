import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSessionUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

const db = supabaseAdmin as any

interface RouteParams {
  params: { id: string }
}

interface PatchBody {
  status?: string
}

// 어드민 전용 — 영수증 승인/거절. 상태만 바꾼다(포인트 지급은 이 라우트 책임이 아니다).
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) return unauthorizedResponse()
  if (!sessionUser.isAdmin) return forbiddenResponse()

  let body: PatchBody
  try {
    body = (await req.json()) as PatchBody
  } catch {
    return NextResponse.json({ error: '요청 본문이 올바른 JSON 형식이 아닙니다' }, { status: 400 })
  }

  if (body.status !== 'approved' && body.status !== 'rejected') {
    return NextResponse.json({ error: 'status는 approved 또는 rejected여야 합니다' }, { status: 400 })
  }

  const { data, error } = await db
    .from('receipts')
    .update({ status: body.status })
    .eq('id', params.id)
    .select()
    .single()

  if (error || !data) {
    return NextResponse.json({ error: '영수증을 찾을 수 없습니다' }, { status: 404 })
  }
  return NextResponse.json(data)
}
