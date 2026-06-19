// 플레이스 모니터링 API 응답 타입 — RESEARCH_db_api.md §2 스키마 기준

export type Signal = 'green' | 'yellow' | 'red';
export type Trend = 'up' | 'down' | 'flat';

export interface PlaceSnapshot {
  id: string;
  registration_id: string;
  snapshot_date: string;
  review_count: number | null;
  visitor_review_count: number | null;
  blog_review_count: number | null;
  rating: number | null;
  photo_count: number | null;
  created_at: string;
}

export interface PlaceRegistration {
  id: string;
  user_id: string;
  naver_place_id: string;
  place_url: string;
  name: string;
  address: string | null;
  category: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  latest_snapshot: PlaceSnapshot | null;
}

export interface RegisterResponse {
  registration: PlaceRegistration;
  snapshot: PlaceSnapshot | null;
  fetch_failed?: boolean;
}

export interface KeywordWithRank {
  id: string;
  keyword: string;
  is_active: boolean;
  latest_rank: number | null;
  latest_is_ad: boolean;
  rank_snapshot_date: string | null;
}

export interface RankingPoint {
  snapshot_date: string;
  rank: number | null;
  is_ad: boolean;
}

export interface RankingSeries {
  keyword_id: string;
  keyword: string;
  points: RankingPoint[];
}

export interface RankingTrendResponse {
  registration_id: string;
  days: number;
  series: RankingSeries[];
}

// UI 표시용 키워드 카드 모델 (signal/trend/delta 계산 후)
export interface KeywordCard {
  id: string;
  keyword: string;
  signal: Signal;
  rank: number | null;
  trend: Trend;
  delta: number;
}

// 차트 라인 (키워드별 시계열을 geometry 로직에 맞춘 형태)
export interface ChartLine {
  name: string;
  color: string;
  ranks: (number | null)[];
}
