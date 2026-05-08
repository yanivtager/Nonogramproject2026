#!/usr/bin/env node

import { mkdirSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";

const sharedDir = resolve("..", "shared");
mkdirSync(sharedDir, { recursive: true });

const content = `// Generated Phase-0 shared contract for Lovable.
// Source: supabase/migrations/006_video_pipeline_schema.sql.
// Replace with Supabase CLI output after the linked project is available.

export type Difficulty = "Intermediate" | "Advanced" | "Expert" | "Master";
export type LanguageCode = "en" | "es" | "ja" | "pt-BR";
export type TemplateId = "scale-shock" | "solve-reveal" | "before-after" | "print-ritual";
export type VariantStatus =
  | "draft"
  | "queued"
  | "rendering"
  | "self-review-pending"
  | "self-review-failed"
  | "preview-ready"
  | "approved"
  | "needs-fix"
  | "rejected"
  | "exported";

export interface Listing {
  id: string;
  name: string;
  etsy_url: string;
  etsy_listing_id: string;
  theme: string;
  grid_size: string;
  cell_count: number;
  puzzle_count: number;
  difficulty: Difficulty;
  cover_image_url: string | null;
  solved_artwork_url: string | null;
  recommended_templates: TemplateId[];
}

export interface Template {
  id: TemplateId;
  name: string;
  best_for: string;
  timeline_json: unknown;
  risk_level: "Low" | "Medium" | "High";
  risk_note: string;
  active: boolean;
}

export interface Voice {
  id: string;
  language: LanguageCode;
  vendor: "edge-tts" | "coqui-xtts";
  vendor_voice_id: string;
  display_name: string;
  gender: "male" | "female" | "neutral" | null;
  sample_url: string | null;
  approved: boolean;
}

export interface Track {
  id: string;
  title: string;
  artist: string | null;
  mood: "calm" | "energetic" | "cinematic-tense" | "playful" | "healing";
  bpm: number | null;
  duration_s: number;
  license_source: "pixabay" | "youtube_audio_library" | "free_music_archive" | "incompetech";
  license_proof_url: string | null;
  file_url: string;
  approved: boolean;
}

export interface Render {
  id: string;
  variant_id: string;
  status: "queued" | "rendering" | "failed" | "completed";
  mp4_url: string | null;
  transcript_url: string | null;
  captions_url: string | null;
  duration_s: number | null;
  self_review_json: unknown;
}

export interface Variant {
  id: string;
  listing_id: string;
  template_id: TemplateId;
  language_code: LanguageCode;
  voice_id: string;
  track_id: string;
  status: VariantStatus;
  hook_text: string | null;
  narration_script_json: unknown;
  on_screen_copy_json: unknown;
  validation_json: unknown;
  feedback_history_json: unknown;
  listings?: Listing;
  templates?: Template;
  voices?: Voice;
  tracks?: Track;
  renders?: Render[];
}

export interface Decision {
  id: string;
  variant_id: string;
  decision: "approved" | "needs-fix" | "rejected";
  reason: string | null;
  decided_at: string;
}
`;

const outPath = join(sharedDir, "types.ts");
await writeFile(outPath, content, "utf8");
console.log(`Shared types written to ${outPath}`);
