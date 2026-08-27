'use client'

import { useState } from 'react'
import ConsentCheckboxes from '@/components/auth/ConsentCheckboxes'
import KakaoLoginButton from '@/components/auth/KakaoLoginButton'
import { EMPTY_CONSENT, hasRequiredConsent } from '@/lib/consent'

type LoginConsentGateProps = {
  next?: string
  kakaoEnabled?: boolean
}

export default function LoginConsentGate({ next, kakaoEnabled = true }: LoginConsentGateProps) {
  const [selection, setSelection] = useState(EMPTY_CONSENT)
  const consentGiven = hasRequiredConsent(selection)

  return (
    <div>
      <ConsentCheckboxes value={selection} onChange={setSelection} />

      <div className="mt-6">
        <KakaoLoginButton
          next={next}
          consent={selection}
          disabled={!consentGiven || !kakaoEnabled}
        />
        {!consentGiven && kakaoEnabled && (
          <p className="mt-3 text-center text-[13px] text-muted-light">
            필수 항목에 동의하면 카카오 로그인을 시작할 수 있어요
          </p>
        )}
      </div>
    </div>
  )
}
