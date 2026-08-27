import { NextResponse } from 'next/server'
import type { User } from '@supabase/supabase-js'
import { createServerSupabase } from '@/lib/supabase/server'
import { usersAdmin, type UsersRow } from '@/lib/supabase/users-admin'
import { generateReferralCode, isOnboardingComplete, type UserProfileData } from '@/lib/profile'
import { sendWelcomeEmail } from '@/lib/email'
import { parseStoredConsent } from '@/lib/consent'
import { sanitizeRedirectPath } from '@/lib/safe-next'
import type { Json } from '@/types/database'

const LOGIN_ERROR_MESSAGE = '카카오 로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.'
const WITHDRAWN_ERROR_MESSAGE = '탈퇴했거나 이용이 정지된 계정입니다. 고객센터로 문의해 주세요.'

// 카카오 이름 키는 프로바이더 설정과 동의 항목에 따라 달라진다.
// 실서비스(referio) 기준 폴백 순서를 그대로 따른다.
const NAME_METADATA_KEYS = ['full_name', 'name', 'nickname', 'preferred_username'] as const

function fallbackEmail(kakaoId: string | undefined, authUserId: string): string {
  return `kakao_${kakaoId ?? authUserId}@no-email.puzl.local`
}

// 카카오는 닉네임 미동의 계정에 대해 값을 비우는 대신 문자열 "NaN"을 내려보내는
// 경우가 실측으로 확인됐다. 그대로 저장하면 "NaN 사장님"이 화면에 노출되므로
// 메타데이터 판독 지점에서 미제공으로 취급한다.
function isUsableMetadataValue(value: string): boolean {
  return value.length > 0 && value !== 'NaN'
}

function readMetadataString(metadata: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = metadata[key]
    if (typeof value !== 'string') continue
    const trimmed = value.trim()
    if (isUsableMetadataValue(trimmed)) return trimmed
  }
  return undefined
}

// Supabase Auth에서 차단(banned_until)된 계정은 코드 교환 단계에서 실패하며
// 에러 메시지에 banned가 포함된다. 일반 실패와 같은 안내를 주면 사용자가
// 무한 재시도를 하게 되므로 여기서 구분한다.
function isBannedAccountError(message: string | undefined): boolean {
  return typeof message === 'string' && /banned/i.test(message)
}

async function insertNewUser(authUser: User): Promise<{ row: UsersRow; usedFallbackEmail: boolean }> {
  const metadata = (authUser.user_metadata ?? {}) as Record<string, unknown>
  const kakaoId = readMetadataString(metadata, 'provider_id', 'sub')
  const usedFallbackEmail = !authUser.email
  const email = authUser.email ?? fallbackEmail(kakaoId, authUser.id)

  const profileData: Record<string, Json> = { referral_code: generateReferralCode() }
  const name = readMetadataString(metadata, ...NAME_METADATA_KEYS)
  const avatarUrl = readMetadataString(metadata, 'avatar_url', 'picture')
  if (kakaoId) profileData.kakao_id = kakaoId
  if (name) profileData.name = name
  if (avatarUrl) profileData.avatar_url = avatarUrl
  // consent는 여기서 넣지 않는다. auth.users는 카카오 인증 순간 이미 생성되므로
  // 프로필만 먼저 만들고, 동의는 로그인 완료 후 /auth/consent에서 받아 저장한다.

  const { data, error } = await usersAdmin
    .from('users')
    .insert({ id: authUser.id, email, profile_data: profileData })
    .select()
    .single()

  if (error || !data) throw new Error(error?.message ?? 'public.users insert 실패')
  return { row: data, usedFallbackEmail }
}

