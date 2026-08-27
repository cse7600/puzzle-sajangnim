'use client';

// 홈 = 관제탑. "오늘 뭘 확인하고 뭘 해야 하지?"에 실데이터로 답하는 화면.
// 모든 숫자는 실제 API에서 온다 — 실패하면 가짜 숫자 대신 실패했다고 보여준다.

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Link2,
  Link as LinkIcon,
  MapPin,
  Receipt,
  ShoppingCart,
  Store,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react';
import { useUser } from '@/lib/hooks/useUser';
import type { PlaceRegistration, PlaceRegistrationsResponse } from '../place/types';
import { buildChecklist } from '../place/checklist';

/* ============================== 데이터 모델 ============================== */

type Slice<T> =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; value: T };

type PointsSummary = { total: number; usable: number };
type ActionablePayback = { totalAmount: number; nearestDeadline: string | null };
type AdAccountSummary = { id: string; transfer_status: string };
type TeamEntrySummary = {
  member_id: string;
  quantity: number;
  price_paid: number;
  status: string;
  deal: { id: string; title: string } | null;
  survey: { total: number; answered: number; status: 'none' | 'pending' | 'partial' | 'done' };
};
type ReceiptSummary = {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  points_earned: number;
};

type HomeData = {
  points: Slice<PointsSummary>;
  expectedTotal: Slice<number>;
  actionable: Slice<ActionablePayback>;
  place: Slice<PlaceRegistration | null>;
  adAccounts: Slice<AdAccountSummary[]>;
  teamEntries: Slice<TeamEntrySummary[]>;
  receipts: Slice<ReceiptSummary[]>;
};

const INITIAL_HOME: HomeData = {
  points: { status: 'loading' },
  expectedTotal: { status: 'loading' },
  actionable: { status: 'loading' },
  place: { status: 'loading' },
  adAccounts: { status: 'loading' },
  teamEntries: { status: 'loading' },
  receipts: { status: 'loading' },
};

function formatP(amount: number): string {
  return `${amount.toLocaleString('ko-KR')}P`;
}

function daysUntil(deadline: string): number {
  return Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

/* ============================== 조회 + 파싱 ============================== */

async function fetchSlice<T>(url: string, parse: (body: unknown) => T): Promise<Slice<T>> {
  const res = await fetch(url).catch(() => null);
  if (!res || !res.ok) return { status: 'error' };
  const body: unknown = await res.json().catch(() => undefined);
  if (body === undefined) return { status: 'error' };
  try {
    return { status: 'ready', value: parse(body) };
  } catch (parseError) {
    console.warn(`홈 데이터 파싱 실패: ${url}`, parseError);
    return { status: 'error' };
  }
}

function parsePoints(body: unknown): PointsSummary {
  const summary = body as Partial<PointsSummary>;
  if (typeof summary?.total !== 'number') throw new Error('포인트 요약 형식이 아님');
  return { total: summary.total, usable: typeof summary.usable === 'number' ? summary.usable : 0 };
}

function parseExpectedTotal(body: unknown): number {
  const expected = body as { totalPending?: number };
  if (typeof expected?.totalPending !== 'number') throw new Error('예상 수익 형식이 아님');
  return expected.totalPending;
}

function parseActionable(body: unknown): ActionablePayback {
  const confirmed = body as {
    actionable?: { totalAmount?: number; nearestDeadline?: string | null };
  };
  if (typeof confirmed?.actionable?.totalAmount !== 'number') {
    throw new Error('확정 수익 형식이 아님');
  }
  return {
    totalAmount: confirmed.actionable.totalAmount,
    nearestDeadline: confirmed.actionable.nearestDeadline ?? null,
  };
}

function parseMinePlace(body: unknown): PlaceRegistration | null {
  if (typeof body !== 'object' || body === null || !('mine' in body)) {
    throw new Error('플레이스 응답 형식이 아님');
  }
  return (body as PlaceRegistrationsResponse).mine ?? null;
}

function parseRows<T>(body: unknown, label: string): T[] {
  if (!Array.isArray(body)) throw new Error(`${label} 응답이 배열이 아님`);
  return body as T[];
}

function useHomeData() {
  const [home, setHome] = useState<HomeData>(INITIAL_HOME);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    let active = true;
    setHome(INITIAL_HOME);
    const assign = <K extends keyof HomeData>(key: K, slice: HomeData[K]) => {
      if (active) setHome((prev) => ({ ...prev, [key]: slice }));
    };
    fetchSlice('/api/points/summary', parsePoints).then((slice) => assign('points', slice));
    fetchSlice('/api/earnings?tab=expected', parseExpectedTotal).then((slice) => assign('expectedTotal', slice));
    fetchSlice('/api/earnings?tab=confirmed', parseActionable).then((slice) => assign('actionable', slice));
    fetchSlice('/api/place/register', parseMinePlace).then((slice) => assign('place', slice));
    fetchSlice('/api/ad-accounts', (body) => parseRows<AdAccountSummary>(body, '광고계정')).then((slice) => assign('adAccounts', slice));
    fetchSlice('/api/team-deals/my', (body) => parseRows<TeamEntrySummary>(body, '팀구매')).then((slice) => assign('teamEntries', slice));
    fetchSlice('/api/receipts', (body) => parseRows<ReceiptSummary>(body, '영수증')).then((slice) => assign('receipts', slice));
    return () => {
      active = false;
    };
  }, [reloadTick]);

  return { home, reload: () => setReloadTick((tick) => tick + 1) };
}

