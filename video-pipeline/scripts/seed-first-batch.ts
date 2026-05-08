/**
 * Seeds the first batch of 10 variants for review.
 *
 * - Approves one curated voice per language (best neural voice for short-form)
 * - Approves one track per mood category
 * - Inserts 10 variant rows spread across listings, templates, and languages
 * - Inserts corresponding render rows (status=queued) so the worker picks them up
 *
 * Run: npx tsx scripts/seed-first-batch.ts
 */

import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required. Copy from .env");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ── Voice approvals — one female + one male per language ─────────────────────
// IDs from voices table (seeded by migration 007)
const APPROVED_VOICE_IDS = [
  "ff4f9a21-5589-41b0-8f05-0eefe6a05a2b", // Aria (en-US, female) — warm & clear
  "4b2f25c0-798e-4b92-8911-6bf92c39e030", // Guy (en-US, male)
  "dfb580c5-d7bf-422d-b615-c96b19e6fd6c", // Jenny (en-US, female)
  "912b3ae1-db5f-461e-bfb1-e6626c6c4ed9", // Davis (en-US, male)
  "f62879ff-436a-4f87-8418-f63a28ebfeeb", // Elvira (es-ES, female)
  "d8551115-0f83-4a58-9b8d-b165edabc8f8", // Alvaro (es-ES, male)
  "86022904-560c-4c49-ba3a-24b56dba39a8", // Nanami (ja-JP, female) — standard/natural
  "60373a74-1b8f-45ac-b39a-15aa4a139a68", // Keita (ja-JP, male)
  "635f97a5-032f-48d9-a2d9-77d0cbb3b769", // Francisca (pt-BR, female) — clear Brazilian PT
  "35138b9f-0ed7-40ee-856c-5f4f58d4e830", // Antonio (pt-BR, male)
];

// ── Track approvals — one per mood, best fit for nonogram content ─────────────
const APPROVED_TRACK_IDS = [
  "3b4e6a46-0863-452b-a00e-8c432a85ddfe", // Calm puzzle focus bed (calm)
  "287b97b9-41ab-4687-8e8e-5871006c5d86", // Minimal logic loop (calm)
  "37ca3de1-4322-496f-9b01-7ba5282548de", // Fast reveal pulse (energetic)
  "a46389ef-8961-47e2-a1f3-f4eeb8df8869", // Fantasy reveal tension (cinematic-tense)
  "bc748993-5854-4e02-9bab-4d8cacaa33fa", // Epic grid scale (cinematic-tense)
  "927b14d0-0656-448a-877a-95072c7191b5", // Curiosity loop (playful)
];

