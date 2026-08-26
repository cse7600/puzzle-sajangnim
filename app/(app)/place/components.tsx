'use client';

import { ArrowUp, ArrowDown, Minus, X } from 'lucide-react';
import type { Signal, Trend, ChartLine } from './types';

export const SIGNAL_STYLES: Record<Signal, { dot: string; ring: string; text: string }> = {
  green: { dot: 'bg-emerald-500', ring: 'ring-emerald-100', text: 'text-emerald-600' },
  yellow: { dot: 'bg-amber-400', ring: 'ring-amber-100', text: 'text-amber-500' },
  red: { dot: 'bg-red-500', ring: 'ring-red-100', text: 'text-red-600' },
};

export function TrendBadge({ trend, delta }: { trend: Trend; delta: number }) {
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

// 카드 형태 회색 박스 스켈레톤 (스피너 단독 금지 — 전역 규칙)
export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-xl border border-gray-100 bg-white p-6 shadow-sm ${className}`}>
      <div className="h-4 w-2/3 rounded bg-gray-100" />
      <div className="mt-4 h-10 w-1/3 rounded bg-gray-100" />
      <div className="mt-3 h-3 w-1/2 rounded bg-gray-100" />
    </div>
  );
}

// 네이버 플레이스 URL 등록 모달 (내 가게 / 경쟁자 공용 — title/description 으로 구분)
export function RegisterModal(props: {
  url: string;
  setUrl: (value: string) => void;
  error: string | null;
  notice: string | null;
  submitting: boolean;
  onClose: () => void;
  onSubmit: () => void;
  title?: string;
  description?: string;
}) {
  const {
    url,
    setUrl,
    error,
    notice,
    submitting,
    onClose,
    onSubmit,
    title = '네이버 플레이스 등록',
    description = '내 가게의 네이버 플레이스 URL을 붙여넣어 주세요. 순위·기본정보를 매일 추적합니다.',
  } = props;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl bg-white"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 p-5">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-3 p-5">
          <p className="text-sm text-gray-500">{description}</p>
          <input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://m.place.naver.com/restaurant/..."
            className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#0066cc] focus:outline-none"
          />
          {error && <p className="text-sm font-medium text-red-600">{error}</p>}
          {notice && <p className="text-sm font-medium text-amber-600">{notice}</p>}
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-100 p-5">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            취소
          </button>
          <button
            onClick={onSubmit}
            disabled={submitting || !url.trim()}
            className="rounded-lg bg-[#0066cc] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#0055aa] disabled:opacity-50"
          >
            {submitting ? '등록 중...' : '등록'}
          </button>
        </div>
      </div>
    </div>
  );
}

// 순위 변동 라인 차트. rank=null(순위권 밖)은 라인 분절 처리.
export function RankChart({ labels, lines }: { labels: string[]; lines: ChartLine[] }) {
  const allRanks = lines.flatMap((line) => line.ranks).filter((rank): rank is number => rank !== null);
  const minRank = allRanks.length ? Math.min(...allRanks) : 1;
  const maxRank = allRanks.length ? Math.max(...allRanks) : 1;
  const chartH = 180;
  const padTop = 12;
  const padBottom = 12;
  const usableH = chartH - padTop - padBottom;
  const colCount = labels.length;

  const yFor = (rank: number) => {
    const ratio = (rank - minRank) / (maxRank - minRank || 1);
    return padTop + ratio * usableH;
  };
  const xFor = (index: number) => (colCount <= 1 ? 0 : (index / (colCount - 1)) * 100);

  return (
    <div className="mt-6 flex gap-3">
      <div
        className="flex w-8 flex-col justify-between text-right text-[10px] text-gray-400"
        style={{ height: chartH }}
      >
        <span>{minRank}위</span>
        <span>{Math.round((minRank + maxRank) / 2)}위</span>
        <span>{maxRank}위</span>
      </div>
      <div className="relative flex-1" style={{ height: chartH }}>
        {[0, 0.5, 1].map((gridline) => (
          <div
            key={gridline}
            className="absolute left-0 right-0 border-t border-dashed border-gray-100"
            style={{ top: padTop + gridline * usableH }}
          />
        ))}
        <svg
          className="absolute inset-0 h-full w-full overflow-visible"
          viewBox="0 0 100 180"
          preserveAspectRatio="none"
        >
          {lines.map((line) =>
            buildSegments(line.ranks).map((segment, segmentIndex) => (
              <polyline
                key={`${line.name}-${segmentIndex}`}
                points={segment.map(({ index, rank }) => `${xFor(index)},${yFor(rank)}`).join(' ')}
                fill="none"
                stroke={line.color}
                strokeWidth={0.8}
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            ))
          )}
        </svg>
        {lines.map((line) =>
          line.ranks.map((rank, index) =>
            rank === null ? null : (
              <span
                key={`${line.name}-${index}`}
                className="absolute h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white"
                style={{ left: `${xFor(index)}%`, top: yFor(rank), backgroundColor: line.color }}
              />
            )
          )
        )}
      </div>
    </div>
  );
}

// null을 경계로 연속 구간을 분리 → polyline이 null로 끊기게 함.
function buildSegments(ranks: (number | null)[]): { index: number; rank: number }[][] {
  const segments: { index: number; rank: number }[][] = [];
  let current: { index: number; rank: number }[] = [];
  ranks.forEach((rank, index) => {
    if (rank === null) {
      if (current.length) segments.push(current);
      current = [];
    } else {
      current.push({ index, rank });
    }
  });
  if (current.length) segments.push(current);
  return segments;
}
