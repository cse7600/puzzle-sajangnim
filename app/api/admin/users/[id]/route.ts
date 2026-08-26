import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { usersReadOnlyAdmin, isUuid, resolveBusinessName } from '@/lib/admin-users'
import { getSessionUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-server'
import { PAYBACK_STATUSES, PaybackStatus } from '@/lib/hub'
import { validateBusinessInfoPatch, hasBusinessInfoField, BusinessInfoPatchBody } from '@/lib/business-info'

export const runtime = 'nodejs'

interface RouteParams {
  params: { id: string }
}

async function loadLatestVerification(userId: string) {
  const { data } = await supabaseAdmin
    .from('business_verifications')
    .select('*')
    .eq('user_id', userId)
    .order('submitted_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!data) return null

  let certificateUrl: string | null = null
  if (data.certificate_path) {
    const { data: signed } = await supabaseAdmin.storage
      .from('business-certificates')
      .createSignedUrl(data.certificate_path, 600)
    certificateUrl = signed?.signedUrl ?? null
  }
  let bankbookCopyUrl: string | null = null
  if (data.bankbook_copy_path) {
    const { data: signed } = await supabaseAdmin.storage
      .from('bank-accounts')
      .createSignedUrl(data.bankbook_copy_path, 600)
    bankbookCopyUrl = signed?.signedUrl ?? null
  }
  return { ...data, certificate_url: certificateUrl, bankbook_copy_url: bankbookCopyUrl }
}

// 5단계 status(draft/review_1/review_2/confirmed/paid) 전부를 버킷팅한다.
// 구버전(pending/confirmed/paid) 3버킷은 draft 3건을 전부 누락시켜 total이 과소 집계됐다.
async function loadPaybackSummary(userId: string) {
  const { data } = await supabaseAdmin.from('paybacks').select('*').eq('user_id', userId)
  const summary: Record<PaybackStatus, number> = { draft: 0, review_1: 0, review_2: 0, confirmed: 0, paid: 0 }
  for (const row of data ?? []) {
    if ((PAYBACK_STATUSES as readonly string[]).includes(row.status)) {
      summary[row.status as PaybackStatus] += row.amount
    }
  }
  const total = Object.values(summary).reduce((sum, amount) => sum + amount, 0)
  return { ...summary, total }
}

async function loadUserById(id: string) {
  return usersReadOnlyAdmin
    .from('users')
    .select('id, email, profile_data, created_at')
    .eq('id', id)
    .maybeSingle()
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) return unauthorizedResponse()
  if (!sessionUser.isAdmin) return forbiddenResponse()

  if (!isUuid(params.id)) {
    return NextResponse.json({ error: '잘못된 사용자 ID 형식입니다' }, { status: 400 })
  }

  const { data: user, error: userError } = await loadUserById(params.id)
  if (userError) {
    return NextResponse.json({ error: '사용자 정보를 불러오지 못했습니다' }, { status: 500 })
  }
  if (!user) {
    return NextResponse.json({ error: '사용자를 찾을 수 없습니다' }, { status: 404 })
  }

  const { data: adAccounts } = await supabaseAdmin
    .from('ad_accounts')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const [verification, paybacks] = await Promise.all([
    loadLatestVerification(user.id),
    loadPaybackSummary(user.id),
  ])

  const totalMonthlySpend = (adAccounts ?? []).reduce((sum, a) => sum + a.monthly_spend, 0)

  return NextResponse.json({
    user: { id: user.id, email: user.email, business_name: resolveBusinessName(user), created_at: user.created_at },
    verification,
    ad_accounts: adAccounts ?? [],
    paybacks,
    budget: { total_monthly_spend: totalMonthlySpend },
  })
}

interface DecisionBody {
  verification_id?: string
  decision?: string
  reviewer_note?: string
}

// 기존 동작 그대로 — 사업자 인증 승인/반려 결정.
async function handleDecisionPatch(userId: string, body: DecisionBody): Promise<NextResponse> {
  const { verification_id, decision, reviewer_note } = body

  if (!verification_id || (decision !== 'approved' && decision !== 'rejected')) {
    return NextResponse.json({ error: '승인 또는 반려 결정과 verification_id가 필요합니다' }, { status: 400 })
  }
  if (decision === 'rejected' && !reviewer_note?.trim()) {
    return NextResponse.json({ error: '반려 사유를 입력해주세요' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('business_verifications')
    .update({
      status: decision,
      reviewer_note: decision === 'rejected' ? (reviewer_note as string).trim() : null,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', verification_id)
    .eq('user_id', userId)
    .select()
    .single()

  if (error || !data) {
    return NextResponse.json({ error: '심사 처리에 실패했습니다' }, { status: 500 })
  }
  return NextResponse.json(data)
}

// 어드민이 사용자 대신 세금계산서 이메일/사업장 주소/네이버 플레이스 URL을 수정.
// status는 절대 건드리지 않는다 — C6의 validateBusinessInfoPatch를 그대로 공유한다.
async function handleBusinessInfoPatch(userId: string, body: BusinessInfoPatchBody): Promise<NextResponse> {
  const { data: latest, error: latestError } = await supabaseAdmin
    .from('business_verifications')
    .select('id')
    .eq('user_id', userId)
    .order('submitted_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (latestError) {
    return NextResponse.json({ error: '사업자 인증 정보를 불러오지 못했습니다' }, { status: 500 })
  }
  if (!latest) {
    return NextResponse.json({ error: '등록된 사업자 인증 정보가 없습니다' }, { status: 404 })
  }

  const { update, error: validationError } = validateBusinessInfoPatch(body)
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 })
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: '변경할 값이 없습니다' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('business_verifications')
    .update(update)
    .eq('id', latest.id)
    .select('tax_invoice_email, business_address, naver_place_url, bank_name, account_number, account_holder')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: '사업자 부가 정보 수정에 실패했습니다' }, { status: 500 })
  }
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) return unauthorizedResponse()
  if (!sessionUser.isAdmin) return forbiddenResponse()

  if (!isUuid(params.id)) {
    return NextResponse.json({ error: '잘못된 사용자 ID 형식입니다' }, { status: 400 })
  }

  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: '요청 본문이 올바른 JSON 형식이 아닙니다' }, { status: 400 })
  }

  const hasDecision = 'decision' in body
  const hasInfoField = hasBusinessInfoField(body)
  if (hasDecision && hasInfoField) {
    return NextResponse.json(
      { error: 'decision과 부가 정보 필드는 함께 요청할 수 없습니다' },
      { status: 400 }
    )
  }

  if (hasDecision) {
    return handleDecisionPatch(params.id, body as DecisionBody)
  }
  return handleBusinessInfoPatch(params.id, body as BusinessInfoPatchBody)
}