/* ============================== 지금 확인할 것 ============================== */

type ActionTone = 'urgent' | 'warn' | 'setup' | 'info';

type ActionEntry = {
  id: string;
  tone: ActionTone;
  icon: LucideIcon;
  title: string;
  detail: string;
  href: string;
  cta: string;
};

function withdrawalAction(slice: Slice<ActionablePayback>): ActionEntry | null {
  if (slice.status !== 'ready' || slice.value.totalAmount <= 0) return null;
  const remaining = slice.value.nearestDeadline ? daysUntil(slice.value.nearestDeadline) : null;
  return {
    id: 'withdrawal',
    tone: 'urgent',
    icon: Banknote,
    title: `출금 신청 가능 ${formatP(slice.value.totalAmount)}`,
    detail:
      remaining !== null && remaining > 0
        ? `D-${remaining} · 기한 내 미신청 시 포인트로 자동 전환됩니다`
        : '수익·정산에서 바로 신청할 수 있어요',
    href: '/earnings?tab=confirmed',
    cta: '출금 신청',
  };
}

function surveyActions(slice: Slice<TeamEntrySummary[]>): ActionEntry[] {
  if (slice.status !== 'ready') return [];
  const needing = slice.value.filter(
    (entry) =>
      entry.status === 'joined' &&
      (entry.survey.status === 'pending' || entry.survey.status === 'partial')
  );
  return needing.slice(0, 2).flatMap((entry) => {
    if (!entry.deal) return [];
    return [
      {
        id: `survey-${entry.member_id}`,
        tone: 'warn' as const,
        icon: ClipboardList,
        title: `「${entry.deal.title}」 추가 정보 입력 필요`,
        detail: `설문 ${entry.survey.answered}/${entry.survey.total} 작성 · 서비스 진행에 필요해요`,
        href: `/team-buy/${entry.deal.id}/survey`,
        cta: '설문 작성',
      },
    ];
  });
}

