-- ad_accounts 상태 값 확장 (approval_requested 추가)
-- Supabase에서 기존 check constraint 제거 후 새로 추가
ALTER TABLE ad_accounts
  DROP CONSTRAINT IF EXISTS ad_accounts_status_check;

ALTER TABLE ad_accounts
  ADD CONSTRAINT ad_accounts_status_check
  CHECK (status IN ('pending', 'approval_requested', 'active', 'rejected'));

-- notifications 테이블 (없으면 생성)
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT          NOT NULL,
  type        TEXT          NOT NULL,
  title       TEXT          NOT NULL,
  body        TEXT          NOT NULL,
  metadata    JSONB         DEFAULT '{}',
  is_read     BOOLEAN       DEFAULT false,
  created_at  TIMESTAMPTZ   DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_unread_idx  ON notifications(user_id, is_read) WHERE is_read = false;
