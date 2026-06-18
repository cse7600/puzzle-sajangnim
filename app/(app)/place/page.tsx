'use client';

import { useState } from 'react';
import {
  RefreshCw,
  Store,
  MapPin,
  Tag,
  CheckCircle2,
  ArrowUp,
  ArrowDown,
  Minus,
  Check,
  AlertTriangle,
  X,
  ChevronRight,
  Sparkles,
  Star,
  Image as ImageIcon,
  MessageSquare,
} from 'lucide-react';

type Signal = 'green' | 'yellow' | 'red';
type Trend = 'up' | 'down' | 'flat';

interface KeywordRank {
  keyword: string;
  signal: Signal;
  rank: number;
  trend: Trend;
  delta: number;
}

interface ChecklistItem {
  status: 'done' | 'warn' | 'fail';
  label: string;
  detail?: string;
  action?: string;
}

interface Competitor {
  rank: number;
  name: string;
  reviews: number;
  photos: number;
  rating: number;
  isMine?: boolean;
}

const KEYWORDS: KeywordRank[] = [
  { keyword: '을지로 쌈밥', signal: 'green', rank: 3, trend: 'up', delta: 2 },
  { keyword: '중구 점심 한식', signal: 'yellow', rank: 11, trend: 'flat', delta: 0 },
  { keyword: '을지로 맛집', signal: 'red', rank: 28, trend: 'down', delta: 3 },
];

const CHECKLIST: ChecklistItem[] = [
  { status: 'done', label: '사진 20장 이상 등록', detail: '완료' },
  { status: 'done', label: '영업시간 최신화', detail: '완료' },
  { status: 'warn', label: '리뷰 응답률 64%', detail: '목표 80%', action: '바로가기' },
  { status: 'fail', label: '메뉴 가격 미업데이트', detail: '6개월 경과', action: '수정하기' },
  { status: 'fail', label: '예약 기능 미사용', action: '설정하기' },
];

const COMPETITORS: Competitor[] = [
  { rank: 1, name: '을지면옥 본점', reviews: 4820, photos: 312, rating: 4.6 },
  { rank: 2, name: '충무로 한정식', reviews: 2104, photos: 198, rating: 4.5 },
  { rank: 3, name: '을지로 쌈밥 철수네', reviews: 1342, photos: 156, rating: 4.7, isMine: true },
  { rank: 4, name: '광장시장 보쌈집', reviews: 1188, photos: 142, rating: 4.3 },
  { rank: 5, name: '명동 손칼국수', reviews: 967, photos: 88, rating: 4.4 },
];

// 30-day rank trend per keyword (rank 1 = best). Lower is better.
const TREND_DATA = {
  labels: ['5/20', '5/25', '5/30', '6/4', '6/9', '6/14', '6/18'],
  series: [
    { name: '을지로 쌈밥', color: '#0066cc', ranks: [7, 6, 5, 4, 5, 4, 3] },
    { name: '중구 점심 한식', color: '#f59e0b', ranks: [9, 10, 12, 11, 13, 12, 11] },
    { name: '을지로 맛집', color: '#ef4444', ranks: [22, 24, 23, 26, 25, 27, 28] },
  ],
};

const SIGNAL_STYLES: Record<Signal, { dot: string; ring: string; text: string }> = {
  green: { dot: 'bg-emerald-500', ring: 'ring-emerald-100', text: 'text-emerald-600' },
  yellow: { dot: 'bg-amber-400', ring: 'ring-amber-100', text: 'text-amber-500' },
  red: { dot: 'bg-red-500', ring: 'ring-red-100', text: 'text-red-600' },
};

function TrendBadge({ trend, delta }: { trend: Trend; delta: number }) {
  if (trend === 'up') {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-md bg-emerald-50 px-1.5 py-0.5 text-xs font-semibold text-emerald-600">
        <ArrowUp className="h-3 w-3" />
        {delta}
      </span>
    );
  }
  if (trend === 'down') {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-md bg-red-50 px-1.5 py-0.5 text-xs font-semibold text-red-600">
        <ArrowDown className="h-3 w-3" />
        {delta}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 rounded-md bg-gray-100 px-1.5 py-0.5 text-xs font-semibold text-gray-500">
      <Minus className="h-3 w-3" />
      {delta}
    </span>
  );
}

