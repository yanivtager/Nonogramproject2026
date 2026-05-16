#!/usr/bin/env node
/**
 * Matrix seeder — inserts variants + queued render rows for the Phase 1 (or Phase 2) batch.
 *
 * Usage:
 *   npx tsx scripts/seed-matrix-batch.ts --dry-run
 *   npx tsx scripts/seed-matrix-batch.ts
 *   npx tsx scripts/seed-matrix-batch.ts --template scale-shock --language en
 *   npx tsx scripts/seed-matrix-batch.ts --template print-ritual-real --listings cafe-serenade,frozen-gaze,...
 *
 * --dry-run: print the expected count without touching the database.
 */

import { createClient } from "@supabase/supabase-js";
import {
  cafeSerenade,
  dragonsWrath,
  frozenGaze,
  ultimateBundle,
  titanicSeries,
  colossusSeries,
  behemothSeries,
} from "../__fixtures__/listings.js";
import {
  SHIPPABLE_TEMPLATES,
  DEFAULT_TRACK_ID_PER_TEMPLATE,
} from "../src/marketing/template-defaults.js";
import { CANDIDATE_VOICES } from "../src/tts/voices-registry.js";
import type { LanguageCode, TemplateId, Listing } from "../src/data/types.js";

const LANGUAGES: LanguageCode[] = ["en", "es", "ja", "pt-BR"];

const ALL_LISTINGS: Listing[] = [
  cafeSerenade,
  dragonsWrath,
  frozenGaze,
  ultimateBundle,
  titanicSeries,
  colossusSeries,
  behemothSeries,
];

// Maps the slug keys in template-defaults.ts → DB track title for live lookup
const TRACK_TITLE_LOOKUP: Record<string, string> = {
  "volatile-reaction": "Volatile Reaction",
  "carpe-diem": "Carpe Diem",
  "kevin-macleod-horroriffic": "Horroriffic",
};

function arg(name: string): string | undefined {
  const idx = process.argv.indexOf(name);
  return idx >= 0 ? process.argv[idx + 1] : undefined;
}

function groupBy<T>(arr: T[], key: (item: T) => string): Record<string, T[]> {
  const result: Record<string, T[]> = {};
  for (const item of arr) {
    const k = key(item);
    (result[k] ??= []).push(item);
  }
  return result;
}

const dryRun = process.argv.includes("--dry-run");
const onlyTemplate = arg("--template") as TemplateId | undefined;
const onlyLanguage = arg("--language") as LanguageCode | undefined;
const listingsArg = arg("--listings");

// Resolve target templates and languages
const templates: TemplateId[] = onlyTemplate ? [onlyTemplate] : SHIPPABLE_TEMPLATES;
const languages: LanguageCode[] = onlyLanguage ? [onlyLanguage] : LANGUAGES;

const listingsMap = Object.fromEntries(ALL_LISTINGS.map((l) => [l.id, l]));
const explicitListingIds = listingsArg ? listingsArg.split(",").map((s) => s.trim()) : null;

// For dry-run: use CANDIDATE_VOICES from local registry (all 17 are approved in DB after migration 016)
// For live insert: query actual approved UUIDs from DB
const localVoicesByLanguage = groupBy(CANDIDATE_VOICES, (v) => v.language);

function listingsForTemplate(template: TemplateId): Listing[] {
  if (explicitListingIds) {
    return explicitListingIds.map((id) => {
      const l = listingsMap[id];
      if (!l) throw new Error(`Unknown listing id "${id}" in --listings`);
      return l;
    });
  }
  return ALL_LISTINGS.filter((l) => {
    // Phase 1: print-ritual-real only for listings that have solved_artwork_url
    if (template === "print-ritual-real" && !l.solved_artwork_url) return false;
    return true;
  });
}

// Count expected rows using local data (works offline for --dry-run)
let totalCount = 0;
const byTemplate: Record<string, number> = {};

for (const template of templates) {
  let count = 0;
  for (const listing of listingsForTemplate(template)) {
    for (const lang of languages) {
      count += (localVoicesByLanguage[lang] ?? []).length;
    }
  }
  byTemplate[template] = count;
  totalCount += count;
}

const summaryStr = Object.entries(byTemplate)
  .map(([t, c]) => `${t}=${c}`)
  .join(", ");
console.log(`Would seed ${totalCount} variants (${summaryStr})`);

if (dryRun) process.exit(0);

