'use client';

import { useEffect, useState, useCallback } from 'react';
import { Wallet, Clock, CheckCircle2, Gift } from 'lucide-react';
import SettlementTable, { PaybackLineItem } from '@/components/earnings/SettlementTable';

type EarningItem = { id: string; label: string; amount: number; unit: 'KRW' | 'P'; date: string; statusLabel: string };
type EarningSection = { key: string; label: string; unit: 'KRW' | 'P'; amount: number; items: EarningItem[] };

type ExpectedData = { tab: 'expected'; totalPending: number; paybacks: PaybackLineItem[]; sections: EarningSection[] };
type ConfirmedData = {
  tab: 'confirmed';
  actionable: { totalAmount: number; nearestDeadline: string | null; paybacks: PaybackLineItem[] };
  realized: { cashTotal: number; pointTotal: number; paybacks: PaybackLineItem[]; sections: EarningSection[] };
};
type RewardsData = { tab: 'rewards'; total: number; sections: EarningSection[] };

type PointSummary = { total: number; usable: number; redeemable: number };

type TabKey = 'expected' | 'confirmed' | 'rewards';

const TABS: { key: TabKey; label: string; icon: typeof Clock }[] = [
  { key: 'expected', label: '예상 수익', icon: Clock },
  { key: 'confirmed', label: '확정 수익', icon: CheckCircle2 },
  { key: 'rewards', label: '리워드', icon: Gift },
];

function formatAmount(n: number, unit: 'KRW' | 'P') {
  return unit === 'KRW' ? `${n.toLocaleString('ko-KR')}원` : `${n.toLocaleString('ko-KR')}P`;
}

function formatDate(iso: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
}

