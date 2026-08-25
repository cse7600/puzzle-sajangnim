-- 사업자 인증(business_verifications) 신설 + ad_accounts 연락처/세금계산서 메타 컬럼 추가
-- + connection_status 상태값 확장(normal/duplicate → duplicate/reviewing/connected)
-- 전부 추가형. DROP COLUMN 없음. users 테이블 미변경(읽기 전용, FK 참조만).

-- (a) ad_accounts: 담당자 연락처 + 세금계산서 직접 발행 여부
alter table public.ad_accounts
  add column if not exists contact_email text,
  add column if not exists contact_phone text,
  add column if not exists tax_invoice_direct boolean not null default false;

-- (b) connection_status 재정의: normal/duplicate(2값) → duplicate/reviewing/connected(3값)
-- 실측 기존 제약명: ad_accounts_connection_status_check
-- (select conname, pg_get_constraintdef(oid) from pg_constraint
--  where conrelid = 'public.ad_accounts'::regclass and contype = 'c'; 로 확인, 2026-08-26)
-- 순서: CHECK 제거 → 데이터 백필 → 기본값 변경 → 새 CHECK 추가 (역순으로 하면 백필 단계에서 실패함)
alter table public.ad_accounts
  drop constraint if exists ad_accounts_connection_status_check;

update public.ad_accounts
  set connection_status = 'reviewing'
  where connection_status = 'normal';

alter table public.ad_accounts
  alter column connection_status set default 'reviewing';

alter table public.ad_accounts
  add constraint ad_accounts_connection_status_check
  check (connection_status in ('duplicate', 'reviewing', 'connected'));

-- (c) 사업자 인증 신청/심사 테이블
create table if not exists public.business_verifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id),
  business_number text not null,
  certificate_path text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewer_note text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index if not exists business_verifications_user_id_submitted_at_idx
  on public.business_verifications (user_id, submitted_at desc);

-- (d) RLS: 사업자등록번호 + 증빙 파일 경로는 PII. anon/authenticated에는 어떤 정책도 부여하지 않는다.
-- 앱은 이 테이블에 supabaseAdmin(service_role) 경유로만 접근하며, service_role은 RLS를 우회한다.
-- 향후 누군가 "동작 안 한다"며 permissive policy를 추가하려 하면 이 주석을 먼저 읽을 것 —
-- 정책이 없는 것이 의도된 상태이며, anon/authenticated 클라이언트가 이 테이블을 직접 읽거나 쓸 수 있으면 안 된다.
alter table public.business_verifications enable row level security;
