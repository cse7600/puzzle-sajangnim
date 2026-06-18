'use client';

import { useEffect, useState } from 'react';
import {
  Users,
  Crown,
  Clock,
  Flame,
  Share2,
  Link2,
  ChevronRight,
  Check,
} from 'lucide-react';
import {
  JoinTeamModal,
  CreateTeamModal,
  ShareModal,
} from '@/components/modals/TeamBuyModals';

const LEADER_DEAL_LINK = 'https://puzzle.kr/team-buy/landing-3pack';
const PARTICIPATING_DEAL_LINK = 'https://puzzle.kr/team-buy/press-package';

// useCountdown — initializes to 0 then sets real value in effect to avoid
// hydration mismatch between server and client render.
function useCountdown(targetMs: number) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const target = Date.now() + targetMs;
    const tick = () => {
      const diff = Math.max(0, target - Date.now());
      setRemaining(diff);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetMs]);

  return remaining;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  if (days > 0) {
    return `${days}일 ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;

type Tab = '진행 중' | '구매 가능' | '완료';

const AVATAR_COLORS = [
  'bg-[#0066cc]',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-violet-500',
];

const AVATAR_NAMES = ['김', '이', '박', '최', '정'];

function AvatarStack({ filled, total }: { filled: number; total: number }) {
  return (
    <div className="flex -space-x-2">
      {Array.from({ length: total }).map((_, i) => {
        const isFilled = i < filled;
        return (
          <div
            key={i}
            className={`flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-[11px] font-semibold text-white ${
              isFilled ? AVATAR_COLORS[i % AVATAR_COLORS.length] : 'bg-gray-200'
            }`}
          >
            {isFilled ? AVATAR_NAMES[i % AVATAR_NAMES.length] : ''}
          </div>
        );
      })}
    </div>
  );
}

function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
      <div
        className="h-full rounded-full bg-[#0066cc] transition-all"
        style={{ width: `${Math.min(100, percent)}%` }}
      />
    </div>
  );
}

// Card 1 — leader deal with full countdown + urgency
function LeaderDealCard({
  onShare,
}: {
  onShare: (title: string, link: string) => void;
}) {
  const remaining = useCountdown(2 * 86400_000 + 3 * 3600_000 + 14 * 60_000 + 52_000);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(LEADER_DEAL_LINK);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard may be unavailable; ignore silently.
    }
  };

  return (
    <div className="flex flex-col rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-900 px-2.5 py-1 text-xs font-semibold text-white">
            <Crown className="h-3 w-3" />
            내가 팀장
          </span>
          <h3 className="mt-3 text-lg font-semibold text-gray-900">
            랜딩페이지 제작 3팩
          </h3>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-600">
          <Flame className="h-3 w-3" />
          1명만 더!
        </span>
      </div>

      <div className="mb-4 flex items-end gap-3">
        <div className="text-3xl font-bold text-[#0066cc]">{won(396000)}</div>
        <div className="pb-1">
          <div className="text-sm text-gray-400 line-through">{won(1200000)}</div>
          <div className="text-xs font-semibold text-emerald-600">67% 할인</div>
        </div>
      </div>

      <div className="mb-4 rounded-lg bg-gray-50 p-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="flex items-center gap-1.5 font-medium text-gray-700">
            <Users className="h-4 w-4 text-gray-400" />
            참여 현황
          </span>
          <span className="font-semibold text-gray-900">4/5명</span>
        </div>
        <ProgressBar percent={80} />
        <div className="mt-3 flex items-center justify-between">
          <AvatarStack filled={4} total={5} />
          <span className="text-xs text-gray-500">80% 달성</span>
        </div>
      </div>

      <div className="mb-5 flex items-center gap-2 rounded-lg border border-orange-100 bg-orange-50 px-3 py-2.5">
        <Clock className="h-4 w-4 text-orange-500" />
        <span className="text-sm text-gray-600">마감까지</span>
        <span
          suppressHydrationWarning
          className="ml-auto font-mono text-sm font-bold tabular-nums text-orange-600"
        >
          {formatCountdown(remaining)}
        </span>
      </div>

      <div className="mt-auto flex gap-2">
        <button
          onClick={() => onShare('랜딩페이지 제작 3팩', LEADER_DEAL_LINK)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#FEE500] px-4 py-2.5 text-sm font-semibold text-[#3C1E1E] transition hover:brightness-95"
        >
          <Share2 className="h-4 w-4" />
          카카오톡 공유
        </button>
        <button
          onClick={handleCopy}
          className="flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 text-emerald-500" />
              복사됨!
            </>
          ) : (
            <>
              <Link2 className="h-4 w-4" />
              링크 복사
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// Card 2 — participating deal
function ParticipatingDealCard({
  onShare,
}: {
  onShare: (title: string, link: string) => void;
}) {
  const remaining = useCountdown(5 * 86400_000 + 14 * 3600_000);

  return (
    <div className="flex flex-col rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-[#0066cc]">
            <Check className="h-3 w-3" />
            참여 중
          </span>
          <h3 className="mt-3 text-lg font-semibold text-gray-900">
            언론 보도 패키지
          </h3>
        </div>
      </div>

      <div className="mb-4 flex items-end gap-3">
        <div className="text-3xl font-bold text-[#0066cc]">{won(400000)}</div>
        <div className="pb-1">
          <div className="text-sm text-gray-400 line-through">{won(800000)}</div>
          <div className="text-xs font-semibold text-emerald-600">50% 할인</div>
        </div>
      </div>

      <div className="mb-5 rounded-lg bg-gray-50 p-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="flex items-center gap-1.5 font-medium text-gray-700">
            <Users className="h-4 w-4 text-gray-400" />
            참여 현황
          </span>
          <span className="font-semibold text-gray-900">2/3명</span>
        </div>
        <ProgressBar percent={67} />
        <div className="mt-3 flex items-center justify-between">
          <AvatarStack filled={2} total={3} />
          <span
            suppressHydrationWarning
            className="font-mono text-xs font-semibold text-gray-500"
          >
            {formatCountdown(remaining)}
          </span>
        </div>
      </div>

      <button
        onClick={() => onShare('언론 보도 패키지', PARTICIPATING_DEAL_LINK)}
        className="mt-auto flex items-center justify-center gap-1.5 rounded-lg bg-[#FEE500] px-4 py-2.5 text-sm font-semibold text-[#3C1E1E] transition hover:brightness-95"
      >
        <Share2 className="h-4 w-4" />
        카카오톡 공유
      </button>
    </div>
  );
}

type Product = {
  emoji: string;
  name: string;
  list: number;
  team: number;
  needed: number;
  discount: number;
  joined: number; // 0 = no team yet
};

const PRODUCTS: Product[] = [
  { emoji: '🖥️', name: '랜딩페이지 1팩', list: 400000, team: 220000, needed: 3, discount: 45, joined: 1 },
  { emoji: '🎨', name: 'SNS 크리에이티브 5종', list: 350000, team: 140000, needed: 5, discount: 60, joined: 3 },
  { emoji: '💬', name: '카카오싱크 도입', list: 600000, team: 300000, needed: 3, discount: 50, joined: 0 },
  { emoji: '✍️', name: '블로그 바이럴 10건', list: 500000, team: 175000, needed: 4, discount: 65, joined: 2 },
  { emoji: '🏢', name: '법인설립 대행', list: 450000, team: 250000, needed: 3, discount: 44, joined: 0 },
  { emoji: '📊', name: 'MMP 컨설팅', list: 1500000, team: 600000, needed: 4, discount: 60, joined: 1 },
  { emoji: '📸', name: '인스타 광고 3개월', list: 900000, team: 360000, needed: 5, discount: 60, joined: 4 },
  { emoji: '🔍', name: '구글광고 최적화', list: 700000, team: 280000, needed: 4, discount: 60, joined: 0 },
];

function ProductCard({
  product,
  onJoin,
  onCreate,
}: {
  product: Product;
  onJoin: (product: Product) => void;
  onCreate: (product: Product) => void;
}) {
  const hasTeam = product.joined > 0;
  const percent = Math.round((product.joined / product.needed) * 100);

  return (
    <div className="flex flex-col rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition hover:border-gray-200 hover:shadow-md">
      <div className="mb-3 text-3xl">{product.emoji}</div>
      <h4 className="mb-2 text-[15px] font-semibold leading-snug text-gray-900">
        {product.name}
      </h4>

      <div className="mb-1 text-xs text-gray-400 line-through">
        {won(product.list)}
      </div>
      <div className="mb-3 text-xl font-bold text-[#0066cc]">
        {won(product.team)}
      </div>

      <div className="mb-3 flex items-center gap-2 text-xs">
        <span className="rounded-md bg-gray-100 px-2 py-0.5 font-medium text-gray-600">
          {product.needed}명 필요
        </span>
        <span className="rounded-md bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-600">
          {product.discount}% 할인
        </span>
      </div>

      {hasTeam ? (
        <div className="mb-4">
          <div className="mb-1.5 flex items-center justify-between text-xs text-gray-500">
            <span>{product.joined}/{product.needed}명 모집 중</span>
            <span className="font-semibold text-[#0066cc]">{percent}%</span>
          </div>
          <ProgressBar percent={percent} />
        </div>
      ) : (
        <div className="mb-4 text-xs text-gray-400">아직 팀이 없어요</div>
      )}

      <button
        onClick={() => (hasTeam ? onJoin(product) : onCreate(product))}
        className={`mt-auto w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
          hasTeam
            ? 'bg-[#0066cc] text-white hover:bg-[#0055aa]'
            : 'border border-[#0066cc] text-[#0066cc] hover:bg-blue-50'
        }`}
      >
        {hasTeam ? '참여하기' : '팀 만들기'}
      </button>
    </div>
  );
}

export default function TeamBuyPage() {
  const [activeTab, setActiveTab] = useState<Tab>('진행 중');
  const tabs: Tab[] = ['진행 중', '구매 가능', '완료'];

  const [showJoin, setShowJoin] = useState<{
    open: boolean;
    product: Product | null;
  }>({ open: false, product: null });
  const [showCreate, setShowCreate] = useState<{
    open: boolean;
    product: Product | null;
  }>({ open: false, product: null });
  const [showShare, setShowShare] = useState<{
    open: boolean;
    title: string;
    link: string;
  }>({ open: false, title: '', link: '' });

  const openShare = (title: string, link: string) =>
    setShowShare({ open: true, title, link });

  return (
    <div className="mx-auto max-w-7xl">
      {/* PAGE HEADER */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">팀 구매</h1>
          <p className="mt-1 text-sm text-gray-500">
            3~5명이 함께 구매하면 최대 70% 할인
          </p>
        </div>
        <button className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50">
          전체 상품 보기
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* TABS */}
      <div className="mb-6 flex gap-1 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`relative px-4 py-2.5 text-sm font-medium transition ${
              activeTab === tab
                ? 'text-[#0066cc]'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
            {activeTab === tab && (
              <span className="absolute inset-x-0 -bottom-px h-0.5 bg-[#0066cc]" />
            )}
          </button>
        ))}
      </div>

      {/* SECTION: 진행 중인 팀 구매 */}
      <section className="mb-10">
        <h2 className="mb-4 text-base font-semibold text-gray-900">
          진행 중인 팀 구매
        </h2>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <LeaderDealCard onShare={openShare} />
          <ParticipatingDealCard onShare={openShare} />
        </div>
      </section>

      {/* SECTION: 구매 가능한 상품 */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">
            구매 가능한 상품
          </h2>
          <span className="text-sm text-gray-400">{PRODUCTS.length}개 상품</span>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {PRODUCTS.map((product) => (
            <ProductCard
              key={product.name}
              product={product}
              onJoin={(p) => setShowJoin({ open: true, product: p })}
              onCreate={(p) => setShowCreate({ open: true, product: p })}
            />
          ))}
        </div>
      </section>

      {/* MODALS */}
      <JoinTeamModal
        isOpen={showJoin.open}
        product={showJoin.product}
        onClose={() => setShowJoin({ open: false, product: null })}
      />
      <CreateTeamModal
        isOpen={showCreate.open}
        product={showCreate.product}
        onClose={() => setShowCreate({ open: false, product: null })}
      />
      <ShareModal
        isOpen={showShare.open}
        title={showShare.title}
        link={showShare.link}
        onClose={() => setShowShare({ open: false, title: '', link: '' })}
      />
    </div>
  );
}
