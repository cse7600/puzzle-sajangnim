'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
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
  '/earnings': '수익 현황',
  '/community': '사장님 모임',
  '/hub': '연동 허브',
  '/settings': '개인 설정',
};

type GateStatus = 'checking' | 'blocked' | 'allowed';

function VerificationGateSkeleton() {
  return (
    <div className="max-w-2xl mx-auto animate-pulse space-y-4">
      <div className="h-6 w-40 bg-[#e5e5ea] rounded" />
      <div className="h-40 w-full bg-[#e5e5ea] rounded-[18px]" />
      <div className="h-40 w-full bg-[#e5e5ea] rounded-[18px]" />
    </div>
  );
}

function useVerificationGate(isSettingsRoute: boolean, pathname: string) {
  const router = useRouter();
  const [status, setStatus] = useState<GateStatus>(isSettingsRoute ? 'allowed' : 'checking');

  useEffect(() => {
    if (isSettingsRoute) {
      setStatus('allowed');
      return;
    }
    let cancelled = false;
    setStatus('checking');
    fetch('/api/business-verification')
      .then(res => res.json())
      .then((body: { status?: string }) => {
        if (cancelled) return;
        if (body.status === 'approved') {
          setStatus('allowed');
        } else {
          setStatus('blocked');
          router.replace('/settings');
        }
      })
      .catch(() => {
        if (cancelled) return;
        setStatus('blocked');
        router.replace('/settings');
      });
    return () => {
      cancelled = true;
    };
  }, [isSettingsRoute, pathname, router]);

  return status;
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isSettingsRoute = pathname.startsWith('/settings');
  const gateStatus = useVerificationGate(isSettingsRoute, pathname);

  const matchedKey = Object.keys(PAGE_TITLES).find((key) =>
    pathname.startsWith(key)
  );
  const title = matchedKey ? PAGE_TITLES[matchedKey] : '대시보드';

  const canRenderContent = isSettingsRoute || gateStatus === 'allowed';

  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar />
      <div className="ml-[240px] flex flex-1 flex-col">
        <AppTopBar title={title} />
        <main className="flex-1 overflow-y-auto bg-[#f9fafb] p-6">
          {canRenderContent ? children : <VerificationGateSkeleton />}
        </main>
      </div>
    </div>
  );
}
