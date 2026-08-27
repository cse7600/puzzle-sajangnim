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

// profile_data.consent는 jsonb라 어떤 형태든 들어올 수 있다(수기 수정, 과거 스키마 등).
// 필수 동의(terms/privacy)가 false인 값은 "동의함"으로 취급할 수 없으므로 null로 폐기한다.
// null을 받은 호출처는 해당 유저를 동의 미완으로 보고 인터스티셜로 보낸다.
export function parseStoredConsent(parsed: unknown): UserConsent | null {
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
