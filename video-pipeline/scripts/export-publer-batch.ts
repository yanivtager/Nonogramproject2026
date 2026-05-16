#!/usr/bin/env node
/**
 * Exports a Publer bulk-import CSV from the generated marketing packs.
 *
 * Usage:
 *   npx tsx scripts/export-publer-batch.ts --phase 1 --start-date 2026-05-17 --posts-per-day 4
 *   npx tsx scripts/export-publer-batch.ts --phase 2 --start-date 2026-06-02 --posts-per-day 4
 */

import { readdirSync, readFileSync, existsSync, mkdirSync, copyFileSync, writeFileSync } from "node:fs";
import { join, basename } from "node:path";

function arg(name: string, fallback?: string): string | undefined {
  const idx = process.argv.indexOf(name);
  return idx >= 0 ? process.argv[idx + 1] : fallback;
}

const phase = parseInt(arg("--phase", "1")!, 10);
const startDateStr = arg("--start-date", "2026-05-17")!;
const postsPerDay = parseInt(arg("--posts-per-day", "4")!, 10);

const PACK_DIR = join(process.cwd(), "out", "marketing-pack");
const OUT_DIR = join(process.cwd(), "out", "publer-batch");
const VIDEOS_DIR = join(OUT_DIR, "videos");
const THUMBS_DIR = join(OUT_DIR, "thumbnails");

mkdirSync(VIDEOS_DIR, { recursive: true });
mkdirSync(THUMBS_DIR, { recursive: true });

const PLATFORMS = ["instagram-reels", "tiktok", "youtube-shorts"] as const;

// Time slots: 09:00, 12:00, 15:00, 18:00 local
const TIME_SLOTS = ["09:00", "12:00", "15:00", "18:00"];

// Language → primary timezone label (informational only — Publer uses account timezone)
const LANG_ACCOUNT_PREFIX: Record<string, string> = {
  en: "instagram-en",
  es: "instagram-es",
  ja: "instagram-ja",
  "pt-BR": "instagram-ptbr",
};

function platformAccount(platform: string, lang: string): string {
  const langKey = lang === "pt-BR" ? "ptbr" : lang;
  const prefix = platform.replace("-", "_");
  return `${prefix}_${langKey}`;
}

interface CopyJson {
  title: string;
  caption: string;
  hashtags: string[];
  etsy_cta_line: string;
}

interface Row {
  account: string;
  date: string;
  time: string;
  caption: string;
  media: string;
  first_comment: string;
}

// Discover variant dirs
const variantDirs = readdirSync(PACK_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

// Filter by phase
// Phase 1: scale-shock + collection-showcase (all listings) + print-ritual-real (dragons-wrath only)
// Phase 2: print-ritual-real (other listings)
const phaseVariants = variantDirs.filter((id) => {
  if (phase === 1) return !id.startsWith("print-ritual-real") || id.includes("dragons-wrath");
  return id.includes("print-ritual-real") && !id.includes("dragons-wrath");
});

const rows: Row[] = [];

// Schedule cursor
let cursor = new Date(`${startDateStr}T09:00:00`);
let slotIndex = 0;

function nextSlot(): { date: string; time: string } {
  const dateStr = cursor.toISOString().slice(0, 10);
  const time = TIME_SLOTS[slotIndex % TIME_SLOTS.length]!;
  slotIndex++;
  if (slotIndex % postsPerDay === 0) {
    cursor.setDate(cursor.getDate() + 1);
  }
  return { date: dateStr, time };
}

for (const variantId of phaseVariants) {
  const variantDir = join(PACK_DIR, variantId);

  // Detect language from variant dir name (last segment before voice)
  // variant IDs are like: listing-template-lang-voice
  const parts = variantId.split("-");
  const langCandidates = ["pt-BR", "en", "es", "ja"];
  const lang = langCandidates.find((l) => variantId.includes(`-${l}-`) || variantId.endsWith(`-${l}`)) ?? "en";

  // Find the mp4
  const mp4File = readdirSync(variantDir).find((f) => f.endsWith(".mp4"));
  if (!mp4File) continue;
  const mp4Src = join(variantDir, mp4File);
  const mp4Dest = join(VIDEOS_DIR, mp4File);
  if (!existsSync(mp4Dest)) copyFileSync(mp4Src, mp4Dest);

  // Find the thumbnail
  const thumbFile = readdirSync(variantDir).find((f) => f.endsWith(".jpg"));
  if (thumbFile) {
    const thumbDest = join(THUMBS_DIR, thumbFile);
    if (!existsSync(thumbDest)) copyFileSync(join(variantDir, thumbFile), thumbDest);
  }

  for (const platform of PLATFORMS) {
    const copyFile = join(variantDir, `${platform}.json`);
    if (!existsSync(copyFile)) continue;

    const copy = JSON.parse(readFileSync(copyFile, "utf8")) as CopyJson;
    const account = platformAccount(platform, lang);

    const fullCaption = [
      copy.title,
      "",
      copy.caption,
      "",
      copy.etsy_cta_line,
      "",
      copy.hashtags.slice(0, 5).join(" "),
    ].join("\n").trim();

    const firstComment = copy.hashtags.slice(5).join(" ");

    const { date, time } = nextSlot();

    rows.push({
      account,
      date,
      time,
      caption: fullCaption.replace(/"/g, '""'),
      media: mp4File,
      first_comment: firstComment,
    });
  }
}

// Write CSV
const csvFile = join(OUT_DIR, `publer-phase${phase}.csv`);
const header = "account,date,time,caption,media,first_comment";
const body = rows.map((r) => `"${r.account}","${r.date}","${r.time}","${r.caption}","${r.media}","${r.first_comment}"`).join("\n");
writeFileSync(csvFile, `${header}\n${body}`, "utf8");

console.log(`Wrote ${rows.length} rows → ${csvFile}`);
console.log(`Videos: ${VIDEOS_DIR}`);
console.log(`Thumbnails: ${THUMBS_DIR}`);
