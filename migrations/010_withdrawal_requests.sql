-- 출금 신청 워크플로우 + 정산금의 포인트 전환 경로 신설.
-- 사용자가 confirmed 정산에 대해 기한(withdrawal_deadline, 어드민이 settlement_settings로 조정 가능) 내
-- 출금을 신청하면 현금 지급, 신청하지 않으면 포인트(1P=1원)로 자동 전환된다.
-- 설계 근거: .planning/PLAN_withdrawal_points_economy.md
-- 전부 추가형. DROP COLUMN 없음. users 테이블 미변경(FK 참조만).

-- (a) point_transactions.type 확장: + 'payback'(정산금 전환 적립), 'refund'(팀구매 환불 적립)
-- 차감은 기존 'redeem'을 재사용하며, redeem 행의 amount는 항상 음수라는 컨벤션을 이번에 확정한다.
alter table public.point_transactions
  drop constraint if exists point_transactions_type_check;

alter table public.point_transactions
  add constraint point_transactions_type_check
  check (type in ('receipt', 'knowledge_question', 'knowledge_answer',
                  'referral', 'reward', 'redeem', 'community',
                  'payback', 'refund'));

-- (b) paybacks: 종결 상태 'converted_to_points' 추가 + 출금 신청 마감일 + 전환 시각
alter table public.paybacks
  drop constraint if exists paybacks_status_check;

alter table public.paybacks
  add constraint paybacks_status_check
  check (status in ('draft', 'review_1', 'review_2', 'confirmed', 'paid', 'converted_to_points'));

alter table public.paybacks
  add column if not exists withdrawal_deadline timestamptz,
  add column if not exists converted_at timestamptz;

-- 기존 confirmed 행 백필: 배포 시점 기준 7일의 유예를 새로 부여한다.
-- (confirmed_at + 7일로 소급하면 이미 만료돼 사용자가 출금 기회를 잃는다 — 신뢰 문제)
update public.paybacks
  set withdrawal_deadline = now() + interval '7 days'
  where status = 'confirmed' and withdrawal_deadline is null;

-- (c) settlement_settings: 출금 정책 어드민 조정값. 기존 단일행(id=1) 패턴 재사용.
alter table public.settlement_settings
  add column if not exists withdrawal_deadline_days integer not null default 7
    check (withdrawal_deadline_days >= 1 and withdrawal_deadline_days <= 90),
  add column if not exists withdrawal_min_amount bigint not null default 10000
    check (withdrawal_min_amount >= 0);

-- (d) withdrawal_requests: 출금 신청 원장.
-- 계좌 정보는 신청 시점 business_verifications 값을 스냅샷한다 —
-- 신청 후 계좌를 바꿔도 진행 중인 지급 건의 근거가 흔들리지 않게.
create table if not exists public.withdrawal_requests (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id),
  payback_id uuid not null references public.paybacks(id),
  amount bigint not null check (amount > 0),
  status text not null default 'requested'
    check (status in ('requested', 'processing', 'paid', 'rejected', 'canceled')),
  bank_name text not null,
  account_number text not null,
  account_holder text not null,
  requested_at timestamptz not null default now(),
  -- processed_by: nullable. admin-entry sentinel 세션은 users 행이 아니므로 API가 NULL 기록 (008 패턴)
  processed_by uuid references public.users(id),
  processed_at timestamptz,
  reject_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- payback당 활성(requested/processing) 또는 완결(paid) 신청은 1건만.
-- canceled/rejected는 제외 — 기한 내 재신청 허용.
create unique index if not exists withdrawal_requests_active_payback_idx
  on public.withdrawal_requests (payback_id)
  where status in ('requested', 'processing', 'paid');

create index if not exists withdrawal_requests_user_idx
  on public.withdrawal_requests (user_id, created_at desc);
create index if not exists withdrawal_requests_status_idx
  on public.withdrawal_requests (status, requested_at);

-- RLS: 계좌번호를 담는 민감 테이블. 008/009와 동일하게 정책 없이 enable만 —
-- 앱은 supabaseAdmin(service_role) 경유로만 접근하고 service_role은 RLS를 우회한다.
alter table public.withdrawal_requests enable row level security;

-- (e) 포인트 잔액 조회 함수 — JS에서 원장 전 행 합산을 피한다.
create or replace function public.get_point_balance(p_user_id uuid)
returns bigint language sql stable
as $$
  select coalesce(sum(amount), 0)::bigint
  from public.point_transactions
  where user_id = p_user_id;
$$;
