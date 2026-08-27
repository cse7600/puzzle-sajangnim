'use client'

import { useState } from 'react'
import ConsentCheckboxes from '@/components/auth/ConsentCheckboxes'
import { EMPTY_CONSENT, hasRequiredConsent } from '@/lib/consent'

const SUBMIT_ERROR_MESSAGE = '동의 정보를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.'
const NETWORK_ERROR_MESSAGE = '네트워크 오류로 동의 정보를 저장하지 못했습니다.'

type ConsentInterstitialProps = {
  next?: string
}

type SubmitOutcome = { onboarded: boolean } | { error: string }

async function submitConsent(selection: typeof EMPTY_CONSENT): Promise<SubmitOutcome> {
  try {
    const response = await fetch('/api/auth/consent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(selection),
    })
    const body = await response.json().catch(() => null)
    if (!response.ok) {
      return { error: typeof body?.error === 'string' ? body.error : SUBMIT_ERROR_MESSAGE }
    }
    return { onboarded: body?.onboarded === true }
  } catch {
    return { error: NETWORK_ERROR_MESSAGE }
  }
}

export default function ConsentInterstitial({ next }: ConsentInterstitialProps) {
  const [selection, setSelection] = useState(EMPTY_CONSENT)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const consentGiven = hasRequiredConsent(selection)

  async function handleSubmit() {
    setSubmitting(true)
    setError(null)

    const outcome = await submitConsent(selection)
    if ('error' in outcome) {
      setError(outcome.error)
      setSubmitting(false)
      return
    }

    // 온보딩 게이트·사업자인증 게이트는 미들웨어가 서버에서 판단한다. 클라이언트 라우터로
    // 이동하면 방금 저장한 profile_data를 반영하지 않은 RSC 캐시를 그대로 쓸 수 있어
    // 전체 내비게이션으로 넘긴다(가입 1회 경로라 비용도 문제되지 않는다).
    window.location.assign(outcome.onboarded ? next ?? '/hub' : '/onboarding')
  }

  return (
    <div>
      <ConsentCheckboxes value={selection} onChange={setSelection} disabled={submitting} />

      {error && (
        <p className="mt-4 rounded-[11px] bg-red-50 px-4 py-3 text-[13px] text-red-600">{error}</p>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!consentGiven || submitting}
        className="mt-6 w-full rounded-[11px] bg-primary py-4 text-[16px] font-semibold text-ink transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-canvas-subtle disabled:text-muted-light"
      >
        {submitting ? '저장 중...' : '동의하고 시작하기'}
      </button>

      {!consentGiven && (
        <p className="mt-3 text-center text-[13px] text-muted-light">
          필수 항목에 동의해야 서비스를 이용할 수 있어요
        </p>
      )}
    </div>
  )
}
