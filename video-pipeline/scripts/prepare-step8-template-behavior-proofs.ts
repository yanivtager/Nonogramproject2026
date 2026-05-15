#!/usr/bin/env node
/**
 * Prepare the live review queue for the corrected Step 8 template behavior proofs.
 *
 * Default mode is read-only. Pass --apply to:
 * - move stale paused-template music-selection previews out of preview-ready
 * - create/requeue exactly three no-music template behavior proof variants
 * - insert queued render rows for those proofs
 *
 * This script intentionally does not approve/reject template_music_approvals and
 * does not change approved gain values.
 */

import { createClient } from "@supabase/supabase-js";

type TemplateId = "before-after" | "print-ritual" | "solve-reveal";

type VariantRow = {
  id: string;
  listing_id: string;
  template_id: TemplateId;
  language_code: string;
  voice_id: string;
  track_id: string;
  status: string;
  hook_text: string | null;
  validation_json: Record<string, unknown> | null;
  feedback_history_json: unknown[] | null;
  extras: Record<string, unknown> | null;
  renders: Array<{ id: string; status: string; mp4_url: string | null; created_at: string | null }> | null;
};

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
}

const apply = process.argv.includes("--apply") || process.env.MARKETING_AUTO_APPLY === "1";
const ARIA_VOICE_ID = "ff4f9a21-5589-41b0-8f05-0eefe6a05a2b";
const STALE_PREVIEW_SET_ID = "step8-template-music-selection-v1";
const PROOF_PREVIEW_SET_ID = "step8-template-behavior-proof-v1";
const TEMPLATE_IDS: TemplateId[] = ["before-after", "print-ritual", "solve-reveal"];
const PLACEHOLDER_TRACK_TITLE = "No Music Placeholder - Template Behavior Proof";

const PROOFS: Array<{
  listing_id: string;
  template_id: TemplateId;
  recipe_id: string;
  hook_text: string;
  rationale: string;
}> = [
  {
    listing_id: "dragons-wrath",
    template_id: "before-after",
    recipe_id: "proof-step8-corrected-before-after-dragons-wrath-en",
    hook_text: "Step 8 template behavior proof: before-after / Dragon's Wrath",
    rationale: "Single central printable grid uses a left-to-right wipe into solved Dragon artwork.",
  },
  {
    listing_id: "cafe-serenade",
    template_id: "print-ritual",
    recipe_id: "proof-step8-corrected-print-ritual-cafe-serenade-en",
    hook_text: "Step 8 template behavior proof: print-ritual / Cafe Serenade",
    rationale: "Top-down paper, printable book cue, hand, pencil, and slow tactile cell filling.",
  },
  {
    listing_id: "dragons-wrath",
    template_id: "solve-reveal",
    recipe_id: "proof-step8-corrected-solve-reveal-dragons-wrath-en",
    hook_text: "Step 8 template behavior proof: solve-reveal / Dragon's Wrath",
    rationale: "Starts nearly solved, fills only final cells, then triggers solved Dragon artwork reveal.",
  },
];

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const { data: voice, error: voiceError } = await supabase
  .from("voices")
  .select("id, language, vendor_voice_id, display_name, approved")
  .eq("id", ARIA_VOICE_ID)
  .maybeSingle();

if (voiceError) throw voiceError;
if (!voice) throw new Error(`Aria voice not found: ${ARIA_VOICE_ID}`);
if (voice.language !== "en" || voice.vendor_voice_id !== "en-US-AriaNeural") {
  throw new Error(`Unexpected proof voice: ${JSON.stringify(voice)}`);
}

const placeholderTrackId = await ensurePlaceholderTrack();

const { data: variantsData, error: variantsError } = await supabase
  .from("variants")
  .select(
    "id, listing_id, template_id, language_code, voice_id, track_id, status, hook_text, validation_json, feedback_history_json, extras, renders(id, status, mp4_url, created_at)",
  )
  .in("template_id", TEMPLATE_IDS)
  .eq("language_code", "en")
  .eq("voice_id", ARIA_VOICE_ID);

if (variantsError) throw variantsError;

const variants = (variantsData ?? []) as unknown as VariantRow[];
const staleMusicPreviewVariants = variants
  .filter((variant) => variant.extras?.preview_set_id === STALE_PREVIEW_SET_ID)
  .filter((variant) => variant.status === "preview-ready");
const existingProofVariants = variants.filter((variant) => variant.extras?.preview_set_id === PROOF_PREVIEW_SET_ID);

console.log(`Step 8 template behavior proof queue mode: ${apply ? "APPLY" : "dry run"}`);
console.log(`Stale music-selection preview variants to mark needs-fix: ${staleMusicPreviewVariants.length}`);
for (const variant of staleMusicPreviewVariants) {
  console.log(`  stale ${variant.id} ${variant.template_id}/${variant.listing_id}`);
}

console.log(`Proof preview set: ${PROOF_PREVIEW_SET_ID}`);
for (const proof of PROOFS) {
  const existing = existingProofVariants.find(
    (variant) => variant.template_id === proof.template_id && variant.listing_id === proof.listing_id,
  );
  console.log(`  ${proof.template_id}/${proof.listing_id}: ${existing ? `reuse ${existing.id} (${existing.status})` : "create"}`);
}

if (!apply) {
  console.log("Dry run only. Re-run with --apply to modify Supabase.");
  process.exit(0);
}