// ── First-batch variant plan ──────────────────────────────────────────────────
// 10 variants: 4 en + 2 es + 2 ja + 2 pt-BR, all 4 templates represented
const VARIANTS = [
  // English — 4 variants, 4 different listings
  {
    listing_id: "dragons-wrath",
    template_id: "scale-shock",
    language: "en",
    voice_id: "ff4f9a21-5589-41b0-8f05-0eefe6a05a2b", // Aria
    track_id: "a46389ef-8961-47e2-a1f3-f4eeb8df8869", // Fantasy reveal tension
  },
  {
    listing_id: "frozen-gaze",
    template_id: "solve-reveal",
    language: "en",
    voice_id: "4b2f25c0-798e-4b92-8911-6bf92c39e030", // Guy
    track_id: "3b4e6a46-0863-452b-a00e-8c432a85ddfe", // Calm puzzle focus
  },
  {
    listing_id: "cafe-serenade",
    template_id: "before-after",
    language: "en",
    voice_id: "dfb580c5-d7bf-422d-b615-c96b19e6fd6c", // Jenny
    track_id: "37ca3de1-4322-496f-9b01-7ba5282548de", // Fast reveal pulse
  },
  {
    listing_id: "behemoth-series",
    template_id: "print-ritual",
    language: "en",
    voice_id: "912b3ae1-db5f-461e-bfb1-e6626c6c4ed9", // Davis
    track_id: "287b97b9-41ab-4687-8e8e-5871006c5d86", // Minimal logic loop
  },
  // Spanish — 2 variants
  {
    listing_id: "titanic-series",
    template_id: "scale-shock",
    language: "es",
    voice_id: "f62879ff-436a-4f87-8418-f63a28ebfeeb", // Elvira
    track_id: "bc748993-5854-4e02-9bab-4d8cacaa33fa", // Epic grid scale
  },
  {
    listing_id: "colossus-series",
    template_id: "solve-reveal",
    language: "es",
    voice_id: "d8551115-0f83-4a58-9b8d-b165edabc8f8", // Alvaro
    track_id: "3b4e6a46-0863-452b-a00e-8c432a85ddfe", // Calm puzzle focus
  },
  // Japanese — 2 variants (iyashi pacing: calm tracks)
  {
    listing_id: "dragons-wrath",
    template_id: "print-ritual",
    language: "ja",
    voice_id: "86022904-560c-4c49-ba3a-24b56dba39a8", // Nanami
    track_id: "287b97b9-41ab-4687-8e8e-5871006c5d86", // Minimal logic loop
  },
  {
    listing_id: "frozen-gaze",
    template_id: "scale-shock",
    language: "ja",
    voice_id: "60373a74-1b8f-45ac-b39a-15aa4a139a68", // Keita
    track_id: "3b4e6a46-0863-452b-a00e-8c432a85ddfe", // Calm puzzle focus
  },
  // Portuguese (Brazil) — 2 variants
  {
    listing_id: "cafe-serenade",
    template_id: "scale-shock",
    language: "pt-BR",
    voice_id: "635f97a5-032f-48d9-a2d9-77d0cbb3b769", // Francisca
    track_id: "927b14d0-0656-448a-877a-95072c7191b5", // Curiosity loop
  },
  {
    listing_id: "ultimate-bundle",
    template_id: "before-after",
    language: "pt-BR",
    voice_id: "35138b9f-0ed7-40ee-856c-5f4f58d4e830", // Antonio
    track_id: "37ca3de1-4322-496f-9b01-7ba5282548de", // Fast reveal pulse
  },
] as const;

async function run() {
  console.log("Approving voices...");
  const { error: voiceErr } = await supabase
    .from("voices")
    .update({ approved: true })
    .in("id", APPROVED_VOICE_IDS);
  if (voiceErr) throw new Error(`Voice approval failed: ${voiceErr.message}`);
  console.log(`  ✓ Approved ${APPROVED_VOICE_IDS.length} voices`);

  console.log("Approving tracks...");
  const { error: trackErr } = await supabase
    .from("tracks")
    .update({ approved: true })
    .in("id", APPROVED_TRACK_IDS);
  if (trackErr) throw new Error(`Track approval failed: ${trackErr.message}`);
  console.log(`  ✓ Approved ${APPROVED_TRACK_IDS.length} tracks`);

  console.log("Creating variants + render rows...");
  for (const v of VARIANTS) {
    const variantId = randomUUID();
    const { error: variantErr } = await supabase.from("variants").insert({
      id: variantId,
      listing_id: v.listing_id,
      template_id: v.template_id,
      language_code: v.language,
      voice_id: v.voice_id,
      track_id: v.track_id,
      status: "queued",
    });
    if (variantErr) {
      console.error(`  ✗ Variant insert failed (${v.listing_id}/${v.template_id}/${v.language}): ${variantErr.message}`);
      continue;
    }

    const { error: renderErr } = await supabase.from("renders").insert({
      id: randomUUID(),
      variant_id: variantId,
      status: "queued",
    });
    if (renderErr) {
      console.error(`  ✗ Render insert failed for variant ${variantId}: ${renderErr.message}`);
      continue;
    }

    console.log(`  ✓ ${v.listing_id} × ${v.template_id} × ${v.language} → ${variantId}`);
  }

  console.log("\nDone. Render worker will process queued rows when started on the VM.");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
