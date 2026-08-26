-- ============================================================
-- Migration 014: 플레이스 스냅샷에 미리보기 사진 URL 저장 (갤러리 표시용)
-- ============================================================

alter table public.puzl_place_snapshots
  add column if not exists photo_urls text[]; -- 미리보기 사진 URL 목록(최대 10장 안팎). 전체 장수는 photo_count
