'use client'

import { useState } from 'react'
import { createBrowserSupabase } from '@/lib/supabase/client'
import { hasRequiredConsent, type ConsentSelection } from '@/lib/consent'

const START_ERROR_MESSAGE = '카카오 로그인을 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.'
const CONSENT_REQUIRED_MESSAGE = '필수 항목에 동의해야 카카오 로그인을 시작할 수 있어요.'
const CONSENT_RECORD_ERROR_MESSAGE = '동의 정보를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.'

// #FEE500 / #191919는 카카오 로그인 버튼 브랜드 가이드가 지정한 고정값이라
// 디자인 토큰으로 대체할 수 없다. 비활성 상태에서는 브랜드 옐로를 유지하면
// 활성 버튼과 구분되지 않아(투명도만 낮아짐) "동작하는 것처럼 보이는" 착시가
// 생기므로, 중립 토큰으로 완전히 전환한다.
const ACTIVE_BUTTON_CLASS = 'bg-[#FEE500] text-[#191919] hover:bg-[#e6cf00]'
const INACTIVE_BUTTON_CLASS =
  'bg-canvas-subtle text-muted-light border border-hairline cursor-not-allowed'

async function recordConsent(consent: ConsentSelection): Promise<boolean> {
  try {
    const response = await fetch('/api/auth/consent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(consent),
    })
    return response.ok
  } catch {
    return false
  }
}

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

    if (!(await recordConsent(consent))) {
      setError(CONSENT_RECORD_ERROR_MESSAGE)
      setLoading(false)
      return
    }

    const supabase = createBrowserSupabase()
    const callbackUrl = new URL('/auth/callback', window.location.origin)
    if (next) callbackUrl.searchParams.set('next', next)

    const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        redirectTo: callbackUrl.toString(),
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

  const inactive = loading || disabled

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={inactive}
        className={`w-full flex items-center justify-center gap-3 rounded-[11px] py-4 px-6 text-[16px] font-semibold transition-colors ${
          inactive ? INACTIVE_BUTTON_CLASS : ACTIVE_BUTTON_CLASS
        }`}
      >
        <svg width="20" height="18" viewBox="0 0 20 18" fill="none" aria-hidden="true">
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M10 0C4.477 0 0 3.582 0 8c0 2.861 1.743 5.38 4.379 6.826L3.5 18l5.035-2.643c.482.07.977.107 1.465.107 5.523 0 10-3.582 10-8s-4.477-8-10-8z"
            fill="currentColor"
          />
        </svg>
        {loading ? '이동 중...' : '카카오로 시작하기'}
      </button>
      {error && <p className="mt-3 text-center text-[13px] text-red-600">{error}</p>}
    </div>
  )
}
