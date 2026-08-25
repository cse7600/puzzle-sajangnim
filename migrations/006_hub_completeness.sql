-- 연동 허브 완성: 영업권 이관 상태, 중복 계정 판정, 비용 검증, 정산 마감일/지급예정일
-- 전부 추가형(ADD COLUMN / CREATE TABLE IF NOT EXISTS). 기존 컬럼 drop 없음. users 테이블 미변경.

alter table public.ad_accounts
  add column if not exists transfer_status text not null default 'waiting'
    check (transfer_status in ('waiting', 'transfer_needed', 'verifying', 'completed')),
  add column if not exists connection_status text not null default 'normal'
    check (connection_status in ('normal', 'duplicate')),
  add column if not exists duplicate_of uuid references public.ad_accounts(id),
  add column if not exists api_credentials jsonb not null default '{}'::jsonb,
  add column if not exists cost_verification_status text not null default 'not_configured'
    check (cost_verification_status in ('not_configured', 'configured', 'verified', 'failed')),
  add column if not exists verified_spend bigint;

create index if not exists ad_accounts_platform_account_id_idx
  on public.ad_accounts (platform, account_id);

alter table public.paybacks
  add column if not exists scheduled_pay_date date,
  add column if not exists cost_basis text not null default 'submitted'
    check (cost_basis in ('submitted', 'verified'));

create table if not exists public.settlement_settings (
  id int primary key default 1,
  settlement_day int not null default 10 check (settlement_day between 1 and 28),
  updated_at timestamptz not null default now(),
  constraint settlement_settings_singleton check (id = 1)
);

insert into public.settlement_settings (id, settlement_day)
values (1, 10)
on conflict (id) do nothing;

-- migration 002가 실 DB에 적용된 적이 없어(002:49-55) platform CHECK가 naver/meta/google/kakao로
-- 남아 있었음(002 실측 확인, 2026-08-25). UI가 6개 플랫폼(toss/danggeun/naver_gfa 포함)을 노출하므로 여기서 확장.
alter table public.ad_accounts
  drop constraint if exists ad_accounts_platform_check;

alter table public.ad_accounts
  add constraint ad_accounts_platform_check
  check (platform in ('naver', 'meta', 'google', 'kakao', 'toss', 'danggeun', 'naver_gfa'));
