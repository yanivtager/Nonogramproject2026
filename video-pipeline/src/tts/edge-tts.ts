/**
 * Microsoft Edge TTS wrapper.
 *
 * Usage:
 *   const result = await synthesize({ voiceId: "en-US-AriaNeural", text: "..." });
 *   // result.audioPath is the MP3 path (cached or freshly synthesized)
 *
 * Defaults to the project-local cache at ./out/tts-cache. Override via setCacheDir().
 *
 * Phase-0 limitation: word-by-word timing is not extracted from this wrapper.
 * The self-review pipeline runs a separate Whisper pass on the rendered video
 * audio track to verify transcription correctness and recover word timings.
 */

import { statSync } from "node:fs";
import { join } from "node:path";
import ffprobeStatic from "ffprobe-static";
import { spawn } from "node:child_process";

import { TtsAudioCache, type CacheMeta } from "./cache.js";
import { synthesizeViaPython } from "./edge-tts-python.js";
import type { SynthesizeOptions, SynthesisResult } from "./types.js";

const DEFAULT_RATE = "+0%";
const DEFAULT_PITCH = "+0Hz";

let cacheDir = join(process.cwd(), "out", "tts-cache");
let cache = new TtsAudioCache(cacheDir);

export function setCacheDir(dir: string): void {
  cacheDir = dir;
  cache = new TtsAudioCache(dir);
}

export function getCacheDir(): string {
  return cacheDir;
}

export async function synthesize(opts: SynthesizeOptions): Promise<SynthesisResult> {
  const rate = opts.rate ?? DEFAULT_RATE;
  const pitch = opts.pitch ?? DEFAULT_PITCH;
  const cacheKey = cache.computeKey({ voiceId: opts.voiceId, rate, pitch, text: opts.text });

  if (cache.has(cacheKey)) {
    const entry = cache.resolve(cacheKey);
    const meta = cache.readMeta(cacheKey);
    return {
      audioPath: entry.audioPath,
      cacheKey,
      durationSeconds: meta?.durationSeconds ?? 0,
      cacheHit: true,
    };
  }

  const entry = cache.resolve(cacheKey);
  const vttPath = entry.audioPath.replace(/\.mp3$/, ".vtt");

  await synthesizeViaPython({
    voiceId: opts.voiceId,
    text: opts.text,
    rate,
    pitch,
    mp3OutPath: entry.audioPath,
    vttOutPath: vttPath,
  });

  const durationSeconds = await probeDurationSeconds(entry.audioPath);

  const meta: CacheMeta = {
    voiceId: opts.voiceId,
    rate,
    pitch,
    textSha256: hashText(opts.text),
    textPreview: opts.text.slice(0, 120),
    durationSeconds,
    createdAt: new Date().toISOString(),
  };
  cache.writeMeta(cacheKey, meta);

  return {
    audioPath: entry.audioPath,
    cacheKey,
    durationSeconds,
    cacheHit: false,
  };
}

/**
 * Probes a media file for its audio duration in seconds. Returns 0 on failure.
 */
export function probeDurationSeconds(path: string): Promise<number> {
  return new Promise((resolve) => {
    const proc = spawn(ffprobeStatic.path, [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      path,
    ]);
    let stdout = "";
    proc.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    proc.on("close", (code) => {
      if (code !== 0) {
        resolve(0);
        return;
      }
      const seconds = Number(stdout.trim());
      resolve(Number.isFinite(seconds) ? seconds : 0);
    });
    proc.on("error", () => resolve(0));
  });
}

function hashText(text: string): string {
  // Re-use the same hashing path as the cache for consistency.
  return new TtsAudioCache(cacheDir).computeKey({
    voiceId: "",
    rate: "",
    pitch: "",
    text,
  });
}

/**
 * Re-export so callers can introspect the cache via a single import.
 */
export { TtsAudioCache } from "./cache.js";

/**
 * Sanity helper: verify a generated audio file exists and has nonzero size.
 */
export function audioFileLooksValid(path: string): boolean {
  try {
    const stat = statSync(path);
    return stat.isFile() && stat.size > 1024; // <1KB is almost certainly a failure
  } catch {
    return false;
  }
}
