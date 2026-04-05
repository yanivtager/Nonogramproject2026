-- Add scheduled_at column to marketing_posts
-- Run in Supabase Dashboard → SQL Editor
ALTER TABLE marketing_posts ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_marketing_posts_scheduled ON marketing_posts(scheduled_at) WHERE status = 'ready_to_post';
