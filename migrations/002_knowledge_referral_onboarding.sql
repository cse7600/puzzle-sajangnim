-- Knowledge questions
create table if not exists public.knowledge_questions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  category text not null,
  title text not null,
  body text not null,
  reward_points integer default 0,
  is_adopted boolean default false,
  view_count integer default 0,
  created_at timestamptz default now() not null
);

-- Knowledge answers
create table if not exists public.knowledge_answers (
  id uuid default uuid_generate_v4() primary key,
  question_id uuid references public.knowledge_questions(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  body text not null,
  is_adopted boolean default false,
  created_at timestamptz default now() not null
);

-- Knowledge comments
create table if not exists public.knowledge_comments (
  id uuid default uuid_generate_v4() primary key,
  question_id uuid references public.knowledge_questions(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  body text not null,
  created_at timestamptz default now() not null
);

-- Daily point limit tracking (1000P per question, 1000P per answer per day)
create table if not exists public.knowledge_daily_points (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  date date not null default current_date,
  question_points_earned integer default 0,
  answer_points_earned integer default 0,
  unique(user_id, date)
);

-- Onboarding: business registration fields on users table
alter table public.users
  add column if not exists business_number text,
  add column if not exists business_certificate_url text,
  add column if not exists onboarding_completed boolean default false;

-- Update ad_accounts platform constraint to include new platforms
alter table public.ad_accounts
  drop constraint if exists ad_accounts_platform_check;

alter table public.ad_accounts
  add constraint ad_accounts_platform_check
  check (platform in ('naver', 'toss', 'google', 'kakao', 'danggeun', 'naver_gfa'));
