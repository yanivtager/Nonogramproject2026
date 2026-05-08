#!/usr/bin/env node

import { existsSync, mkdirSync, copyFileSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";

interface ApprovedVariant {
  id: string;
  mp4Path: string;
  caption: string;
  hashtags: string;
  firstComment?: string;
  platforms?: string[];
  date?: string;
  time?: string;
}

function csvCell(value: unknown): string {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

const input = resolve(process.argv.includes("--input") ? process.argv[process.argv.indexOf("--input") + 1]! : join("out", "approved-variants.json"));
const outDir = resolve(process.argv.includes("--out") ? process.argv[process.argv.indexOf("--out") + 1]! : join("..", "shorts-output", `metricool-batch-${Date.now()}`));

if (!existsSync(input)) {
  throw new Error(`Input file not found: ${input}. Expected an array of approved variants.`);
}

const variants = JSON.parse(await readFile(input, "utf8")) as ApprovedVariant[];
mkdirSync(outDir, { recursive: true });

const rows = [["Channel", "Date", "Time", "Text", "Media", "Hashtags", "FirstComment"]];
for (const variant of variants) {
  if (!existsSync(variant.mp4Path)) {
    throw new Error(`Missing MP4 for variant ${variant.id}: ${variant.mp4Path}`);
  }
  const mediaName = `${variant.id}-${basename(variant.mp4Path)}`;
  copyFileSync(variant.mp4Path, join(outDir, mediaName));
  for (const channel of variant.platforms ?? ["TikTok", "Instagram", "YouTube Shorts"]) {
    rows.push([
      channel,
      variant.date ?? "",
      variant.time ?? "",
      variant.caption,
      mediaName,
      variant.hashtags,
      variant.firstComment ?? "",
    ]);
  }
}

await writeFile(join(outDir, "metricool.csv"), rows.map((row) => row.map(csvCell).join(",")).join("\n"), "utf8");
await writeFile(join(outDir, "README.txt"), [
  "Metricool batch export",
  "======================",
  "",
  "Upload the MP4 files and metricool.csv through Metricool's bulk scheduler.",
  "Column names should be verified against the current Metricool importer before the first live upload.",
].join("\n"), "utf8");

console.log(`Metricool batch written to ${outDir}`);
