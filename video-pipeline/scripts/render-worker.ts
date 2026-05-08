#!/usr/bin/env node
/**
 * Render worker — polls Supabase for queued render jobs, processes one at a time.
 * Runs as a systemd service on the Hetzner CPX22 VM (178.104.137.140).
 *
 * Flow:
 *   renders.status=queued → rendering → (self-review) → completed / failed
 *   variants.status → rendering → self-review-pending → preview-ready | self-review-failed
 *
 * Usage:
 *   npm run worker:render            # loop forever (production)
 *   npm run worker:render -- --once  # process one job and exit (CI / manual trigger)
 */

import { createReadStream, existsSync, mkdirSync } from "node:fs";
import { basename, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

import type { Listing, Track, Voice } from "../src/data/types.js";
import { ALL_SCRIPTS } from "../src/narration/scripts/index.js";
import { renderVariant } from "../src/render/render-variant.js";
import { runSelfReview } from "../src/self-review/pipeline.js";
import type { PreferenceProfile } from "../src/self-review/layer5-subjective.js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const workerHost = process.env.RENDER_WORKER_HOST ?? "local";
const outDir = resolve(process.env.RENDER_OUT_DIR ?? "out/worker-renders");
const STORAGE_BUCKET = "renders";

const once = process.argv.includes("--once");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
}

