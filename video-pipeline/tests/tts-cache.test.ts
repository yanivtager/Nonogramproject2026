/**
 * Tests the file-based cache logic without hitting the Edge TTS network.
 * Network synthesis is exercised separately by `scripts/curate-voices.mjs`.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { mkdtempSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { TtsAudioCache } from "../src/tts/cache.js";

describe("TtsAudioCache", () => {
  let cacheDir: string;
  let cache: TtsAudioCache;

  beforeEach(() => {
    cacheDir = mkdtempSync(join(tmpdir(), "tts-cache-test-"));
    cache = new TtsAudioCache(cacheDir);
  });

  it("computes deterministic SHA256 cache keys", () => {
    const k1 = cache.computeKey({ voiceId: "en-US-AriaNeural", rate: "+0%", pitch: "+0Hz", text: "Hello" });
    const k2 = cache.computeKey({ voiceId: "en-US-AriaNeural", rate: "+0%", pitch: "+0Hz", text: "Hello" });
    expect(k1).toBe(k2);
    expect(k1).toMatch(/^[0-9a-f]{64}$/);
  });

  it("changes cache key when any input changes", () => {
    const base = { voiceId: "en-US-AriaNeural", rate: "+0%", pitch: "+0Hz", text: "Hello" };
    const k = cache.computeKey(base);
    expect(cache.computeKey({ ...base, voiceId: "en-US-GuyNeural" })).not.toBe(k);
    expect(cache.computeKey({ ...base, rate: "-10%" })).not.toBe(k);
    expect(cache.computeKey({ ...base, pitch: "+5Hz" })).not.toBe(k);
    expect(cache.computeKey({ ...base, text: "Hello!" })).not.toBe(k);
  });

  it("shards entries by first 2 hex chars of the key", () => {
    const key = "abcdef" + "0".repeat(58);
    const entry = cache.resolve(key);
    expect(entry.audioPath).toContain(`${cacheDir}`);
    expect(entry.audioPath.replace(/\\/g, "/")).toContain(`/ab/${key}.mp3`);
    expect(entry.metaPath.replace(/\\/g, "/")).toContain(`/ab/${key}.meta.json`);
  });

  it("has() returns false until both audio and meta files exist", () => {
    const key = cache.computeKey({ voiceId: "v", rate: "+0%", pitch: "+0Hz", text: "x" });
    const entry = cache.resolve(key);
    expect(cache.has(key)).toBe(false);

    writeFileSync(entry.audioPath, "fake audio bytes");
    expect(cache.has(key)).toBe(false); // meta missing

    writeFileSync(entry.metaPath, JSON.stringify({}));
    expect(cache.has(key)).toBe(true);
  });

  it("readMeta() round-trips through writeMeta()", () => {
    const key = cache.computeKey({ voiceId: "v", rate: "+0%", pitch: "+0Hz", text: "y" });
    cache.writeMeta(key, {
      voiceId: "en-US-AriaNeural",
      rate: "+0%",
      pitch: "+0Hz",
      textSha256: "deadbeef",
      textPreview: "y",
      durationSeconds: 1.23,
      createdAt: "2026-05-08T00:00:00Z",
    });
    const meta = cache.readMeta(key);
    expect(meta).not.toBeNull();
    expect(meta!.voiceId).toBe("en-US-AriaNeural");
    expect(meta!.durationSeconds).toBe(1.23);
  });

  it("creates the cache directory if it doesn't exist", () => {
    const subDir = join(cacheDir, "nested", "deep");
    new TtsAudioCache(subDir);
    expect(existsSync(subDir)).toBe(true);
  });
});
