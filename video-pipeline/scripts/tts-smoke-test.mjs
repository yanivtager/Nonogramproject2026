#!/usr/bin/env node
/**
 * Smoke test for the Edge TTS wrapper. Hits the live Microsoft Edge TTS service.
 * Run: node scripts/tts-smoke-test.mjs
 *
 * Pass criteria:
 *  - Synthesizes a short English clip
 *  - Cache miss on first run, cache hit on second
 *  - Audio file size > 1KB
 *  - ffprobe reports a duration > 0
 */

import { existsSync, statSync, rmSync } from "node:fs";
import { join } from "node:path";
import { synthesize, getCacheDir, audioFileLooksValid } from "../src/tts/edge-tts.ts";

async function main() {
  const cacheDir = getCacheDir();

  // Clear any prior cache to ensure a true first-run state.
  if (existsSync(cacheDir)) {
    rmSync(cacheDir, { recursive: true, force: true });
  }

  const opts = {
    voiceId: "en-US-AriaNeural",
    text: "Hello from Grand Grid Studio. This is a smoke test.",
  };

  console.log("Run 1 (expect cache miss)...");
  const r1 = await synthesize(opts);
  console.log("  audioPath:       ", r1.audioPath);
  console.log("  cacheKey:        ", r1.cacheKey);
  console.log("  durationSeconds: ", r1.durationSeconds);
  console.log("  cacheHit:        ", r1.cacheHit);

  if (r1.cacheHit) {
    throw new Error("Run 1 should be a cache miss");
  }
  if (!audioFileLooksValid(r1.audioPath)) {
    throw new Error("Run 1 produced an invalid audio file");
  }
  if (r1.durationSeconds <= 0.5) {
    throw new Error(`Run 1 duration suspiciously short: ${r1.durationSeconds}s`);
  }

  const sizeKb = statSync(r1.audioPath).size / 1024;
  console.log(`  file size:        ${sizeKb.toFixed(1)} KB`);

  console.log("\nRun 2 (expect cache hit)...");
  const r2 = await synthesize(opts);
  console.log("  cacheHit:        ", r2.cacheHit);
  console.log("  audioPath:       ", r2.audioPath);

  if (!r2.cacheHit) {
    throw new Error("Run 2 should be a cache hit");
  }
  if (r2.audioPath !== r1.audioPath) {
    throw new Error("Run 2 returned a different audio path than Run 1");
  }

  console.log("\nSMOKE TEST PASSED.");
}

main().catch((err) => {
  console.error("SMOKE TEST FAILED:", err);
  process.exit(1);
});
