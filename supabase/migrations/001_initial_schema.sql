-- GrandGridStudio Marketing Operations Schema
-- Run this in Supabase SQL Editor to create all tables

-- 1. Puzzle catalog
CREATE TABLE puzzles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard', 'expert', 'colossus')),
  grid_size TEXT NOT NULL, -- e.g. '15x15', '200x200'
  theme TEXT, -- e.g. 'nature', 'animals', 'space', 'food'
  book_title TEXT, -- which book/collection this belongs to
  teaser_image_url TEXT,
  solved_image_url TEXT,
  etsy_listing_url TEXT,
  marketed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Marketing posts across all platforms
CREATE TABLE marketing_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  puzzle_id UUID REFERENCES puzzles(id),
  platform TEXT NOT NULL CHECK (platform IN ('pinterest', 'reddit', 'instagram', 'email', 'etsy_seo')),
  content_type TEXT, -- e.g. 'pin', 'post', 'reel', 'carousel', 'newsletter', 'story'
  copy_text TEXT NOT NULL,
  hashtags TEXT[], -- array of hashtags
  image_url TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'ready_to_post', 'posted', 'failed', 'blocked')),
  platform_post_url TEXT, -- URL of the post once published
  engagement_clicks INTEGER DEFAULT 0,
  engagement_impressions INTEGER DEFAULT 0,
  engagement_likes INTEGER DEFAULT 0,
  engagement_comments INTEGER DEFAULT 0,
  posted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Incoming customer messages from all platforms
CREATE TABLE messages_inbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL CHECK (platform IN ('etsy', 'reddit', 'pinterest', 'instagram', 'email')),
  sender TEXT NOT NULL,
  sender_url TEXT,
  thread_url TEXT,
  content TEXT NOT NULL,
  category TEXT CHECK (category IN ('faq', 'purchase_support', 'escalation', 'spam')),
  auto_responded BOOLEAN DEFAULT FALSE,
  auto_response_text TEXT,
  escalated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Escalation queue for messages requiring human review
CREATE TABLE escalation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES messages_inbox(id) NOT NULL,
  draft_response TEXT NOT NULL,
  platform_thread_url TEXT,
  email_sent BOOLEAN DEFAULT FALSE,
  email_sent_at TIMESTAMPTZ,
  reminder_sent BOOLEAN DEFAULT FALSE,
  reminder_sent_at TIMESTAMPTZ,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. FAQ knowledge base for auto-responses
CREATE TABLE faq_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_pattern TEXT NOT NULL, -- regex or keyword pattern to match
  question_examples TEXT[], -- example questions this covers
  answer_template TEXT NOT NULL, -- response template (supports {brand_name} etc.)
  category TEXT, -- e.g. 'shipping', 'product', 'pricing', 'technical'
  priority INTEGER DEFAULT 0, -- higher = matched first
  active BOOLEAN DEFAULT TRUE,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Full audit trail of all system activity
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type TEXT NOT NULL, -- e.g. 'post_created', 'message_received', 'auto_response', 'escalation', 'error'
  platform TEXT,
  details JSONB, -- flexible payload for any action-specific data
  status TEXT DEFAULT 'success' CHECK (status IN ('success', 'failure', 'warning')),
  error_message TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_puzzles_marketed ON puzzles(marketed) WHERE marketed = FALSE;
CREATE INDEX idx_marketing_posts_status ON marketing_posts(status);
CREATE INDEX idx_marketing_posts_platform ON marketing_posts(platform, posted_at DESC);
CREATE INDEX idx_messages_inbox_category ON messages_inbox(category, created_at DESC);
CREATE INDEX idx_messages_inbox_escalated ON messages_inbox(escalated) WHERE escalated = TRUE;
CREATE INDEX idx_escalation_queue_resolved ON escalation_queue(resolved) WHERE resolved = FALSE;
CREATE INDEX idx_activity_log_type ON activity_log(action_type, created_at DESC);
CREATE INDEX idx_activity_log_created ON activity_log(created_at DESC);

-- Row Level Security (enable but allow service role full access)
ALTER TABLE puzzles ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages_inbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalation_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE faq_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Policies: allow authenticated and service_role full access
CREATE POLICY "Service role full access" ON puzzles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON marketing_posts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON messages_inbox FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON escalation_queue FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON faq_knowledge FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON activity_log FOR ALL USING (true) WITH CHECK (true);
