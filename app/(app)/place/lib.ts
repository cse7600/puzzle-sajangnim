// 순위 데이터 → UI 모델 변환 로직 (signal/trend/delta, 차트 시계열)

import type {
  Signal,
  Trend,
  KeywordWithRank,
  RankingSeries,
  KeywordCard,
  ChartLine,
} from './types';

const KEYWORD_COLORS = ['#0066cc', '#f59e0b', '#ef4444', '#10b981', '#8b5cf6'];

// 최신 rank 임계값 → 신호색. null(순위권 밖)은 red.
export function rankToSignal(rank: number | null): Signal {
  if (rank === null) return 'red';
  if (rank < 10) return 'green';
  if (rank < 20) return 'yellow';
  return 'red';
}

// 직전 스냅샷 대비 순위 변화. rank가 줄면 상승(up).
function rankTrend(points: { rank: number | null }[]): { trend: Trend; delta: number } {
  const ranked = points.filter((point) => point.rank !== null);
  if (ranked.length < 2) return { trend: 'flat', delta: 0 };
  const current = ranked[ranked.length - 1].rank as number;
  const previous = ranked[ranked.length - 2].rank as number;
  const diff = previous - current;
  if (diff > 0) return { trend: 'up', delta: diff };
  if (diff < 0) return { trend: 'down', delta: -diff };
  return { trend: 'flat', delta: 0 };
}

// 키워드 목록 + 순위 시계열 → 카드 모델. series는 trend/delta 계산용.
export function toKeywordCards(
  keywords: KeywordWithRank[],
  series: RankingSeries[]
): KeywordCard[] {
  return keywords.map((keywordRow) => {
    const matched = series.find((line) => line.keyword_id === keywordRow.id);
    const { trend, delta } = rankTrend(matched?.points ?? []);
    return {
      id: keywordRow.id,
      keyword: keywordRow.keyword,
      signal: rankToSignal(keywordRow.latest_rank),
      rank: keywordRow.latest_rank,
      trend,
      delta,
    };
  });
}

// 'YYYY-MM-DD' → 'M/D'
function toShortDate(isoDate: string): string {
  const parsed = new Date(isoDate);
  return `${parsed.getMonth() + 1}/${parsed.getDate()}`;
}

// 모든 series의 날짜 합집합(정렬) → 공통 x축 라벨.
export function toChartLabels(series: RankingSeries[]): string[] {
  const dates = new Set<string>();
  series.forEach((line) => line.points.forEach((point) => dates.add(point.snapshot_date)));
  return Array.from(dates)
    .sort()
    .map(toShortDate);
}

// series → 차트 라인. 공통 라벨 축에 맞춰 rank를 정렬, 미수집 날짜는 null.
export function toChartLines(series: RankingSeries[]): ChartLine[] {
  const sortedDates = Array.from(
    new Set(series.flatMap((line) => line.points.map((point) => point.snapshot_date)))
  ).sort();

  return series.map((line, index) => {
    const byDate = new Map(line.points.map((point) => [point.snapshot_date, point.rank]));
    return {
      name: line.keyword,
      color: KEYWORD_COLORS[index % KEYWORD_COLORS.length],
      ranks: sortedDates.map((date) => byDate.get(date) ?? null),
    };
  });
}
