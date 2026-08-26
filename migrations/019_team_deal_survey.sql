-- 019: 팀구매 양방향 설문 (어드민 문항 정의 + 신청자 답변)
-- 2026-08-26 실측: team_deal_survey_questions/responses 실 DB에 없음(PGRST205) 확인 후 신설.
-- 전부 추가형 — 기존 테이블 변경 없음. 설계: .planning/PLAN_team_buy_survey.md

create table if not exists public.team_deal_survey_questions (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.team_deals(id) on delete cascade,
  position integer not null default 0,
  question_type text not null check (question_type in ('text', 'link', 'image')),
  label text not null,
  required boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists team_deal_survey_questions_deal_id_idx
  on public.team_deal_survey_questions (deal_id, position);

create table if not exists public.team_deal_survey_responses (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.team_deal_members(id) on delete cascade,
  question_id uuid not null references public.team_deal_survey_questions(id) on delete cascade,
  value text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (member_id, question_id)
);

create index if not exists team_deal_survey_responses_member_id_idx
  on public.team_deal_survey_responses (member_id);

-- team_deal_members와 동일 정책: RLS on·정책 0건 — 모든 접근은 서버(service role) 경유.
alter table public.team_deal_survey_questions enable row level security;
alter table public.team_deal_survey_responses enable row level security;
