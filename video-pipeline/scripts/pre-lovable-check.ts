#!/usr/bin/env node

import { existsSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const repoRoot = resolve("..");
const checks: { id: string; passed: boolean; detail: string }[] = [];

function check(id: string, passed: boolean, detail: string): void {
  checks.push({ id, passed, detail });
}

function file(path: string): string {
  return join(repoRoot, path);
}

const schemaPath = file("supabase/migrations/006_video_pipeline_schema.sql");
const seedPath = file("supabase/migrations/007_video_pipeline_seed.sql");
const apiPath = file("supabase/functions/video-factory-api/index.ts");
const sharedTypesPath = file("shared/types.ts");
const promptPath = file("docs/marketing-plans/lovable-video-review-ui-starting-prompt.md");
const voiceManifestPath = resolve("out/voice-curation/voices-manifest.json");
const musicManifestPath = resolve("out/music-curation/music-candidates.json");
const artworkManifestPath = resolve("out/artwork-registry/artwork-manifest.json");

check("schema migration exists", existsSync(schemaPath), schemaPath);
check("seed migration exists", existsSync(seedPath), seedPath);
check("video-factory API exists", existsSync(apiPath), apiPath);
check("shared Lovable types exist", existsSync(sharedTypesPath), sharedTypesPath);
check("Lovable starting prompt exists", existsSync(promptPath), promptPath);
check("voice curation manifest exists", existsSync(voiceManifestPath), voiceManifestPath);
check("music curation manifest exists", existsSync(musicManifestPath), musicManifestPath);
check("artwork manifest exists", existsSync(artworkManifestPath), artworkManifestPath);

if (existsSync(schemaPath)) {
  const schema = readFileSync(schemaPath, "utf8");
  check(
    "no broad RLS write policy in video schema",
    !/CREATE POLICY\s+"Service role full access"/i.test(schema),
    "writes must go through Edge Functions/service-role clients, not broad anon policies",
  );
}

if (existsSync(seedPath)) {
  const seed = readFileSync(seedPath, "utf8");
  const expected = ["ultimate-bundle", "titanic-series", "colossus-series", "behemoth-series", "dragons-wrath", "frozen-gaze", "cafe-serenade"];
  for (const listing of expected) {
    check(`seed includes listing ${listing}`, seed.includes(`'${listing}'`), listing);
  }
  for (const language of ["'en'", "'es'", "'ja'", "'pt-BR'"]) {
    check(`seed includes language ${language}`, seed.includes(language), language);
  }
}

if (existsSync(voiceManifestPath)) {
  const voices = JSON.parse(readFileSync(voiceManifestPath, "utf8")) as { language: string; sample_path?: string; error?: string }[];
  for (const language of ["en", "es", "ja", "pt-BR"]) {
    const generated = voices.filter((voice) => voice.language === language && voice.sample_path && existsSync(voice.sample_path));
    check(`voice samples generated for ${language}`, generated.length >= 2, `${generated.length} generated samples`);
  }
}

if (existsSync(musicManifestPath)) {
  const tracks = JSON.parse(readFileSync(musicManifestPath, "utf8")) as unknown[];
  check("20 music candidates curated", tracks.length === 20, `${tracks.length} candidates`);
}

if (existsSync(artworkManifestPath)) {
  const artwork = JSON.parse(readFileSync(artworkManifestPath, "utf8")) as unknown[];
  check("48 solved artwork assets indexed", artwork.length === 48, `${artwork.length} PNGs`);
}

const renderedVideo = resolve("out/renders/dragons-wrath-scale-shock-en.mp4");
check(
  "Dragon's Wrath smoke render exists",
  existsSync(renderedVideo) && statSync(renderedVideo).size > 100_000,
  renderedVideo,
);

let failed = 0;
for (const result of checks) {
  const status = result.passed ? "PASS" : "FAIL";
  console.log(`[${status}] ${result.id} - ${result.detail}`);
  if (!result.passed) failed += 1;
}

if (failed > 0) {
  console.error(`\nPre-Lovable check failed: ${failed} issue(s).`);
  process.exit(1);
}

console.log("\nPre-Lovable check passed.");
