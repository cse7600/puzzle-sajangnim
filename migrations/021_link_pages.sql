-- 021_link_pages.sql
-- 나만의 링크 — 사용자 프로필 페이지 설정 (사용자당 1페이지)
-- Created: 2026-08-26

CREATE TABLE IF NOT EXISTS link_pages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  link_handle TEXT,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  sns_links JSONB DEFAULT '[]'::jsonb,
  layout_preset TEXT,
  theme_preset TEXT,
  background JSONB,
  font_preset TEXT,
  block_style JSONB,
  notice_text TEXT,
  proposal_enabled BOOLEAN NOT NULL DEFAULT true,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_link_pages_user UNIQUE (user_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_link_pages_handle_lower
  ON link_pages (lower(link_handle)) WHERE link_handle IS NOT NULL;

ALTER TABLE link_pages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "link_pages_select" ON link_pages;
CREATE POLICY "link_pages_select" ON link_pages
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "link_pages_insert" ON link_pages;
CREATE POLICY "link_pages_insert" ON link_pages
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "link_pages_update" ON link_pages;
CREATE POLICY "link_pages_update" ON link_pages
  FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "link_pages_delete" ON link_pages;
CREATE POLICY "link_pages_delete" ON link_pages
  FOR DELETE USING (user_id = auth.uid());