function placeActions(slice: Slice<PlaceRegistration | null>): ActionEntry[] {
  if (slice.status !== 'ready') return [];
  if (slice.value === null) {
    return [
      {
        id: 'place-register',
        tone: 'setup',
        icon: Store,
        title: '네이버 플레이스를 등록해 주세요',
        detail: '가게 정보 진단과 경쟁 가게 비교가 시작됩니다',
        href: '/place',
        cta: '플레이스 등록',
      },
    ];
  }
  const snapshot = slice.value.latest_snapshot;
  if (!snapshot) return [];
  const undone = buildChecklist(snapshot).items.filter((check) => check.status !== 'done');
  if (undone.length === 0) return [];
  const preview = undone.slice(0, 2).map((check) => check.label).join(' · ');
  return [
    {
      id: 'place-checklist',
      tone: 'warn',
      icon: MapPin,
      title: `플레이스 개선 항목 ${undone.length}건`,
      detail: preview + (undone.length > 2 ? ' 외' : ''),
      href: '/place',
      cta: '진단 보기',
    },
  ];
}

function adAccountActions(slice: Slice<AdAccountSummary[]>): ActionEntry[] {
  if (slice.status !== 'ready') return [];
  if (slice.value.length === 0) {
    return [
      {
        id: 'hub-connect',
        tone: 'setup',
        icon: Link2,
        title: '광고계정을 연동해 주세요',
        detail: '광고비의 최대 5%를 페이백으로 돌려받을 수 있어요',
        href: '/hub',
        cta: '계정 연동',
      },
    ];
  }
  const pendingTransfer = slice.value.filter(
    (account) => account.transfer_status === 'transfer_needed' || account.transfer_status === 'waiting'
  ).length;
  if (pendingTransfer === 0) return [];
  return [
    {
      id: 'hub-transfer',
      tone: 'warn',
      icon: Link2,
      title: `광고계정 ${pendingTransfer}개 이관 대기중`,
      detail: '영업권 이관을 완료해야 페이백 대상이 됩니다',
      href: '/hub',
      cta: '이관 진행',
    },
  ];
}

function receiptAction(slice: Slice<ReceiptSummary[]>): ActionEntry | null {
  if (slice.status !== 'ready') return null;
  const pending = slice.value.filter((receipt) => receipt.status === 'pending');
  if (pending.length === 0) return null;
  const pendingPoints = pending.reduce((sum, receipt) => sum + receipt.points_earned, 0);
  return {
    id: 'receipts-pending',
    tone: 'info',
    icon: Receipt,
    title: `영수증 ${pending.length}건 검토중`,
    detail: `승인되면 +${formatP(pendingPoints)} 적립됩니다`,
    href: '/rewards',
    cta: '내역 보기',
  };
}

// 우선순위: 출금(기한 있음) → 팀구매 설문 → 플레이스 → 광고계정 → 영수증 안내
function buildHomeActions(home: HomeData): ActionEntry[] {
  const actions: ActionEntry[] = [];
  const withdrawal = withdrawalAction(home.actionable);
  if (withdrawal) actions.push(withdrawal);
  actions.push(...surveyActions(home.teamEntries));
  actions.push(...placeActions(home.place));
  actions.push(...adAccountActions(home.adAccounts));
  const receipts = receiptAction(home.receipts);
  if (receipts) actions.push(receipts);
  return actions;
}

/* ============================== 한눈에 보기 ============================== */

type GlanceBody = 'loading' | 'error' | { value: string; sub: string };
type GlanceCardModel = { key: string; label: string; href: string; body: GlanceBody };

function glanceBody<T>(slice: Slice<T>, toBody: (value: T) => { value: string; sub: string }): GlanceBody {
  if (slice.status === 'loading') return 'loading';
  if (slice.status === 'error') return 'error';
  return toBody(slice.value);
}

function withdrawableSub(actionable: ActionablePayback): string {
  if (actionable.totalAmount <= 0) return '출금 가능한 금액이 없어요';
  const remaining = actionable.nearestDeadline ? daysUntil(actionable.nearestDeadline) : null;
  return remaining !== null && remaining > 0 ? `D-${remaining} 이내 신청` : '지금 신청할 수 있어요';
}

