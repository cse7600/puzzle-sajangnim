import { NextResponse } from 'next/server'
import { getSessionUser, unauthorizedResponse } from '@/lib/auth-server'
import { usersAdmin } from '@/lib/supabase/users-admin'
import { isOnboardingComplete, type UserProfileData } from '@/lib/profile'
import {
  buildConsentRecord,
  hasRequiredConsent,
  parseConsentSelection,
  parseStoredConsent,
  type UserConsent,
} from '@/lib/consent'
import type { Json } from '@/types/database'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const INVALID_BODY_MESSAGE = '동의 항목 형식이 올바르지 않습니다.'
const REQUIRED_CONSENT_MESSAGE = '이용약관과 개인정보처리방침에는 동의해야 합니다.'
const PROFILE_READ_ERROR_MESSAGE = '사용자 정보를 불러오지 못했습니다.'
const PROFILE_WRITE_ERROR_MESSAGE = '동의 정보를 저장하지 못했습니다.'
const NO_CONSENT_RECORD_MESSAGE = '동의 기록이 없어 수신 설정을 변경할 수 없습니다. 다시 로그인해 주세요.'

// 로그인 이후에만 호출되는 인증 필수 엔드포인트다. 동의는 카카오 인증으로 유저가
// 확정된 다음에 받으므로 비인증 경로(과거 puzl_consent 쿠키 발급)는 존재하지 않는다.
type ProfileSnapshot = { profile: Record<string, Json> }

async function fetchProfile(userId: string): Promise<ProfileSnapshot | null> {
  const { data, error } = await usersAdmin
    .from('users')
    .select('profile_data')
    .eq('id', userId)
    .maybeSingle()

  if (error || !data) return null
  return { profile: (data.profile_data ?? {}) as Record<string, Json> }
}

// profile_data는 referral_code·onboarded_at 등 다른 제품/단계가 쓰는 키를 함께 담는
// jsonb다. 통째로 교체하면 그 키들이 유실되므로 반드시 기존 값 위에 consent만 얹는다.
async function persistConsent(userId: string, profile: Record<string, Json>, consent: UserConsent) {
  const merged: Record<string, Json> = { ...profile, consent: { ...consent } }
  const { error } = await usersAdmin
    .from('users')
    .update({ profile_data: merged })
    .eq('id', userId)

  if (error) {
    console.error('[api/auth/consent] profile_data 저장 실패:', error)
    return null
  }
  return merged
}

export async function GET() {
  const sessionUser = await getSessionUser()
  if (!sessionUser) return unauthorizedResponse()

  const snapshot = await fetchProfile(sessionUser.id)
  if (!snapshot) return NextResponse.json({ error: PROFILE_READ_ERROR_MESSAGE }, { status: 500 })

  return NextResponse.json({ consent: parseStoredConsent(snapshot.profile.consent) })
}

export async function POST(request: Request) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) return unauthorizedResponse()

  const body = await request.json().catch(() => null)
  const selection = parseConsentSelection(body)
  if (!selection) {
    return NextResponse.json({ error: INVALID_BODY_MESSAGE }, { status: 400 })
  }
  if (!hasRequiredConsent(selection)) {
    return NextResponse.json({ error: REQUIRED_CONSENT_MESSAGE }, { status: 400 })
  }

  const snapshot = await fetchProfile(sessionUser.id)
  if (!snapshot) return NextResponse.json({ error: PROFILE_READ_ERROR_MESSAGE }, { status: 500 })

  const merged = await persistConsent(sessionUser.id, snapshot.profile, buildConsentRecord(selection))
  if (!merged) return NextResponse.json({ error: PROFILE_WRITE_ERROR_MESSAGE }, { status: 500 })

  // 동의 직후 목적지(온보딩 vs 원래 가려던 곳)를 클라이언트가 알아야 하므로 함께 돌려준다.
  return NextResponse.json({
    ok: true,
    onboarded: isOnboardingComplete(merged as UserProfileData),
  })
}

// 마케팅 수신 동의만 사후 변경한다. 필수 동의(terms/privacy)는 가입 시 1회 기록 후 불변이므로
// 여기서 건드리지 않고, 기존 기록이 없으면 임의로 만들어내지 않는다.
export async function PATCH(request: Request) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) return unauthorizedResponse()

  const body = (await request.json().catch(() => null)) as { marketing?: unknown } | null
  if (!body || typeof body.marketing !== 'boolean') {
    return NextResponse.json({ error: INVALID_BODY_MESSAGE }, { status: 400 })
  }

  const snapshot = await fetchProfile(sessionUser.id)
  if (!snapshot) return NextResponse.json({ error: PROFILE_READ_ERROR_MESSAGE }, { status: 500 })

  const existing = parseStoredConsent(snapshot.profile.consent)
  if (!existing) {
    return NextResponse.json({ error: NO_CONSENT_RECORD_MESSAGE }, { status: 409 })
  }

  const updated = buildConsentRecord({ ...existing, marketing: body.marketing })
  const merged = await persistConsent(sessionUser.id, snapshot.profile, updated)
  if (!merged) return NextResponse.json({ error: PROFILE_WRITE_ERROR_MESSAGE }, { status: 500 })

  return NextResponse.json({ consent: updated })
}
