-- Video Pipeline Seed Data
-- Listings, languages, and templates pulled verbatim from short-form-studio/src/data/shortsFactoryData.ts.
-- This is the single source of truth — narration scripts will interpolate from these rows.

-- Languages (4 per research priority).
-- cultural_pass_json drives per-language overrides at render time.
INSERT INTO languages (code, name, rank, cultural_pass_json) VALUES
  ('en', 'English', 1, '{
    "narration_pace_multiplier": 1.0,
    "font_scale_multiplier": 1.0,
    "preferred_music_moods": ["energetic", "cinematic-tense", "playful"],
    "hook_style": "direct"
  }'::jsonb),
  ('es', 'Spanish', 2, '{
    "narration_pace_multiplier": 1.0,
    "font_scale_multiplier": 1.0,
    "preferred_music_moods": ["energetic", "playful"],
    "hook_style": "high-energy",
    "notes": "Latin America is mobile-first; lean into cognitive-benefit framing per research."
  }'::jsonb),
  ('ja', 'Japanese', 3, '{
    "narration_pace_multiplier": 0.9,
    "font_scale_multiplier": 1.0,
    "preferred_music_moods": ["healing", "calm"],
    "hook_style": "calming",
    "notes": "Suspenseful titles, sensory symbols in opening, healing/iyashi aesthetic per research. Slower pace."
  }'::jsonb),
  ('pt-BR', 'Portuguese (Brazil)', 4, '{
    "narration_pace_multiplier": 1.0,
    "font_scale_multiplier": 1.1,
    "preferred_music_moods": ["energetic", "playful"],
    "hook_style": "high-energy",
    "notes": "Mobile/Android-heavy market per research; larger text scale for fast mobile-legible pacing."
  }'::jsonb);

-- Templates (4 of the original 5; dropping partial-grid-tease per locked decision).
-- timeline_json describes the segment structure each composition implements.
INSERT INTO templates (id, name, best_for, timeline_json, risk_level, risk_note) VALUES
  ('scale-shock', 'Scale Shock', 'Huge grid and cell-count hooks',
    '{
      "duration_s": 15,
      "segments": [
        {"kind": "hook", "start_s": 0, "end_s": 2, "purpose": "Hook + grid detail"},
        {"kind": "scale_pan", "start_s": 2, "end_s": 8, "purpose": "Scale pan across grid"},
        {"kind": "reveal_motion", "start_s": 8, "end_s": 13, "purpose": "Reveal motion"},
        {"kind": "cta", "start_s": 13, "end_s": 15, "purpose": "Soft Etsy CTA"}
      ]
    }'::jsonb,
    'Low', 'Use zoomed or moving grid detail so the puzzle cannot be copied.'),
  ('solve-reveal', 'Solve Reveal', 'Hidden image reveal videos',
    '{
      "duration_s": 15,
      "segments": [
        {"kind": "hook", "start_s": 0, "end_s": 2, "purpose": "Hook"},
        {"kind": "cropped_grid", "start_s": 2, "end_s": 6, "purpose": "Cropped grid detail"},
        {"kind": "reveal_fill", "start_s": 6, "end_s": 13, "purpose": "Fast-fill reveal"},
        {"kind": "cta", "start_s": 13, "end_s": 15, "purpose": "Solved art + CTA"}
      ]
    }'::jsonb,
    'Medium', 'Solved art is safe, but do not hold a full unsolved grid on screen.'),
  ('before-after', 'Before/After', 'Grid-to-art transformation',
    '{
      "duration_s": 15,
      "segments": [
        {"kind": "hook", "start_s": 0, "end_s": 2, "purpose": "Hook"},
        {"kind": "abstract_grid", "start_s": 2, "end_s": 6, "purpose": "Abstract grid detail"},
        {"kind": "transition_wipe", "start_s": 6, "end_s": 9, "purpose": "Transition wipe"},
        {"kind": "solved_art", "start_s": 9, "end_s": 13, "purpose": "Solved art"},
        {"kind": "cta", "start_s": 13, "end_s": 15, "purpose": "CTA"}
      ]
    }'::jsonb,
    'Low', 'Use solved art and abstract grid detail; do not expose the full puzzle.'),
  ('print-ritual', 'Print Ritual', 'Analog and screen-free positioning',
    '{
      "duration_s": 15,
      "segments": [
        {"kind": "hook", "start_s": 0, "end_s": 2, "purpose": "Hook"},
        {"kind": "desk_scene", "start_s": 2, "end_s": 8, "purpose": "Print/desk scene"},
        {"kind": "pencil_close_up", "start_s": 8, "end_s": 13, "purpose": "Pencil close-up"},
        {"kind": "cta", "start_s": 13, "end_s": 15, "purpose": "CTA"}
      ]
    }'::jsonb,
    'Low', 'Lifestyle footage is safe; avoid static readable puzzle pages.');

-- Listings (7 Etsy products, verbatim from shortsFactoryData.ts).
-- recommended_templates filtered to drop partial-grid-tease.
INSERT INTO listings (id, name, etsy_url, etsy_listing_id, theme, grid_size, cell_count, puzzle_count, difficulty, recommended_templates) VALUES
  ('ultimate-bundle', 'Ultimate Bundle',
    'https://www.etsy.com/listing/4454210115/', '4454210115',
    '45 expert printable nonograms across fantasy, wildlife, and grandmaster scenes.',
    '100x150, 200x200, 250x250',
    117500, 45, 'Master',
    ARRAY['scale-shock', 'before-after']),
  ('titanic-series', 'Titanic Series',
    'https://www.etsy.com/listing/4453773767/', '4453773767',
    '15 fantasy nonograms with dragons, magic, libraries, and hidden pixel art.',
    '100x150',
    15000, 15, 'Expert',
    ARRAY['solve-reveal', 'before-after']),
  ('colossus-series', 'Colossus Series',
    'https://www.etsy.com/listing/4454075252/', '4454075252',
    '15 wildlife nonograms built for long, focused solving sessions.',
    '200x200',
    40000, 15, 'Expert',
    ARRAY['scale-shock', 'solve-reveal']),
  ('behemoth-series', 'Behemoth Series',
    'https://www.etsy.com/listing/4454100576/', '4454100576',
    '15 grandmaster 250x250 nonograms with people, places, and scene reveals.',
    '250x250',
    62500, 15, 'Master',
    ARRAY['scale-shock']),
  ('dragons-wrath', 'Dragon''s Wrath',
    'https://www.etsy.com/listing/4455139351/', '4455139351',
    'A fantasy dragon reveal in a printable expert nonogram.',
    '100x150',
    15000, 1, 'Expert',
    ARRAY['solve-reveal', 'before-after']),
  ('frozen-gaze', 'Frozen Gaze',
    'https://www.etsy.com/listing/4455144471/', '4455144471',
    'A 200x200 wolf and winter wildlife reveal.',
    '200x200',
    40000, 1, 'Expert',
    ARRAY['solve-reveal']),
  ('cafe-serenade', 'Cafe Serenade',
    'https://www.etsy.com/listing/4455156318/', '4455156318',
    'A 250x250 cafe scene positioned as a screen-free analog challenge.',
    '250x250',
    62500, 1, 'Master',
    ARRAY['print-ritual', 'scale-shock']);
