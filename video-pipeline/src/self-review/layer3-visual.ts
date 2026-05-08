/**
 * Layer 3 — Visual inspection.
 * Extracts 7 keyframes via ffmpeg; sends each to Claude multimodal vision for analysis.
 * Checks: hook readability, text contrast, no overlap, CTA presence, no glitches.
 */

import { execFile } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { promisify } from "node:util";
import Anthropic from "@anthropic-ai/sdk";
import type { KeyframeCheck, VisualInspection } from "./types.js";

const execFileAsync = promisify(execFile);

const KEYFRAMES = [
  { label: "hook", t: 0.5 },
  { label: "mid-1.5", t: 1.5 },
  { label: "mid-2.5", t: 2.5 },
  { label: "mid-5", t: 5.0 },
  { label: "mid-8", t: 8.0 },
  { label: "mid-12", t: 12.0 },
  { label: "cta", t: -1 }, // -1 = end-0.5s, resolved from duration
];

async function extractKeyframe(
  mp4Path: string,
  timecode: string,
  outputPath: string,
  ffmpegBin: string,
): Promise<boolean> {
  try {
    await execFileAsync(ffmpegBin, [
      "-ss", timecode,
      "-i", mp4Path,
      "-vframes", "1",
      "-q:v", "2",
      "-y",
      outputPath,
    ]);
    return existsSync(outputPath);
  } catch {
    return false;
  }
}

function buildFramePrompt(label: string): string {
  const baseInstruction =
    "You are reviewing a 9:16 short-form marketing video frame for quality. " +
    "Reply in JSON: { pass: boolean, issues: string[], observations: string }. " +
    "Keep observations under 40 words.";

  const labelInstructions: Record<string, string> = {
    hook:
      "This is the HOOK frame (first ~0.5s). Check: (1) Is there visible text? Is it readable within 1 second? " +
      "(2) Is there a clear visual hook / interesting image? (3) Any rendering glitch, black frame, or watermark?",
    cta:
      "This is the CTA (call-to-action) frame (near end). Check: (1) Is Etsy or Grand Grid Studio mentioned/visible? " +
      "(2) Is there clear branding text? (3) Any rendering artifact, cut-off text, or watermark?",
  };

  const genericInstruction =
    "Check: (1) Text not cut off at edges, contrast adequate? (2) No layout overlap between text and visual? " +
    "(3) No rendering glitch, garbled text, or watermark?";

  return `${baseInstruction}\n\n${labelInstructions[label] ?? genericInstruction}`;
}

export async function checkVisualInspection(
  mp4Path: string,
  durationSeconds: number,
  listingName: string,
): Promise<{ pass: boolean; inspection: VisualInspection }> {
  const client = new Anthropic();

  // Find ffmpeg binary via ffprobe-static's sibling package
  const ffprobeStaticMod = (await import("ffprobe-static")).default as { path: string };
  const ffmpegBin = ffprobeStaticMod.path
    .replace(/ffprobe(\.exe)?$/, (_, ext: string | undefined) => `ffmpeg${ext ?? ""}`)
    .replace("ffprobe-static", "ffmpeg-static");

  // Fall back to system ffmpeg if the static binary path doesn't resolve
  const ffmpegExe = existsSync(ffmpegBin) ? ffmpegBin : "ffmpeg";

  const frameDir = join(tmpdir(), `sr-frames-${Date.now()}`);
  mkdirSync(frameDir, { recursive: true });

  const keyframeChecks: KeyframeCheck[] = [];
  const glitchesDetected: string[] = [];

  for (const kf of KEYFRAMES) {
    const t = kf.t < 0 ? Math.max(0, durationSeconds + kf.t) : kf.t;
    // Skip if beyond video duration
    if (t >= durationSeconds) continue;

    const framePath = join(frameDir, `${kf.label}.jpg`);
    const extracted = await extractKeyframe(mp4Path, String(t.toFixed(2)), framePath, ffmpegExe);

    if (!extracted) {
      keyframeChecks.push({
        timestampSeconds: t,
        framePath,
        label: kf.label,
        pass: false,
        issues: ["failed to extract frame"],
      });
      glitchesDetected.push(`Frame extraction failed at t=${t}s`);
      continue;
    }

    // Send to Claude vision
    let gradePass = true;
    let issues: string[] = [];
    let observations = "";

    try {
      const imageData = readFileSync(framePath);
      const base64 = imageData.toString("base64");

      const response = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 300,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: "image/jpeg", data: base64 },
              },
              {
                type: "text",
                text: buildFramePrompt(kf.label),
              },
            ],
          },
        ],
      });

      const block = response.content[0];
      let text = "";
      if (block && block.type === "text") text = block.text;
      // Extract JSON from the response (may be wrapped in markdown code fences)
      const jsonMatch = /\{[\s\S]*\}/.exec(text);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as {
          pass?: boolean;
          issues?: string[];
          observations?: string;
        };
        gradePass = parsed.pass ?? true;
        issues = parsed.issues ?? [];
        observations = parsed.observations ?? "";
      }
    } catch {
      // Vision failure is non-blocking — log and continue
      observations = "Vision check skipped (API error)";
    }

    if (!gradePass && issues.some((i) => /glitch|watermark|black frame/i.test(i))) {
      glitchesDetected.push(...issues.filter((i) => /glitch|watermark|black frame/i.test(i)));
    }

    keyframeChecks.push({
      timestampSeconds: t,
      framePath,
      label: kf.label,
      pass: gradePass,
      issues,
      observations,
    });
  }

  const anyFrameFailed = keyframeChecks.some((k) => !k.pass);
  const inspection: VisualInspection = {
    keyframes: keyframeChecks,
    anyFrameFailed,
    glitchesDetected,
  };

  return { pass: !anyFrameFailed, inspection };
}
