import { describe, expect, it } from "vitest";

import { CANDIDATE_TRACKS } from "../src/music/candidate-tracks.js";
import { CANDIDATE_VOICES, SAMPLE_TEXT_BY_LANGUAGE } from "../src/tts/voices-registry.js";

describe("Phase 0 curation assets", () => {
  it("has the promised 20 royalty-free music candidates", () => {
    expect(CANDIDATE_TRACKS).toHaveLength(20);
    expect(new Set(CANDIDATE_TRACKS.map((track) => track.mood))).toEqual(
      new Set(["calm", "energetic", "cinematic-tense", "playful", "healing"]),
    );
    expect(CANDIDATE_TRACKS.every((track) => track.licenseSource === "pixabay")).toBe(true);
  });

  it("has at least 3 candidate voices per locked language", () => {
    for (const language of ["en", "es", "ja", "pt-BR"] as const) {
      expect(CANDIDATE_VOICES.filter((voice) => voice.language === language).length).toBeGreaterThanOrEqual(3);
    }
  });

  it("keeps Japanese sample text as real Japanese, not mojibake", () => {
    expect(SAMPLE_TEXT_BY_LANGUAGE.ja).toContain("ようこそ");
    expect(SAMPLE_TEXT_BY_LANGUAGE.ja).not.toMatch(/[ãâ€]/);
  });
});
