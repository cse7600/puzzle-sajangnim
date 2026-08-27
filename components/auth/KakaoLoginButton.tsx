'use client'

import { useState } from 'react'
import { createBrowserSupabase } from '@/lib/supabase/client'
import { hasRequiredConsent, type ConsentSelection } from '@/lib/consent'

const START_ERROR_MESSAGE = '카카오 로그인을 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.'
const CONSENT_REQUIRED_MESSAGE = '필수 항목에 동의해야 카카오 로그인을 시작할 수 있어요.'

type KakaoLoginButtonProps = {
  next?: string
  consent: ConsentSelection
  disabled?: boolean
}

export default function KakaoLoginButton({ next, consent, disabled }: KakaoLoginButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Supabase에 카카오 프로바이더가 미설정이면 authorize 엔드포인트가 400 JSON을 반환한다.
  // signInWithOAuth의 기본 동작(즉시 리다이렉트)은 그 JSON 페이지로 사용자를 보내버리므로,
  // 리다이렉트 전에 authorize URL을 프리플라이트해 실패 시 한국어 에러를 보여준다.
  async function canReachAuthorize(url: string): Promise<boolean> {
    try {
      const response = await fetch(url, { redirect: 'manual' })
      return response.type === 'opaqueredirect' || response.ok
    } catch {
      return false
    }
  }

  async function handleClick() {
    if (!hasRequiredConsent(consent)) {
      setError(CONSENT_REQUIRED_MESSAGE)
      return
    }

    setLoading(true)
    setError(null)

    const supabase = createBrowserSupabase()
    const callbackUrl = new URL('/auth/callback', window.location.origin)
    if (next) callbackUrl.searchParams.set('next', next)

    const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        redirectTo: callbackUrl.toString(),
        scopes: 'profile_nickname account_email',
        skipBrowserRedirect: true,
      },
    })

    if (oauthError || !data?.url || !(await canReachAuthorize(data.url))) {
      setError(START_ERROR_MESSAGE)
      setLoading(false)
      return
    }

    window.location.assign(data.url)
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading || disabled}
        className="w-full flex items-center justify-center gap-3 bg-[#FEE500] rounded-[11px] py-4 px-6 text-[16px] font-semibold text-[#191919] hover:bg-[#e6cf00] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
      >
        <svg width="20" height="18" viewBox="0 0 20 18" fill="none">
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M10 0C4.477 0 0 3.582 0 8c0 2.861 1.743 5.38 4.379 6.826L3.5 18l5.035-2.643c.482.07.977.107 1.465.107 5.523 0 10-3.582 10-8s-4.477-8-10-8z"
            fill="#191919"
          />
        </svg>
        {loading ? '이동 중...' : '카카오로 시작하기'}
      </button>
      {error && <p className="mt-3 text-center text-[13px] text-red-600">{error}</p>}
    </div>
  )
}
