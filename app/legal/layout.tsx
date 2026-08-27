import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-parchment">
      <header className="border-b border-hairline bg-canvas-white">
        <div className="mx-auto flex max-w-[760px] items-center justify-between px-6 py-5">
          <Link href="/" className="text-[15px] font-bold text-ink">
            퍼즐 사장님
          </Link>
          <Link
            href="/"
            className="flex items-center gap-1.5 text-[13px] text-muted transition hover:text-ink"
          >
            <ArrowLeft size={14} strokeWidth={1.8} />
            홈으로
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[760px] px-6 py-16">
        <article className="rounded-lg bg-canvas-white px-6 py-10 sm:px-10 sm:py-14">
          {children}
        </article>
      </main>
    </div>
  );
}
