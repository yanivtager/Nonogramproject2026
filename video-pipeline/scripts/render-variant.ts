#!/usr/bin/env node

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
import { ALL_SCRIPTS } from "../src/narration/scripts/index.js";
import { renderVariant } from "../src/render/render-variant.js";
import {
  buildCompositionArtworkSelectionForRecipe,
  loadArtworkV1Manifest,
} from "../src/marketing/composition-artwork-selection.js";
import type { TemplateId } from "../src/marketing/artwork-selection.js";

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
const templateId = arg("--template", "scale-shock")!;
const language = arg("--language", "en")! as LanguageCode;
const voiceArg = arg("--voice");
const outDir = resolve(arg("--out", join("out", "renders"))!);
const musicArg = arg("--music");
const musicPath = musicArg ? resolve(musicArg) : null;
const dryRun = process.argv.includes("--dry-run");

const listing = LISTINGS[listingId];
if (!listing) {
  throw new Error(`Unknown fixture listing "${listingId}". Valid: ${Object.keys(LISTINGS).join(", ")}`);
}

const templateScripts = ALL_SCRIPTS[templateId as keyof typeof ALL_SCRIPTS];
if (!templateScripts) {
  throw new Error(`Unknown template "${templateId}". Valid: ${Object.keys(ALL_SCRIPTS).join(", ")}`);
}
const script = templateScripts[language as keyof typeof templateScripts];
if (!script) {
  throw new Error(`No script for template "${templateId}" / language "${language}".`);
}

const resolvedVoiceId = voiceArg ?? DEFAULT_VOICES[language];
const voice: Voice = {
  id: "00000000-0000-0000-0000-000000000000",
  language,
  vendor: "edge-tts",
  vendor_voice_id: resolvedVoiceId,
  display_name: resolvedVoiceId,
  gender: null,
  sample_url: null,
  approved: true,
};

const track: Track = musicPath
  ? {
      id: "stage1-dragon-horroriffic",
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
      recommended_templates: ["solve-reveal"],
      recommended_gain_db: -7.5,
      approved: true,
      approval_status: "approved",
      approval_reason: null,
    }
  : {
      id: "45d36594-2402-40fa-85f7-b1666ba42eca",
      title: "Volatile Reaction",
      artist: "Kevin MacLeod",
      mood: "energetic",
      bpm: 155,
      duration_s: 125.0,
      license_source: "incompetech",
      license_proof_url: "https://incompetech.com/music/royalty-free/licenses/",
      source_url: "https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1400163",
      source_name: "incompetech",
      attribution_required: true,
      download_date: "2026-05-09",
      file_url: "https://incompetech.com/music/royalty-free/mp3-royaltyfree/Volatile%20Reaction.mp3",
      recommended_templates: ["scale-shock"],
      recommended_gain_db: -3.0,
      approved: true,
      approval_status: "approved",
      approval_reason: null,
    };

const artworkManifest = loadArtworkV1Manifest();
const artworkSelection = buildCompositionArtworkSelectionForRecipe(
  {
    listing_id: listing.id,
    template_id: templateId as TemplateId,
    language_code: language,
    voice_id: resolvedVoiceId,
    track_title: track.title,
    track_mood: track.mood,
  },
  artworkManifest,
);

const result = await renderVariant({
  variantId: `${listing.id}-${templateId}-${language}`,
  templateId,
  artworkSelection,
  listing,
  voice,
  track,
  script,
  outDir,
  musicApprovalStatus: "approved",
  musicGainDb: track.recommended_gain_db,
  dryRun,
});

console.log(JSON.stringify(result, null, 2));
process.exit(result.status === "ok" ? 0 : 1);
