// 로그인 후 복귀 경로(`next`)는 로그인 페이지 · 카카오 심사 페이지 · OAuth 콜백 ·
// 어드민 로그인 네 곳에서 읽는다. 각자 다른 규칙을 쓰면 한 곳만 느슨해져도
// 오픈 리다이렉트가 열리므로 화이트리스트를 이 함수 하나로 강제한다.

// 정규화 전용 더미 오리진. `.invalid`는 RFC 2606이 예약한 TLD라 실제로 해석되지 않는다.
const INTERNAL_BASE = 'https://app.invalid'

/**
 * 앱 내부 절대 경로만 통과시키고, 그 외에는 null을 반환한다(호출처가 기본 목적지로 폴백).
 *
 * 1차 거부: "/"로 시작하지 않거나, "//host"(프로토콜 상대 URL)이거나, 백슬래시를 포함하는 값.
 *   백슬래시는 브라우저가 "/"로 정규화해 "/\evil.com"이 "//evil.com"으로 읽히는 우회 경로다.
 *
 * 2차 정규화: URL 파서는 탭/개행 같은 제어문자를 조용히 제거하고 ".." 세그먼트를 접는다.
 *   그 결과 "/\t/evil.com"이나 "/..//evil.com"이 "//evil.com" **경로**로 붕괴할 수 있다.
 *   서버 리다이렉트(`${origin}${path}`)에서는 같은 오리진이라 무해하지만, 같은 값이 클라이언트
 *   라우터로 흘러가면 프로토콜 상대 URL로 해석될 수 있다. 그래서 정규화 결과를 한 번 더
 *   검증하고, 원본이 아닌 **정규화된 경로**를 돌려준다(제어문자도 여기서 함께 제거된다).
 */
export function sanitizeRedirectPath(raw: string | null | undefined): string | null {
  if (!raw) return null
  if (!raw.startsWith('/')) return null
  if (raw.startsWith('//')) return null
  if (raw.includes('\\')) return null

  let normalized: URL
  try {
    normalized = new URL(raw, INTERNAL_BASE)
  } catch {
    return null
  }

  if (normalized.origin !== INTERNAL_BASE) return null
  if (normalized.pathname.startsWith('//')) return null

  return `${normalized.pathname}${normalized.search}${normalized.hash}`
}
