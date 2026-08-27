'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Menu } from 'lucide-react';
import { MOBILE_PRIMARY_ITEMS } from '@/lib/nav-config';
import MoreSheet from './MoreSheet';

export default function MobileBottomNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-hairline bg-white pb-[env(safe-area-inset-bottom)] lg:hidden"
        aria-label="주요 메뉴"
      >
        {MOBILE_PRIMARY_ITEMS.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                'flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] transition active:scale-95',
                active ? 'text-primary-dark' : 'text-muted-light',
              ].join(' ')}
            >
              <Icon size={22} strokeWidth={active ? 2.4 : 2} />
              <span className={active ? 'font-semibold' : ''}>{item.label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] text-muted-light transition active:scale-95"
          aria-haspopup="dialog"
          aria-expanded={moreOpen}
        >
          <Menu size={22} />
          <span>더보기</span>
        </button>
      </nav>

      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} />
    </>
  );
}