function placeGlanceBody(slice: Slice<PlaceRegistration | null>): GlanceBody {
  if (slice.status === 'loading') return 'loading';
  if (slice.status === 'error') return 'error';
  if (slice.value === null) return { value: '미등록', sub: '등록하고 진단 받기' };
  if (!slice.value.latest_snapshot) return { value: '분석 대기', sub: slice.value.name };
  return {
    value: `${buildChecklist(slice.value.latest_snapshot).score}점`,
    sub: slice.value.name,
  };
}

function buildGlanceCards(home: HomeData): GlanceCardModel[] {
  return [
    {
      key: 'points',
      label: '보유 포인트',
      href: '/earnings',
      body: glanceBody(home.points, (points) => ({
        value: formatP(points.total),
        sub: `사용 가능 ${formatP(points.usable)}`,
      })),
    },
    {
      key: 'expected',
      label: '예상 수익',
      href: '/earnings',
      body: glanceBody(home.expectedTotal, (total) => ({
        value: formatP(total),
        sub: total > 0 ? '검토 후 확정됩니다' : '처리중인 수익이 없어요',
      })),
    },
    {
      key: 'withdrawable',
      label: '출금 가능',
      href: '/earnings?tab=confirmed',
      body: glanceBody(home.actionable, (actionable) => ({
        value: formatP(actionable.totalAmount),
        sub: withdrawableSub(actionable),
      })),
    },
    { key: 'place', label: '플레이스 진단', href: '/place', body: placeGlanceBody(home.place) },
  ];
}

function GlanceCard({ card }: { card: GlanceCardModel }) {
  return (
    <Link
      href={card.href}
      className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition hover:border-primary-dark/30 sm:p-5"
    >
      <p className="text-xs font-medium text-gray-500 sm:text-sm">{card.label}</p>
      {card.body === 'loading' ? (
        <div className="mt-3 space-y-2">
          <div className="h-6 w-20 animate-pulse rounded bg-gray-100" />
          <div className="h-3 w-24 animate-pulse rounded bg-gray-100" />
        </div>
      ) : card.body === 'error' ? (
        <>
          <p className="mt-2 text-xl font-semibold text-gray-300 sm:text-2xl">—</p>
          <p className="mt-1 text-xs text-gray-400">불러오지 못했습니다</p>
        </>
      ) : (
        <>
          <p className="mt-2 truncate text-xl font-semibold text-gray-900 sm:text-2xl">
            {card.body.value}
          </p>
          <p className="mt-1 truncate text-xs text-gray-400">{card.body.sub}</p>
        </>
      )}
    </Link>
  );
}

/* ============================== 액션 리스트 UI ============================== */

const TONE_STYLES: Record<ActionTone, { bubble: string; row: string }> = {
  urgent: { bubble: 'bg-primary text-ink', row: 'border-primary-dark/25 bg-accent-bg/40' },
  warn: { bubble: 'bg-amber-50 text-amber-600', row: 'border-gray-100' },
  setup: { bubble: 'bg-accent-bg text-primary-dark', row: 'border-gray-100' },
  info: { bubble: 'bg-gray-100 text-gray-500', row: 'border-gray-100' },
};

