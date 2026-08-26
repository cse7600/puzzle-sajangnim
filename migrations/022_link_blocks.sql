-- 022_link_blocks.sql
-- 나만의 링크 — 프로필 페이지 블록 (텍스트/링크/이미지/컬렉션/캘린더/구분선 등)
-- Created: 2026-08-26

CREATE TABLE IF NOT EXISTS link_blocks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  link_page_id UUID NOT NULL REFERENCES link_pages(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('text', 'link', 'image', 'program_collection', 'collection', 'calendar', 'divider')),
  payload JSONB DEFAULT '{}'::jsonb,
  position INTEGER NOT NULL DEFAULT 0,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_link_blocks_page_position
  ON link_blocks (link_page_id, position);

ALTER TABLE link_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "link_blocks_select" ON link_blocks;
CREATE POLICY "link_blocks_select" ON link_blocks
  FOR SELECT USING (
    link_page_id IN (
      SELECT lp.id FROM link_pages lp WHERE lp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "link_blocks_insert" ON link_blocks;
CREATE POLICY "link_blocks_insert" ON link_blocks
  FOR INSERT WITH CHECK (
    link_page_id IN (
      SELECT lp.id FROM link_pages lp WHERE lp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "link_blocks_update" ON link_blocks;
CREATE POLICY "link_blocks_update" ON link_blocks
  FOR UPDATE USING (
    link_page_id IN (
      SELECT lp.id FROM link_pages lp WHERE lp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "link_blocks_delete" ON link_blocks;
CREATE POLICY "link_blocks_delete" ON link_blocks
  FOR DELETE USING (
    link_page_id IN (
      SELECT lp.id FROM link_pages lp WHERE lp.user_id = auth.uid()
    )
  );
