import { redirect } from 'next/navigation'

// 카카오 전용 인증 체계에서는 별도 회원가입 플로우가 없다 — /login에서 카카오로 로그인하면
// app/auth/callback/route.ts가 신규 유저를 자동 생성하고 온보딩으로 보낸다.
export default function SignupRedirectPage() {
  redirect('/login')
}
