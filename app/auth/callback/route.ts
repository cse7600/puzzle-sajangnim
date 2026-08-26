import { NextResponse } from 'next/server'
import type { User } from '@supabase/supabase-js'
import { createServerSupabase } from '@/lib/supabase/server'
import { usersAdmin, type UsersRow } from '@/lib/supabase/users-admin'
import { generateReferralCode, isOnboardingComplete, type UserProfileData } from '@/lib/profile'
import { sendWelcomeEmail } from '@/lib/email'
import type { Json } from '@/types/database'

const LOGIN_ERROR_MESSAGE = '카카오 로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.'

function fallbackEmail(kakaoId: string | undefined, authUserId: string): string {
  return `kakao_${kakaoId ?? authUserId}@no-email.puzl.local`
}

function readMetadataString(metadata: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = metadata[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return undefined
}

function safeNext(nextParam: string | null): string | null {
  if (!nextParam) return null
  return nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : null
}

async function insertNewUser(
  authUser: User
): Promise<{ row: UsersRow; usedFallbackEmail: boolean }> {
  const metadata = (authUser.user_metadata ?? {}) as Record<string, unknown>
  const kakaoId = readMetadataString(metadata, 'provider_id', 'sub')
  const usedFallbackEmail = !authUser.email
  const email = authUser.email ?? fallbackEmail(kakaoId, authUser.id)

  const profileData: Record<string, Json> = { referral_code: generateReferralCode() }
  const name = readMetadataString(metadata, 'name', 'nickname')
  const avatarUrl = readMetadataString(metadata, 'avatar_url', 'picture')
  if (kakaoId) profileData.kakao_id = kakaoId
  if (name) profileData.name = name
  if (avatarUrl) profileData.avatar_url = avatarUrl

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

  const needsKakaoId = !profile.kakao_id && kakaoId
  const needsAvatar = !profile.avatar_url && avatarUrl
  if (!needsKakaoId && !needsAvatar) return existing

  // 기존 profile_data는 절대 덮어쓰지 않고, 비어 있던 필드만 채운다.
  const merged: Record<string, Json> = { ...profile }
  if (needsKakaoId) merged.kakao_id = kakaoId as string
  if (needsAvatar) merged.avatar_url = avatarUrl as string

  const { data, error } = await usersAdmin
    .from('users')
    .update({ profile_data: merged })
    .eq('id', existing.id)
    .select()
    .single()

  return error || !data ? existing : data
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

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = safeNext(searchParams.get('next'))
  const loginErrorRedirect = () =>
    NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(LOGIN_ERROR_MESSAGE)}`)

  if (!code) return loginErrorRedirect()

  try {
    const supabase = createServerSupabase()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
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

    const onboarded = isOnboardingComplete(userRow.profile_data as UserProfileData | null)
    const destination = onboarded ? next ?? '/hub' : '/onboarding'
    return NextResponse.redirect(`${origin}${destination}`)
  } catch (callbackError) {
    console.error('[auth/callback] 처리 실패:', callbackError)
    return loginErrorRedirect()
  }
}