async function backfillExistingUser(existing: UsersRow, authUser: User): Promise<UsersRow> {
  const metadata = (authUser.user_metadata ?? {}) as Record<string, unknown>
  const profile = (existing.profile_data ?? {}) as Record<string, Json>
  const kakaoId = readMetadataString(metadata, 'provider_id', 'sub')
  const avatarUrl = readMetadataString(metadata, 'avatar_url', 'picture')
  const name = readMetadataString(metadata, ...NAME_METADATA_KEYS)

  const needsKakaoId = !profile.kakao_id && kakaoId
  const needsAvatar = !profile.avatar_url && avatarUrl
  // "NaN" 정규화 이전에 가입한 유저는 profile_data.name에 "NaN"이 저장돼 있을 수
  // 있다. 재로그인 시 정상 값으로 교정한다.
  const storedName = typeof profile.name === 'string' ? profile.name : ''
  const needsName = (!storedName || storedName === 'NaN') && name
  if (!needsKakaoId && !needsAvatar && !needsName) return existing

  // 기존 profile_data는 비어 있던 필드만 채우고 덮어쓰지 않는다. consent도 예외가 아니다 —
  // 최초 동의 1회만 기록하고 재로그인 때는 손대지 않는다(마케팅 수신 변경은 /settings에서만).
  const merged: Record<string, Json> = { ...profile }
  if (needsKakaoId) merged.kakao_id = kakaoId as string
  if (needsAvatar) merged.avatar_url = avatarUrl as string
  if (needsName) merged.name = name as string

  const { data, error } = await usersAdmin
    .from('users')
    .update({ profile_data: merged })
    .eq('id', existing.id)
    .select()
    .single()

  if (error || !data) {
    console.error('[auth/callback] profile_data 갱신 실패:', error)
    return existing
  }
  return data
}

async function syncUserRow(
  authUser: User
): Promise<{ userRow: UsersRow; isNewUser: boolean; usedFallbackEmail: boolean }> {
  const { data: existingRow } = await usersAdmin
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .maybeSingle()

  if (existingRow) {
    const userRow = await backfillExistingUser(existingRow, authUser)
    return { userRow, isNewUser: false, usedFallbackEmail: false }
  }

  const { row, usedFallbackEmail } = await insertNewUser(authUser)
  return { userRow: row, isNewUser: true, usedFallbackEmail }
}

function extractWelcomeName(row: UsersRow): string {
  const profile = row.profile_data as UserProfileData | null
  return profile?.name?.trim() || '사장님'
}

// 동의를 아직 남기지 않은 유저의 착지점. 신규 가입자와, 과거 쿠키 유실로 consent 없이
// 만들어진 기존 유저 모두 여기로 보낸다 — 판단 기준은 가입 시점이 아니라 기록의 유무다.
function consentDestination(next: string | null): string {
  const params = next ? `?next=${encodeURIComponent(next)}` : ''
  return `/auth/consent${params}`
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = sanitizeRedirectPath(searchParams.get('next'))
  const loginErrorRedirect = (message: string = LOGIN_ERROR_MESSAGE) =>
    NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(message)}`)

  if (!code) return loginErrorRedirect()

  try {
    const supabase = createServerSupabase()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (error && isBannedAccountError(error.message)) {
      return loginErrorRedirect(WITHDRAWN_ERROR_MESSAGE)
    }
    if (error || !data.user) return loginErrorRedirect()

    const { userRow, isNewUser, usedFallbackEmail } = await syncUserRow(data.user)

    // 신규 유저 & 실제(비폴백) 이메일 보유 시에만 환영 메일 발송. 카카오가 이메일 스코프를
    // 못 준 유저의 폴백 이메일(no-email.puzl.local)은 수신 불가 주소이므로 여기서는 건너뛰고,
    // 온보딩에서 실제 이메일을 입력받으면 그쪽 라우트에서 발송한다. 메일 실패가 로그인을
    // 막으면 안 되므로 await하지 않고 실패는 로깅만 한다.
    if (isNewUser && !usedFallbackEmail) {
      sendWelcomeEmail(userRow.email, extractWelcomeName(userRow)).catch((sendError: unknown) => {
        console.error('[auth/callback] 환영 이메일 발송 실패:', sendError)
      })
    }

    const profile = userRow.profile_data as UserProfileData | null
    if (!parseStoredConsent(profile?.consent)) {
      return NextResponse.redirect(`${origin}${consentDestination(next)}`)
    }

    const onboarded = isOnboardingComplete(profile)
    const destination = onboarded ? next ?? '/hub' : '/onboarding'
    return NextResponse.redirect(`${origin}${destination}`)
  } catch (callbackError) {
    console.error('[auth/callback] 처리 실패:', callbackError)
    return loginErrorRedirect()
  }
}