mkdirSync(outDir, { recursive: true });
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function tick(): Promise<void> {
  // Claim the oldest queued render atomically via status update
  const { data: renderRows, error: fetchErr } = await supabase
    .from("renders")
    .select(
      "id, variant_id, variants!inner(id, template_id, language_code, voice_id, track_id, narration_script_json, listings!inner(*), voices!inner(*), tracks(*), status)",
    )
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(1);

  if (fetchErr) {
    console.error("fetch error:", fetchErr.message);
    return;
  }

  const renderRow = renderRows?.[0];
  if (!renderRow) {
    console.log(`[${new Date().toISOString()}] No queued renders.`);
    return;
  }

  const variant = renderRow.variants as unknown as {
    id: string;
    template_id: string;
    language_code: string;
    listings: Listing;
    voices: Voice;
    tracks: Track | null;
  };

  console.log(
    `[${new Date().toISOString()}] Claiming render ${renderRow.id} for variant ${variant.id} (${variant.template_id}/${variant.language_code})`,
  );

  // Optimistic lock — only proceed if still queued
  const { error: claimErr } = await supabase
    .from("renders")
    .update({ status: "rendering", worker_host: workerHost, started_at: new Date().toISOString() })
    .eq("id", renderRow.id)
    .eq("status", "queued"); // guard against double-claim

  if (claimErr) {
    console.error("claim error:", claimErr.message);
    return;
  }
  await supabase.from("variants").update({ status: "rendering" }).eq("id", variant.id);

  // Resolve narration script
  const templateScripts = ALL_SCRIPTS[variant.template_id as keyof typeof ALL_SCRIPTS];
  if (!templateScripts) {
    await fail(renderRow.id, variant.id, `Unknown template: ${variant.template_id}`);
    return;
  }
  const script = templateScripts[variant.language_code as keyof typeof templateScripts];
  if (!script) {
    await fail(
      renderRow.id,
      variant.id,
      `No script for ${variant.template_id}/${variant.language_code}`,
    );
    return;
  }

  // ── Render ────────────────────────────────────────────────────────────────
  const renderResult = await renderVariant({
    variantId: variant.id,
    templateId: variant.template_id,
    listing: variant.listings,
    voice: variant.voices,
    track: variant.tracks,
    script,
    outDir,
  });

  if (renderResult.status !== "ok" || !renderResult.mp4Path) {
    await fail(renderRow.id, variant.id, renderResult.error ?? "renderVariant returned no mp4");
    return;
  }

  // ── Upload to Supabase Storage ────────────────────────────────────────────
  const mp4Key = `${variant.id}/${basename(renderResult.mp4Path)}`;
  let publicMp4Url: string | null = null;

  try {
    const fileStream = createReadStream(renderResult.mp4Path);
    const { error: uploadErr } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(mp4Key, fileStream, { contentType: "video/mp4", upsert: true });

    if (uploadErr) {
      console.warn("Storage upload failed (continuing with local path):", uploadErr.message);
    } else {
      const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(mp4Key);
      publicMp4Url = urlData.publicUrl;
    }
  } catch (e) {
    console.warn("Storage upload threw (continuing with local path):", e);
  }

  const resolvedMp4Url = publicMp4Url ?? renderResult.mp4Path;

  // ── Self-review ───────────────────────────────────────────────────────────
  await supabase.from("variants").update({ status: "self-review-pending" }).eq("id", variant.id);

  // Fetch approved variant count to determine calibration mode
  const { count: approvedCount } = await supabase
    .from("decisions")
    .select("id", { count: "exact", head: true })
    .eq("decision", "approved");

  // Fetch previous voice IDs for this listing (for voice variety check)
  const { data: prevVariants } = await supabase
    .from("variants")
    .select("voice_id")
    .eq("listing_id", variant.listings.id)
    .neq("id", variant.id)
    .not("voice_id", "is", null);

  const previousVoiceIds = (prevVariants ?? []).map((v) => String(v.voice_id));

  const preferenceProfile: PreferenceProfile | null =
    approvedCount && approvedCount >= 3
      ? {
          approvedCount,
          feedbackSummary: await buildPreferenceSummary(),
          lastUpdatedAt: new Date().toISOString(),
        }
      : null;

  const selfReviewReport = await runSelfReview({
    variantId: variant.id,
    mp4Path: renderResult.mp4Path,
    listing: variant.listings,
    script,
    voiceId: variant.voices.vendor_voice_id,
    captionsVttPath: renderResult.captionsPath ?? null,
    musicPath: variant.tracks?.file_url ?? null,
    previousVoiceIdsForListing: previousVoiceIds,
    preferenceProfile,
  });

  // ── Update DB with results ────────────────────────────────────────────────
  await supabase
    .from("renders")
    .update({
      status: "completed",
      mp4_url: resolvedMp4Url,
      captions_url: renderResult.captionsPath ?? null,
      duration_s: renderResult.durationSeconds ?? null,
      width: 1080,
      height: 1920,
      self_review_json: selfReviewReport,
      completed_at: new Date().toISOString(),
      build_log: `self-review: ${selfReviewReport.overallPass ? "PASS" : "FAIL"} (${selfReviewReport.failedLayers.join(",") || "none"})`,
    })
    .eq("id", renderRow.id);

  const newVariantStatus = selfReviewReport.overallPass ? "preview-ready" : "self-review-failed";
  await supabase
    .from("variants")
    .update({
      status: newVariantStatus,
      validation_json: {
        self_review: {
          pass: selfReviewReport.overallPass,
          failed_layers: selfReviewReport.failedLayers,
          auto_fix_hint: selfReviewReport.autoFixHint,
          recommended_action: selfReviewReport.recommendedAction,
        },
      },
    })
    .eq("id", variant.id);

  if (selfReviewReport.overallPass) {
    console.log(`✓ Variant ${variant.id} → preview-ready: ${resolvedMp4Url}`);
  } else {
    console.warn(
      `✗ Variant ${variant.id} → self-review-failed: ${selfReviewReport.failedLayers.join(", ")}`,
    );
    if (selfReviewReport.autoFixHint) {
      console.warn(`  Auto-fix hint: ${selfReviewReport.autoFixHint}`);
    }
  }
}

async function fail(renderId: string, variantId: string, message: string): Promise<void> {
  console.error(`✗ Render ${renderId}: ${message}`);
  await supabase
    .from("renders")
    .update({ status: "failed", build_log: message, completed_at: new Date().toISOString() })
    .eq("id", renderId);
  await supabase.from("variants").update({ status: "self-review-failed" }).eq("id", variantId);
}

/** Summarizes approved feedback_patterns into a preference profile string. */
async function buildPreferenceSummary(): Promise<string> {
  const { data: patterns } = await supabase
    .from("feedback_patterns")
    .select("parsed_rule_json, applied_count")
    .order("applied_count", { ascending: false })
    .limit(10);

  if (!patterns || patterns.length === 0) return "No feedback patterns yet.";

  return patterns
    .map((p) => JSON.stringify(p.parsed_rule_json))
    .join("; ");
}

// ── Main loop ─────────────────────────────────────────────────────────────────

do {
  try {
    await tick();
  } catch (e) {
    console.error("tick error:", e);
  }
  if (!once) await new Promise((r) => setTimeout(r, 15_000));
} while (!once);
