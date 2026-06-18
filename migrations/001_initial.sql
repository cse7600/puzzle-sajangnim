-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Users table
create table if not exists public.users (
  id uuid default uuid_generate_v4() primary key,
  kakao_id text unique,
  name text not null,
  phone text,
  business_name text,
  business_type text,
  total_points integer default 0 not null,
  referral_code text unique default substring(md5(random()::text), 1, 8),
  referred_by uuid references public.users(id),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Ad accounts table
create table if not exists public.ad_accounts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  platform text not null check (platform in ('naver', 'meta', 'google', 'kakao')),
  account_id text not null,
  account_name text not null,
  monthly_spend bigint default 0,
  payback_rate numeric(4,2) default 3.00,
  status text default 'pending' check (status in ('pending', 'active', 'rejected')),
  verified_at timestamptz,
  created_at timestamptz default now() not null,
  unique(user_id, platform, account_id)
);

-- Paybacks table
create table if not exists public.paybacks (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  ad_account_id uuid references public.ad_accounts(id) on delete cascade not null,
  amount bigint not null,
  period text not null,
  status text default 'pending' check (status in ('pending', 'confirmed', 'paid')),
  processed_at timestamptz,
  created_at timestamptz default now() not null
);

-- Receipts table
create table if not exists public.receipts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  image_url text not null,
  store_name text,
  amount bigint,
  points_earned integer default 0 not null,
  status text default 'pending' check (status in ('pending', 'approved', 'rejected')),
  ocr_data jsonb,
  created_at timestamptz default now() not null
);

-- Team deals table
create table if not exists public.team_deals (
  id uuid default uuid_generate_v4() primary key,
  creator_id uuid references public.users(id) on delete cascade not null,
  title text not null,
  description text,
  category text not null,
  original_price bigint not null,
  deal_price bigint not null,
  leader_price bigint not null,
  target_count integer not null check (target_count between 2 and 10),
  current_count integer default 0 not null,
  deadline timestamptz not null,
  status text default 'active' check (status in ('active', 'completed', 'failed', 'cancelled')),
  created_at timestamptz default now() not null
);

-- Team deal members
create table if not exists public.team_deal_members (
  id uuid default uuid_generate_v4() primary key,
  deal_id uuid references public.team_deals(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  is_leader boolean default false not null,
  price_paid bigint not null,
  joined_at timestamptz default now() not null,
  unique(deal_id, user_id)
);

-- Points ledger
create table if not exists public.points (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  amount integer not null,
  source_type text not null check (source_type in ('receipt', 'payback', 'referral', 'team_deal', 'bonus')),
  source_id uuid,
  description text not null,
  created_at timestamptz default now() not null
);

-- Referrals
create table if not exists public.referrals (
  id uuid default uuid_generate_v4() primary key,
  referrer_id uuid references public.users(id) on delete cascade not null,
  referee_id uuid references public.users(id) on delete cascade not null,
  commission_rate numeric(4,2) default 5.00 not null,
  total_earned bigint default 0 not null,
  created_at timestamptz default now() not null,
  unique(referrer_id, referee_id)
);

-- Enable Realtime for team_deals
alter publication supabase_realtime add table public.team_deals;
alter publication supabase_realtime add table public.team_deal_members;

-- RLS Policies (basic)
alter table public.users enable row level security;
alter table public.ad_accounts enable row level security;
alter table public.receipts enable row level security;
alter table public.team_deals enable row level security;
alter table public.team_deal_members enable row level security;
alter table public.points enable row level security;

-- Allow read access to team_deals for everyone (public marketplace)
create policy "team_deals_select" on public.team_deals for select using (true);
create policy "team_deal_members_select" on public.team_deal_members for select using (true);
