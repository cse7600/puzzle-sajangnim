'use client';

import { useState } from 'react';
import { Bell, Menu } from 'lucide-react';

type AppTopBarProps = {
  title: string;
};

export default function AppTopBar({ title }: AppTopBarProps) {
  const [, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-100 bg-white px-6">
      {/* Left: hamburger (mobile) + breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="메뉴"
          onClick={() => setMobileOpen((v) => !v)}
          className="flex items-center text-gray-600 transition active:scale-95 lg:hidden"
        >
          <Menu size={22} />
        </button>
        <div className="flex items-center gap-1.5 text-[14px]">
          <span className="text-gray-400">퍼즐 사장님</span>
          <span className="text-gray-300">›</span>
          <span className="font-semibold text-gray-900">{title}</span>
        </div>
      </div>

      {/* Right: notifications + points + avatar */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          aria-label="알림"
          className="relative flex h-9 w-9 items-center justify-center rounded-full text-gray-600 transition hover:bg-gray-100"
        >
          <Bell size={18} />
          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            3
          </span>
        </button>

        <span className="rounded-full bg-[#0066cc]/10 px-3 py-1.5 text-[13px] font-semibold text-[#0066cc]">
          23,400P
        </span>

        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0066cc] text-[13px] font-semibold text-white">
          김
        </div>
      </div>
    </header>
  );
}
