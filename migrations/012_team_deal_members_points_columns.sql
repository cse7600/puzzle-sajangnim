-- 011 작성 시 `team_deal_members`가 이미 실 DB에 존재하는 줄 몰랐다(CREATE TABLE IF NOT EXISTS가
-- 조용히 스킵됨 — 스키마 드리프트 트랩, .planning/schema-drift-supabase.md 참고).
-- 실제 컬럼은 (id, deal_id, user_id, is_leader, price_paid, joined_at)뿐이었고
-- join_team_deal() 함수가 참조하는 point_transaction_id 컬럼이 없어 함수가 런타임에 깨지는 상태였다.
-- 이 마이그레이션으로 011이 원래 의도했던 컬럼을 추가한다. 전부 추가형.
--
-- point_transaction_id를 NOT NULL로 두지 않는다 — team-deals POST(방장 자동 참여)가
-- 포인트 차감 없이 team_deal_members를 insert하는 기존 경로가 있어 NOT NULL이면 그 경로가 깨진다.

alter table public.team_deal_members
  add column if not exists point_transaction_id uuid references public.point_transactions(id),
  add column if not exists status text not null default 'joined' check (status in ('joined', 'refunded')),
  add column if not exists refund_transaction_id uuid references public.point_transactions(id);
