import AppShell from '@/components/AppShell';
import { isQaModeActive } from '@/lib/auth-server';

// 사업자 인증 게이트는 middleware.ts의 handleVerificationGate에서 서버 사이드로 강제된다.
// (미승인 상태로 보호 페이지 접근 시 /settings로 리다이렉트) — 클라이언트에서 중복 검사하지 않는다.
//
// QA 모드 배지는 서버에서 판단해 클라이언트로 내려준다 — 클라이언트가 쿠키 유무만으로
// 스스로 판단하게 두면 위조된 값으로 배지를 조작할 수 있어 신뢰할 수 없다.
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const qaMode = await isQaModeActive();

  return <AppShell qaMode={qaMode}>{children}</AppShell>;
}