for (const variant of staleMusicPreviewVariants) {
  const feedbackHistory = Array.isArray(variant.feedback_history_json) ? variant.feedback_history_json : [];
  const nextExtras = {
    ...(variant.extras ?? {}),
    stale: true,
    stale_reason: "Template behavior paused; music review disabled until corrected behavior proof is approved.",
    superseded_by_preview_set_id: PROOF_PREVIEW_SET_ID,
    music_review_allowed: false,
    stale_marked_at: new Date().toISOString(),
  };
  const nextValidation = {
    ...(variant.validation_json ?? {}),
    stale_preview: {
      stale: true,
      stale_reason: "Template behavior proof required before music selection resumes.",
      superseded_by_preview_set_id: PROOF_PREVIEW_SET_ID,
    },
  };
  const nextFeedbackHistory = [
    ...feedbackHistory,
    {
      decision: "needs-fix",
      reason: "Stale Step 8 music-selection preview. Template behavior must be approved before music review resumes.",
      feedback: {
        stale_preview_set_id: STALE_PREVIEW_SET_ID,
        superseded_by_preview_set_id: PROOF_PREVIEW_SET_ID,
      },
      intake_version: 2,
      decided_at: new Date().toISOString(),
    },
  ];

  const { error: updateError } = await supabase
    .from("variants")
    .update({
      status: "needs-fix",
      extras: nextExtras,
      validation_json: nextValidation,
      feedback_history_json: nextFeedbackHistory,
    })
    .eq("id", variant.id);
  if (updateError) throw updateError;
}

const queuedProofVariantIds: string[] = [];
for (const proof of PROOFS) {
  let variant = existingProofVariants.find(
    (row) => row.template_id === proof.template_id && row.listing_id === proof.listing_id,
  );

  const extras = {
    step: "8",
    preview_set_id: PROOF_PREVIEW_SET_ID,
    preview_type: "template_behavior_proof",
    render_purpose: "template-behavior-proof",
    music_review_allowed: false,
    music_status: "not_used_template_behavior_only",
    fixed_dimensions: {
      listing_id: proof.listing_id,
      template_id: proof.template_id,
      language_code: "en",
      voice_id: ARIA_VOICE_ID,
      voice_name: "Aria",
    },
    rationale: proof.rationale,
    proof_recipe_id: proof.recipe_id,
  };
  const validation = {
    step: "8",
    preview_set_id: PROOF_PREVIEW_SET_ID,
    proof_recipe_id: proof.recipe_id,
    render_purpose: "template-behavior-proof",
    music_review_allowed: false,
    acceptance_focus: "template behavior only; no music approval decision allowed",
  };

  if (!variant) {
    const { data: insertedVariant, error: insertVariantError } = await supabase
      .from("variants")
      .insert({
        listing_id: proof.listing_id,
        template_id: proof.template_id,
        language_code: "en",
        voice_id: ARIA_VOICE_ID,
        track_id: placeholderTrackId,
        status: "queued",
        hook_text: proof.hook_text,
        narration_script_json: {},
        on_screen_copy_json: {},
        validation_json: validation,
        extras,
      })
      .select("id, listing_id, template_id, language_code, voice_id, track_id, status, hook_text, validation_json, feedback_history_json, extras, renders(id, status, mp4_url, created_at)")
      .single();
    if (insertVariantError) throw insertVariantError;
    variant = insertedVariant as unknown as VariantRow;
  } else {
    const activeRenderIds =
      variant.renders
        ?.filter((render) => ["queued", "rendering"].includes(render.status))
        .map((render) => render.id) ?? [];
    if (activeRenderIds.length > 0) {
      const { error: failOldRenderError } = await supabase
        .from("renders")
        .update({
          status: "failed",
          build_log: "Superseded by corrected Step 8 template behavior proof requeue.",
          completed_at: new Date().toISOString(),
        })
        .in("id", activeRenderIds);
      if (failOldRenderError) throw failOldRenderError;
    }

    const { error: updateVariantError } = await supabase
      .from("variants")
      .update({
        status: "queued",
        track_id: placeholderTrackId,
        hook_text: proof.hook_text,
        validation_json: validation,
        extras,
      })
      .eq("id", variant.id);
    if (updateVariantError) throw updateVariantError;
  }

  const { data: insertedRender, error: insertRenderError } = await supabase
    .from("renders")
    .insert({
      variant_id: variant.id,
      status: "queued",
      build_log: "Queued for Step 8 no-music template behavior proof.",
    })
    .select("id")
    .single();
  if (insertRenderError) throw insertRenderError;

  queuedProofVariantIds.push(variant.id);
  console.log(`queued ${proof.template_id}/${proof.listing_id}: variant ${variant.id} render ${insertedRender.id}`);
}

console.log(`Marked stale variants: ${staleMusicPreviewVariants.length}`);
console.log(`Queued behavior proof variants: ${queuedProofVariantIds.length}`);

async function ensurePlaceholderTrack(): Promise<string> {
  const { data: existing, error: existingError } = await supabase
    .from("tracks")
    .select("id, title")
    .eq("title", PLACEHOLDER_TRACK_TITLE)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing?.id) return existing.id as string;

  if (!apply) return "dry-run-placeholder-track-id";

  const { data: inserted, error: insertError } = await supabase
    .from("tracks")
    .insert({
      title: PLACEHOLDER_TRACK_TITLE,
      artist: "GrandGridStudio",
      mood: "calm",
      bpm: null,
      duration_s: 15,
      license_source: "free_music_archive",
      license_proof_url: null,
      source_name: "GrandGridStudio internal placeholder",
      source_url: null,
      download_date: new Date().toISOString(),
      file_url: "template-behavior-proof/no-music-placeholder.mp3",
      approved: false,
      approval_status: "pending",
      approval_reason: "Muted placeholder only. The render worker suppresses music for template-behavior-proof variants.",
      recommended_templates: [],
      platform_suitability_json: { tiktok: false, reels: false, shorts: false },
      recommended_gain_db: -40,
    })
    .select("id")
    .single();
  if (insertError) throw insertError;
  return inserted.id as string;
}
