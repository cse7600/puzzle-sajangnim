// 개선 진단 체크리스트 — 전부 실제 수집 데이터(PlaceSnapshot) 기반으로 채점한다.
// 네이버가 순위 가중치를 공식적으로 밝힌 적이 없으므로(리서치 확인) "이 항목을 채우면
// 순위가 오른다"가 아니라 "이 항목이 채워져 있다/아니다"만 진단한다.

import type { PlaceSnapshot } from './types';

export type ChecklistStatus = 'done' | 'warn' | 'fail';

export interface ChecklistItem {
  status: ChecklistStatus;
  label: string;
  detail: string;
}

export interface ChecklistResult {
  items: ChecklistItem[];
  score: number; // done 항목 비율 (0~100). warn/fail은 미달로 취급.
}

function photoCheck(photoCount: number | null): ChecklistItem {
  const label = '사진 20장 이상 등록';
  if (photoCount === null) return { status: 'fail', label, detail: '수집된 사진 없음' };
  if (photoCount >= 20) return { status: 'done', label, detail: `${photoCount}장` };
  if (photoCount >= 5) return { status: 'warn', label, detail: `${photoCount}장 · 목표 20장` };
  return { status: 'fail', label, detail: `${photoCount}장 · 목표 20장` };
}

function keywordCheck(keywordCount: number | null): ChecklistItem {
  const label = '대표 키워드 설정';
  if (keywordCount === null) return { status: 'fail', label, detail: '수집 실패 — 다음 갱신에서 재확인' };
  if (keywordCount >= 5) return { status: 'done', label, detail: `${keywordCount}개` };
  if (keywordCount > 0) return { status: 'warn', label, detail: `${keywordCount}개 · 최대 5개까지 등록 가능` };
  return { status: 'fail', label, detail: '설정된 키워드 없음' };
}

function descriptionCheck(hasDescription: boolean | null): ChecklistItem {
  const label = '소개글 작성';
  if (hasDescription === null) return { status: 'fail', label, detail: '수집 실패' };
  return hasDescription
    ? { status: 'done', label, detail: '작성됨' }
    : { status: 'fail', label, detail: '미작성' };
}

function menuCheck(menuCount: number | null): ChecklistItem {
  const label = '메뉴/가격 등록';
  if (menuCount !== null && menuCount > 0) {
    return { status: 'done', label, detail: `${menuCount}개` };
  }
  return { status: 'fail', label, detail: '등록된 메뉴 없음' };
}

function reservationCheck(hasReservation: boolean | null): ChecklistItem {
  const label = '네이버 예약 연동';
  if (hasReservation === null) return { status: 'warn', label, detail: '확인 불가' };
  return hasReservation
    ? { status: 'done', label, detail: '연동됨' }
    : { status: 'fail', label, detail: '미연동' };
}

function visitorReviewCheck(visitorReviewCount: number | null): ChecklistItem {
  const label = '방문자(영수증) 리뷰';
  if (visitorReviewCount === null) return { status: 'fail', label, detail: '수집된 리뷰 없음' };
  if (visitorReviewCount >= 10) return { status: 'done', label, detail: `${visitorReviewCount}건` };
  if (visitorReviewCount > 0) return { status: 'warn', label, detail: `${visitorReviewCount}건 · 목표 10건` };
  return { status: 'fail', label, detail: '리뷰 없음' };
}

function blogReviewCheck(blogReviewCount: number | null): ChecklistItem {
  const label = '블로그 리뷰';
  return blogReviewCount !== null && blogReviewCount > 0
    ? { status: 'done', label, detail: `${blogReviewCount}건` }
    : { status: 'fail', label, detail: '없음' };
}

function ratingCheck(rating: number | null): ChecklistItem {
  const label = '평점 데이터 확인';
  return rating !== null
    ? { status: 'done', label, detail: `${rating.toFixed(2)}점` }
    : { status: 'fail', label, detail: '평점 비공개 또는 미수집' };
}

// 안 된 것부터 눈에 띄어야 바로 조치할 수 있다 — fail → warn → done 순으로 정렬.
const STATUS_ORDER: Record<ChecklistStatus, number> = { fail: 0, warn: 1, done: 2 };

export function buildChecklist(snapshot: PlaceSnapshot): ChecklistResult {
  const items: ChecklistItem[] = [
    photoCheck(snapshot.photo_count),
    keywordCheck(snapshot.keyword_count),
    descriptionCheck(snapshot.has_description),
    menuCheck(snapshot.menu_count),
    reservationCheck(snapshot.has_reservation),
    visitorReviewCheck(snapshot.visitor_review_count),
    blogReviewCheck(snapshot.blog_review_count),
    ratingCheck(snapshot.rating),
  ];
  const doneCount = items.filter((item) => item.status === 'done').length;
  const score = Math.round((doneCount / items.length) * 100);
  const sorted = [...items].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
  return { items: sorted, score };
}
