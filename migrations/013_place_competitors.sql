-- ============================================================
-- Migration 013: 플레이스 경쟁자 등록 + 체크리스트용 스냅샷 컬럼
-- 트리거 미사용 — updated_at은 애플리케이션 코드에서 수동 세팅 (기존 패턴)
-- ============================================================

-- 1) 내 가게 / 경쟁자 구분
alter table public.puzl_place_registrations
  add column if not exists role text not null default 'mine' check (role in ('mine', 'competitor'));

-- 유저당 'mine' 은 최대 1개 (경쟁자는 여러 개 등록 가능)
create unique index if not exists idx_puzl_place_reg_one_mine
  on public.puzl_place_registrations (user_id)
  where role = 'mine';

-- 2) 체크리스트 채점용 스냅샷 컬럼 — lib/naver-place.ts PlaceBasicInfo 확장분(2026-08-26)과 매핑
alter table public.puzl_place_snapshots
  add column if not exists has_reservation boolean,   -- null = 판별 불가(naverBooking 노드 못 찾음)
  add column if not exists keyword_count integer,      -- 대표 키워드 개수. null = 못 읽음, 0 = 진짜 미설정
  add column if not exists has_description boolean,    -- 소개글 작성 여부
  add column if not exists menu_count integer;         -- 등록된 메뉴 개수
