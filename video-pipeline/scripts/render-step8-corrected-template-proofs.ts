#!/usr/bin/env node
/**
 * Render one corrected behavior proof for each paused Step 8 template.
 *
 * This script intentionally does not render or modify Step 7 approved proofs.
 * It uses no music so Yaniv can judge template behavior before music approval.
 */

import { copyFileSync, existsSync, readFileSync, readdirSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import type { Listing, Voice } from "../src/data/types.js";
import type { ArtworkAsset } from "../src/marketing/artwork-selection.js";
import type { CompositionProps } from "../src/compositions/types.js";
import { beforeAfterScripts } from "../src/narration/scripts/before-after.js";
import { printRitualScripts } from "../src/narration/scripts/print-ritual.js";
import { solveRevealScripts } from "../src/narration/scripts/solve-reveal.js";
import { buildSelectionForRecipe } from "../src/marketing/artwork-selection.js";
import { renderVariant } from "../src/render/render-variant.js";

type CorrectedTemplateId = "before-after" | "print-ritual" | "solve-reveal";

type ProofRecipe = {
  recipeId: string;
  templateId: CorrectedTemplateId;
  listing: Listing;
  rationale: string;
};

const repoRoot = resolve("..");
const outDir = resolve(
  process.argv.includes("--out")
    ? process.argv[process.argv.indexOf("--out") + 1]!
    : join(repoRoot, "docs", "marketing-plans", "step8-corrected-template-proofs"),
);
const manifestPath = resolve(
  process.argv.includes("--artwork-manifest")
    ? process.argv[process.argv.indexOf("--artwork-manifest") + 1]!
    : join(repoRoot, "docs", "marketing-plans", "2026-05-13-step6-artwork-v1-manifest.json"),
);
const dryRun = process.argv.includes("--dry-run");

if (!existsSync(manifestPath)) {
  throw new Error(`Artwork manifest not found: ${manifestPath}`);
}

await mkdir(outDir, { recursive: true });

// Stage hand PNGs into _remotion-public so compositions can resolve them
// via staticFile("hand-tl.png") etc. The renderVariant orchestrator reuses
// this directory for its bundle's publicDir.
const publicDir = join(outDir, "_remotion-public");
await mkdir(publicDir, { recursive: true });
const handsDir = join(repoRoot, "assets", "hands");
if (existsSync(handsDir)) {
  for (const file of readdirSync(handsDir)) {
    if (!file.endsWith(".png") || file.startsWith("_")) continue;
    copyFileSync(join(handsDir, file), join(publicDir, file));
  }
  console.log(`Staged hand assets from ${handsDir} into ${publicDir}`);
} else {
  console.warn(`No assets/hands directory found at ${handsDir} — compositions will show broken images.`);
}

const artworkManifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
  assets: ArtworkAsset[];
};

const aria: Voice = {
  id: "ff4f9a21-5589-41b0-8f05-0eefe6a05a2b",
  language: "en",
  vendor: "edge-tts",
  vendor_voice_id: "en-US-AriaNeural",
  display_name: "Aria",
  gender: "female",
  sample_url: null,
  approved: true,
};

const dragonsWrath: Listing = {
  id: "dragons-wrath",
  name: "Dragon's Wrath",
  etsy_url: "https://www.etsy.com/listing/4455139351/",
  etsy_listing_id: "4455139351",
  theme: "A fantasy dragon reveal in a printable expert nonogram.",
  grid_size: "100x150",
  cell_count: 15000,
  puzzle_count: 1,
  difficulty: "Expert",
  cover_image_url: null,
  solved_artwork_url: null,
  recommended_templates: ["solve-reveal", "before-after"],
};

const cafeSerenade: Listing = {
  id: "cafe-serenade",
  name: "Cafe Serenade",
  etsy_url: "https://www.etsy.com/listing/4455156318/",
  etsy_listing_id: "4455156318",
  theme: "A 250x250 cafe scene positioned as a screen-free analog challenge.",
  grid_size: "250x250",
  cell_count: 62500,
  puzzle_count: 1,
  difficulty: "Master",
  cover_image_url: null,
  solved_artwork_url: null,
  recommended_templates: ["print-ritual", "scale-shock"],
};

