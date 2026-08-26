const RESERVED_HANDLES = new Set<string>([
  'about', 'admin', 'api', 'auth', 'blog', 'dashboard', 'data-deletion',
  'forgot-password', 'login', 'onboarding', 'privacy', 'reset-password',
  'security', 'signup', 'terms', 'l', 's', 'r',
  'public', 'upload', 'webhook', 'settings',
  'hub', 'earnings', 'place', 'experience', 'team-buy', 'rewards',
  'knowledge', 'referral', 'community', 'ohora', 'my-link', 'ai-blog',
  'puzl', 'puzzle', 'www', 'go', 'join',
])

export type HandleValidation =
  | { ok: true; handle: string }
  | { ok: false; error: string }

export function validateHandle(raw: unknown): HandleValidation {
  if (typeof raw !== 'string') {
    return { ok: false, error: '주소를 입력해 주세요' }
  }
  const trimmed = raw.trim()
  if (trimmed.length < 3 || trimmed.length > 30) {
    return { ok: false, error: '주소는 3~30자로 입력해 주세요' }
  }
  if (!/^[a-zA-Z0-9._]+$/.test(trimmed)) {
    return { ok: false, error: '영문, 숫자, 언더스코어(_), 점(.)만 사용할 수 있습니다' }
  }
  const normalized = trimmed.toLowerCase()
  if (RESERVED_HANDLES.has(normalized)) {
    return { ok: false, error: '사용할 수 없는 주소입니다' }
  }
  return { ok: true, handle: normalized }
}
