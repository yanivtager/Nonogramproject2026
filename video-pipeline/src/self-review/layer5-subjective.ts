/**
 * Layer 5 — Subjective grading.
 * Uses Claude multimodal to assess the video against a calibrated preference profile.
 * In calibration mode (< 3 approved variants), returns score 8 so everything surfaces.
 * After calibration, applies the learned preference profile and scores 0-10.
 */

import { existsSync, readFileSync } from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import type { SubjectiveGrade } from "./types.js";

export interface PreferenceProfile {
  approvedCount: number;
  feedbackSummary: string; // Free-text summary of what Yaniv has liked/disliked
  lastUpdatedAt: string;
}

export interface SubjectiveOptions {
  hookFramePath: string;
  midFramePath: string;
  ctaFramePath: string;
  listingName: string;
  templateId: string;
  languageCode: string;
  preferenceProfile: PreferenceProfile | null;
}

const CALIBRATION_THRESHOLD = 3;

export async function checkSubjective(
  opts: SubjectiveOptions,
): Promise<{ pass: boolean; grade: SubjectiveGrade }> {
  const { preferenceProfile } = opts;
  const approvedCount = preferenceProfile?.approvedCount ?? 0;
  const inCalibration = approvedCount < CALIBRATION_THRESHOLD;

  if (inCalibration) {
    // Calibration mode: surface everything — user's approvals will teach us preferences
    return {
      pass: true,
      grade: {
        score: 8,
        calibrationMode: true,
        reasoning:
          `Calibration mode (${approvedCount}/${CALIBRATION_THRESHOLD} approvals). ` +
          "Surfacing for user review to build preference profile.",
        preferenceProfileApplied: false,
      },
    };
  }

  const client = new Anthropic();

  // Collect keyframe images that exist
  const imageParts: Anthropic.ImageBlockParam[] = [];
  for (const framePath of [opts.hookFramePath, opts.midFramePath, opts.ctaFramePath]) {
    if (existsSync(framePath)) {
      const data = readFileSync(framePath).toString("base64");
      imageParts.push({
        type: "image",
        source: { type: "base64", media_type: "image/jpeg", data },
      });
    }
  }

  const systemPrompt =
    "You are a quality reviewer for GrandGridStudio, a nonogram puzzle Etsy shop. " +
    "You score marketing video quality on a scale of 0-10. " +
    "Respond in JSON: { score: number, reasoning: string }. Keep reasoning under 60 words.";

  const userPrompt =
    `Review these keyframes from a ${opts.templateId} video for "${opts.listingName}" (${opts.languageCode}).\n\n` +
    `Preference profile from past approvals:\n${preferenceProfile?.feedbackSummary ?? "No profile yet."}\n\n` +
    "Score 0-10 on: visual clarity, hook strength, text readability, professional feel. " +
    "Score ≥8 means surface to user; <8 means hold for revision.";

  let score = 8;
  let reasoning = "Subjective grade not available (API error); defaulting to 8.";

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: [
            ...imageParts,
            { type: "text", text: userPrompt },
          ],
        },
      ],
    });

    const block = response.content[0];
    let text = "";
    if (block && block.type === "text") text = block.text;
    const jsonMatch = /\{[\s\S]*\}/.exec(text);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as { score?: number; reasoning?: string };
      score = typeof parsed.score === "number" ? Math.min(10, Math.max(0, parsed.score)) : 8;
      reasoning = parsed.reasoning ?? reasoning;
    }
  } catch {
    // API failure is non-blocking; default to 8 so renders aren't blocked by outage
  }

  const grade: SubjectiveGrade = {
    score,
    calibrationMode: false,
    reasoning,
    preferenceProfileApplied: true,
  };

  return { pass: score >= 8, grade };
}
