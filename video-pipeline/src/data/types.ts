/**
 * Re-exports the canonical types generated from Supabase. Lovable's UI imports the same
 * file from `shared/types.ts` at the repo root. Both ends share one contract.
 *
 * Until we run `supabase gen types typescript` (Phase 0 task 5), these types mirror the
 * 006_video_pipeline_schema.sql migration by hand. After type generation, this file
 * becomes a thin re-export.
 */

export type Difficulty = "Intermediate" | "Advanced" | "Expert" | "Master";

export type LanguageCode = "en" | "es" | "ja" | "pt-BR";

export type TemplateId = "scale-shock" | "solve-reveal" | "before-after" | "print-ritual";

export type Mood = "calm" | "energetic" | "cinematic-tense" | "playful" | "healing";

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

export type RenderStatus = "queued" | "rendering" | "failed" | "completed";

export type Decision = "approved" | "needs-fix" | "rejected";

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

export interface CulturalPass {
  narration_pace_multiplier: number;
  font_scale_multiplier: number;
  preferred_music_moods: Mood[];
  hook_style: "direct" | "high-energy" | "calming";
  notes?: string;
}

export interface Language {
  code: LanguageCode;
  name: string;
  rank: number;
  cultural_pass_json: CulturalPass;
}

export interface TemplateSegment {
  kind: string;
  start_s: number;
  end_s: number;
  purpose: string;
}

export interface TemplateTimeline {
  duration_s: number;
  segments: TemplateSegment[];
}

export interface Template {
  id: TemplateId;
  name: string;
  best_for: string;
  timeline_json: TemplateTimeline;
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
  mood: Mood;
  bpm: number | null;
  duration_s: number;
  license_source: "pixabay" | "youtube_audio_library" | "free_music_archive" | "incompetech";
  license_proof_url: string | null;
  download_date: string;
  file_url: string;
  approved: boolean;
}
