export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSessionUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-server'
import { isUuid } from '@/lib/admin-users'
import { parseQuestionSet, saveQuestionSet, listQuestions } from '@/lib/admin-team-deal-questions'

const db = supabaseAdmin as any

async function requireAdmin(): Promise<NextResponse | null> {
  const sessionUser = await getSessionUser()
  if (!sessionUser) return unauthorizedResponse()
  if (!sessionUser.isAdmin) return forbiddenResponse()
  return null
}

async function fetchDealStatus(dealId: string): Promise<string | null> {
  const { data } = await db.from('team_deals').select('id, status').eq('id', dealId).maybeSingle()
  return data?.status ?? null
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const gate = await requireAdmin()
  if (gate) return gate
  if (!isUuid(params.id)) {
    return NextResponse.json({ error: '팀구매를 찾을 수 없습니다' }, { status: 404 })
  }
  const status = await fetchDealStatus(params.id)
  if (!status) {
    return NextResponse.json({ error: '팀구매를 찾을 수 없습니다' }, { status: 404 })
  }
  return NextResponse.json({ questions: await listQuestions(params.id) })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const gate = await requireAdmin()
  if (gate) return gate
  if (!isUuid(params.id)) {
    return NextResponse.json({ error: '팀구매를 찾을 수 없습니다' }, { status: 404 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: '요청 본문이 올바른 JSON 형식이 아닙니다' }, { status: 400 })
  }
  const parsed = parseQuestionSet((body as { questions?: unknown })?.questions)
  if ('error' in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }

  const status = await fetchDealStatus(params.id)
  if (!status) {
    return NextResponse.json({ error: '팀구매를 찾을 수 없습니다' }, { status: 404 })
  }
  // 오픈 전제조건 불변식: 모집중(active) 딜에서 문항을 전부 비울 수 없다.
  // draft → active 자동 전환은 딜 편집 저장 경로(PATCH)로 일원화 — 여기서는 하지 않는다.
  if (status === 'active' && parsed.questions.length === 0) {
    return NextResponse.json(
      { error: '모집중인 딜의 요청서 문항은 전부 삭제할 수 없습니다. 딜을 취소하거나 문항을 남겨주세요' },
      { status: 400 }
    )
  }

  const saveError = await saveQuestionSet(params.id, parsed.questions)
  if (saveError) {
    return NextResponse.json({ error: saveError }, { status: 500 })
  }
  return NextResponse.json({ questions: await listQuestions(params.id) })
}
