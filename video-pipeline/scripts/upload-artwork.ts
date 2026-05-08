#!/usr/bin/env node

import { readdir, writeFile, mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";

const solutionsDir = resolve(process.argv.includes("--solutions") ? process.argv[process.argv.indexOf("--solutions") + 1]! : join("..", "extracted_images", "solutions"));
const outDir = resolve(process.argv.includes("--out") ? process.argv[process.argv.indexOf("--out") + 1]! : join("out", "artwork-registry"));
await mkdir(outDir, { recursive: true });

const files = (await readdir(solutionsDir)).filter((file) => file.toLowerCase().endsWith(".png")).sort();
const rows = files.map((file) => {
  const series = file.startsWith("titanic_")
    ? "titanic-series"
    : file.startsWith("colossus_")
      ? "colossus-series"
      : file.startsWith("behemoth_")
        ? "behemoth-series"
        : file.startsWith("single_dragons")
          ? "dragons-wrath"
          : file.startsWith("single_frozen")
            ? "frozen-gaze"
            : file.startsWith("single_cafe")
              ? "cafe-serenade"
              : "unknown";
  return {
    file,
    localPath: join(solutionsDir, file),
    listingId: series,
    storagePath: `video-pipeline/solved-artwork/${file}`,
    uploaded: false,
    publicUrl: "",
  };
});

await writeFile(join(outDir, "artwork-manifest.json"), JSON.stringify(rows, null, 2), "utf8");
console.log(`Artwork manifest written to ${join(outDir, "artwork-manifest.json")}`);
console.log(`Found ${rows.length} PNG files.`);
