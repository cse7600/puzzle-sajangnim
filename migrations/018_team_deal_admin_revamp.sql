-- 018: 팀구매 어드민 운영형 전환 (방장 모델 폐기 + 수량 + 썸네일 + 어드민 개별취소)
-- 2026-08-26 Management API 실측: team_deals 0행 / team_deal_members 0행,
--   team_deal_members_status_check = ('joined','refunded'), join_team_deal(uuid,uuid) 단일 오버로드,
--   team_deals.thumbnail_url/content_html 없음(42703), leader_price·creator_id 둘 다 NOT NULL,
--   team_deals_target_count_check = (2 <= target_count <= 10), price_paid CHECK는 실 DB에 없음(011 사문).
-- 전부 추가형/완화형 — 컬럼·테이블 삭제 없음. 설계: .planning/PLAN_team_buy_revamp.md

-- 1) 딜: 썸네일/상세본문 컬럼 신설. 방장 모델 폐기로 어드민 insert가 leader_price·creator_id를
--    보내지 않아도 되도록 NOT NULL 완화(컬럼 자체는 비파괴 원칙으로 유지).
alter table public.team_deals
  add column if not exists thumbnail_url text,
  add column if not exists content_html text;
alter table public.team_deals alter column leader_price drop not null;
alter table public.team_deals alter column creator_id drop not null;

-- 어드민 운영 딜은 총 모집 좌석이 10을 넘을 수 있어 상한만 제거(하한 2 유지).
alter table public.team_deals drop constraint if exists team_deals_target_count_check;
alter table public.team_deals add constraint team_deals_target_count_check
  check (target_count >= 2);

-- 2) 참여: 수량 도입(unique(deal_id,user_id) 유지 — 유저당 1행, 수량은 행 안의 값) +
--    어드민 개별취소 상태 'cancelled' 추가('refunded'는 마감실패 일괄환불 전용으로 구분 유지).
alter table public.team_deal_members
  add column if not exists quantity integer not null default 1 check (quantity >= 1);
alter table public.team_deal_members drop constraint if exists team_deal_members_status_check;
alter table public.team_deal_members add constraint team_deal_members_status_check
  check (status in ('joined', 'refunded', 'cancelled'));

-- 3) join_team_deal에 p_quantity 추가.
-- create or replace는 인자 수가 다르면 별도 오버로드가 생겨 PostgREST 호출이 모호해지므로(PGRST203)
-- 기존 2-인자 정의를 drop 후 3-인자(default 1) 단일 정의로 재생성한다. 같은 마이그레이션 안이라 무중단.
drop function if exists public.join_team_deal(uuid, uuid);

create function public.join_team_deal(p_deal_id uuid, p_user_id uuid, p_quantity integer default 1)
returns jsonb language plpgsql as $$
declare
  v_deal public.team_deals%rowtype;
  v_balance bigint;
  v_total bigint;
  v_tx_id uuid;
  v_new_count integer;
begin
  if p_quantity is null or p_quantity < 1 then
    return jsonb_build_object('ok', false, 'reason', 'invalid_quantity');
  end if;

  select * into v_deal from public.team_deals where id = p_deal_id for update;
  if not found then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if v_deal.status <> 'active' then return jsonb_build_object('ok', false, 'reason', 'deal_not_active'); end if;
  if v_deal.deadline < now() then return jsonb_build_object('ok', false, 'reason', 'deal_expired'); end if;
  if v_deal.current_count + p_quantity > v_deal.target_count then
    return jsonb_build_object('ok', false, 'reason', 'deal_full',
      'remaining', greatest(0, v_deal.target_count - v_deal.current_count));
  end if;
  if exists (select 1 from public.team_deal_members where deal_id = p_deal_id and user_id = p_user_id) then
    return jsonb_build_object('ok', false, 'reason', 'already_joined');
  end if;

  -- 같은 유저의 동시 차감(다른 딜 포함) 직렬화 — 잔액 검증과 insert 사이 끼어들기 방지 (011과 동일)
  perform pg_advisory_xact_lock(hashtext('points:' || p_user_id::text));

  v_total := v_deal.deal_price * p_quantity;
  select coalesce(sum(amount), 0) into v_balance
  from public.point_transactions where user_id = p_user_id;
  if v_balance < v_total then
    return jsonb_build_object('ok', false, 'reason', 'insufficient_points', 'balance', v_balance);
  end if;

  insert into public.point_transactions (user_id, amount, type, description, reference_id)
  values (p_user_id, -v_total, 'redeem',
          '팀구매 참여 — ' || v_deal.title || ' (' || p_quantity || '개)', p_deal_id)
  returning id into v_tx_id;

  -- price_paid는 총액(단가×수량). refundFailedTeamDeals()가 price_paid 전액 환불이라 수량과 자동 정합.
  insert into public.team_deal_members (deal_id, user_id, price_paid, point_transaction_id, quantity)
  values (p_deal_id, p_user_id, v_total, v_tx_id, p_quantity);

  update public.team_deals
  set current_count = current_count + p_quantity,
      status = case when current_count + p_quantity >= target_count then 'completed' else status end
  where id = p_deal_id
  returning current_count into v_new_count;

  return jsonb_build_object('ok', true, 'new_count', v_new_count,
    'completed', v_new_count >= v_deal.target_count,
    'price_paid', v_total, 'quantity', p_quantity);
end;
$$;

-- 4) 어드민 개별 취소(환불) — 상태 전환·환불 원장 기록·카운트 감소를 단일 트랜잭션 원자 처리.
-- 잠금 순서: member행 → deal행. join_team_deal은 deal행만 잠그고 member행은 잠그지 않으므로
-- 두 함수 사이 잠금 사이클이 없다(교착 불가).
create function public.cancel_team_deal_member(p_member_id uuid)
returns jsonb language plpgsql as $$
declare
  v_member public.team_deal_members%rowtype;
  v_deal public.team_deals%rowtype;
  v_tx_id uuid;
  v_new_count integer;
begin
  select * into v_member from public.team_deal_members where id = p_member_id for update;
  if not found then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if v_member.status <> 'joined' then
    return jsonb_build_object('ok', false, 'reason', 'already_processed', 'status', v_member.status);
  end if;

  select * into v_deal from public.team_deals where id = v_member.deal_id for update;

  insert into public.point_transactions (user_id, amount, type, description, reference_id)
  values (v_member.user_id, v_member.price_paid, 'refund',
          '팀구매 참여 취소 환불 — ' || v_deal.title, v_deal.id)
  returning id into v_tx_id;

  update public.team_deal_members
  set status = 'cancelled', refund_transaction_id = v_tx_id
  where id = p_member_id;

  v_new_count := greatest(0, v_deal.current_count - v_member.quantity);
  update public.team_deals
  set current_count = v_new_count,
      -- 취소로 목표 미달이 된 completed 딜은 마감 전이면 다시 모집(active) 상태로 되돌린다.
      status = case
        when status = 'completed' and v_new_count < target_count and deadline > now() then 'active'
        else status
      end
  where id = v_deal.id;

  return jsonb_build_object('ok', true, 'refunded', v_member.price_paid,
    'refund_transaction_id', v_tx_id, 'new_count', v_new_count);
end;
$$;
