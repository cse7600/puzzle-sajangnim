'use client';

import { useEffect, useState } from 'react';
import { Wallet, Clock, CheckCircle2, Gift } from 'lucide-react';

type EarningItem = {
  label: string;
  amount: number;
  date: string;
};

type EarningSection = {
  key: string;
  label: string;
  amount: number;
  items: EarningItem[];
};

type EarningsResponse = {
  tab: string;
  total: number;
  sections: EarningSection[];
};

type TabKey = 'expected' | 'confirmed' | 'rewards';

const TABS: { key: TabKey; label: string; icon: typeof Clock }[] = [
  { key: 'expected', label: '예상 수익', icon: Clock },
  { key: 'confirmed', label: '확정 수익', icon: CheckCircle2 },
  { key: 'rewards', label: '리워드', icon: Gift },
];

function formatPoint(n: number) {
  return n.toLocaleString('ko-KR') + 'P';
}

function formatDate(iso: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
  });
}

function EarningsSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-xl border border-gray-100 bg-white p-6 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div className="h-4 w-32 rounded bg-gray-100" />
            <div className="h-5 w-20 rounded bg-gray-100" />
          </div>
          <div className="mt-4 space-y-3">
            <div className="h-3 w-full rounded bg-gray-100" />
            <div className="h-3 w-2/3 rounded bg-gray-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

function SectionCard({ section }: { section: EarningSection }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">
          {section.label}
        </h2>
        <span className="text-base font-bold text-gray-900">
          {formatPoint(section.amount)}
        </span>
      </div>
      {section.items.length === 0 ? (
        <p className="mt-4 text-sm text-gray-400">내역이 없습니다</p>
      ) : (
        <ul className="mt-4 divide-y divide-gray-100">
          {section.items.map((row, i) => (
            <li
              key={i}
              className="flex items-center justify-between gap-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm text-gray-700">{row.label}</p>
                <p className="text-xs text-gray-400">{formatDate(row.date)}</p>
              </div>
              <span className="whitespace-nowrap text-sm font-semibold text-gray-900">
                +{formatPoint(row.amount)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function EarningsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('expected');
  const [data, setData] = useState<EarningsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/earnings?tab=${activeTab}`)
      .then((res) => res.json() as Promise<EarningsResponse>)
      .then((body) => {
        if (!cancelled) setData(body);
      })
      .catch(() => {
        if (!cancelled)
          setData({ tab: activeTab, total: 0, sections: [] });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeTab]);

  const total = data?.total ?? 0;
  const hasItems = (data?.sections ?? []).some(
    (section) => section.items.length > 0
  );

  return (
    <div className="px-8 py-6 max-w-[1280px] mx-auto">
      {/* PAGE HEADER */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">수익 현황</h1>
        <p className="mt-1 text-sm text-gray-500">
          예상 수익, 확정 수익, 리워드를 한눈에 확인하세요
        </p>
      </div>

      {/* 총합 카드 */}
      <div className="mb-6 rounded-xl bg-[#0066cc] p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 text-white">
            <Wallet className="h-5 w-5" />
          </span>
          <span className="text-sm font-medium text-white/80">
            {TABS.find((tab) => tab.key === activeTab)?.label} 합계
          </span>
        </div>
        <div className="mt-3 text-3xl font-bold tracking-tight text-white">
          {loading ? (
            <span className="inline-block h-9 w-40 animate-pulse rounded bg-white/20" />
          ) : (
            formatPoint(total)
          )}
        </div>
      </div>

      {/* 탭 */}
      <div className="mb-6 flex gap-6 border-b border-gray-200">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = tab.key === activeTab;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`-mb-px inline-flex items-center gap-2 border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${
                active
                  ? 'border-[#0066cc] text-[#0066cc]'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 본문 */}
      {loading ? (
        <EarningsSkeleton />
      ) : !hasItems ? (
        <div className="rounded-xl border border-gray-100 bg-white p-12 text-center shadow-sm">
          <p className="text-sm text-gray-500">내역이 없습니다</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {(data?.sections ?? []).map((section) => (
            <SectionCard key={section.key} section={section} />
          ))}
        </div>
      )}
    </div>
  );
}
