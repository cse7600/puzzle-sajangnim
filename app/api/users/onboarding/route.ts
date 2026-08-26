import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser, unauthorizedResponse, type SessionUser } from '@/lib/auth-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { usersAdmin } from '@/lib/supabase/users-admin'
import { sendWelcomeEmail } from '@/lib/email'
import { KOREAN_PHONE_PATTERN, generateReferralCode, isOnboardingComplete, type UserProfileData } from '@/lib/profile'

export const runtime = 'nodejs'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type OnboardingBody = {
  name?: unknown
  phone?: unknown
  notification_email?: unknown
}

type FieldErrors = {
  name?: string
  phone?: string
  notification_email?: string
}

function validateFields(body: OnboardingBody): { errors: FieldErrors } | { name: string; phone: string; notificationEmail: string } {
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const phone = typeof body.phone === 'string' ? body.phone.trim() : ''
  const notificationEmail = typeof body.notification_email === 'string' ? body.notification_email.trim() : ''

  const errors: FieldErrors = {}
  if (!name) errors.name = '이름을 입력해주세요'
  if (!phone) errors.phone = '연락처를 입력해주세요'
  else if (!KOREAN_PHONE_PATTERN.test(phone)) errors.phone = '연락처 형식이 올바르지 않습니다 (예: 010-1234-5678)'
  if (!notificationEmail) errors.notification_email = '알림 수신 이메일을 입력해주세요'
  else if (!EMAIL_PATTERN.test(notificationEmail)) errors.notification_email = '이메일 형식이 올바르지 않습니다'

  if (Object.keys(errors).length > 0) return { errors }
  return { name, phone, notificationEmail }
}

async function fetchProfile(userId: string): Promise<{ profile: UserProfileData; email: string } | null> {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('profile_data, email')
    .eq('id', userId)
    .maybeSingle()

  if (error || !data) return null
  return { profile: (data.profile_data ?? {}) as UserProfileData, email: data.email }
}

// 콜백에서 public.users insert가 실패한 세션은 온보딩에서 빠져나올 수 없게 되므로 여기서 복구한다.
async function ensureProfile(sessionUser: SessionUser): Promise<{ profile: UserProfileData; email: string } | null> {
  const existing = await fetchProfile(sessionUser.id)
  if (existing) return existing

  const email = sessionUser.email || `${sessionUser.id}@no-email.puzl.local`
  const profile: UserProfileData = { referral_code: generateReferralCode() }
  const { error } = await usersAdmin
    .from('users')
    .insert({ id: sessionUser.id, email, profile_data: { ...profile } })

  if (error) {
    console.error('[onboarding] users 행 복구 실패:', error)
    return null
  }
  return { profile, email }
}

export async function GET() {
  const sessionUser = await getSessionUser()
  if (!sessionUser) return unauthorizedResponse()

  const result = await ensureProfile(sessionUser)
  if (!result) {
    return NextResponse.json({ error: '사용자 정보를 불러오지 못했습니다' }, { status: 500 })
  }

  return NextResponse.json(result)
}

function buildMergedProfile(existing: UserProfileData, validated: { name: string; phone: string; notificationEmail: string }, nowIso: string): UserProfileData {
  return {
    ...existing,
    name: validated.name,
    phone: validated.phone,
    notification_email: validated.notificationEmail,
    onboarded_at: existing.onboarded_at ?? nowIso,
  }
}

async function persistProfile(userId: string, mergedProfile: UserProfileData, nowIso: string): Promise<{ error?: string }> {
  const { error } = await supabaseAdmin
    .from('users')
    .update({ profile_data: mergedProfile, updated_at: nowIso })
    .eq('id', userId)

  return error ? { error: '프로필 저장에 실패했습니다' } : {}
}

async function notifyFirstOnboarding(wasOnboarded: boolean, notificationEmail: string, name: string): Promise<void> {
  if (wasOnboarded) return
  try {
    await sendWelcomeEmail(notificationEmail, name)
  } catch (error) {
    console.error('[onboarding] 환영 이메일 발송 실패:', error)
  }
}

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) return unauthorizedResponse()

  const body = (await req.json().catch(() => null)) as OnboardingBody | null
  if (!body) {
    return NextResponse.json({ error: '요청 본문을 확인할 수 없습니다' }, { status: 400 })
  }

  const validated = validateFields(body)
  if ('errors' in validated) {
    return NextResponse.json({ errors: validated.errors }, { status: 400 })
  }

  const existing = await ensureProfile(sessionUser)
  if (!existing) {
    return NextResponse.json({ error: '사용자 정보를 불러오지 못했습니다' }, { status: 500 })
  }

  const wasOnboarded = isOnboardingComplete(existing.profile)
  const nowIso = new Date().toISOString()
  const mergedProfile = buildMergedProfile(existing.profile, validated, nowIso)

  const { error: persistError } = await persistProfile(sessionUser.id, mergedProfile, nowIso)
  if (persistError) {
    return NextResponse.json({ error: persistError }, { status: 500 })
  }

  await notifyFirstOnboarding(wasOnboarded, validated.notificationEmail, validated.name)

  return NextResponse.json({ profile: mergedProfile })
}
