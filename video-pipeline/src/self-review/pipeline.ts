/**
 * Self-review pipeline — top-level runner.
 *
 * Runs all 5 layers in order. A variant moves to `preview-ready` only when
 * layers 1-4 pass strictly AND layer 5 passes (score ≥8 or calibration mode).
 */

import { join, dirname } from "node:path";
import { existsSync, mkdirSync } from "node:fs";
import type { Listing } from "../data/types.js";
import type { NarrationScript } from "../narration/schema.js";
import { resolveScript } from "../narration/schema.js";
import { checkIntegrity } from "./layer1-integrity.js";
import { checkAudioFidelity } from "./layer2-audio.js";
import { checkVisualInspection } from "./layer3-visual.js";
import { checkEffectiveness } from "./layer4-effectiveness.js";
import { checkSubjective, type PreferenceProfile } from "./layer5-subjective.js";
import type { SelfReviewReport } from "./types.js";

export interface SelfReviewOptions {
  variantId: string;
  mp4Path: string;
  listing: Listing;
  script: NarrationScript;
  voiceId: string;
  captionsVttPath: string | null;
  musicPath: string | null;
  previousVoiceIdsForListing: string[];
  preferenceProfile: PreferenceProfile | null;
  /** Skip the expensive visual and subjective layers (fast mode for CI). */
  fastMode?: boolean;
}

export async function runSelfReview(opts: SelfReviewOptions): Promise<SelfReviewReport> {
  const reviewedAt = new Date().toISOString();
  const failedLayers: string[] = [];

  // ── Layer 1: Integrity ──────────────────────────────────────────────────────
  const { pass: l1Pass, check: integrityCheck } = await checkIntegrity(opts.mp4Path);
  if (!l1Pass) failedLayers.push("integrity");

  // ── Layer 2: Audio fidelity ─────────────────────────────────────────────────
  const expectedNarration = resolveScript(opts.script, opts.listing, opts.script.language_code)
    .map((r) => r.resolved_text)
    .join(" ");

  const { pass: l2Pass, check: audioCheck } = await checkAudioFidelity(
    opts.mp4Path,
    expectedNarration,
    opts.listing,
    opts.script.language_code,
  );
  if (!l2Pass) failedLayers.push("audioFidelity");

  // ── Layer 3: Visual inspection ──────────────────────────────────────────────
  let visualResult: Awaited<ReturnType<typeof checkVisualInspection>> | null = null;
  if (!opts.fastMode) {
    const durationSeconds = integrityCheck.durationSeconds ?? 15;
    visualResult = await checkVisualInspection(opts.mp4Path, durationSeconds, opts.listing.name);
    if (!visualResult.pass) failedLayers.push("visualInspection");
  }

  // ── Layer 4: Effectiveness ──────────────────────────────────────────────────
  const { pass: l4Pass, check: effectivenessCheck } = checkEffectiveness({
    durationSeconds: integrityCheck.durationSeconds ?? 15,
    script: opts.script,
    captionsVttPath: opts.captionsVttPath,
    musicPath: opts.musicPath,
    voiceId: opts.voiceId,
    previousVoiceIdsForListing: opts.previousVoiceIdsForListing,
  });
  if (!l4Pass) failedLayers.push("effectiveness");

  // ── Layer 5: Subjective grading ─────────────────────────────────────────────
  let subjectiveResult: Awaited<ReturnType<typeof checkSubjective>> | null = null;
  if (!opts.fastMode && failedLayers.length === 0) {
    // Only run expensive subjective layer when layers 1-4 pass
    const frameDir = opts.mp4Path.replace(/\.mp4$/, "-frames");
    subjectiveResult = await checkSubjective({
      hookFramePath: join(frameDir, "hook.jpg"),
      midFramePath: join(frameDir, "mid-5.jpg"),
      ctaFramePath: join(frameDir, "cta.jpg"),
      listingName: opts.listing.name,
      templateId: opts.script.template_id,
      languageCode: opts.script.language_code,
      preferenceProfile: opts.preferenceProfile,
    });
    if (!subjectiveResult.pass) failedLayers.push("subjective");
  }

  const overallPass = failedLayers.length === 0;

  // Derive recommendedAction
  let recommendedAction: SelfReviewReport["recommendedAction"];
  if (overallPass) {
    recommendedAction = "surface";
  } else if (failedLayers.includes("integrity") || failedLayers.includes("audioFidelity")) {
    recommendedAction = "auto-fix";
  } else if (failedLayers.includes("effectiveness")) {
    recommendedAction = "auto-fix";
  } else {
    recommendedAction = "needs-human";
  }

  // Construct auto-fix hint when applicable
  let autoFixHint: string | undefined;
  if (!l1Pass && !integrityCheck.audioPresent) {
    autoFixHint = "Audio track missing — re-render with TTS audio staged correctly.";
  } else if (!l1Pass && integrityCheck.audioLevelOk === false) {
    autoFixHint = `Audio too quiet (peak ${integrityCheck.audioPeakDb?.toFixed(1)} dB) — check TTS volume and music ducking.`;
  } else if (!l4Pass && !effectivenessCheck.captionsPresent) {
    autoFixHint = "Captions VTT not found — re-render with caption generation enabled.";
  } else if (!l4Pass && !effectivenessCheck.musicPresent) {
    autoFixHint = "No music track — assign a track before rendering.";
  }

  const report: SelfReviewReport = {
    variantId: opts.variantId,
    mp4Path: opts.mp4Path,
    reviewedAt,
    layers: {
      integrity: { pass: l1Pass, check: integrityCheck },
      audioFidelity: { pass: l2Pass, check: audioCheck },
      visualInspection: visualResult
        ? { pass: visualResult.pass, inspection: visualResult.inspection }
        : {
            pass: true,
            inspection: { keyframes: [], anyFrameFailed: false, glitchesDetected: [] },
          },
      effectiveness: { pass: l4Pass, check: effectivenessCheck },
      ...(subjectiveResult
        ? { subjective: { pass: subjectiveResult.pass, grade: subjectiveResult.grade } }
        : {}),
    },
    overallPass,
    failedLayers,
    recommendedAction,
    autoFixHint,
  };

  return report;
}
