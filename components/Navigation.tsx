'use client';

import { useState } from 'react';
import { Search, Menu, X } from 'lucide-react';

const NAV_LINKS = [
  { label: '대시보드', href: '/dashboard' },
  { label: 'AI블로그', href: '/ai-blog' },
  { label: '플레이스', href: '/place' },
  { label: '체험단', href: '/creators' },
  { label: '팀구매', href: '/team-purchase' },
  { label: '리워드', href: '/rewards' },
  { label: '지식거래소', href: '/knowledge' },
];

export default function Navigation() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50">
      {/* Top black bar — 44px */}
      <div className="h-11 bg-black text-white">
        <div className="mx-auto flex h-full max-w-wide items-center justify-between px-6">
          <a href="/" className="text-nav font-semibold tracking-tight">
            퍼즐 사장님
          </a>
          <div className="flex items-center gap-5">
            <button
              aria-label="검색"
              className="flex items-center text-white/90 transition active:scale-95 hover:text-white"
            >
              <Search size={15} strokeWidth={1.8} />
            </button>
            <a
              href="/login"
              className="text-nav text-white/90 transition hover:text-white"
            >
              로그인
            </a>
          </div>
        </div>
      </div>

      {/* Sub-nav — 52px, blurred parchment, sticky */}
      <div className="h-[52px] border-b border-hairline bg-parchment/80 backdrop-blur-md">
        <div className="mx-auto flex h-full max-w-wide items-center justify-between px-6">
          <span className="text-[15px] font-semibold text-ink">
            SMB 마케팅 슈퍼앱
          </span>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-6 min-[835px]:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-[13px] text-ink/80 transition hover:text-ink"
              >
                {link.label}
              </a>
            ))}
            <a
              href="/signup"
              className="btn-pill btn-primary !px-5 !py-2 !text-[13px]"
            >
              무료 시작
            </a>
          </nav>

          {/* Mobile hamburger — collapses at 834px */}
          <button
            aria-label="메뉴"
            onClick={() => setMobileOpen((v) => !v)}
            className="flex items-center text-ink transition active:scale-95 min-[835px]:hidden"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile collapse panel */}
        {mobileOpen && (
          <div className="border-b border-hairline bg-parchment min-[835px]:hidden">
            <nav className="mx-auto flex max-w-wide flex-col gap-1 px-6 py-4">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="py-2 text-body text-ink/85 transition hover:text-ink"
                >
                  {link.label}
                </a>
              ))}
              <a
                href="/signup"
                onClick={() => setMobileOpen(false)}
                className="btn-pill btn-primary mt-3 w-full"
              >
                무료 시작
              </a>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
