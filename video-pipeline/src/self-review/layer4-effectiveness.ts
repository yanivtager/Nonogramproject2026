/**
 * Layer 4 — Effectiveness scorecard.
 * Six binary research-derived checks. Score 0-6; pass requires ≥5.
 */

import { existsSync, statSync, readFileSync } from "node:fs";
import type { NarrationScript } from "../narration/schema.js";
import type { EffectivenessCheck } from "./types.js";

export interface EffectivenessOptions {
  durationSeconds: number;
  script: NarrationScript;
  captionsVttPath: string | null;
  musicPath: string | null;
  /** Voice ID used for this variant. */
  voiceId: string;
  /** Voice IDs previously used for other variants on the same listing. */
  previousVoiceIdsForListing: string[];
}

export function checkEffectiveness(opts: EffectivenessOptions): {
  pass: boolean;
  check: EffectivenessCheck;
} {
  // 1. Hook duration: hook segment ends at or before 3s
  const hookSegment = opts.script.segments.find((s) => s.kind === "hook");
  const hookDurationOk = hookSegment ? hookSegment.end_s <= 3.0 : false;

  // 2. Captions present and non-trivial
  const captionsPresent =
    !!opts.captionsVttPath &&
    existsSync(opts.captionsVttPath) &&
    statSync(opts.captionsVttPath).size > 50;

  // 3. Music present
  const musicPresent =
    !!opts.musicPath &&
    (opts.musicPath.startsWith("http") || existsSync(opts.musicPath));

  // 4. Total length 12–25s
  const totalDurationOk = opts.durationSeconds >= 12 && opts.durationSeconds <= 25;

  // 5. CTA shown in last 2s: find cta segment, check its end_s ≥ duration-2
  const ctaSegment = opts.script.segments.find((s) => s.kind === "cta");
  const ctaShownAtEnd = ctaSegment
    ? ctaSegment.end_s >= opts.durationSeconds - 2
    : false;

  // 6. Voice variety: current voice is different from previous variant's voice on same listing
  const voiceVarietyOk =
    opts.previousVoiceIdsForListing.length === 0 ||
    !opts.previousVoiceIdsForListing.includes(opts.voiceId);

  const checks = [
    hookDurationOk,
    captionsPresent,
    musicPresent,
    totalDurationOk,
    ctaShownAtEnd,
    voiceVarietyOk,
  ];
  const score = checks.filter(Boolean).length;

  const check: EffectivenessCheck = {
    hookDurationOk,
    captionsPresent,
    musicPresent,
    totalDurationOk,
    ctaShownAtEnd,
    voiceVarietyOk,
    score,
  };

  return { pass: score >= 5, check };
}
