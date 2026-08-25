import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { usersReadOnlyAdmin, isUuid, resolveBusinessName } from '@/lib/admin-users'

export const runtime = 'nodejs'

interface RouteParams {
  params: { id: string }
}

const PAYBACK_STATUSES = ['pending', 'confirmed', 'paid'] as const
type PaybackStatus = (typeof PAYBACK_STATUSES)[number]

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
  return { ...data, certificate_url: certificateUrl }
}

async function loadPaybackSummary(userId: string) {
  const { data } = await supabaseAdmin.from('paybacks').select('*').eq('user_id', userId)
  const summary: Record<PaybackStatus, number> = { pending: 0, confirmed: 0, paid: 0 }
  for (const row of data ?? []) {
    if ((PAYBACK_STATUSES as readonly string[]).includes(row.status)) {
      summary[row.status as PaybackStatus] += row.amount
    }
  }
  return { ...summary, total: summary.pending + summary.confirmed + summary.paid }
}

async function loadUserById(id: string) {
  return usersReadOnlyAdmin
    .from('users')
    .select('id, email, profile_data, created_at')
    .eq('id', id)
    .maybeSingle()
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
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

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  if (!isUuid(params.id)) {
    return NextResponse.json({ error: '잘못된 사용자 ID 형식입니다' }, { status: 400 })
  }

  let body: DecisionBody
  try {
    body = (await req.json()) as DecisionBody
  } catch {
    return NextResponse.json({ error: '요청 본문이 올바른 JSON 형식이 아닙니다' }, { status: 400 })
  }
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
    .eq('user_id', params.id)
    .select()
    .single()

  if (error || !data) {
    return NextResponse.json({ error: '심사 처리에 실패했습니다' }, { status: 500 })
  }

  return NextResponse.json(data)
}
