-- 024_business_proposals.sql
-- 나만의 링크 — 비즈니스 제안 수신함
-- Created: 2026-08-26

CREATE TABLE IF NOT EXISTS business_proposals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  campaign_image_url TEXT,
  campaign_type TEXT,
  brand_name TEXT,
  product_name TEXT,
  categories JSONB DEFAULT '[]'::jsonb,
  features TEXT,
  start_date DATE,
  end_date DATE,
  reward_type TEXT,
  reward_amount TEXT,
  proposal_message TEXT,
  proposer_name TEXT,
  proposer_email TEXT,
  proposer_phone TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'read', 'replied', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_business_proposals_user
  ON business_proposals (user_id, created_at DESC);

ALTER TABLE business_proposals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "proposal_owner_select" ON business_proposals;
CREATE POLICY "proposal_owner_select" ON business_proposals
  FOR SELECT USING (user_id = auth.uid());
