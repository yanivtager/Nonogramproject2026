#!/usr/bin/env node

import { mkdirSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import { CANDIDATE_VOICES, SAMPLE_TEXT_BY_LANGUAGE } from "../src/tts/voices-registry.js";
import { setCacheDir, synthesize } from "../src/tts/edge-tts.js";

const outDir = resolve(process.argv.includes("--out") ? process.argv[process.argv.indexOf("--out") + 1]! : join("out", "voice-curation"));
const dryRun = process.argv.includes("--dry-run");
mkdirSync(outDir, { recursive: true });
setCacheDir(join(outDir, "cache"));

const rows = [];
for (const voice of CANDIDATE_VOICES) {
  const text = SAMPLE_TEXT_BY_LANGUAGE[voice.language];
  let audioPath = "";
  let error = "";
  if (!dryRun) {
    try {
      const result = await synthesize({ voiceId: voice.short_name, text });
      audioPath = result.audioPath;
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
      console.warn(`Voice sample failed for ${voice.short_name}: ${error.split("\n")[0]}`);
    }
  }
  rows.push({ ...voice, sample_text: text, sample_path: audioPath, error });
}

const manifestPath = join(outDir, "voices-manifest.json");
await writeFile(manifestPath, JSON.stringify(rows, null, 2), "utf8");

const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>GrandGridStudio Voice Curation</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 32px; color: #151515; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border-bottom: 1px solid #ddd; padding: 10px; text-align: left; vertical-align: top; }
    th { background: #f7f7f7; }
    code { background: #f2f2f2; padding: 2px 4px; }
  </style>
</head>
<body>
  <h1>GrandGridStudio Voice Curation</h1>
  <p>Pick 3-5 voices per language. These are Microsoft Edge neural voices and remain candidates until marked approved in Supabase.</p>
  <table>
    <thead><tr><th>Language</th><th>Voice</th><th>Gender</th><th>Sample</th><th>Text</th></tr></thead>
    <tbody>
      ${rows.map((row) => `<tr>
        <td><code>${row.language}</code></td>
        <td>${row.display_name}<br><code>${row.short_name}</code></td>
        <td>${row.gender}</td>
        <td>${
          row.sample_path
            ? `<audio controls src="${row.sample_path.replace(/\\/g, "/")}"></audio>`
            : row.error
              ? `<strong>Unavailable</strong><br><small>${escapeHtml(row.error).slice(0, 280)}</small>`
              : "dry run"
        }</td>
        <td>${row.sample_text}</td>
      </tr>`).join("\n")}
    </tbody>
  </table>
</body>
</html>`;

await writeFile(join(outDir, "index.html"), html, "utf8");
console.log(`Voice curation written to ${outDir}`);
console.log(`Manifest: ${manifestPath}`);

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
