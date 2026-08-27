'use client'

import { useState } from 'react'
import ConsentCheckboxes from '@/components/auth/ConsentCheckboxes'
import KakaoLoginButton from '@/components/auth/KakaoLoginButton'
import { EMPTY_CONSENT, hasRequiredConsent } from '@/lib/consent'

type LoginConsentGateProps = {
  next?: string
  /**
   * 카카오 심사 제출용 화면(/kakao-login, /kakao-signup) 전용.
   * 심사 담당자가 비활성 버튼을 보고 반려하지 않도록 동의 여부와 무관하게
   * 버튼을 활성 상태로 그린다. 실제 동의 검증은 버튼 클릭 시
   * KakaoLoginButton 내부의 hasRequiredConsent 가드가 그대로 수행한다.
   */
  forceButtonEnabled?: boolean
}

export default function LoginConsentGate({ next, forceButtonEnabled = false }: LoginConsentGateProps) {
  const [selection, setSelection] = useState(EMPTY_CONSENT)
  const consentGiven = hasRequiredConsent(selection)

  return (
    <div>
      <ConsentCheckboxes value={selection} onChange={setSelection} />

      <div className="mt-6">
        <KakaoLoginButton
          next={next}
          consent={selection}
          disabled={!consentGiven && !forceButtonEnabled}
        />
        {!consentGiven && (
          <p className="mt-3 text-center text-[13px] text-muted-light">
            필수 항목에 동의하면 카카오 로그인을 시작할 수 있어요
          </p>
        )}
      </div>
    </div>
  )
}