function ActionRow({ action }: { action: ActionEntry }) {
  const tone = TONE_STYLES[action.tone];
  const Icon = action.icon;
  return (
    <Link
      href={action.href}
      className={`flex items-center gap-3 rounded-lg border px-3.5 py-3 transition hover:border-primary-dark/40 ${tone.row}`}
    >
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tone.bubble}`}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-gray-900">{action.title}</p>
        <p className="mt-0.5 truncate text-xs text-gray-500">{action.detail}</p>
      </div>
      <span className="hidden shrink-0 items-center gap-0.5 text-xs font-semibold text-primary-dark sm:inline-flex">
        {action.cta}
        <ChevronRight className="h-3.5 w-3.5" />
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-gray-300 sm:hidden" />
    </Link>
  );
}

function ActionSkeletonRows({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="flex animate-pulse items-center gap-3 rounded-lg border border-gray-100 px-3.5 py-3"
        >
          <div className="h-9 w-9 shrink-0 rounded-lg bg-gray-100" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3.5 w-2/5 rounded bg-gray-100" />
            <div className="h-3 w-3/5 rounded bg-gray-100" />
          </div>
        </div>
      ))}
    </>
  );
}

function ActionEmptyState() {
  return (
    <div className="flex flex-col items-center gap-2 py-8 text-center">
      <CheckCircle2 className="h-8 w-8 text-primary-dark/60" />
      <p className="text-sm font-medium text-gray-700">지금 처리할 일이 없어요</p>
      <p className="text-xs text-gray-400">출금·설문·진단 등 확인할 일이 생기면 여기에 표시됩니다</p>
    </div>
  );
}

function ActionErrorNote({ onReload, hasActions }: { onReload: () => void; hasActions: boolean }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5">
      <span className="flex min-w-0 items-center gap-1.5 text-xs text-amber-700">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
        {hasActions
          ? '일부 정보를 불러오지 못해 목록이 완전하지 않을 수 있어요'
          : '확인할 일을 불러오지 못했습니다'}
      </span>
      <button
        onClick={onReload}
        className="shrink-0 text-xs font-semibold text-amber-700 underline underline-offset-2"
      >
        다시 시도
      </button>
    </div>
  );
}

function ActionSection({
  home,
  actions,
  onReload,
}: {
  home: HomeData;
  actions: ActionEntry[];
  onReload: () => void;
}) {
  const slices = Object.values(home);
  const anyLoading = slices.some((slice) => slice.status === 'loading');
  const anyError = slices.some((slice) => slice.status === 'error');
  return (
    <section className="rounded-xl border border-gray-100 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 sm:px-6">
        <h2 className="text-base font-semibold text-gray-900">지금 확인할 것</h2>
        {!anyLoading && actions.length > 0 && (
          <span className="rounded-full bg-accent-bg px-2.5 py-0.5 text-xs font-semibold text-accent-text">
            {actions.length}건
          </span>
        )}
      </div>
      <div className="space-y-2.5 px-5 py-4 sm:px-6">
        {actions.map((action) => (
          <ActionRow key={action.id} action={action} />
        ))}
        {anyLoading && <ActionSkeletonRows count={actions.length > 0 ? 1 : 3} />}
        {!anyLoading && !anyError && actions.length === 0 && <ActionEmptyState />}
        {!anyLoading && anyError && <ActionErrorNote onReload={onReload} hasActions={actions.length > 0} />}
      </div>
    </section>
  );
}

/* ============================== 바로가기 / 내 팀구매 ============================== */

const QUICK_LINKS: { icon: LucideIcon; label: string; href: string }[] = [
  { icon: MapPin, label: '플레이스 최적화', href: '/place' },
  { icon: Link2, label: '연동 허브', href: '/hub' },
  { icon: ShoppingCart, label: '팀 구매', href: '/team-buy' },
  { icon: Receipt, label: '영수증 올리기', href: '/rewards' },
  { icon: LinkIcon, label: '나만의 링크', href: '/my-link' },
  { icon: UtensilsCrossed, label: '한끼 체험단', href: '/experience' },
];

function QuickLinksCard() {
  return (
    <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-base font-semibold text-gray-900">바로가기</h2>
      <div className="mt-4 grid grid-cols-2 gap-2.5">
        {QUICK_LINKS.map((shortcut) => {
          const Icon = shortcut.icon;
          return (
            <Link
              key={shortcut.href}
              href={shortcut.href}
              className="flex items-center gap-2.5 rounded-lg border border-gray-100 px-3 py-2.5 transition hover:border-primary-dark/40 hover:bg-gray-50"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-bg text-primary-dark">
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 truncate text-[13px] font-medium text-gray-700">
                {shortcut.label}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

const TEAM_STATUS_LABELS: Record<string, string> = {
  joined: '신청 완료',
  refunded: '환불됨',
  cancelled: '취소됨',
};

function TeamBuyRow({ entry }: { entry: TeamEntrySummary }) {
  const deal = entry.deal;
  if (!deal) return null;
  const needsSurvey = entry.survey.status === 'pending' || entry.survey.status === 'partial';
  return (
    <li>
      <Link
        href={`/team-buy/${deal.id}`}
        className="flex items-center gap-3 rounded-lg border border-gray-100 px-3 py-2.5 transition hover:border-primary-dark/40"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-gray-800">{deal.title}</p>
          <p className="mt-0.5 text-xs text-gray-400">
            {entry.quantity}개 · {formatP(entry.price_paid)} ·{' '}
            {TEAM_STATUS_LABELS[entry.status] ?? entry.status}
          </p>
        </div>
        {needsSurvey ? (
          <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
            설문 필요
          </span>
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-gray-300" />
        )}
      </Link>
    </li>
  );
}

function TeamBuyBody({ slice }: { slice: Slice<TeamEntrySummary[]> }) {
  if (slice.status === 'loading') {
    return (
      <div className="space-y-2.5">
        {[0, 1].map((row) => (
          <div key={row} className="h-14 animate-pulse rounded-lg bg-gray-100" />
        ))}
      </div>
    );
  }
  if (slice.status === 'error') {
    return <p className="py-4 text-center text-sm text-gray-400">신청 내역을 불러오지 못했습니다</p>;
  }
  const visible = slice.value.filter((entry) => entry.deal !== null).slice(0, 3);
  if (visible.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-gray-200 px-4 py-6 text-center text-sm leading-relaxed text-gray-400">
        아직 참여한 팀 구매가 없어요.
        <br />
        사장님들과 함께 마케팅 서비스를 반값에 이용해 보세요.
      </p>
    );
  }
  return (
    <ul className="space-y-2.5">
      {visible.map((entry) => (
        <TeamBuyRow key={entry.member_id} entry={entry} />
      ))}
    </ul>
  );
}

function MyTeamBuysCard({ slice }: { slice: Slice<TeamEntrySummary[]> }) {
  return (
    <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">내 팀구매</h2>
        <Link
          href="/team-buy"
          className="inline-flex items-center gap-0.5 text-sm font-medium text-primary-dark hover:underline"
        >
          전체 보기
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="mt-4">
        <TeamBuyBody slice={slice} />
      </div>
    </section>
  );
}

/* ============================== 페이지 ============================== */

function GreetingHeader({ actionCount, ready }: { actionCount: number; ready: boolean }) {
  const { user } = useUser();
  const ownerName = user?.profile.name?.trim();
  const businessName = user?.profile.business_name?.trim();
  const dateLabel = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold text-gray-900 sm:text-2xl">
          {ownerName ? `안녕하세요, ${ownerName} 사장님` : '안녕하세요, 사장님'}
        </h1>
        <p className="mt-1 truncate text-sm text-gray-500" suppressHydrationWarning>
          {businessName ? `${businessName} · ` : ''}
          {dateLabel}
        </p>
      </div>
      {ready && actionCount > 0 && (
        <span className="shrink-0 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-ink">
          확인할 일 {actionCount}건
        </span>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { home, reload } = useHomeData();
  const actions = useMemo(() => buildHomeActions(home), [home]);
  const glanceCards = useMemo(() => buildGlanceCards(home), [home]);
  const allReady = Object.values(home).every((slice) => slice.status !== 'loading');

  return (
    <div className="mx-auto max-w-[1200px] space-y-5 sm:space-y-6">
      <GreetingHeader actionCount={actions.length} ready={allReady} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {glanceCards.map((card) => (
          <GlanceCard key={card.key} card={card} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 sm:gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ActionSection home={home} actions={actions} onReload={reload} />
        </div>
        <div className="space-y-5 sm:space-y-6">
          <QuickLinksCard />
          <MyTeamBuysCard slice={home.teamEntries} />
        </div>
      </div>
    </div>
  );
}