export default function PlacePage() {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1200);
  };

  // Chart geometry
  const allRanks = TREND_DATA.series.flatMap((s) => s.ranks);
  const minRank = Math.min(...allRanks);
  const maxRank = Math.max(...allRanks);
  const chartH = 180;
  const padTop = 12;
  const padBottom = 12;
  const usableH = chartH - padTop - padBottom;
  const colCount = TREND_DATA.labels.length;

  const yFor = (rank: number) => {
    // rank 1 (best) near top -> small y. Higher rank number -> lower position.
    const ratio = (rank - minRank) / (maxRank - minRank || 1);
    return padTop + ratio * usableH;
  };
  const xFor = (i: number) => (i / (colCount - 1)) * 100;

  return (
    <div className="mx-auto max-w-[1280px] space-y-6">
      {/* PAGE HEADER */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">플레이스 최적화</h1>
          <p className="mt-1 text-sm text-gray-500">
            내 가게의 네이버 노출 순위를 실시간으로 관리하세요
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-[#0066cc] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[#0055aa] disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? '새로고침 중...' : '데이터 새로고침'}
        </button>
      </div>

      {/* 가게 정보 BAR */}
      <div className="flex flex-wrap items-center gap-x-8 gap-y-3 rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <Store className="h-4 w-4 text-gray-400" />
          <span className="text-base font-bold text-gray-900">을지로 쌈밥 철수네</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <MapPin className="h-4 w-4 text-gray-400" />
          서울 중구 을지로 123
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Tag className="h-4 w-4 text-gray-400" />
          한식 / 쌈밥
        </div>
        <div className="flex items-center gap-2 text-sm font-medium text-emerald-600">
          <CheckCircle2 className="h-4 w-4" />
          네이버 연동 완료
        </div>
        <button className="ml-auto text-sm font-medium text-[#0066cc] hover:underline">
          가게 정보 수정
        </button>
      </div>

      {/* 키워드 순위 PANEL */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {KEYWORDS.map((k) => {
          const s = SIGNAL_STYLES[k.signal];
          return (
            <div
              key={k.keyword}
              className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">{k.keyword}</span>
                <span
                  className={`h-4 w-4 rounded-full ${s.dot} ring-4 ${s.ring}`}
                  aria-label={`신호 ${k.signal}`}
                />
              </div>
              <div className="mt-4 flex items-end gap-2">
                <span className="text-[48px] font-bold leading-none text-gray-900">
                  {k.rank}
                </span>
                <span className="pb-1 text-lg font-semibold text-gray-400">위</span>
                <div className="ml-auto pb-1">
                  <TrendBadge trend={k.trend} delta={k.delta} />
                </div>
              </div>
              <p className="mt-3 text-xs text-gray-400">
                {k.trend === 'up'
                  ? '지난주 대비 순위 상승 중'
                  : k.trend === 'down'
                    ? '순위 하락 — 개선이 필요해요'
                    : '순위 변동 없음'}
              </p>
            </div>
          );
        })}
      </div>

      {/* 2-COLUMN: 개선 진단 + 경쟁자 분석 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* LEFT — 개선 진단 */}
        <div className="flex flex-col rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">개선 진단 체크리스트</h2>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-[#0066cc]">62</span>
              <span className="text-sm font-medium text-gray-400">/100</span>
            </div>
          </div>

          {/* score bar */}
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div className="h-full rounded-full bg-[#0066cc]" style={{ width: '62%' }} />
          </div>

          <ul className="mt-5 flex-1 space-y-2.5">
            {CHECKLIST.map((item, i) => {
              const isDone = item.status === 'done';
              const isWarn = item.status === 'warn';
              return (
                <li
                  key={i}
                  className="flex items-center gap-3 rounded-lg border border-gray-100 px-3 py-2.5"
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                      isDone
                        ? 'bg-emerald-50 text-emerald-600'
                        : isWarn
                          ? 'bg-amber-50 text-amber-500'
                          : 'bg-red-50 text-red-500'
                    }`}
                  >
                    {isDone ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : isWarn ? (
                      <AlertTriangle className="h-3.5 w-3.5" />
                    ) : (
                      <X className="h-3.5 w-3.5" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`truncate text-sm font-medium ${
                        isDone ? 'text-gray-500' : 'text-gray-900'
                      }`}
                    >
                      {item.label}
                    </p>
                    {item.detail && (
                      <p className="text-xs text-gray-400">{item.detail}</p>
                    )}
                  </div>
                  {item.action && (
                    <button className="inline-flex shrink-0 items-center gap-0.5 text-xs font-semibold text-[#0066cc] hover:underline">
                      {item.action}
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>

          <button className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#0066cc] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0055aa]">
            <Sparkles className="h-4 w-4" />
            자동 최적화 시작
          </button>
        </div>

        {/* RIGHT — 경쟁자 분석 */}
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">내 가게 vs 경쟁자</h2>
            <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-[#0066cc]">
              &lsquo;을지로 쌈밥&rsquo; 기준
            </span>
          </div>

          <div className="mt-4 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-medium text-gray-400">
                  <th className="pb-2 pl-3 font-medium">순위</th>
                  <th className="pb-2 font-medium">가게명</th>
                  <th className="pb-2 text-right font-medium">리뷰수</th>
                  <th className="pb-2 text-right font-medium">사진</th>
                  <th className="pb-2 pr-1 text-right font-medium">평점</th>
                </tr>
              </thead>
              <tbody>
                {COMPETITORS.map((c) => (
                  <tr
                    key={c.rank}
                    className={`border-b border-gray-50 last:border-0 ${
                      c.isMine ? 'bg-blue-50/50' : ''
                    }`}
                  >
                    <td
                      className={`py-3 pl-3 ${
                        c.isMine ? 'border-l-2 border-[#0066cc]' : 'border-l-2 border-transparent'
                      }`}
                    >
                      <span className="font-semibold text-gray-700">{c.rank}</span>
                    </td>
                    <td className="py-3 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`truncate ${
                            c.isMine ? 'font-bold text-[#0066cc]' : 'font-medium text-gray-800'
                          }`}
                        >
                          {c.name}
                        </span>
                        {c.isMine && (
                          <span className="shrink-0 rounded bg-[#0066cc] px-1.5 py-0.5 text-[10px] font-semibold text-white">
                            내 가게
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 text-right tabular-nums text-gray-600">
                      {c.reviews.toLocaleString()}
                    </td>
                    <td className="py-3 text-right tabular-nums text-gray-600">{c.photos}</td>
                    <td className="py-3 pr-1 text-right">
                      <span className="inline-flex items-center gap-0.5 tabular-nums font-medium text-gray-800">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        {c.rating}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center gap-4 rounded-lg bg-gray-50 px-4 py-3 text-xs text-gray-500">
            <span className="inline-flex items-center gap-1">
              <MessageSquare className="h-3.5 w-3.5 text-gray-400" />
              리뷰수 1위와 격차 <b className="text-gray-700">-3,478</b>
            </span>
            <span className="inline-flex items-center gap-1">
              <ImageIcon className="h-3.5 w-3.5 text-gray-400" />
              사진 보강 추천 <b className="text-gray-700">+44장</b>
            </span>
          </div>
        </div>
      </div>

      {/* 순위 변동 그래프 */}
      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900">순위 변동 추이</h2>
            <p className="mt-0.5 text-xs text-gray-400">최근 30일 키워드별 노출 순위 (낮을수록 상위)</p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            {TREND_DATA.series.map((s) => (
              <div key={s.name} className="flex items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: s.color }}
                />
                <span className="text-xs font-medium text-gray-600">{s.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Chart */}
        <div className="mt-6 flex gap-3">
          {/* Y axis labels */}
          <div
            className="flex w-8 flex-col justify-between text-right text-[10px] text-gray-400"
            style={{ height: chartH }}
          >
            <span>{minRank}위</span>
            <span>{Math.round((minRank + maxRank) / 2)}위</span>
            <span>{maxRank}위</span>
          </div>

          {/* Plot area */}
          <div className="relative flex-1" style={{ height: chartH }}>
            {/* gridlines */}
            {[0, 0.5, 1].map((g) => (
              <div
                key={g}
                className="absolute left-0 right-0 border-t border-dashed border-gray-100"
                style={{ top: padTop + g * usableH }}
              />
            ))}

            {/* lines + points via SVG overlay */}
            <svg
              className="absolute inset-0 h-full w-full overflow-visible"
              viewBox="0 0 100 180"
              preserveAspectRatio="none"
            >
              {TREND_DATA.series.map((s) => {
                const points = s.ranks
                  .map((r, i) => `${xFor(i)},${yFor(r)}`)
                  .join(' ');
                return (
                  <polyline
                    key={s.name}
                    points={points}
                    fill="none"
                    stroke={s.color}
                    strokeWidth={0.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                  />
                );
              })}
            </svg>

            {/* point dots (non-stretched) */}
            {TREND_DATA.series.map((s) =>
              s.ranks.map((r, i) => (
                <span
                  key={`${s.name}-${i}`}
                  className="absolute h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white"
                  style={{
                    left: `${xFor(i)}%`,
                    top: yFor(r),
                    backgroundColor: s.color,
                  }}
                />
              ))
            )}
          </div>
        </div>

        {/* X axis labels */}
        <div className="ml-11 mt-2 flex justify-between text-[10px] text-gray-400">
          {TREND_DATA.labels.map((l) => (
            <span key={l}>{l}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
