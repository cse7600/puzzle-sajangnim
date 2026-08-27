-- 지원사업 상세페이지를 "정보 나열"에서 "① 얼마 탈 수 있어(최대) ② 나 되나? ③ 뭘 할 수 있어(퍼즐) ④ 뭐 해야해"
-- 순서로 재구성하기 위한 필드. bizinfo 원본 요약문엔 이 정보가 산문 속에 파묻혀 있어 구조화가 안 돼있다.
-- 전부 어드민이 사업별로 직접 분석해서 채워넣는 큐레이션 필드 — collect-gov-support.mjs가
-- 건드리지 않는 컬럼이라(기존 is_puzzle_transactable/puzzle_note와 동일 원칙) 매일 배치로 안 지워진다.

alter table public.gov_support_listings
  add column if not exists max_support_krw bigint,
  add column if not exists eligibility_max_revenue_krw bigint,
  add column if not exists eligibility_industry_keywords text[] not null default '{}',
  add column if not exists eligibility_notes text,
  add column if not exists puzzle_services text[] not null default '{}',
  add column if not exists application_steps text[] not null default '{}';

alter table public.gov_support_listings
  drop constraint if exists gov_support_listings_max_support_krw_check;
alter table public.gov_support_listings
  add constraint gov_support_listings_max_support_krw_check
  check (max_support_krw is null or max_support_krw >= 0);

alter table public.gov_support_listings
  drop constraint if exists gov_support_listings_eligibility_max_revenue_krw_check;
alter table public.gov_support_listings
  add constraint gov_support_listings_eligibility_max_revenue_krw_check
  check (eligibility_max_revenue_krw is null or eligibility_max_revenue_krw >= 0);
