// public.users.profile_data(jsonb) 스키마. 컬럼 추가 금지(다른 puzl 제품과 공유 테이블).
export type UserProfileData = {
  name?: string
  phone?: string
  notification_email?: string
  business_name?: string
  business_type?: string
  referral_code?: string
  referred_by?: string | null
  kakao_id?: string
  avatar_url?: string
  onboarded_at?: string
}

export const KOREAN_PHONE_PATTERN = /^01[0-9]-\d{3,4}-\d{4}$/

export function isOnboardingComplete(profile: UserProfileData | null | undefined): boolean {
  if (!profile) return false
  return Boolean(profile.name?.trim() && profile.phone?.trim())
}

export function generateReferralCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 8; i += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return code
}
