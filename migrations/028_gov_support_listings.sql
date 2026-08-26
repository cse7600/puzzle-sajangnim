-- 기업마당(bizinfo.go.kr) 지원사업 공고 캐시 테이블
-- 배경: bizinfo API는 실시간 조회용이 아니고 필터가 약함(전용 마케팅 카테고리 없음) →
-- 일 1회 배치로 전량 수집해 내부 DB에 적재하고, 서버사이드에서 2차 필터링(해시태그+키워드)한다.
-- 실측(2026-08-26): 전체 1,588건, hashtags=마케팅/홍보/판로/온라인 조합으로 282건(17.8%) 추출 확인.

create table if not exists public.gov_support_listings (
  pblanc_id text primary key,
  title text not null,
  url text,
  jrsdinsttnm text,
  excinsttnm text,
  trgetnm text,
  reqst_begin_de date,
  reqst_end_de date,
  lclas_nm text,
  mlsfc_nm text,
  hashtags text[] not null default '{}',
  summary text,
  apply_method text,
  contact text,
  is_marketing boolean not null default false,
  region_sido text,
  source text not null default 'bizinfo',
  raw jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists gov_support_listings_is_marketing_idx
  on public.gov_support_listings (is_marketing) where is_marketing;

create index if not exists gov_support_listings_region_sido_idx
  on public.gov_support_listings (region_sido);

create index if not exists gov_support_listings_reqst_end_de_idx
  on public.gov_support_listings (reqst_end_de);

-- 공공 API를 그대로 캐싱한 공개 정보라 PII 없음. 단, 앱 노출 전이라 지금은 service role 전용으로 잠근다
-- (business_verifications과 동일한 원칙: 정책 0건, anon/authenticated는 아무 것도 못 봄).
alter table public.gov_support_listings enable row level security;
