#!/usr/bin/env node
/**
 * Generate photoreal hand-with-pencil PNGs for the rebuilt Step 8 templates.
 *
 * Produces 5 poses × 3 candidates = 15 PNGs at 1024x1024 with transparent
 * background via OpenAI `gpt-image-1`. Writes a contact-sheet.html so Yaniv
 * can pick the cleanest 5 (one per pose) and move them to assets/hands/.
 *
 * Requires: process.env.OPENAI_API_KEY
 *
 * Cost (medium quality, $0.042/image): ~$0.63 total.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";

import OpenAI from "openai";

type HandPose = {
  id: "hand-tl" | "hand-side" | "hand-br" | "hand-final" | "hand-slide";
  description: string;
  prompt: string;
};

const POSES: HandPose[] = [
  {
    id: "hand-tl",
    description: "Top-left entry, pencil pointing down-right (PrintRitual beat 1)",
    prompt:
      "Top-down photograph of a human right hand holding a yellow wooden pencil with a sharpened graphite tip. " +
      "The hand and forearm enter the frame from the upper-left corner. Fingers naturally curled around the pencil " +
      "in a relaxed writing grip. The pencil tip points diagonally toward the lower-right. " +
      "Warm amber-gold studio lighting from above-right, gentle soft shadows on the hand itself. " +
      "Five anatomically correct fingers in a natural pose. Photoreal, sharp focus, high detail. " +
      "Isolated subject on fully transparent background — no surface, no shadow on background, just the hand-and-pencil cutout. " +
      "Hand and forearm visible up to wrist; no body, no face.",
  },
  {
    id: "hand-side",
    description: "Left side entry, pencil horizontal (PrintRitual beat 2)",
    prompt:
      "Top-down photograph of a human right hand holding a yellow wooden pencil with a sharpened graphite tip. " +
      "The hand and forearm enter from the left edge of the frame, forearm extending horizontally to the right. " +
      "Fingers in a relaxed writing grip on the pencil. The pencil points to the right. " +
      "Warm amber-gold studio lighting from above. Five anatomically correct fingers. " +
      "Photoreal, sharp focus, high detail. Isolated on fully transparent background — no surface, no scene.",
  },
  {
    id: "hand-br",
    description: "Bottom-right entry, pencil pointing up-left (PrintRitual beat 3)",
    prompt:
      "Top-down photograph of a human right hand holding a yellow wooden pencil. " +
      "The hand enters from the lower-right corner of the frame, pencil tip pointing diagonally toward the upper-left. " +
      "Fingers in a relaxed writing grip. Warm amber-gold lighting from above-left. " +
      "Five anatomically correct fingers. Photoreal, high detail. " +
      "Isolated on fully transparent background, no surface or shadow on background.",
  },
  {
    id: "hand-final",
    description: "Close-up, pencil tip on final cell (PrintRitual beat 4 + SolveReveal)",
    prompt:
      "Top-down close-up photograph of a human right hand holding a yellow wooden pencil. " +
      "The pencil tip is precisely touching a single spot at the center of the frame, as if completing a final mark. " +
      "Fingers visible in a careful precision grip. Warm amber-gold lighting from above. " +
      "Five anatomically correct fingers in natural anatomy. Photoreal, sharp focus on pencil tip, " +
      "high detail on hand and pencil texture. Isolated on fully transparent background.",
  },
  {
    id: "hand-slide",
    description: "Hand gripping paper edge mid-slide (BeforeAfter)",
    prompt:
      "Top-down photograph of a human right hand. The hand is open with palm facing down, fingers spread and slightly " +
      "curled, fingertips gripping the right edge of a thin sheet of cream-colored printer paper as if sliding it leftward. " +
      "The forearm enters the frame from the right edge. Warm amber-gold lighting from above. " +
      "Five anatomically correct fingers. Photoreal, sharp focus, high detail. " +
      "Isolated on fully transparent background — just the hand and the small visible right-edge slice of cream paper, no surrounding surface.",
  },
];

const CANDIDATES_PER_POSE = 3;
const PARALLEL_BATCH = 3;
const QUALITY: "low" | "medium" | "high" = "medium";

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error(
    "OPENAI_API_KEY not set. In PowerShell: $env:OPENAI_API_KEY = '<your-key>'",
  );
  process.exit(1);
}

const repoRoot = resolve("..");
const candidatesDir = join(repoRoot, "assets", "hands", "_candidates");
const contactSheetPath = join(candidatesDir, "contact-sheet.html");

await mkdir(candidatesDir, { recursive: true });

const client = new OpenAI({ apiKey });

type GeneratedCandidate = {
  poseId: HandPose["id"];
  candidateIndex: number;
  filename: string;
  prompt: string;
  description: string;
  error?: string;
};

const tasks: Array<{ pose: HandPose; index: number }> = [];
for (const pose of POSES) {
  for (let i = 1; i <= CANDIDATES_PER_POSE; i++) {
    tasks.push({ pose, index: i });
  }
}

console.log(`Generating ${tasks.length} hand candidates (${POSES.length} poses × ${CANDIDATES_PER_POSE} each)...`);
console.log(`Quality: ${QUALITY}, output dir: ${candidatesDir}`);

const results: GeneratedCandidate[] = [];
for (let i = 0; i < tasks.length; i += PARALLEL_BATCH) {
  const batch = tasks.slice(i, i + PARALLEL_BATCH);
  console.log(`  batch ${Math.floor(i / PARALLEL_BATCH) + 1}: ${batch.map((b) => `${b.pose.id}-${b.index}`).join(", ")}`);
  const batchResults = await Promise.all(
    batch.map(async ({ pose, index }) => {
      const filename = `${pose.id}-${index}.png`;
      const outPath = join(candidatesDir, filename);
      try {
        if (existsSync(outPath)) {
          console.log(`    skip ${filename} (exists)`);
          return { poseId: pose.id, candidateIndex: index, filename, prompt: pose.prompt, description: pose.description };
        }
        const response = await client.images.generate({
          model: "gpt-image-1",
          prompt: pose.prompt,
          n: 1,
          size: "1024x1024",
          quality: QUALITY,
          background: "transparent",
          output_format: "png",
        });
        const b64 = response.data?.[0]?.b64_json;
        if (!b64) throw new Error("OpenAI response missing b64_json");
        await writeFile(outPath, Buffer.from(b64, "base64"));
        console.log(`    ok ${filename}`);
        return { poseId: pose.id, candidateIndex: index, filename, prompt: pose.prompt, description: pose.description };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error(`    FAIL ${filename}: ${msg}`);
        return {
          poseId: pose.id,
          candidateIndex: index,
          filename,
          prompt: pose.prompt,
          description: pose.description,
          error: msg,
        };
      }
    }),
  );
  results.push(...batchResults);
}

const succeeded = results.filter((r) => !r.error);
const failed = results.filter((r) => r.error);
console.log(`\nDone: ${succeeded.length} succeeded, ${failed.length} failed.`);

await writeFile(contactSheetPath, renderContactSheet(results), "utf8");
console.log(`\nContact sheet: ${contactSheetPath}`);
console.log(
  `Open it in a browser. For each pose, pick the cleanest candidate (correct fingers, good lighting),\n` +
  `then copy that PNG to assets/hands/<pose-id>.png (drop the -1/-2/-3 suffix).`,
);

function renderContactSheet(rows: GeneratedCandidate[]): string {
  const byPose = new Map<string, GeneratedCandidate[]>();
  for (const row of rows) {
    if (!byPose.has(row.poseId)) byPose.set(row.poseId, []);
    byPose.get(row.poseId)!.push(row);
  }

  const sections = Array.from(byPose.entries())
    .map(([poseId, candidates]) => {
      const desc = candidates[0]?.description ?? "";
      const cards = candidates
        .map((c) => {
          if (c.error) {
            return `<div class="card error"><div class="label">${c.filename}</div><div class="err">${escapeHtml(c.error)}</div></div>`;
          }
          return `
            <figure class="card">
              <img src="${c.filename}" alt="${c.filename}" />
              <figcaption>
                <div class="label">${c.filename}</div>
                <button onclick="copy('${c.filename}', '${poseId}.png')">copy command</button>
              </figcaption>
            </figure>`;
        })
        .join("\n");
      return `
        <section>
          <h2>${poseId} <small>${escapeHtml(desc)}</small></h2>
          <div class="row">${cards}</div>
        </section>`;
    })
    .join("\n");

  return `<!doctype html>
<html><head><meta charset="utf-8"><title>Hand candidates contact sheet</title>
<style>
  body { font-family: system-ui, sans-serif; background: #1a1611; color: #f8eed7; padding: 24px; }
  h1 { color: #d4a84b; }
  h2 { color: #d4a84b; margin-top: 32px; border-bottom: 1px solid rgba(212,168,75,0.3); padding-bottom: 8px; }
  h2 small { color: rgba(248,238,215,0.6); font-weight: 400; font-size: 14px; margin-left: 12px; }
  .row { display: flex; gap: 16px; flex-wrap: wrap; }
  .card { background: rgba(255,255,255,0.04); border-radius: 8px; padding: 8px; margin: 0; }
  .card img { width: 280px; height: 280px; object-fit: contain; background: repeating-conic-gradient(#333 0 25%, #2a2a2a 0 50%) 50% / 20px 20px; border-radius: 4px; }
  .card.error { width: 280px; height: 280px; background: rgba(220,80,40,0.2); display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 16px; }
  .label { font-family: ui-monospace, monospace; font-size: 13px; margin-top: 6px; }
  button { margin-top: 4px; padding: 4px 10px; background: #d4a84b; color: #1a1611; border: none; border-radius: 4px; cursor: pointer; font-weight: 700; }
  .err { color: #ff9080; font-size: 12px; margin-top: 8px; }
</style></head>
<body>
  <h1>Hand candidates — pick one per pose</h1>
  <p>For each pose, click <strong>copy command</strong> on your favorite, paste in PowerShell to copy it to <code>assets/hands/</code>.</p>
  ${sections}
  <script>
    function copy(src, dest) {
      const cmd = 'Copy-Item ".\\\\' + src + '" "..\\\\' + dest + '"';
      navigator.clipboard.writeText(cmd);
      const btn = event.currentTarget;
      const old = btn.textContent;
      btn.textContent = 'copied!';
      setTimeout(() => { btn.textContent = old; }, 1500);
    }
  </script>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
