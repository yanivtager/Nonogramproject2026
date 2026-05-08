#!/usr/bin/env node

import { join, resolve } from "node:path";

import { cafeSerenade, dragonsWrath, frozenGaze, ultimateBundle } from "../__fixtures__/listings.js";
import type { LanguageCode, Listing, Voice } from "../src/data/types.js";
import { scaleShockScripts } from "../src/narration/scripts/scale-shock.js";
import { renderVariant } from "../src/render/render-variant.js";

const LISTINGS: Record<string, Listing> = {
  "cafe-serenade": cafeSerenade,
  "dragons-wrath": dragonsWrath,
  "frozen-gaze": frozenGaze,
  "ultimate-bundle": ultimateBundle,
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
const outDir = resolve(arg("--out", join("out", "renders"))!);
const dryRun = process.argv.includes("--dry-run");

const listing = LISTINGS[listingId];
if (!listing) {
  throw new Error(`Unknown fixture listing "${listingId}". Valid: ${Object.keys(LISTINGS).join(", ")}`);
}

const script = scaleShockScripts[language];
if (!script) {
  throw new Error(`Scale Shock script does not exist for language "${language}".`);
}

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

const result = await renderVariant({
  variantId: `${listing.id}-scale-shock-${language}`,
  templateId: "scale-shock",
  listing,
  voice,
  track: null,
  script,
  outDir,
  dryRun,
});

console.log(JSON.stringify(result, null, 2));
process.exit(result.status === "ok" ? 0 : 1);
