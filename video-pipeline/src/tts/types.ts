import type { LanguageCode } from "../data/types.js";

export interface SynthesizeOptions {
  /** Edge TTS short name like "en-US-AriaNeural". */
  voiceId: string;
  /** Plain text to synthesize. Must already pass the numeric-token gate. */
  text: string;
  /** Optional pacing override. Examples: "-10%" (slow), "+0%" (default), "+10%" (fast). */
  rate?: string;
  /** Optional pitch override. Default unchanged. */
  pitch?: string;
}

export interface SynthesisResult {
  /** Absolute path to the generated MP3 (cached or freshly synthesized). */
  audioPath: string;
  /** Cache key (SHA256 hex of "voiceId:rate:pitch:text"). */
  cacheKey: string;
  /** Duration in seconds (best-effort; resolved via ffprobe after synthesis). */
  durationSeconds: number;
  /** True if served from cache. */
  cacheHit: boolean;
}

export interface VoiceMeta {
  short_name: string;
  display_name: string;
  locale: string;
  language: LanguageCode;
  gender: "male" | "female" | "neutral";
}
