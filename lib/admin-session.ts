import { SignJWT, jwtVerify, type JWTPayload } from 'jose'

// 미들웨어(Edge)와 API 라우트(Node) 양쪽에서 공유하는 순수 모듈.
// jose는 Edge/Node 모두에서 동작하므로 여기서만 서명/검증 로직을 다룬다.
export const ADMIN_ENTRY_COOKIE = 'admin_entry_session'
export const QA_MODE_COOKIE = 'qa_mode_session'

export const ADMIN_ENTRY_COOKIE_MAX_AGE = 8 * 60 * 60 // 8시간(초)
export const QA_MODE_COOKIE_MAX_AGE = 4 * 60 * 60 // 4시간(초)

interface AdminEntryClaims extends JWTPayload {
  scope: 'admin-entry'
}

interface QaModeClaims extends JWTPayload {
  scope: 'qa'
  uid: string
}

function getSecretKey(): Uint8Array {
  const secret = process.env.ADMIN_SESSION_SECRET
  if (!secret) throw new Error('ADMIN_SESSION_SECRET이 설정되지 않았습니다')
  return new TextEncoder().encode(secret)
}

export async function signAdminEntryToken(): Promise<string> {
  return new SignJWT({ scope: 'admin-entry' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${ADMIN_ENTRY_COOKIE_MAX_AGE}s`)
    .sign(getSecretKey())
}

// 관리자 입장 쿠키가 유효한지 검증한다. 서명이 다르거나 만료·위조된 토큰은 false.
export async function verifyAdminEntryCookie(token: string | undefined): Promise<boolean> {
  if (!token) return false
  try {
    const { payload } = await jwtVerify<AdminEntryClaims>(token, getSecretKey())
    return payload.scope === 'admin-entry'
  } catch {
    return false
  }
}

export async function signQaModeToken(uid: string): Promise<string> {
  return new SignJWT({ scope: 'qa', uid })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${QA_MODE_COOKIE_MAX_AGE}s`)
    .sign(getSecretKey())
}

// QA 쿠키에서 대상 사용자 ID를 꺼낸다. 호출부는 이 값을 admin proof와 반드시 함께
// 검증해야 한다 — 이 함수 단독 통과는 접근을 허용하지 않는다.
//
// uid는 서명이 유효하더라도 반드시 고정된 QA_USER_ID여야 한다. 이 제약이 없으면
// ADMIN_SESSION_SECRET을 아는 주체가 임의의 uid로 쿠키를 서명해 아무 사용자나
// 가장(impersonate)할 수 있다. QA 모드의 의도는 고정 샌드박스 사용자 대행뿐이므로,
// 여기서 uid를 QA_USER_ID로 못박아 임의 가장 경로를 차단한다.
export async function verifyQaModeCookie(token: string | undefined): Promise<string | null> {
  if (!token) return null
  const qaUserId = process.env.QA_USER_ID
  if (!qaUserId) return null
  try {
    const { payload } = await jwtVerify<QaModeClaims>(token, getSecretKey())
    if (payload.scope !== 'qa' || payload.uid !== qaUserId) return null
    return payload.uid
  } catch {
    return null
  }
}
