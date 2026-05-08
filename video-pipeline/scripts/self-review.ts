#!/usr/bin/env node
/**
 * CLI: npm run self-review -- <path-to-mp4> [--full] [--fast]
 *
 * Default (no flags): quick ffprobe integrity check only.
 * --full: runs all 5 layers (integrity + Whisper STT + multimodal vision + effectiveness + subjective).
 *   Requires ANTHROPIC_API_KEY in the environment.
 * --fast: runs layers 1-4, skips vision and subjective (no API calls needed).
 *
 * For full integration (all layers with real listing context), the render worker
 * calls src/self-review/pipeline.ts directly.
 */

import { existsSync, mkdirSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

import ffmpegPath from "ffmpeg-static";
import ffprobeStatic from "ffprobe-static";
import { runSelfReview } from "../src/self-review/pipeline.js";
import { scaleShockScripts } from "../src/narration/scripts/scale-shock.js";
import type { Listing } from "../src/data/types.js";

interface ProbeStream {
  codec_type?: string;
  width?: number;
  height?: number;
}

interface LegacyReport {
  file: string;
  passed: boolean;
  checks: Record<string, { passed: boolean; detail: string }>;
  keyframesDir?: string;
  createdAt: string;
}

const mp4 = process.argv[2] ? resolve(process.argv[2]) : "";
if (!mp4 || !existsSync(mp4)) {
  throw new Error("Usage: npm run self-review -- <path-to-mp4> [--full] [--fast] [--keyframes]");
}

const fullMode = process.argv.includes("--full");
const fastMode = process.argv.includes("--fast");

// ── Full 5-layer pipeline mode ────────────────────────────────────────────────

if (fullMode || fastMode) {
  // Demo listing — in production the render worker passes the real listing from DB
  const demoListing: Listing = {
    id: "demo",
    name: "Demo Listing",
    etsy_url: "",
    etsy_listing_id: "0",
    theme: "demo",
    grid_size: "100x100",
    cell_count: 10000,
    puzzle_count: 1,
    difficulty: "Intermediate",
    cover_image_url: null,
    solved_artwork_url: null,
    recommended_templates: ["scale-shock"],
  };

  const variantId = mp4.replace(/\\/g, "/").split("/").pop()?.replace(/\.mp4$/i, "") ?? "unknown";

  const report = await runSelfReview({
    variantId,
    mp4Path: mp4,
    listing: demoListing,
    script: scaleShockScripts.en,
    voiceId: "en-US-AriaNeural",
    captionsVttPath: mp4.replace(/\.mp4$/, ".vtt"),
    musicPath: null,
    previousVoiceIdsForListing: [],
    preferenceProfile: null,
    fastMode,
  });

  const reportPath = mp4.replace(/\.mp4$/i, ".self-review.json");
  await writeFile(reportPath, JSON.stringify(report, null, 2), "utf8");

  console.log(JSON.stringify(report, null, 2));
  console.log(`\nOverall: ${report.overallPass ? "PASS ✓" : "FAIL ✗"}`);
  if (report.failedLayers.length > 0) {
    console.log(`Failed layers: ${report.failedLayers.join(", ")}`);
  }
  if (report.autoFixHint) console.log(`Auto-fix: ${report.autoFixHint}`);
  console.log(`Report: ${reportPath}`);
  process.exit(report.overallPass ? 0 : 1);
}

// ── Quick ffprobe-only mode (default, no API calls) ───────────────────────────

function probeJson(path: string): {
  streams: ProbeStream[];
  format?: { duration?: string; bit_rate?: string };
} {
  const result = spawnSync(
    ffprobeStatic.path,
    [
      "-v", "error",
      "-show_entries", "stream=codec_type,width,height:format=duration,bit_rate",
      "-of", "json",
      path,
    ],
    { encoding: "utf8" },
  );
  if (result.status !== 0) throw new Error(result.stderr || "ffprobe failed");
  return JSON.parse(result.stdout) as {
    streams: ProbeStream[];
    format?: { duration?: string; bit_rate?: string };
  };
}

const probe = probeJson(mp4);
const video = probe.streams.find((s) => s.codec_type === "video");
const audio = probe.streams.find((s) => s.codec_type === "audio");
const duration = Number(probe.format?.duration ?? 0);
const bitrate = Number(probe.format?.bit_rate ?? 0);

const checks: LegacyReport["checks"] = {
  exists: { passed: existsSync(mp4), detail: "MP4 file exists" },
  resolution: {
    passed: video?.width === 1080 && video?.height === 1920,
    detail: `Expected 1080x1920, got ${video?.width ?? "?"}x${video?.height ?? "?"}`,
  },
  duration: {
    passed: duration >= 12 && duration <= 25,
    detail: `Expected 12-25s, got ${duration.toFixed(2)}s`,
  },
  audio: {
    passed: Boolean(audio),
    detail: audio ? "Audio stream present" : "No audio stream found",
  },
  bitrate: {
    passed: bitrate === 0 || bitrate >= 1_500_000,
    detail: bitrate ? `Bitrate ${(bitrate / 1_000_000).toFixed(2)} Mbps` : "Bitrate unavailable",
  },
};

if (process.argv.includes("--keyframes")) {
  if (!ffmpegPath) throw new Error("ffmpeg-static did not provide a binary path.");
  const keyframesDir = join(dirname(mp4), "_self-review-keyframes");
  mkdirSync(keyframesDir, { recursive: true });
  const result = spawnSync(
    ffmpegPath,
    [
      "-y", "-i", mp4,
      "-vf", "select='eq(n,15)+eq(n,45)+eq(n,75)+eq(n,150)+eq(n,240)+eq(n,360)+eq(n,435)'",
      "-vsync", "0",
      join(keyframesDir, "frame-%02d.png"),
    ],
    { encoding: "utf8" },
  );
  checks.keyframes = {
    passed: result.status === 0,
    detail:
      result.status === 0
        ? `Keyframes written to ${keyframesDir}`
        : result.stderr.slice(-500),
  };
}

const report: LegacyReport = {
  file: mp4,
  passed: Object.values(checks).every((c) => c.passed),
  checks,
  createdAt: new Date().toISOString(),
};

const reportPath = mp4.replace(/\.mp4$/i, ".self-review.json");
await writeFile(reportPath, JSON.stringify(report, null, 2), "utf8");
console.log(JSON.stringify(report, null, 2));
console.log(`Report: ${reportPath}`);
process.exit(report.passed ? 0 : 1);
