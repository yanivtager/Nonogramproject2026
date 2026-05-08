#!/usr/bin/env node

import { mkdirSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import { CANDIDATE_TRACKS } from "../src/music/candidate-tracks.js";

const outDir = resolve(process.argv.includes("--out") ? process.argv[process.argv.indexOf("--out") + 1]! : join("out", "music-curation"));
mkdirSync(outDir, { recursive: true });

const manifest = CANDIDATE_TRACKS.map((track) => ({
  ...track,
  pixabaySearchUrl: `https://pixabay.com/music/search/${encodeURIComponent(track.searchQuery)}/`,
  approved: false,
  selectedFileUrl: "",
  selectedTrackTitle: "",
  selectedArtist: "",
  bpm: null,
  duration_s: null,
}));

await writeFile(join(outDir, "music-candidates.json"), JSON.stringify(manifest, null, 2), "utf8");

const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>GrandGridStudio Music Curation</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 32px; color: #151515; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border-bottom: 1px solid #ddd; padding: 10px; text-align: left; vertical-align: top; }
    th { background: #f7f7f7; }
    code { background: #f2f2f2; padding: 2px 4px; }
  </style>
</head>
<body>
  <h1>GrandGridStudio Music Curation</h1>
  <p>Pick 10 tracks from Pixabay. Record the downloaded file path, title, artist, duration, and license proof before any production render.</p>
  <table>
    <thead><tr><th>ID</th><th>Mood</th><th>Use</th><th>Pixabay Search</th><th>License</th></tr></thead>
    <tbody>
      ${manifest.map((track) => `<tr>
        <td><code>${track.id}</code><br>${track.title}</td>
        <td>${track.mood}</td>
        <td>${track.notes}</td>
        <td><a href="${track.pixabaySearchUrl}">${track.searchQuery}</a></td>
        <td><a href="${track.licenseProofUrl}">Pixabay license summary</a></td>
      </tr>`).join("\n")}
    </tbody>
  </table>
</body>
</html>`;

await writeFile(join(outDir, "index.html"), html, "utf8");
console.log(`Music curation written to ${outDir}`);
