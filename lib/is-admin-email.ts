// 미들웨어(Edge)와 서버 컴포넌트/라우트 양쪽에서 공유하는 순수 함수.
// next/headers 등 런타임 종속 모듈을 import하지 않아야 Edge 미들웨어 번들에 안전하게 포함된다.
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  const adminEmails = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
  return adminEmails.includes(email.trim().toLowerCase())
}
