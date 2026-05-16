#!/usr/bin/env node
/**
 * Per-variant marketing pack generator.
 * For each completed render: extract thumbnail + generate 3 platform captions.
 *
 * Usage:
 *   npx tsx scripts/generate-marketing-pack.ts --variant <id>
 *   npx tsx scripts/generate-marketing-pack.ts --all [--concurrency 8]
 *   npx tsx scripts/generate-marketing-pack.ts --template print-ritual-real
 */

import { createClient } from "@supabase/supabase-js";
import { existsSync, mkdirSync, writeFileSync, copyFileSync } from "node:fs";
import { join, basename } from "node:path";
import { extractThumbnail } from "../src/marketing/thumbnail-extractor.js";
import { generateCopy } from "../src/marketing/copy-generator.js";
import type { LanguageCode, TemplateId } from "../src/data/types.js";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Missing Supabase env vars");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function arg(name: string): string | undefined {
  const idx = process.argv.indexOf(name);
  return idx >= 0 ? process.argv[idx + 1] : undefined;
}

const variantArg = arg("--variant");
const templateArg = arg("--template");
const allMode = process.argv.includes("--all");
const concurrency = parseInt(arg("--concurrency") ?? "4", 10);

const OUT_DIR = join(process.cwd(), "out", "marketing-pack");
const WORKER_RENDERS_DIR = join(process.cwd(), "out", "worker-renders");

const PLATFORMS = ["instagram-reels", "tiktok", "youtube-shorts"] as const;

async function processVariant(render: {
  id: string;
  mp4_url: string | null;
  variant_id: string;
  variants: {
    listing_id: string;
    template_id: string;
    language_code: string;
    listings: { name: string; grid_size: string; cell_count: number; puzzle_count: number; theme: string; etsy_url: string };
    voices: { vendor_voice_id: string };
    narration_script_json: unknown;
  };
}): Promise<void> {
  const v = render.variants;
  const variantDir = join(OUT_DIR, render.variant_id);
  mkdirSync(variantDir, { recursive: true });

  // Resolve local mp4 path
  const localMp4 = join(WORKER_RENDERS_DIR, `${render.variant_id}.mp4`);
  const mp4Path = existsSync(localMp4) ? localMp4 : null;

  if (!mp4Path) {
    console.warn(`  [skip] No local mp4 for ${render.variant_id}`);
    return;
  }

  // Thumbnail
  const thumbPath = join(variantDir, "thumbnail.jpg");
  if (!existsSync(thumbPath)) {
    await extractThumbnail(mp4Path, variantDir);
  }

  // Copy mp4
  const destMp4 = join(variantDir, basename(mp4Path));
  if (!existsSync(destMp4)) copyFileSync(mp4Path, destMp4);

  // Extract narration text from script JSON
  const scriptSegments = (v.narration_script_json as { segments?: Array<{ text_template?: string }> })?.segments ?? [];
  const narrationText = scriptSegments.map((s) => s.text_template ?? "").join(". ");

  const listing = v.listings;

  // Generate copy for 3 platforms
  for (const platform of PLATFORMS) {
    const outFile = join(variantDir, `${platform}.json`);
    if (existsSync(outFile)) continue;

    const copy = await generateCopy({
      listing,
      template: v.template_id as TemplateId,
      language: v.language_code as LanguageCode,
      platform,
      narrationResolvedText: narrationText,
    });
    writeFileSync(outFile, JSON.stringify(copy, null, 2));
  }
}

// Fetch completed renders
let query = supabase
  .from("renders")
  .select("id, variant_id, mp4_url, variants!inner(listing_id, template_id, language_code, narration_script_json, listings!inner(name,grid_size,cell_count,puzzle_count,theme,etsy_url), voices!inner(vendor_voice_id))")
  .eq("status", "completed");

if (variantArg) {
  query = query.eq("variant_id", variantArg);
} else if (templateArg) {
  query = query.eq("variants.template_id", templateArg);
}

const { data: renders, error } = await query;
if (error) throw new Error(`Fetch failed: ${error.message}`);
if (!renders?.length) { console.log("No completed renders found."); process.exit(0); }

console.log(`Processing ${renders.length} renders (concurrency=${concurrency})...`);

// Process with concurrency limit
let done = 0;
for (let i = 0; i < renders.length; i += concurrency) {
  const batch = renders.slice(i, i + concurrency);
  await Promise.all(batch.map((r) => processVariant(r as unknown as Parameters<typeof processVariant>[0]).catch((e: Error) => console.error(`  [error] ${r.variant_id}: ${e.message}`))));
  done += batch.length;
  console.log(`  ${done}/${renders.length} done`);
}

console.log("Marketing pack complete.");
