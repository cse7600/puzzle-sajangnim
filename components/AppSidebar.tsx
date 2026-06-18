'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';

type NavItem = { icon: string; label: string; href: string };
type NavSection = { label: string; items: NavItem[] };

const NAV_SECTIONS: NavSection[] = [
  {
    label: '마케팅 도구',
    items: [
      { icon: '📊', label: '대시보드', href: '/dashboard' },
      { icon: '✍️', label: 'AI 블로그', href: '/ai-blog' },
      { icon: '📍', label: '플레이스 최적화', href: '/place' },
      { icon: '👥', label: '미니 체험단', href: '/experience' },
    ],
  },
  {
    label: '성장 도구',
    items: [
      { icon: '🛒', label: '팀 구매', href: '/team-buy' },
      { icon: '🎁', label: '리워드', href: '/rewards' },
      { icon: '💡', label: '지식 거래소', href: '/knowledge' },
      { icon: '🤝', label: '추천인', href: '/referral' },
    ],
  },
  {
    label: '설정',
    items: [{ icon: '🔗', label: '연동 허브', href: '/hub' }],
  },
];

export default function AppSidebar() {
  const pathname = usePathname();
  const user = getCurrentUser();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-[240px] flex-col bg-[#111827]">
      {/* Logo area */}
      <div className="flex h-16 items-center gap-2 px-5">
        <span className="text-[18px] font-bold text-white">퍼즐 사장님</span>
        <span className="rounded bg-[#0066cc] px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-white">
          BETA
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-2">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="mb-6">
            <p className="px-3 pb-2 text-[11px] font-medium uppercase tracking-wider text-gray-500">
              {section.label}
            </p>
            <ul className="space-y-1">
              {section.items.map((item) => {
                const active = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={[
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-[14px] transition',
                        active
                          ? 'bg-[#0066cc]/15 text-[#60a5fa]'
                          : 'text-gray-400 hover:bg-white/5 hover:text-white',
                      ].join(' ')}
                    >
                      <span className="text-[16px] leading-none">{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* User card */}
      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0066cc] text-[13px] font-semibold text-white">
            {user.name[0]}
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#111827] bg-green-500" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium text-white">
              {user.name} 사장님
            </p>
            <p className="truncate text-[11px] text-gray-500">
              {user.business_name}
            </p>
          </div>
        </div>
        <button
          type="button"
          className="mt-1 w-full rounded-lg px-2 py-1.5 text-left text-[12px] text-gray-500 transition hover:bg-white/5 hover:text-gray-300"
        >
          로그아웃
        </button>
      </div>
    </aside>
  );
}
