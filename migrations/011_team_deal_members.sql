-- 팀구매 참여 원장 + 포인트 결제 원자 처리 함수.
-- 참여(잔액 검증→redeem 차감→참여 기록→카운트 증가)는 supabase-js로 원자화가 불가능해
-- 이 프로젝트 최초로 Postgres 함수(join_team_deal)를 도입한다. 돈이 걸린 유일한 다중 쓰기 경로다.
-- 설계 근거: .planning/PLAN_withdrawal_points_economy.md
-- 전부 추가형. 기존 team_deals 컬럼 무변경. team_deals.status CHECK에 'failed' 이미 존재(실측 확인).

create table if not exists public.team_deal_members (
  id uuid primary key default uuid_generate_v4(),
  deal_id uuid not null references public.team_deals(id) on delete cascade,
  user_id uuid not null references public.users(id),
  price_paid bigint not null check (price_paid > 0),
  point_transaction_id uuid not null references public.point_transactions(id),
  status text not null default 'joined' check (status in ('joined', 'refunded')),
  refund_transaction_id uuid references public.point_transactions(id),
  joined_at timestamptz not null default now(),
  unique (deal_id, user_id)
);

create index if not exists team_deal_members_deal_idx on public.team_deal_members (deal_id);
create index if not exists team_deal_members_user_idx on public.team_deal_members (user_id, joined_at desc);

alter table public.team_deal_members enable row level security; -- 정책 없음 (008/009 패턴)

-- 잔액 확인 → redeem 차감 → 참여 기록 → 카운트 증가를 단일 트랜잭션으로 원자 처리.
-- for update 행 잠금으로 마지막 자리 race를, advisory lock으로 동일 유저 동시 차감 race를 막는다.
create or replace function public.join_team_deal(p_deal_id uuid, p_user_id uuid)
returns jsonb language plpgsql as $$
declare
  v_deal public.team_deals%rowtype;
  v_balance bigint;
  v_tx_id uuid;
  v_new_count integer;
begin
  select * into v_deal from public.team_deals where id = p_deal_id for update;
  if not found then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if v_deal.status <> 'active' then return jsonb_build_object('ok', false, 'reason', 'deal_not_active'); end if;
  if v_deal.deadline < now() then return jsonb_build_object('ok', false, 'reason', 'deal_expired'); end if;
  if v_deal.current_count >= v_deal.target_count then return jsonb_build_object('ok', false, 'reason', 'deal_full'); end if;
  if exists (select 1 from public.team_deal_members where deal_id = p_deal_id and user_id = p_user_id) then
    return jsonb_build_object('ok', false, 'reason', 'already_joined');
  end if;

  -- 같은 유저의 동시 차감(다른 딜 포함) 직렬화 — 잔액 검증과 insert 사이 끼어들기 방지
  perform pg_advisory_xact_lock(hashtext('points:' || p_user_id::text));

  select coalesce(sum(amount), 0) into v_balance
  from public.point_transactions where user_id = p_user_id;
  if v_balance < v_deal.deal_price then
    return jsonb_build_object('ok', false, 'reason', 'insufficient_points', 'balance', v_balance);
  end if;

  insert into public.point_transactions (user_id, amount, type, description, reference_id)
  values (p_user_id, -v_deal.deal_price, 'redeem', '팀구매 참여 — ' || v_deal.title, p_deal_id)
  returning id into v_tx_id;

  insert into public.team_deal_members (deal_id, user_id, price_paid, point_transaction_id)
  values (p_deal_id, p_user_id, v_deal.deal_price, v_tx_id);

  update public.team_deals
  set current_count = current_count + 1,
      status = case when current_count + 1 >= target_count then 'completed' else status end
  where id = p_deal_id
  returning current_count into v_new_count;

  return jsonb_build_object('ok', true, 'new_count', v_new_count,
    'completed', v_new_count >= v_deal.target_count, 'price_paid', v_deal.deal_price);
end;
$$;
