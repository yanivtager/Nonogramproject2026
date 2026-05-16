#!/usr/bin/env node

/**
 * Driver for the print-ritual-real template: brands a pre-rendered background
 * video (e.g. the Kling-generated "Finished print ritual man.mp4") with
 * standard promo overlays — top stats bar, narration captions, GrandGridStudio
 * mark, and the gold "Download on Etsy" CTA — using the same TTS + music
 * pipeline as every other template.
 *
 * Usage:
 *   npx tsx scripts/render-print-ritual-real.ts \
 *     [--listing <id>] \
 *     [--video <path>] \
 *     [--music <path>] \
 *     [--language <en|es|ja|pt-BR>] \
 *     [--out <dir>] \
 *     [--dry-run]
 *
 * Defaults are tuned to the original ask (Dragon's Wrath + Kling print-ritual
 * footage). Swap the artwork with `--listing frozen-gaze` etc. — the overlays
 * regenerate from the listing record (no code changes).
 */

import { existsSync } from "node:fs";
import { join, resolve } from "node:path";

import {
  cafeSerenade,
  dragonsWrath,
  frozenGaze,
  ultimateBundle,
  titanicSeries,
  colossusSeries,
  behemothSeries,
} from "../__fixtures__/listings.js";
import type { LanguageCode, Listing, Track, Voice } from "../src/data/types.js";
import { printRitualScripts } from "../src/narration/scripts/print-ritual.js";
import { renderVariant } from "../src/render/render-variant.js";

const LISTINGS: Record<string, Listing> = {
  "cafe-serenade": cafeSerenade,
  "dragons-wrath": dragonsWrath,
  "frozen-gaze": frozenGaze,
  "ultimate-bundle": ultimateBundle,
  "titanic-series": titanicSeries,
  "colossus-series": colossusSeries,
  "behemoth-series": behemothSeries,
};

const DEFAULT_VOICES: Record<LanguageCode, string> = {
  en: "en-US-AriaNeural",
  es: "es-MX-DaliaNeural",
  ja: "ja-JP-NanamiNeural",
  "pt-BR": "pt-BR-FranciscaNeural",
};

function arg(name: string, fallback?: string): string | undefined {
  const idx = process.argv.indexOf(name);
  return idx >= 0 ? process.argv[idx + 1] : fallback;
}

const listingId = arg("--listing", "dragons-wrath")!;
const language = arg("--language", "en")! as LanguageCode;
const dryRun = process.argv.includes("--dry-run");

const listing = LISTINGS[listingId];
if (!listing) {
  throw new Error(`Unknown fixture listing "${listingId}". Valid: ${Object.keys(LISTINGS).join(", ")}`);
}

const script = printRitualScripts[language];
if (!script) {
  throw new Error(`Print Ritual script does not exist for language "${language}".`);
}

// Default background video: the Kling-generated print-ritual footage that
// prompted this template. Lives at the repo root, one level up from video-pipeline.
const defaultVideo = resolve(process.cwd(), "..", "Kling", "Print-Ritual", "Finished print ritual man.mp4");
const backgroundVideoPath = resolve(arg("--video", defaultVideo)!);
if (!existsSync(backgroundVideoPath)) {
  throw new Error(
    `Background video not found at "${backgroundVideoPath}". Pass --video <path> to override.`,
  );
}

// Default approved music: the only locally-available approved track in the
// repo. Calm/cinematic Kevin MacLeod piece — not specifically tagged for
// print-ritual, but acceptable as the user-requested fallback ("if there
// isn't one for print ritual, just pick any available music"). Override with
// --music when a better fit is available.
const defaultMusic = resolve(process.cwd(), "assets", "music", "kevin-macleod-horroriffic.mp3");
const musicArg = arg("--music", defaultMusic);
const musicPath = musicArg ? resolve(musicArg) : null;
if (musicPath && !existsSync(musicPath)) {
  throw new Error(`Music file not found at "${musicPath}". Pass --music <path> or omit to use no music.`);
}

const outDir = resolve(arg("--out", join("out", "renders", "print-ritual-real"))!);

const voice: Voice = {
  id: "00000000-0000-0000-0000-000000000000",
  language,
  vendor: "edge-tts",
  vendor_voice_id: DEFAULT_VOICES[language],
  display_name: DEFAULT_VOICES[language],
  gender: null,
  sample_url: null,
  approved: true,
};

const track: Track | null = musicPath
  ? {
      id: "local-kevin-macleod-horroriffic",
      title: "Horroriffic",
      artist: "Kevin MacLeod",
      mood: "cinematic-tense",
      bpm: null,
      duration_s: 168.07,
      license_source: "incompetech",
      license_proof_url: "https://commons.wikimedia.org/wiki/File:Kevin_MacLeod_-_Horroriffic.ogg",
      source_url: null,
      source_name: "incompetech",
      attribution_required: true,
      download_date: "2026-05-09",
      file_url: musicPath,
      // Tagged for both the live-action and synthetic print-ritual templates
      // so the approval-semantics check passes.
      recommended_templates: ["print-ritual", "print-ritual-real"],
      recommended_gain_db: -9.0,
      approved: true,
      approval_status: "approved",
      approval_reason: null,
    }
  : null;

const result = await renderVariant({
  variantId: `${listing.id}-print-ritual-real-${language}`,
  templateId: "print-ritual-real",
  listing,
  voice,
  track,
  script,
  outDir,
  backgroundVideoPath,
  musicApprovalStatus: track ? "approved" : null,
  musicGainDb: track?.recommended_gain_db ?? null,
  dryRun,
});

console.log(JSON.stringify(result, null, 2));
process.exit(result.status === "ok" ? 0 : 1);
