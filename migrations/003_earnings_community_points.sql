-- ============================================================
-- Migration 003: 수익 섹션 + 추천인 수익 + 커뮤니티 + 포인트 통합
-- ============================================================

-- 통합 포인트 내역
create table if not exists public.point_transactions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  amount integer not null,
  type text not null check (type in ('receipt', 'knowledge_question', 'knowledge_answer', 'referral', 'reward', 'redeem', 'community')),
  description text,
  reference_id uuid,
  created_at timestamptz default now() not null
);

create index if not exists idx_point_tx_user on public.point_transactions(user_id);
create index if not exists idx_point_tx_type on public.point_transactions(type);

-- 추천인 수익 내역
create table if not exists public.referral_earnings (
  id uuid default uuid_generate_v4() primary key,
  referrer_id uuid references public.users(id) on delete cascade not null,
  referee_id uuid references public.users(id) on delete cascade not null,
  source_type text not null,
  source_amount integer not null,
  earning_rate numeric(4,2) default 5.00,
  earned_amount integer not null,
  is_paid boolean default false,
  created_at timestamptz default now() not null
);

create index if not exists idx_referral_earnings_referrer on public.referral_earnings(referrer_id);

-- 영수증 분석 타임스탬프
alter table public.receipts add column if not exists analyzed_at timestamptz;

-- 커뮤니티 게시글 (puzl_ prefix: 공유 DB 내 기존 community_posts 충돌 회피)
create table if not exists public.puzl_community_posts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  title text,
  body text not null,
  category text default 'general' check (category in ('general', 'business', 'success', 'question')),
  likes integer default 0,
  is_filtered boolean default false,
  filter_reason text,
  daily_points_date date,
  created_at timestamptz default now() not null
);

create index if not exists idx_puzl_community_posts_category on public.puzl_community_posts(category);
create index if not exists idx_puzl_community_posts_created on public.puzl_community_posts(created_at desc);

-- 커뮤니티 댓글
create table if not exists public.puzl_community_comments (
  id uuid default uuid_generate_v4() primary key,
  post_id uuid references public.puzl_community_posts(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  body text not null,
  is_filtered boolean default false,
  created_at timestamptz default now() not null
);

create index if not exists idx_puzl_community_comments_post on public.puzl_community_comments(post_id);

-- 금지어
create table if not exists public.puzl_banned_words (
  id uuid default uuid_generate_v4() primary key,
  word text not null unique,
  created_at timestamptz default now() not null
);

insert into public.puzl_banned_words (word) values
  ('욕설1'), ('광고'), ('스팸'), ('도박'), ('불법'), ('사기'), ('협박')
on conflict (word) do nothing;

-- 하루 포인트 한도 (전체 합산)
create table if not exists public.daily_point_limits (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  date date not null default current_date,
  total_points_earned integer default 0,
  unique(user_id, date)
);

-- ============================================================
-- 지식 거래소 (migration 002가 실제 DB에 미적용 상태여서 003에서 보강)
-- ============================================================
create table if not exists public.knowledge_questions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  category text not null,
  title text not null,
  body text not null,
  reward_points integer default 0,
  is_adopted boolean default false,
  view_count integer default 0,
  created_at timestamptz default now() not null
);
create table if not exists public.knowledge_answers (
  id uuid default gen_random_uuid() primary key,
  question_id uuid references public.knowledge_questions(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  body text not null,
  is_adopted boolean default false,
  created_at timestamptz default now() not null
);
create table if not exists public.knowledge_daily_points (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  date date not null default current_date,
  question_points_earned integer default 0,
  answer_points_earned integer default 0,
  unique(user_id, date)
);
create index if not exists idx_kq_category on public.knowledge_questions(category);
create index if not exists idx_kq_created on public.knowledge_questions(created_at desc);

-- ============================================================
-- 데모 유저 시드 (공유 DB: public.users.id 는 auth.users FK)
-- 데모 모드 user_id = 00000000-0000-0000-0000-000000000001 (lib/auth.ts DEMO_USER_ID)
-- auth.users 선행 생성 필요. 운영 전환 시 이 시드는 제거.
-- ============================================================
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_sso_user, is_anonymous)
values
('00000000-0000-0000-0000-000000000000','00000000-0000-0000-0000-000000000001','authenticated','authenticated','demo@puzzle.kr','', now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false, false),
('00000000-0000-0000-0000-000000000000','00000000-0000-0000-0000-000000000002','authenticated','authenticated','friend1@puzzle.kr','', now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false, false),
('00000000-0000-0000-0000-000000000000','00000000-0000-0000-0000-000000000003','authenticated','authenticated','friend2@puzzle.kr','', now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false, false)
on conflict (id) do nothing;

insert into public.users (id, email, role, profile_data) values
('00000000-0000-0000-0000-000000000001', 'demo@puzzle.kr', 'advertiser', '{"name":"김철수","business_name":"을지로 쌈밥 철수네","referral_code":"PUZZLE01","total_points":23400}'::jsonb),
('00000000-0000-0000-0000-000000000002', 'friend1@puzzle.kr', 'advertiser', '{"name":"박영희","business_name":"영희분식","referral_code":"PUZZLE02","referred_by":"00000000-0000-0000-0000-000000000001"}'::jsonb),
('00000000-0000-0000-0000-000000000003', 'friend2@puzzle.kr', 'advertiser', '{"name":"이민수","business_name":"민수카페","referral_code":"PUZZLE03","referred_by":"00000000-0000-0000-0000-000000000001"}'::jsonb)
on conflict (id) do update set profile_data = excluded.profile_data;
