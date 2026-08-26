-- ============================================================
-- Migration 017: 체크리스트 항목 확장 대응 — 스마트주문/쿠폰 + 사진 종류 분리
-- ============================================================

alter table public.puzl_place_snapshots
  add column if not exists has_smart_order boolean,      -- 스마트주문 연동 여부. null = 판별 불가
  add column if not exists coupon_count integer,          -- 쿠폰 개수
  add column if not exists business_photo_urls text[],    -- 업체 등록 사진 미리보기 URL
  add column if not exists review_photo_urls text[];      -- 방문자 리뷰 첨부 사진 미리보기 URL

-- photo_urls(migration 014)는 business+visitor 를 섞어서 담고 있었다. 이제
-- business_photo_urls/review_photo_urls 로 나눠서 저장하므로 더 안 쓴다 — 과거 데이터
-- 마이그레이션 없이 컬럼만 남겨둔다(신규 코드는 안 읽음).
