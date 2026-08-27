'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { X } from 'lucide-react';
import { useUser } from '@/lib/hooks/useUser';
import { createBrowserSupabase } from '@/lib/supabase/client';
import { MOBILE_MORE_SECTIONS } from '@/lib/nav-config';

type MoreSheetProps = {
  open: boolean;
  onClose: () => void;
};

async function handleLogout(router: ReturnType<typeof useRouter>) {
  const supabase = createBrowserSupabase();
  await supabase.auth.signOut();
  router.push('/login');
}

export default function MoreSheet({ open, onClose }: MoreSheetProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUser();
  const displayName = user?.profile.name?.trim() || '사장님';
  const businessName = user?.profile.business_name?.trim() || '';

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto rounded-t-[24px] bg-white pb-[calc(env(safe-area-inset-bottom)+16px)] shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-hairline bg-white px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-[13px] font-semibold text-ink">
              {displayName[0]}
            </div>
            <div className="min-w-0">
              <p className="truncate text-[14px] font-semibold text-ink">{displayName} 사장님</p>
              {businessName && (
                <p className="truncate text-[12px] text-muted-light">{businessName}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="rounded-full p-2 text-muted transition active:scale-95"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-3 py-2">
          {MOBILE_MORE_SECTIONS.map((section) => (
            <div key={section.label} className="mb-4">
              <p className="px-3 pb-1.5 pt-2 text-[11px] font-medium uppercase tracking-wider text-muted-light">
                {section.label}
              </p>
              <ul>
                {section.items.map((item) => {
                  const active = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onClose}
                        className={[
                          'flex items-center gap-3 rounded-[11px] px-3 py-3 text-[15px] transition',
                          active
                            ? 'bg-accent-bg font-semibold text-accent-text'
                            : 'text-ink active:bg-parchment',
                        ].join(' ')}
                      >
                        <Icon size={20} />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-hairline px-3 py-3">
          <button
            type="button"
            onClick={() => handleLogout(router)}
            className="w-full rounded-[11px] px-3 py-3 text-left text-[14px] text-muted transition active:bg-parchment"
          >
            로그아웃
          </button>
        </div>
      </div>
    </div>
  );
}
