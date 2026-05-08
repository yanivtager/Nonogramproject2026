#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

import { CANDIDATE_TRACKS } from "../src/music/candidate-tracks.js";

const repoRoot = resolve("..");
loadEnv(join(repoRoot, ".env"));

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucketName = process.env.VIDEO_ASSETS_BUCKET ?? "video-assets";
const bucketFileSizeLimit = "5MB";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in .env.");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

await ensureBucket(bucketName);
await syncArtwork();
await syncVoices();
await syncTrackCandidates();

console.log("Phase 0 assets synced.");

async function ensureBucket(name: string): Promise<void> {
  const { data } = await supabase.storage.getBucket(name);
  if (data) {
    const { error } = await supabase.storage.updateBucket(name, {
      public: true,
      fileSizeLimit: bucketFileSizeLimit,
    });
    if (error) throw error;
    return;
  }
  const { error } = await supabase.storage.createBucket(name, {
    public: true,
    fileSizeLimit: bucketFileSizeLimit,
  });
  if (error && !/already exists/i.test(error.message)) throw error;
}

async function syncArtwork(): Promise<void> {
  const solutionsDir = resolve(repoRoot, "extracted_images", "solutions");
  const files = (await readdir(solutionsDir)).filter((file) => file.toLowerCase().endsWith(".png")).sort();
  const representative = new Map<string, string>();

  for (const file of files) {
    const listingId = listingForArtwork(file);
    const storagePath = `video-pipeline/solved-artwork/${file}`;
    const localPath = join(solutionsDir, file);
    await uploadFile(storagePath, localPath, "image/png");
    const publicUrl = publicUrlFor(storagePath);
    if (listingId !== "unknown" && !representative.has(listingId)) {
      representative.set(listingId, publicUrl);
    }
  }

  for (const [listingId, solved_artwork_url] of representative.entries()) {
    const { error } = await supabase.from("listings").update({ solved_artwork_url }).eq("id", listingId);
    if (error) throw error;
  }

  console.log(`Synced ${files.length} solved artwork PNGs to ${bucketName}.`);
}

async function syncVoices(): Promise<void> {
  const manifestPath = resolve("out", "voice-curation", "voices-manifest.json");
  if (!existsSync(manifestPath)) {
    console.log("Voice manifest missing; skipping voice sync.");
    return;
  }

  const rows = JSON.parse(readFileSync(manifestPath, "utf8")) as {
    short_name: string;
    display_name: string;
    language: string;
    gender: string;
    sample_path?: string;
  }[];

  let synced = 0;
  for (const row of rows) {
    let sampleUrl: string | null = null;
    if (row.sample_path && existsSync(row.sample_path)) {
      const storagePath = `video-pipeline/voice-samples/${basename(row.sample_path)}`;
      await uploadFile(storagePath, row.sample_path, "audio/mpeg");
      sampleUrl = publicUrlFor(storagePath);
      synced += 1;
    }

    const { error } = await supabase.from("voices").upsert(
      {
        language: row.language,
        vendor: "edge-tts",
        vendor_voice_id: row.short_name,
        display_name: row.display_name,
        gender: row.gender,
        sample_url: sampleUrl,
        approved: false,
      },
      { onConflict: "vendor,vendor_voice_id" },
    );
    if (error) throw error;
  }

  console.log(`Synced ${synced} working voice samples; inserted/updated ${rows.length} voice candidates.`);
}

async function syncTrackCandidates(): Promise<void> {
  const { data: existing, error: existingError } = await supabase
    .from("tracks")
    .select("title, license_source");
  if (existingError) throw existingError;

  const existingKeys = new Set((existing ?? []).map((row) => `${row.license_source}:${row.title}`));
  let inserted = 0;

  for (const track of CANDIDATE_TRACKS) {
    const key = `${track.licenseSource}:${track.title}`;
    if (existingKeys.has(key)) continue;
    const { error } = await supabase.from("tracks").insert({
      title: track.title,
      artist: null,
      mood: track.mood,
      bpm: null,
      duration_s: 0,
      license_source: track.licenseSource,
      license_proof_url: track.licenseProofUrl,
      download_date: new Date().toISOString(),
      file_url: `https://pixabay.com/music/search/${encodeURIComponent(track.searchQuery)}/`,
      approved: false,
    });
    if (error) throw error;
    inserted += 1;
  }

  console.log(`Inserted ${inserted} new music candidate rows.`);
}

async function uploadFile(storagePath: string, localPath: string, contentType: string): Promise<void> {
  const data = readFileSync(localPath);
  const { error } = await supabase.storage.from(bucketName).upload(storagePath, data, {
    contentType,
    upsert: true,
  });
  if (error) throw error;
}

function publicUrlFor(storagePath: string): string {
  const { data } = supabase.storage.from(bucketName).getPublicUrl(storagePath);
  return data.publicUrl;
}

function listingForArtwork(file: string): string {
  if (file.startsWith("titanic_")) return "titanic-series";
  if (file.startsWith("colossus_")) return "colossus-series";
  if (file.startsWith("behemoth_")) return "behemoth-series";
  if (file.startsWith("single_dragons")) return "dragons-wrath";
  if (file.startsWith("single_frozen")) return "frozen-gaze";
  if (file.startsWith("single_cafe")) return "cafe-serenade";
  return "unknown";
}

function loadEnv(path: string): void {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#") || !line.includes("=")) continue;
    const index = line.indexOf("=");
    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim();
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}
