'use client';

import { usePathname } from 'next/navigation';
import AppSidebar from '@/components/AppSidebar';
import AppTopBar from '@/components/AppTopBar';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': '대시보드',
  '/ai-blog': 'AI 블로그',
  '/place': '플레이스 최적화',
  '/experience': '미니 체험단',
  '/team-buy': '팀 구매',
  '/rewards': '리워드',
  '/knowledge': '지식 거래소',
  '/referral': '추천인',
  '/hub': '연동 허브',
};

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const matchedKey = Object.keys(PAGE_TITLES).find((key) =>
    pathname.startsWith(key)
  );
  const title = matchedKey ? PAGE_TITLES[matchedKey] : '대시보드';

  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar />
      <div className="ml-[240px] flex flex-1 flex-col">
        <AppTopBar title={title} />
        <main className="flex-1 overflow-y-auto bg-[#f9fafb] p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
