-- Video Pipeline Schema
-- Tables for the short-form marketing video factory.
-- Hard rule: cell_count and other product facts live ONLY in `listings` (single source of truth).
-- All numeric tokens that appear in narration scripts must trace back to a column on this row.

-- 1. Listings — the 7 Etsy products being marketed.
-- Uses TEXT primary key (slug) because listings are well-known constants, not dynamic.
CREATE TABLE listings (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  etsy_url TEXT NOT NULL,
  etsy_listing_id TEXT NOT NULL,
  theme TEXT NOT NULL,
  grid_size TEXT NOT NULL,
  cell_count INTEGER NOT NULL CHECK (cell_count > 0),
  puzzle_count INTEGER NOT NULL CHECK (puzzle_count > 0),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('Intermediate', 'Advanced', 'Expert', 'Master')),
  cover_image_url TEXT,
  solved_artwork_url TEXT,
  recommended_templates TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Languages — fixed set, with cultural pass overrides per research.
CREATE TABLE languages (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  cultural_pass_json JSONB NOT NULL DEFAULT '{}',
  rank INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Templates — the 4 video templates we ship (drop partial-grid-tease).
CREATE TABLE templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  best_for TEXT NOT NULL,
  timeline_json JSONB NOT NULL,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('Low', 'Medium', 'High')),
  risk_note TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Voices — Edge TTS voice registry; multiple voices per language for the voice numerosity effect.
CREATE TABLE voices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  language TEXT NOT NULL REFERENCES languages(code),
  vendor TEXT NOT NULL DEFAULT 'edge-tts' CHECK (vendor IN ('edge-tts', 'coqui-xtts')),
  vendor_voice_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  gender TEXT CHECK (gender IN ('male', 'female', 'neutral')),
  sample_url TEXT,
  approved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (vendor, vendor_voice_id)
);

-- 5. Tracks — royalty-free music library.
CREATE TABLE tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  artist TEXT,
  mood TEXT NOT NULL CHECK (mood IN ('calm', 'energetic', 'cinematic-tense', 'playful', 'healing')),
  bpm INTEGER,
  duration_s NUMERIC(6,2) NOT NULL,
  license_source TEXT NOT NULL CHECK (license_source IN ('pixabay', 'youtube_audio_library', 'free_music_archive', 'incompetech')),
  license_proof_url TEXT,
  download_date TIMESTAMPTZ NOT NULL,
  file_url TEXT NOT NULL,
  approved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Variants — one master concept = (listing × template × language × voice × track).
-- narration_script_json is structured (segments with substitution variables resolved at render time),
-- never free-form prose. This is structural lock #2 against the 250k bug.
CREATE TABLE variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id TEXT NOT NULL REFERENCES listings(id),
  template_id TEXT NOT NULL REFERENCES templates(id),
  language_code TEXT NOT NULL REFERENCES languages(code),
  voice_id UUID NOT NULL REFERENCES voices(id),
  track_id UUID NOT NULL REFERENCES tracks(id),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft',
    'queued',
    'rendering',
    'self-review-pending',
    'self-review-failed',
    'preview-ready',
    'approved',
    'needs-fix',
    'rejected',
    'exported'
  )),
  hook_text TEXT,
  narration_script_json JSONB NOT NULL DEFAULT '{}',
  on_screen_copy_json JSONB NOT NULL DEFAULT '{}',
  validation_json JSONB NOT NULL DEFAULT '{}',
  feedback_history_json JSONB NOT NULL DEFAULT '[]',
  extras JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Renders — output of the render pipeline; one variant can have multiple renders (re-renders, cascade fixes).
CREATE TABLE renders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id UUID NOT NULL REFERENCES variants(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN (
    'queued',
    'rendering',
    'failed',
    'completed'
  )),
  mp4_url TEXT,
  transcript_url TEXT,
  captions_url TEXT,
  duration_s NUMERIC(6,2),
  width INTEGER,
  height INTEGER,
  build_log TEXT,
  self_review_json JSONB,
  worker_host TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Decisions — the user's approve/needs-fix/reject calls per variant.
CREATE TABLE decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id UUID NOT NULL REFERENCES variants(id) ON DELETE CASCADE,
  decision TEXT NOT NULL CHECK (decision IN ('approved', 'needs-fix', 'rejected')),
  reason TEXT,
  decided_by TEXT NOT NULL DEFAULT 'yaniv',
  decided_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Feedback patterns — the cascade-fix engine's audit log.
-- When a "needs-fix" decision parses into a structured rule, it goes here.
CREATE TABLE feedback_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_variant_id UUID NOT NULL REFERENCES variants(id),
  source_decision_id UUID REFERENCES decisions(id),
  raw_feedback TEXT NOT NULL,
  parsed_rule_json JSONB NOT NULL,
  scope_json JSONB NOT NULL,
  applied_count INTEGER NOT NULL DEFAULT 0,
  applied_variant_ids UUID[],
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_listings_etsy_listing_id ON listings(etsy_listing_id);
CREATE INDEX idx_voices_language ON voices(language) WHERE approved = TRUE;
CREATE INDEX idx_tracks_mood ON tracks(mood) WHERE approved = TRUE;
CREATE INDEX idx_variants_status ON variants(status);
CREATE INDEX idx_variants_listing_template_lang ON variants(listing_id, template_id, language_code);
CREATE INDEX idx_renders_status ON renders(status) WHERE status IN ('queued', 'rendering');
CREATE INDEX idx_renders_variant ON renders(variant_id, created_at DESC);
CREATE INDEX idx_decisions_variant ON decisions(variant_id, decided_at DESC);
CREATE INDEX idx_feedback_patterns_active ON feedback_patterns(active) WHERE active = TRUE;

-- updated_at triggers
CREATE OR REPLACE FUNCTION set_updated_at_video_pipeline()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_listings_updated_at BEFORE UPDATE ON listings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at_video_pipeline();

CREATE TRIGGER trg_variants_updated_at BEFORE UPDATE ON variants
  FOR EACH ROW EXECUTE FUNCTION set_updated_at_video_pipeline();

-- RLS
-- Public reads are deliberately narrow; all writes go through Supabase Edge
-- Functions using the service-role key. Do not add broad FOR ALL policies here:
-- that is exactly how product facts can drift from the controlled pipeline.
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE voices ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE renders ENABLE ROW LEVEL SECURITY;
ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_patterns ENABLE ROW LEVEL SECURITY;

-- Read-only for anon / authenticated review UI.
CREATE POLICY "Anon read listings" ON listings FOR SELECT USING (true);
CREATE POLICY "Anon read languages" ON languages FOR SELECT USING (true);
CREATE POLICY "Anon read templates" ON templates FOR SELECT USING (true);
CREATE POLICY "Anon read voices" ON voices FOR SELECT USING (approved = TRUE);
CREATE POLICY "Anon read tracks" ON tracks FOR SELECT USING (approved = TRUE);
CREATE POLICY "Anon read variants" ON variants FOR SELECT USING (true);
CREATE POLICY "Anon read renders" ON renders FOR SELECT USING (true);
CREATE POLICY "Anon read decisions" ON decisions FOR SELECT USING (true);
