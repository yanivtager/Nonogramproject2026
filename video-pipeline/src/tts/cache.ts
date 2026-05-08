/**
 * File-based audio cache for synthesized TTS output.
 *
 * Cache key: SHA256("voiceId:rate:pitch:text") — ensures any change to inputs misses the cache.
 * Storage:   {cacheDir}/{first-2-hex}/{key}.mp3 plus {key}.meta.json with metadata.
 *
 * Caching matters because:
 *  - Re-renders are common (cascade fixes, parameter tweaks).
 *  - Even Edge TTS being free, network calls add ~1-3s per variant; cached lookups are <5ms.
 *  - We isolate "did the input change" from "did the audio change" — if the cache hits, the audio is byte-identical.
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export interface CacheEntry {
  cacheKey: string;
  audioPath: string;
  metaPath: string;
}

export interface CacheMeta {
  voiceId: string;
  rate: string;
  pitch: string;
  textSha256: string;
  textPreview: string;
  durationSeconds: number | null;
  createdAt: string;
}

export class TtsAudioCache {
  constructor(private readonly cacheDir: string) {
    mkdirSync(this.cacheDir, { recursive: true });
  }

  computeKey(input: { voiceId: string; rate: string; pitch: string; text: string }): string {
    const composite = `${input.voiceId}:${input.rate}:${input.pitch}:${input.text}`;
    return createHash("sha256").update(composite, "utf8").digest("hex");
  }

  resolve(cacheKey: string): CacheEntry {
    const shard = cacheKey.slice(0, 2);
    const shardDir = join(this.cacheDir, shard);
    mkdirSync(shardDir, { recursive: true });
    return {
      cacheKey,
      audioPath: join(shardDir, `${cacheKey}.mp3`),
      metaPath: join(shardDir, `${cacheKey}.meta.json`),
    };
  }

  has(cacheKey: string): boolean {
    const entry = this.resolve(cacheKey);
    return existsSync(entry.audioPath) && existsSync(entry.metaPath);
  }

  readMeta(cacheKey: string): CacheMeta | null {
    const entry = this.resolve(cacheKey);
    if (!existsSync(entry.metaPath)) return null;
    return JSON.parse(readFileSync(entry.metaPath, "utf8")) as CacheMeta;
  }

  writeMeta(cacheKey: string, meta: CacheMeta): void {
    const entry = this.resolve(cacheKey);
    writeFileSync(entry.metaPath, JSON.stringify(meta, null, 2));
  }
}
