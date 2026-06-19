-- ============================================================
-- Migration 005: 네이버 플레이스 모니터링
-- 등록 플레이스 / 키워드 / 일별 기본정보 스냅샷 / 일별 키워드 순위
-- 트리거 미사용 — updated_at은 애플리케이션 코드에서 수동 세팅
-- user_id = DEMO_USER_ID (lib/auth.ts), 운영 전환 시 auth 연동으로 교체
-- ============================================================

-- 1) 등록된 네이버 플레이스
create table if not exists public.puzl_place_registrations (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  naver_place_id text not null,            -- 네이버 placeId (예: '1085956231')
  place_url text not null,                  -- 사용자가 입력한 원본 URL
  name text not null,
  address text,
  category text,
  is_active boolean default true not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique(user_id, naver_place_id)
);

create index if not exists idx_puzl_place_reg_user on public.puzl_place_registrations(user_id);

-- 2) 모니터링 키워드
create table if not exists public.puzl_place_keywords (
  id uuid default uuid_generate_v4() primary key,
  registration_id uuid references public.puzl_place_registrations(id) on delete cascade not null,
  keyword text not null,
  is_active boolean default true not null,
  created_at timestamptz default now() not null,
  unique(registration_id, keyword)
);

create index if not exists idx_puzl_place_kw_reg on public.puzl_place_keywords(registration_id);

-- 3) 일별 기본정보 스냅샷
create table if not exists public.puzl_place_snapshots (
  id uuid default uuid_generate_v4() primary key,
  registration_id uuid references public.puzl_place_registrations(id) on delete cascade not null,
  snapshot_date date not null default current_date,
  review_count integer,
  visitor_review_count integer,
  blog_review_count integer,
  rating numeric(3,2),                      -- 0.00 ~ 5.00
  photo_count integer,
  raw_data jsonb,
  created_at timestamptz default now() not null,
  unique(registration_id, snapshot_date)
);

create index if not exists idx_puzl_place_snap_reg_date
  on public.puzl_place_snapshots(registration_id, snapshot_date desc);

-- 4) 일별 키워드 순위 스냅샷
create table if not exists public.puzl_keyword_rankings (
  id uuid default uuid_generate_v4() primary key,
  keyword_id uuid references public.puzl_place_keywords(id) on delete cascade not null,
  snapshot_date date not null default current_date,
  rank integer,                             -- null = 순위권 밖(미노출)
  is_ad boolean default false not null,
  total_results integer,
  raw_data jsonb,
  created_at timestamptz default now() not null,
  unique(keyword_id, snapshot_date)
);

create index if not exists idx_puzl_kw_rank_kw_date
  on public.puzl_keyword_rankings(keyword_id, snapshot_date desc);

-- RLS (기존 패턴: 켜되 전체 read 허용)
alter table public.puzl_place_registrations enable row level security;
alter table public.puzl_place_keywords enable row level security;
alter table public.puzl_place_snapshots enable row level security;
alter table public.puzl_keyword_rankings enable row level security;

-- 정책은 drop 선행 후 create (동일 SQL 재실행 멱등성)
drop policy if exists "puzl_place_registrations_select" on public.puzl_place_registrations;
drop policy if exists "puzl_place_keywords_select" on public.puzl_place_keywords;
drop policy if exists "puzl_place_snapshots_select" on public.puzl_place_snapshots;
drop policy if exists "puzl_keyword_rankings_select" on public.puzl_keyword_rankings;

create policy "puzl_place_registrations_select" on public.puzl_place_registrations for select using (true);
create policy "puzl_place_keywords_select" on public.puzl_place_keywords for select using (true);
create policy "puzl_place_snapshots_select" on public.puzl_place_snapshots for select using (true);
create policy "puzl_keyword_rankings_select" on public.puzl_keyword_rankings for select using (true);
