'use client'

import type { ConsentSelection } from '@/lib/consent'

type ConsentCheckboxesProps = {
  value: ConsentSelection
  onChange: (next: ConsentSelection) => void
  disabled?: boolean
}

const CHECKBOX_CLASS =
  'mt-0.5 h-5 w-5 shrink-0 rounded-sm border-hairline accent-primary-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-dark'

export default function ConsentCheckboxes({ value, onChange, disabled }: ConsentCheckboxesProps) {
  const allChecked = value.terms && value.privacy && value.marketing

  function toggleAll() {
    const next = !allChecked
    onChange({ terms: next, privacy: next, marketing: next })
  }

  function toggleTerms() {
    onChange({ ...value, terms: !value.terms })
  }

  function togglePrivacy() {
    onChange({ ...value, privacy: !value.privacy })
  }

  function toggleMarketing() {
    onChange({ ...value, marketing: !value.marketing })
  }

  return (
    <div>
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="consent-all"
          checked={allChecked}
          onChange={toggleAll}
          disabled={disabled}
          className={CHECKBOX_CLASS}
        />
        <label htmlFor="consent-all" className="text-[15px] font-semibold text-ink">
          전체 동의
        </label>
      </div>

      <div className="my-4 border-t border-hairline" />

      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            id="consent-terms"
            checked={value.terms}
            onChange={toggleTerms}
            disabled={disabled}
            className={CHECKBOX_CLASS}
          />
          <div className="flex flex-1 items-center justify-between gap-2">
            <label htmlFor="consent-terms" className="text-[14px] text-ink">
              <span className="font-semibold text-primary-dark">[필수]</span> 이용약관 동의
            </label>
            <a
              href="/legal/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 text-[13px] text-muted-light underline underline-offset-2 hover:text-ink"
            >
              보기
            </a>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            id="consent-privacy"
            checked={value.privacy}
            onChange={togglePrivacy}
            disabled={disabled}
            className={CHECKBOX_CLASS}
          />
          <div className="flex flex-1 items-center justify-between gap-2">
            <label htmlFor="consent-privacy" className="text-[14px] text-ink">
              <span className="font-semibold text-primary-dark">[필수]</span> 개인정보 처리방침 동의
            </label>
            <a
              href="/legal/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 text-[13px] text-muted-light underline underline-offset-2 hover:text-ink"
            >
              보기
            </a>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            id="consent-marketing"
            checked={value.marketing}
            onChange={toggleMarketing}
            disabled={disabled}
            className={CHECKBOX_CLASS}
          />
          <div className="flex-1">
            <label htmlFor="consent-marketing" className="text-[14px] text-ink">
              <span className="font-semibold text-muted-light">[선택]</span> 마케팅 정보 수신 동의
            </label>
            <p className="mt-0.5 text-[12px] text-muted-light">
              혜택·이벤트·신규 기능 소식을 알려드려요
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
