export const CONSENT_COOKIE = 'puzl_consent'

// 동의부터 콜백 착지까지는 정상 흐름에서 수십 초. 5분은 카카오 화면에서
// 지체되는 경우를 흡수하면서, 브라우저를 공유하는 다음 사람에게 앞사람의
// 동의가 승계될 창을 최소화한다.
export const CONSENT_COOKIE_MAX_AGE_SECONDS = 300

export type ConsentSelection = {
  terms: boolean
  privacy: boolean
  marketing: boolean
}

export type UserConsent = ConsentSelection & { agreed_at: string }

export const EMPTY_CONSENT: ConsentSelection = {
  terms: false,
  privacy: false,
  marketing: false,
}

export function hasRequiredConsent(selection: ConsentSelection): boolean {
  return selection.terms && selection.privacy
}
