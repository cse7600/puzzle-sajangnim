'use client';

import { ArrowUp, ArrowDown, Minus, X } from 'lucide-react';
import type { Signal, Trend, ChartLine, PlaceRegistration } from './types';

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

// 체크리스트 항목 옆에 붙는 작은 썸네일 줄 — "숫자만 말하는 게 아니라 실제로 봤다"는 증거.
// 독립된 큰 갤러리 섹션은 "등록해놓고 뭘 어쩌라는 거냐"는 피드백으로 없앴다.
export function ThumbRow({ urls }: { urls: string[] }) {
  if (urls.length === 0) return null;
  return (
    <div className="mt-1.5 flex gap-1">
      {urls.slice(0, 6).map((url, index) => (
        <img
          key={`${url}-${index}`}
          src={url}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={(event) => {
            // 일부 네이버 CDN(블로그 원본 등)은 리퍼러 없이도 403을 낼 수 있다 —
            // 깨진 이미지 아이콘 대신 타일 자체를 숨긴다.
            event.currentTarget.style.display = 'none';
          }}
          className="h-10 w-10 shrink-0 rounded-md object-cover ring-1 ring-black/5"
        />
      ))}
    </div>
  );
}

// 경쟁자 이름에 마우스 올렸을 때 뜨는 비교 카드 — 클릭 없이 대표 키워드 실목록·소개글·
// 예약연동·메뉴수를 내 가게와 나란히 보여준다. 부모(.group)에 relative 를 걸고 그 안에서 쓴다.
function CompareField({
  label,
  mineValue,
  theirValue,
  unit = '',
}: {
  label: string;
  mineValue: boolean | number | null | undefined;
  theirValue: boolean | number | null | undefined;
  unit?: string;
}) {
  const fmt = (value: boolean | number | null | undefined) => {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'boolean') return value ? '완료' : '미완료';
    return `${value}${unit}`;
  };
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-gray-500">{label}</span>
      <span className="flex items-center gap-1.5 font-medium">
        <span className="text-gray-800">{fmt(theirValue)}</span>
        <span className="text-gray-300">vs 내</span>
        <span className="text-gray-500">{fmt(mineValue)}</span>
      </span>
    </div>
  );
}

export function CompetitorHoverCard({
  competitor,
  mine,
  openUpward = false,
}: {
  competitor: PlaceRegistration;
  mine: PlaceRegistration;
  openUpward?: boolean;
}) {
  const theirs = competitor.latest_snapshot;
  const mines = mine.latest_snapshot;
  const positionClass = openUpward ? 'bottom-full mb-2 -translate-y-1' : 'top-full mt-2 -translate-y-1';
  return (
    <div
      className={`pointer-events-none invisible absolute left-0 ${positionClass} z-30 w-72 rounded-xl border border-gray-200 bg-white p-4 text-left opacity-0 shadow-lg transition duration-150 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100`}
    >
      <p className="truncate text-xs font-semibold text-gray-900">{competitor.name}</p>
      {theirs ? (
        <div className="mt-3 space-y-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">대표 키워드</p>
            {theirs.keyword_list === null ? (
              <p className="mt-1 text-xs text-gray-400">다시 수집하면 표시됩니다</p>
            ) : theirs.keyword_list.length === 0 ? (
              <p className="mt-1 text-xs text-gray-400">설정 안 함</p>
            ) : (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {theirs.keyword_list.map((keyword, index) => (
                  <span
                    key={`${keyword}-${index}`}
                    className="rounded-full bg-accent-bg px-2 py-0.5 text-[11px] font-medium text-primary-dark"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-1.5 border-t border-gray-100 pt-2.5">
            <CompareField label="소개글" mineValue={mines?.has_description} theirValue={theirs.has_description} />
            <CompareField label="예약 연동" mineValue={mines?.has_reservation} theirValue={theirs.has_reservation} />
            <CompareField label="스마트주문" mineValue={mines?.has_smart_order} theirValue={theirs.has_smart_order} />
            <CompareField label="메뉴 등록" mineValue={mines?.menu_count} theirValue={theirs.menu_count} unit="개" />
            <CompareField label="블로그 리뷰" mineValue={mines?.blog_review_count} theirValue={theirs.blog_review_count} unit="건" />
            <CompareField label="쿠폰" mineValue={mines?.coupon_count} theirValue={theirs.coupon_count} unit="개" />
          </div>
        </div>
      ) : (
        <p className="mt-2 text-xs text-gray-400">아직 수집된 정보가 없습니다.</p>
      )}
    </div>
  );
}

// 네이버 플레이스 URL 등록 모달 (내 가게 / 경쟁자 공용 — title/description 으로 구분)
export function RegisterModal(props: {
  url: string;
  setUrl: (value: string) => void;
  error: string | null;
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
            className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary-dark focus:outline-none"
          />
          {error && <p className="text-sm font-medium text-red-600">{error}</p>}
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
            className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-primary-hover disabled:opacity-50"
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
