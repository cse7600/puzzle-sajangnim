import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSessionUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-server'
import { awardPoints } from '@/lib/points'

export const dynamic = 'force-dynamic'

const db = supabaseAdmin as any

interface RouteParams {
  params: { id: string }
}

interface PatchBody {
  status?: string
}

// pending 상태인 건만 승인/거절 대상으로 삼는다 — 이미 approved/rejected인 건은
// 조건부 UPDATE가 0행을 반환하므로 재호출(버튼 연타 등)해도 포인트가 중복 지급되지 않는다.
async function applyReceiptStatus(id: string, status: 'approved' | 'rejected') {
  return db
    .from('receipts')
    .update({ status })
    .eq('id', id)
    .eq('status', 'pending')
    .select('id, user_id, store_name, points_earned')
    .maybeSingle()
}

async function awardReceiptPoints(receipt: { id: string; user_id: string; store_name: string | null; points_earned: number }) {
  if (!receipt.points_earned || receipt.points_earned <= 0) return
  await awardPoints({
    userId: receipt.user_id,
    requestedAmount: receipt.points_earned,
    type: 'receipt',
    description: `영수증 적립 · ${receipt.store_name ?? '미상 매장'}`,
    referenceId: receipt.id,
  })
}

// 어드민 전용 — 영수증 승인/거절. 승인 시 이 라우트가 직접 포인트를 지급한다.
// 종결 상태(approved/rejected)는 불변 — 번복하려면 신규 영수증 제출이 원칙(원장 append-only).
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

  const { data, error } = await applyReceiptStatus(params.id, body.status)

  if (error) {
    return NextResponse.json({ error: '영수증 상태 변경에 실패했습니다' }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ error: '대기 중인 영수증을 찾을 수 없습니다 (이미 처리됐을 수 있습니다)' }, { status: 404 })
  }

  if (body.status === 'approved') {
    await awardReceiptPoints(data)
  }
  return NextResponse.json({ ...data, status: body.status })
}
