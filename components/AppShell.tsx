'use client';

import { usePathname } from 'next/navigation';
import AppSidebar from '@/components/AppSidebar';
import AppTopBar from '@/components/AppTopBar';
import MobileBottomNav from '@/components/MobileBottomNav';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': '홈',
  '/ai-blog': 'AI 블로그',
  '/place': '플레이스 최적화',
  '/experience': '한끼 체험단',
  '/team-buy': '팀 구매',
  '/rewards': '리워드',
  '/knowledge/ask': '질문하기',
  '/knowledge': '오호라!',
  '/referral': '추천인',
  '/earnings': '수익·정산',
  '/hub': '연동 허브',
  '/my-link': '나만의 링크',
  '/settings': '개인 설정',
};

type AppShellProps = {
  qaMode: boolean;
  children: React.ReactNode;
};

export default function AppShell({ qaMode, children }: AppShellProps) {
  const pathname = usePathname();

  const matchedKey = Object.keys(PAGE_TITLES)
    .filter((key) => pathname.startsWith(key))
    .sort((a, b) => b.length - a.length)[0];
  const title = matchedKey ? PAGE_TITLES[matchedKey] : '홈';

  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar />
      <div className="flex flex-1 flex-col lg:ml-[240px]">
        <AppTopBar title={title} qaMode={qaMode} />
        <main className="flex-1 overflow-y-auto bg-[#f9fafb] p-4 pb-28 sm:p-6 lg:pb-6">
          {children}
        </main>
      </div>
      <MobileBottomNav />
    </div>
  );
}