function daysUntil(deadline: string): number {
  return Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function CardSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
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
        <h2 className="text-base font-semibold text-gray-900">{section.label}</h2>
        <span className="text-base font-bold text-gray-900">{formatAmount(section.amount, section.unit)}</span>
      </div>
      {section.items.length === 0 ? (
        <p className="mt-4 text-sm text-gray-400">내역이 없습니다</p>
      ) : (
        <ul className="mt-4 divide-y divide-gray-100">
          {section.items.map((row) => (
            <li key={row.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm text-gray-700">{row.label}</p>
                <p className="text-xs text-gray-400">{formatDate(row.date)}</p>
              </div>
              <span className="whitespace-nowrap text-sm font-semibold text-gray-900">
                +{formatAmount(row.amount, section.unit)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PointSummaryStrip({ summary }: { summary: PointSummary | null }) {
  return (
    <div className="mb-6 rounded-xl bg-primary-dark p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 text-white">
          <Wallet className="h-5 w-5" />
        </span>
        <span className="text-sm font-medium text-white/80">보유 포인트</span>
      </div>
      <div className="mt-3 text-3xl font-bold tracking-tight text-white">
        {summary ? `${summary.total.toLocaleString('ko-KR')}P` : (
          <span className="inline-block h-9 w-40 animate-pulse rounded bg-white/20" />
        )}
      </div>
      <p className="mt-1 text-xs text-white/70">사용 가능 {summary ? `${summary.usable.toLocaleString('ko-KR')}P` : '-'}</p>
    </div>
  );
}

function ExpectedTab({ data, loading }: { data: ExpectedData | null; loading: boolean }) {
  if (loading) return <CardSkeleton />;
  if (!data) return null;
  const hasAny = data.paybacks.length > 0 || data.sections.some((s) => s.items.length > 0);
  if (!hasAny) {
    return (
      <div className="rounded-xl border border-gray-100 bg-white p-12 text-center shadow-sm">
        <p className="text-sm text-gray-500">처리중인 예상 수익이 없습니다</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-gray-400">처리중인 금액은 검토 결과에 따라 달라질 수 있어요.</p>
      {data.paybacks.length > 0 && (
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-gray-900">광고 페이백 (처리중)</h2>
          <SettlementTable paybacks={data.paybacks} showPdfDownload={false} />
        </div>
      )}
      {data.sections.map((section) => (
        <SectionCard key={section.key} section={section} />
      ))}
    </div>
  );
}

function ActionableZone({
  actionable,
  onReload,
}: {
  actionable: ConfirmedData['actionable'];
  onReload: () => void;
}) {
  if (actionable.paybacks.length === 0) return null;
  const remaining = actionable.nearestDeadline ? daysUntil(actionable.nearestDeadline) : null;

  return (
    <div className="rounded-xl border-2 border-primary-dark bg-accent-bg p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-primary-dark">출금 신청 가능 · {actionable.totalAmount.toLocaleString('ko-KR')}P</h2>
        {remaining !== null && (
          <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-primary-dark shadow-sm">
            {remaining > 0 ? `D-${remaining} · 기한 내 미신청 시 포인트로 자동 전환됩니다` : '기한 만료 — 곧 포인트로 전환됩니다'}
          </span>
        )}
      </div>
      <div className="mt-4">
        <SettlementTable paybacks={actionable.paybacks} onWithdrawalRequested={onReload} showPdfDownload={false} />
      </div>
    </div>
  );
}

function RealizedZone({ realized }: { realized: ConfirmedData['realized'] }) {
  const hasAny = realized.paybacks.length > 0 || realized.sections.some((s) => s.items.length > 0);
  if (!hasAny) {
    return (
      <div className="rounded-xl border border-gray-100 bg-white p-12 text-center shadow-sm">
        <p className="text-sm text-gray-500">지급 완료된 내역이 없습니다</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500">현금으로 받은 금액</p>
          <p className="mt-1 text-xl font-bold text-gray-900">₩{realized.cashTotal.toLocaleString('ko-KR')}</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500">포인트로 받은 금액</p>
          <p className="mt-1 text-xl font-bold text-primary-dark">{realized.pointTotal.toLocaleString('ko-KR')}P</p>
        </div>
      </div>
      {realized.paybacks.length > 0 && (
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-gray-900">광고 페이백</h2>
          <SettlementTable paybacks={realized.paybacks} />
        </div>
      )}
      {realized.sections.map((section) => (
        <SectionCard key={section.key} section={section} />
      ))}
    </div>
  );
}

function ConfirmedTab({ data, loading, onReload }: { data: ConfirmedData | null; loading: boolean; onReload: () => void }) {
  if (loading) return <CardSkeleton />;
  if (!data) return null;
  return (
    <div className="flex flex-col gap-4">
      <ActionableZone actionable={data.actionable} onReload={onReload} />
      <RealizedZone realized={data.realized} />
    </div>
  );
}

function RewardsTab({ data, loading }: { data: RewardsData | null; loading: boolean }) {
  if (loading) return <CardSkeleton />;
  if (!data) return null;
  const hasAny = data.sections.some((s) => s.items.length > 0);
  if (!hasAny) {
    return (
      <div className="rounded-xl border border-gray-100 bg-white p-12 text-center shadow-sm">
        <p className="text-sm text-gray-500">적립된 리워드가 없습니다</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      {data.sections.map((section) => (
        <SectionCard key={section.key} section={section} />
      ))}
    </div>
  );
}

export default function EarningsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('expected');
  const [pointSummary, setPointSummary] = useState<PointSummary | null>(null);
  const [expected, setExpected] = useState<ExpectedData | null>(null);
  const [confirmed, setConfirmed] = useState<ConfirmedData | null>(null);
  const [rewards, setRewards] = useState<RewardsData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback((tab: TabKey) => {
    setLoading(true);
    Promise.all([
      fetch('/api/points/summary').then((r) => r.json()),
      fetch(`/api/earnings?tab=${tab}`).then((r) => r.json()),
    ])
      .then(([summary, body]) => {
        setPointSummary(summary);
        if (tab === 'expected') setExpected(body);
        else if (tab === 'confirmed') setConfirmed(body);
        else setRewards(body);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load(activeTab);
  }, [activeTab, load]);

  return (
    <div className="py-2 sm:px-8 sm:py-6 max-w-[1280px] mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">수익·정산</h1>
        <p className="mt-1 text-sm text-gray-500">
          연동 허브의 광고 페이백부터 영수증·추천인·리워드까지, 모든 수익을 한곳에서 확인하세요
        </p>
      </div>

      <PointSummaryStrip summary={pointSummary} />

      <div className="mb-6 flex gap-6 border-b border-gray-200">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = tab.key === activeTab;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`-mb-px inline-flex items-center gap-2 border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${
                active ? 'border-primary-dark text-primary-dark' : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'expected' && <ExpectedTab data={expected} loading={loading} />}
      {activeTab === 'confirmed' && <ConfirmedTab data={confirmed} loading={loading} onReload={() => load('confirmed')} />}
      {activeTab === 'rewards' && <RewardsTab data={rewards} loading={loading} />}
    </div>
  );
}
