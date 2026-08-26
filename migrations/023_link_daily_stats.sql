-- 023_link_daily_stats.sql
-- 나만의 링크 — 일자별 통계 집계 (페이지 조회수 / 블록 클릭수)
-- Created: 2026-08-26
--
-- block_id NULL 행 = 페이지 조회(views), block_id 값 있음 = 해당 블록 클릭(clicks).
-- NULLS NOT DISTINCT: PostgreSQL 15+, Supabase 지원.

CREATE TABLE IF NOT EXISTS link_daily_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  link_page_id UUID NOT NULL REFERENCES link_pages(id) ON DELETE CASCADE,
  block_id UUID REFERENCES link_blocks(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  views INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT uq_link_daily_stats_page_block_date
    UNIQUE NULLS NOT DISTINCT (link_page_id, block_id, date)
);

CREATE INDEX IF NOT EXISTS idx_link_daily_stats_page_date
  ON link_daily_stats (link_page_id, date);

ALTER TABLE link_daily_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "link_daily_stats_select" ON link_daily_stats;
CREATE POLICY "link_daily_stats_select" ON link_daily_stats
  FOR SELECT USING (
    link_page_id IN (
      SELECT lp.id FROM link_pages lp WHERE lp.user_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION increment_link_page_stat(p_link_page_id UUID, p_block_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO link_daily_stats (link_page_id, block_id, date, views, clicks)
  VALUES (
    p_link_page_id,
    p_block_id,
    (NOW() AT TIME ZONE 'Asia/Seoul')::date,
    CASE WHEN p_block_id IS NULL THEN 1 ELSE 0 END,
    CASE WHEN p_block_id IS NULL THEN 0 ELSE 1 END
  )
  ON CONFLICT ON CONSTRAINT uq_link_daily_stats_page_block_date
  DO UPDATE SET
    views = link_daily_stats.views + (CASE WHEN p_block_id IS NULL THEN 1 ELSE 0 END),
    clicks = link_daily_stats.clicks + (CASE WHEN p_block_id IS NULL THEN 0 ELSE 1 END);
END;
$$;
