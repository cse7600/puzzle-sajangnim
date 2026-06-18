import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '퍼즐 사장님 | SMB 마케팅 슈퍼앱',
  description:
    '복잡한 마케팅, 이제 사장님이 직접 합니다. AI 블로그 자동화, 네이버 플레이스 최적화, 미니 체험단, 팀 구매까지 — 네이버 권한 하나면 모든 마케팅이 무료.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
