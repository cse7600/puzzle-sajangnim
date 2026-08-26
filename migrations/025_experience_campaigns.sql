-- 025_experience_campaigns.sql
-- 한끼 체험단 (구 "미니 체험단") 전면 재설계
-- 사장님이 캠페인을 만들면 어드민이 승인 후 오픈, 참여자(크리에이터)는 플랫폼 미가입 별도 신원으로 참여,
-- 블로그 RSS 모니터링 + 영수증 OCR 대조로 검증, 검증완료 시 예산에서 자동 차감/자동중지.
-- Created: 2026-08-26

-- 1) 캠페인
CREATE TABLE IF NOT EXISTS experience_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  place_registration_id uuid,
  store_name text NOT NULL,
  naver_place_id text,
  title text NOT NULL,
  description text,
  mission_type text NOT NULL CHECK (mission_type IN ('visit', 'press', 'provided', 'receipt_review')),
  creator_types text[] NOT NULL DEFAULT '{}',
  mission_conditions text NOT NULL,
  payback_amount integer NOT NULL CHECK (payback_amount > 0),
  capacity integer NOT NULL CHECK (capacity > 0),
  budget_total integer NOT NULL CHECK (budget_total > 0),
  fee_rate numeric(5,2) NOT NULL DEFAULT 10.00,
  fee_amount integer NOT NULL DEFAULT 0,
  budget_available integer NOT NULL DEFAULT 0,
  budget_reserved integer NOT NULL DEFAULT 0,
  setup_mode text NOT NULL DEFAULT 'self' CHECK (setup_mode IN ('self', 'requested')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'pending_setup', 'pending_approval', 'change_requested',
    'active', 'paused', 'closed', 'settled', 'rejected'
  )),
  auto_payout boolean NOT NULL DEFAULT true,
  charge_confirmed boolean NOT NULL DEFAULT false,
  charge_confirmed_at timestamptz,
  reject_reason text,
  start_date date,
  end_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_experience_campaigns_user ON experience_campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_experience_campaigns_status ON experience_campaigns(status);

-- 2) 세팅 대행/승인 코멘트 스레드
CREATE TABLE IF NOT EXISTS experience_campaign_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES experience_campaigns(id) ON DELETE CASCADE,
  author_role text NOT NULL CHECK (author_role IN ('user', 'admin')),
  author_id uuid,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_experience_comments_campaign ON experience_campaign_comments(campaign_id);

-- 3) 참여자 (크리에이터 — 플랫폼 회원이 아닌 별도 신원)
CREATE TABLE IF NOT EXISTS experience_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES experience_campaigns(id) ON DELETE CASCADE,
  nickname text NOT NULL,
  phone text NOT NULL,
  email text,
  creator_type text NOT NULL CHECK (creator_type IN ('blog', 'instagram', 'youtube', 'tiktok')),
  channel_handle text NOT NULL,
  channel_url text,
  bank_name text,
  account_number text,
  account_holder text,
  status text NOT NULL DEFAULT 'applied' CHECK (status IN (
    'applied', 'approved', 'content_submitted', 'verifying', 'verified',
    'paid', 'rejected', 'expired'
  )),
  applied_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  content_url text,
  content_detected_at timestamptz,
  content_match_snippet text,
  receipt_image_url text,
  receipt_ocr_store text,
  receipt_ocr_amount integer,
  receipt_ocr_at timestamptz,
  receipt_matched boolean NOT NULL DEFAULT false,
  verification_note text,
  verified_at timestamptz,
  payout_amount integer,
  paid_at timestamptz,
  reject_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, channel_handle)
);

CREATE INDEX IF NOT EXISTS idx_experience_participants_campaign ON experience_participants(campaign_id);
CREATE INDEX IF NOT EXISTS idx_experience_participants_status ON experience_participants(status);

-- 4) 예산 원장 (수수료/예약/해제/지급/환불 — 이중지급 방지 및 감사 추적)
CREATE TABLE IF NOT EXISTS experience_campaign_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES experience_campaigns(id) ON DELETE CASCADE,
  participant_id uuid REFERENCES experience_participants(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('fee', 'reserve', 'release', 'payout', 'refund')),
  amount integer NOT NULL,
  balance_after integer NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_experience_ledger_campaign ON experience_campaign_ledger(campaign_id);
-- 참여자당 실지급(payout)은 1회만 — 이중지급 하드 차단
CREATE UNIQUE INDEX IF NOT EXISTS uq_experience_ledger_payout_once
  ON experience_campaign_ledger(participant_id)
  WHERE type = 'payout';
