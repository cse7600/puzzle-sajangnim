import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import ConsentInterstitial from '@/components/auth/ConsentInterstitial'
import { getSessionUser } from '@/lib/auth-server'
import { usersAdmin } from '@/lib/supabase/users-admin'
import { parseStoredConsent } from '@/lib/consent'
import { isOnboardingComplete, type UserProfileData } from '@/lib/profile'
import { sanitizeRedirectPath } from '@/lib/safe-next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '약관 동의 | 퍼즐 사장님',
  robots: { index: false, follow: false },
}

// 카카오 인증은 끝났고 세션도 있는 상태에서, 동의 기록이 없는 유저에게만 보이는 화면이다.
// 로그인 화면이 아니라 "가입 마지막 단계"이므로 카피도 그렇게 읽히도록 쓴다.
export default async function ConsentPage({
  searchParams,
}: {
  searchParams: { next?: string }
}) {
  const sessionUser = await getSessionUser()
  const next = sanitizeRedirectPath(searchParams.next) ?? undefined
  if (!sessionUser) {
    redirect(next ? `/login?next=${encodeURIComponent(next)}` : '/login')
  }

  const { data } = await usersAdmin
    .from('users')
    .select('profile_data')
    .eq('id', sessionUser.id)
    .maybeSingle()
  const profile = (data?.profile_data ?? null) as UserProfileData | null

  // 이미 동의한 유저가 주소를 직접 입력하거나 뒤로가기로 돌아온 경우 — 다시 받지 않는다.
  if (parseStoredConsent(profile?.consent)) {
    redirect(isOnboardingComplete(profile) ? next ?? '/hub' : '/onboarding')
  }

  return (
    <div className="min-h-[100dvh] bg-canvas-subtle flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-[420px]">
        <div className="text-center mb-8 sm:mb-10">
          <span className="text-[24px] sm:text-[28px] font-bold text-ink">퍼즐 사장님</span>
          <p className="mt-2 text-[14px] sm:text-[15px] text-muted-light">소상공인 마케팅 슈퍼앱</p>
        </div>

        <div className="bg-canvas-white rounded-[18px] border border-hairline p-6 sm:p-8">
          <h1 className="text-[22px] font-semibold text-ink mb-2">가입을 완료해주세요</h1>
          <p className="text-[14px] text-muted-light mb-8">
            퍼즐 사장님 이용을 위해 아래 항목에 동의해주세요. 처음 가입할 때 한 번만 확인합니다.
          </p>

          <ConsentInterstitial next={next} />
        </div>

        <p className="mt-6 text-center text-[13px] text-muted-light">
          동의 내역은 설정에서 언제든 확인·변경할 수 있어요
        </p>
      </div>
    </div>
  )
}