const proofRecipes: ProofRecipe[] = [
  {
    recipeId: "proof-step8-corrected-before-after-dragons-wrath-en",
    templateId: "before-after",
    listing: withArtwork(dragonsWrath, "before-after"),
    rationale: "Strong single-art payoff; cleanest blank-grid to solved-art transformation proof.",
  },
  {
    recipeId: "proof-step8-corrected-print-ritual-cafe-serenade-en",
    templateId: "print-ritual",
    listing: withArtwork(cafeSerenade, "print-ritual"),
    rationale: "Cafe theme fits calm print-and-pencil ritual positioning.",
  },
  {
    recipeId: "proof-step8-corrected-solve-reveal-dragons-wrath-en",
    templateId: "solve-reveal",
    listing: withArtwork(dragonsWrath, "solve-reveal"),
    rationale: "Dragon artwork gives the strongest final-cell closure payoff for the solve-reveal proof.",
  },
];

const rows = [];
for (const proof of proofRecipes) {
  const result = await renderVariant({
    variantId: proof.recipeId,
    templateId: proof.templateId,
    listing: proof.listing,
    voice: aria,
    track: null,
    script: scriptForTemplate(proof.templateId),
    outDir,
    renderPurpose: "template-behavior-proof",
    artworkSelection: artworkSelectionForProof(proof),
    dryRun,
  });

  rows.push({
    recipe_id: proof.recipeId,
    listing_id: proof.listing.id,
    template_id: proof.templateId,
    language_code: "en",
    voice_id: aria.vendor_voice_id,
    music_status: "not_used_template_behavior_only",
    render_purpose: "template-behavior-proof",
    music_review_allowed: false,
    rationale: proof.rationale,
    status: result.status,
    mp4_path: result.mp4Path ?? null,
    captions_path: result.captionsPath ?? null,
    duration_s: result.durationSeconds ?? null,
    error: result.error ?? null,
  });

  if (result.status !== "ok") {
    throw new Error(`${proof.recipeId} render failed: ${result.error}`);
  }
}

const proofManifestPath = join(outDir, dryRun ? "corrected-template-proofs-dry-run.json" : "corrected-template-proofs.json");
await writeFile(proofManifestPath, JSON.stringify(rows, null, 2), "utf8");
console.log(`Step 8 corrected template proof manifest written to ${proofManifestPath}`);
console.log(JSON.stringify(rows, null, 2));

function scriptForTemplate(templateId: CorrectedTemplateId) {
  if (templateId === "before-after") return beforeAfterScripts.en;
  if (templateId === "print-ritual") return printRitualScripts.en;
  return solveRevealScripts.en;
}

function withArtwork(listing: Listing, templateId: CorrectedTemplateId): Listing {
  const selection = buildSelectionForRecipe(
    {
      listing_id: listing.id,
      template_id: templateId,
      language_code: "en",
      voice_id: aria.vendor_voice_id,
      track_title: "no music - template behavior proof",
      track_mood: null,
    },
    artworkManifest.assets,
  );
  const firstAsset = selection.items
    .map((item) => ({
      item,
      asset: artworkManifest.assets.find((candidate) => candidate.asset_id === item.asset_id),
    }))
    .sort((a, b) => a.item.display_order - b.item.display_order)[0]?.asset;

  return {
    ...listing,
    solved_artwork_url: firstAsset?.public_url ?? listing.solved_artwork_url,
  };
}

function artworkSelectionForProof(proof: ProofRecipe): CompositionProps["artworkSelection"] {
  const selection = buildSelectionForRecipe(
    {
      listing_id: proof.listing.id,
      template_id: proof.templateId,
      language_code: "en",
      voice_id: aria.vendor_voice_id,
      track_title: "no music - template behavior proof",
      track_mood: null,
    },
    artworkManifest.assets,
  );

  return {
    selectionVersion: selection.selection_version,
    selectionMode: selection.selection_mode,
    assets: selection.items.map((item) => {
      const asset = artworkManifest.assets.find((candidate) => candidate.asset_id === item.asset_id);
      if (!asset) throw new Error(`Missing artwork asset ${item.asset_id} for ${proof.recipeId}`);
      return {
        assetId: asset.asset_id,
        fileName: asset.file_name,
        publicUrl: asset.public_url,
        segmentRole: item.segment_role,
        displayOrder: item.display_order,
      };
    }),
  };
}
