-- 정산 2단계 검토 프로세스(draft→review_1→review_2→confirmed→paid) +
-- 광고 계정별 월간 실지출(ad_account_monthly_spend, 관리자 수기 입력) 신설 +
-- business_verifications 부가 연락처/위치 정보 컬럼 추가.
-- 전부 추가형. DROP COLUMN 없음. users 테이블 미변경(읽기 전용, FK 참조만).

-- (a) ad_account_monthly_spend: 관리자가 각 광고 플랫폼 자체 결제 화면에서 직접 확인한
-- VAT 제외 실지출 금액을 (계정, 월) 단위로 수기 입력해 누적하는 테이블.
create table if not exists public.ad_account_monthly_spend (
  id uuid primary key default uuid_generate_v4(),
  ad_account_id uuid not null references public.ad_accounts(id) on delete cascade,
  period text not null check (period ~ '^\d{4}-\d{2}$'),
  spend_vat_excluded bigint not null check (spend_vat_excluded >= 0),
  -- entered_by: nullable. 관리자 입장(admin-entry) 세션은 sentinel id('admin-entry')이며
  -- 실제 users 행이 아니므로 FK가 깨진다. API 레이어는 이 경우 NULL을 기록한다.
  -- (lib/auth-server.ts getSessionUser() 참고 — admin proof만으로 들어오면 실제 users 행이 없음)
  entered_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (ad_account_id, period)
);

create index if not exists ad_account_monthly_spend_account_period_idx
  on public.ad_account_monthly_spend (ad_account_id, period desc);

-- RLS: business_verifications(007)과 동일한 이유로 정책을 하나도 부여하지 않는다.
-- 이 테이블은 관리자가 수기로 입력하는 재무 데이터이며 최종 사용자(사장님)가
-- 직접 읽을 수 있으면 안 된다. 앱은 supabaseAdmin(service_role) 경유로만 접근하고,
-- service_role은 RLS를 우회한다. permissive policy를 추가하기 전에 007의 (d) 주석을 먼저 읽을 것.
alter table public.ad_account_monthly_spend enable row level security;

-- (b) paybacks.status 3단계 → 5단계 확장: pending/confirmed/paid → draft/review_1/review_2/confirmed/paid
-- 순서: CHECK 제거 → 데이터 백필 → 기본값 변경 → 새 CHECK 추가 (007 (b)와 동일한 트랩 회피)
alter table public.paybacks
  drop constraint if exists paybacks_status_check;

update public.paybacks
  set status = 'draft'
  where status = 'pending';

-- 실측(2026-08-26) 기존 기본값 'pending'::text 존재 → 신규 첫 단계 값인 'draft'로 교체.
alter table public.paybacks
  alter column status set default 'draft';

alter table public.paybacks
  add constraint paybacks_status_check
  check (status in ('draft', 'review_1', 'review_2', 'confirmed', 'paid'));

-- (c) paybacks 감사(audit) 컬럼 — 누가/언제 각 단계를 처리했는지 기록. 전부 nullable.
-- *_by 컬럼은 admin-entry sentinel 세션일 때 API 레이어가 NULL로 기록한다(위 entered_by와 동일 사유).
-- *_at 컬럼은 그 경우에도 "언제"는 항상 기록한다.
alter table public.paybacks
  add column if not exists reviewed_by_1 uuid references public.users(id),
  add column if not exists reviewed_at_1 timestamptz,
  add column if not exists reviewed_by_2 uuid references public.users(id),
  add column if not exists reviewed_at_2 timestamptz,
  add column if not exists confirmed_by uuid references public.users(id),
  add column if not exists confirmed_at timestamptz;

-- (d) business_verifications: 세금계산서 수신 이메일 / 사업장 주소 / 네이버 플레이스 URL.
-- 부가 연락처·위치 정보로, 사용자가 승인(approved) 이후에도 수정할 수 있어야 한다.
-- 이 컬럼들을 수정한다고 해서 status를 pending으로 되돌려서는 안 된다 — API 레이어가 강제한다.
alter table public.business_verifications
  add column if not exists tax_invoice_email text,
  add column if not exists business_address text,
  add column if not exists naver_place_url text;

-- (e) paybacks.cost_basis 2단계 → 3단계 확장: submitted/verified → submitted/verified/manual
-- 검토 워크플로우에서 어드민이 amount를 직접 손으로 고칠 수 있게 되면서, 그 금액이
-- 어떤 근거로 산정됐는지 UI에 명시해야 한다. 기존 컬럼을 재사용하는 편이 컬럼 신설보다 깔끔하다.
--   verified  = ad_account_monthly_spend의 실 소진액(VAT 제외) 기준으로 계산됨
--   submitted = 사장님이 제출한 ad_accounts.monthly_spend 기준으로 계산됨
--   manual    = 어드민이 금액을 직접 입력해 덮어씀
-- 순서: CHECK 제거 → (백필 불필요, 기존 행 전부 submitted/verified만 사용 — 적용 전 재확인함) → 새 CHECK 추가
alter table public.paybacks
  drop constraint if exists paybacks_cost_basis_check;

alter table public.paybacks
  add constraint paybacks_cost_basis_check
  check (cost_basis in ('submitted', 'verified', 'manual'));