// --- Live insert path: requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY ---

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for live insert.");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Fetch approved voices from DB (UUID is needed for the FK)
const { data: voiceRows, error: voiceErr } = await supabase
  .from("voices")
  .select("id, language, vendor_voice_id")
  .eq("approved", true);

if (voiceErr) throw new Error(`Voices query failed: ${voiceErr.message}`);
const dbVoicesByLanguage = groupBy(voiceRows!, (v) => v.language as string);

// Fetch track UUIDs for the 3 canonical tracks by title
const { data: trackRows, error: trackErr } = await supabase
  .from("tracks")
  .select("id, title")
  .eq("approval_status", "approved");

if (trackErr) throw new Error(`Tracks query failed: ${trackErr.message}`);

const trackIdBySlug: Record<string, string> = {};
for (const [slug, titleMatch] of Object.entries(TRACK_TITLE_LOOKUP)) {
  const row = trackRows!.find((t) => t.title === titleMatch);
  if (!row) throw new Error(`Track not found: slug "${slug}" → expected title "${titleMatch}"`);
  trackIdBySlug[slug] = row.id;
}

// Build desired rows using DB UUIDs
interface SeedRow {
  listing_id: string;
  template_id: string;
  language_code: LanguageCode;
  voice_uuid: string;
  track_uuid: string;
}

const desiredRows: SeedRow[] = [];

for (const template of templates) {
  const trackSlug = DEFAULT_TRACK_ID_PER_TEMPLATE[template];
  const trackUuid = trackIdBySlug[trackSlug];
  if (!trackUuid) {
    throw new Error(`No track UUID for template "${template}" (slug: "${trackSlug}")`);
  }

  for (const listing of listingsForTemplate(template)) {
    for (const lang of languages) {
      const voices = dbVoicesByLanguage[lang] ?? [];
      for (const voice of voices) {
        desiredRows.push({
          listing_id: listing.id,
          template_id: template,
          language_code: lang,
          voice_uuid: voice.id,
          track_uuid: trackUuid,
        });
      }
    }
  }
}

// Fetch existing variants to skip duplicates (no unique constraint on the table)
const listingIds = [...new Set(desiredRows.map((r) => r.listing_id))];
const { data: existingRows, error: existErr } = await supabase
  .from("variants")
  .select("listing_id, template_id, language_code, voice_id, track_id")
  .in("listing_id", listingIds)
  .in("template_id", templates);

if (existErr) throw new Error(`Existing variants query failed: ${existErr.message}`);

const existingSet = new Set(
  (existingRows ?? []).map(
    (r) => `${r.listing_id}|${r.template_id}|${r.language_code}|${r.voice_id}|${r.track_id}`,
  ),
);

const newRows = desiredRows.filter(
  (r) =>
    !existingSet.has(
      `${r.listing_id}|${r.template_id}|${r.language_code}|${r.voice_uuid}|${r.track_uuid}`,
    ),
);

console.log(`Skipping ${desiredRows.length - newRows.length} already-existing variants.`);
console.log(`Inserting ${newRows.length} new variants + render rows...`);

if (newRows.length === 0) {
  console.log("Nothing to insert.");
  process.exit(0);
}

// Batch insert to avoid request-size limits
const BATCH_SIZE = 50;
let insertedVariants = 0;
let insertedRenders = 0;

for (let i = 0; i < newRows.length; i += BATCH_SIZE) {
  const batch = newRows.slice(i, i + BATCH_SIZE);

  const variantInserts = batch.map((r) => ({
    listing_id: r.listing_id,
    template_id: r.template_id,
    language_code: r.language_code,
    voice_id: r.voice_uuid,
    track_id: r.track_uuid,
    narration_script_json: {},
    on_screen_copy_json: {},
    validation_json: {},
  }));

  const { data: insertedVariantRows, error: variantErr } = await supabase
    .from("variants")
    .insert(variantInserts)
    .select("id");

  if (variantErr) throw new Error(`Variant insert batch ${i} failed: ${variantErr.message}`);
  insertedVariants += insertedVariantRows!.length;

  const renderInserts = insertedVariantRows!.map((v) => ({ variant_id: v.id }));
  const { error: renderErr } = await supabase.from("renders").insert(renderInserts);
  if (renderErr) throw new Error(`Render insert batch ${i} failed: ${renderErr.message}`);
  insertedRenders += renderInserts.length;

  process.stdout.write(`\r  Progress: ${Math.min(i + BATCH_SIZE, newRows.length)}/${newRows.length}`);
}

console.log(`\nDone. Inserted ${insertedVariants} variants, ${insertedRenders} render rows.`);
