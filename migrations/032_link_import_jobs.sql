-- 032_link_import_jobs.sql
-- 나만의 링크 — 유료 서비스 원클릭 이관 잡 추적 테이블
-- Created: 2026-08-27

CREATE TABLE IF NOT EXISTS link_import_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL DEFAULT 'inpock',
  source_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'parsing', 'preview', 'applied', 'failed')),
  parsed_payload JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_link_import_jobs_user
  ON link_import_jobs (user_id, created_at DESC);

ALTER TABLE link_import_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "link_import_jobs_select" ON link_import_jobs;
CREATE POLICY "link_import_jobs_select" ON link_import_jobs
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "link_import_jobs_insert" ON link_import_jobs;
CREATE POLICY "link_import_jobs_insert" ON link_import_jobs
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "link_import_jobs_update" ON link_import_jobs;
CREATE POLICY "link_import_jobs_update" ON link_import_jobs
  FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "link_import_jobs_delete" ON link_import_jobs;
CREATE POLICY "link_import_jobs_delete" ON link_import_jobs
  FOR DELETE USING (user_id = auth.uid());
