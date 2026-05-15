#!/usr/bin/env node
/**
 * Promote locally rendered, QA-passed Step 8 template behavior proofs to the
 * Supabase review queue.
 *
 * This avoids old render workers that do not yet understand the
 * template-behavior-proof no-music path. Default is dry-run; pass --apply.
 */

import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { basename, join, resolve } from "node:path";

import { createClient } from "@supabase/supabase-js";

type ProofManifestRow = {
  recipe_id: string;
  listing_id: string;
  template_id: string;
  language_code: string;
  voice_id: string;
  music_status: string;
  render_purpose: string;
  music_review_allowed: boolean;
  status: string;
  mp4_path: string | null;
  captions_path: string | null;
  duration_s: number | null;
};

type QaReport = {
  status: "pass";
  rows: Array<{
    recipe_id: string;
    mp4_sha256: string;
    contact_sheet_path: string;
    duration_s: number;
    width: number;
    height: number;
  }>;
};

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
}

const apply = process.argv.includes("--apply") || process.env.MARKETING_AUTO_APPLY === "1";
const repoRoot = resolve("..");
const proofDir = resolve(
  process.argv.includes("--proof-dir")
    ? process.argv[process.argv.indexOf("--proof-dir") + 1]!
    : join(repoRoot, "docs", "marketing-plans", "step8-corrected-template-proofs"),
);
const manifestPath = join(proofDir, "corrected-template-proofs.json");
const qaReportPath = join(proofDir, "step8-corrected-template-proof-qa-report.json");
const PREVIEW_SET_ID = "step8-template-behavior-proof-v1";
const STORAGE_BUCKET = "renders";

if (!existsSync(manifestPath)) throw new Error(`Proof manifest not found: ${manifestPath}`);
if (!existsSync(qaReportPath)) throw new Error(`Proof QA report not found: ${qaReportPath}`);

const proofs = JSON.parse(readFileSync(manifestPath, "utf8")) as ProofManifestRow[];
const qaReport = JSON.parse(readFileSync(qaReportPath, "utf8")) as QaReport;
if (qaReport.status !== "pass") throw new Error(`Proof QA report is not pass: ${qaReport.status}`);
if (proofs.length !== 3) throw new Error(`Expected 3 proof manifest rows, found ${proofs.length}.`);

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const { data: variants, error: variantsError } = await supabase
  .from("variants")
  .select("id, listing_id, template_id, status, extras, validation_json, renders(id, status)")
  .contains("extras", { preview_set_id: PREVIEW_SET_ID });

if (variantsError) throw variantsError;

console.log(`Step 8 behavior proof promotion mode: ${apply ? "APPLY" : "dry run"}`);

for (const proof of proofs) {
  if (proof.status !== "ok") throw new Error(`${proof.recipe_id} was not rendered successfully.`);
  if (proof.render_purpose !== "template-behavior-proof") throw new Error(`${proof.recipe_id} has wrong render_purpose.`);
  if (proof.music_review_allowed !== false) throw new Error(`${proof.recipe_id} must have music_review_allowed=false.`);
  if (!proof.mp4_path || !existsSync(proof.mp4_path)) throw new Error(`${proof.recipe_id} missing MP4.`);
  if (!proof.captions_path || !existsSync(proof.captions_path)) throw new Error(`${proof.recipe_id} missing captions.`);

  const qaRow = qaReport.rows.find((row) => row.recipe_id === proof.recipe_id);
  if (!qaRow) throw new Error(`${proof.recipe_id} missing QA row.`);

  const variant = (variants ?? []).find((row: any) => row.extras?.proof_recipe_id === proof.recipe_id);
  if (!variant) throw new Error(`No proof variant found for ${proof.recipe_id}. Run prepare-step8-template-behavior-proofs first.`);

  console.log(
    `${proof.template_id}/${proof.listing_id}: variant=${variant.id} status=${variant.status} mp4=${(statSync(proof.mp4_path).size / 1_000_000).toFixed(2)} MB`,
  );

  if (!apply) continue;

  const activeRenderIds =
    (variant.renders ?? [])
      .filter((render: { status: string }) => ["queued", "rendering"].includes(render.status))
      .map((render: { id: string }) => render.id) ?? [];
  if (activeRenderIds.length > 0) {
    const { error: failActiveError } = await supabase
      .from("renders")
      .update({
        status: "failed",
        build_log: "Superseded by locally QA-passed Step 8 template behavior proof promotion.",
        completed_at: new Date().toISOString(),
      })
      .in("id", activeRenderIds);
    if (failActiveError) throw failActiveError;
  }

  const storageKey = `${variant.id}/${Date.now()}-${basename(proof.mp4_path)}`;
  const { error: uploadError } = await supabase.storage.from(STORAGE_BUCKET).upload(storageKey, createReadStream(proof.mp4_path), {
    contentType: "video/mp4",
    upsert: true,
  });
  if (uploadError) throw uploadError;
  const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(storageKey);

  const selfReviewJson = {
    overallPass: true,
    failedLayers: [],
    recommendedAction: "surface",
    source: "local-step8-template-behavior-proof-qa",
    proof_manifest_path: manifestPath,
    proof_qa_report_path: qaReportPath,
    contact_sheet_path: qaRow.contact_sheet_path,
    mp4_sha256: qaRow.mp4_sha256,
    music_review_allowed: false,
  };

  const { error: insertRenderError } = await supabase
    .from("renders")
    .insert({
      variant_id: variant.id,
      status: "completed",
      mp4_url: urlData.publicUrl,
      captions_url: proof.captions_path,
      duration_s: proof.duration_s ?? qaRow.duration_s,
      width: qaRow.width,
      height: qaRow.height,
      self_review_json: selfReviewJson,
      completed_at: new Date().toISOString(),
      build_log: "self-review: PASS (local Step 8 template behavior proof QA)",
    })
    .select("id")
    .single();
  if (insertRenderError) throw insertRenderError;

  const { error: updateVariantError } = await supabase
    .from("variants")
    .update({
      status: "preview-ready",
      validation_json: {
        ...(variant.validation_json ?? {}),
        self_review: {
          pass: true,
          failed_layers: [],
          recommended_action: "surface",
          source: "local-step8-template-behavior-proof-qa",
        },
        proof_qa_report_path: qaReportPath,
        music_review_allowed: false,
      },
    })
    .eq("id", variant.id);
  if (updateVariantError) throw updateVariantError;

  console.log(`  promoted render ${insertRenderError ? "" : "ok"} -> ${urlData.publicUrl}`);
}

if (!apply) {
  console.log("Dry run only. Re-run with --apply to upload and promote these proof variants.");
}
