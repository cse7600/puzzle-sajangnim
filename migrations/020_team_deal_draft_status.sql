-- 020: 팀구매 딜 draft(비공개 대기) 상태 도입 — 설문 문항 없는 딜의 고객 노출 차단용
-- 2026-08-26 실측: team_deals_status_check = active|completed|failed|cancelled (draft 없음) 확인.
-- 완화형만 — 기존 값 전부 유지, 'draft' 허용값 추가. 설계: .planning/PLAN_team_buy_survey.md 부록.

alter table public.team_deals drop constraint if exists team_deals_status_check;
alter table public.team_deals add constraint team_deals_status_check
  check (status in ('draft', 'active', 'completed', 'failed', 'cancelled'));
