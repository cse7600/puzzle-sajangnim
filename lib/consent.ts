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

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasValidBooleanFields(candidate: Record<string, unknown>): candidate is Record<string, unknown> & ConsentSelection {
  return (
    typeof candidate.terms === 'boolean' &&
    typeof candidate.privacy === 'boolean' &&
    typeof candidate.marketing === 'boolean'
  )
}

function hasValidAgreedAt(candidate: Record<string, unknown>): boolean {
  return typeof candidate.agreed_at === 'string' && !Number.isNaN(Date.parse(candidate.agreed_at))
}

// 쿠키/요청 바디를 신뢰하지 않고 형태를 검증한다. 필수 동의(terms/privacy)가
// false인 페이로드는 저장할 수 없는 값이므로 여기서 null로 폐기한다.
export function parseConsentCookie(raw: string | undefined): UserConsent | null {
  if (!raw) return null

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }

  if (!isPlainObject(parsed)) return null
  if (!hasValidBooleanFields(parsed)) return null
  if (!hasValidAgreedAt(parsed)) return null

  const selection: ConsentSelection = {
    terms: parsed.terms,
    privacy: parsed.privacy,
    marketing: parsed.marketing,
  }
  if (!hasRequiredConsent(selection)) return null

  return { ...selection, agreed_at: parsed.agreed_at as string }
}

export function buildConsentRecord(selection: ConsentSelection): UserConsent {
  return { ...selection, agreed_at: new Date().toISOString() }
}

// 요청 바디 검증용. agreed_at 없이 terms/privacy/marketing boolean 형태만 확인한다.
export function parseConsentSelection(raw: unknown): ConsentSelection | null {
  if (!isPlainObject(raw)) return null
  if (!hasValidBooleanFields(raw)) return null
  return { terms: raw.terms, privacy: raw.privacy, marketing: raw.marketing }
}
