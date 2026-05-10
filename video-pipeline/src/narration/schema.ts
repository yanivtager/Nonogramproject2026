/**
 * Structured narration script schema.
 *
 * RULE: scripts contain segment templates with {{interpolation}} variables only.
 * Never free-form prose with hardcoded numbers. The interpolation engine
 * (resolveScript below) replaces variables from the listing record at render time.
 *
 * Scripts cannot reference numbers that aren't on the listing record. This is
 * structural lock #2 against the 250k bug class.
 */

import { z } from "zod";
import type { Listing } from "../data/types.js";

export const NarrationVariableSchema = z.enum([
  "listing.cell_count",
  "listing.cell_count_formatted",
  "listing.grid_size",
  "listing.puzzle_count",
  "listing.name",
  "listing.theme",
  "listing.difficulty",
]);

export type NarrationVariable = z.infer<typeof NarrationVariableSchema>;

export const NarrationSegmentSchema = z.object({
  kind: z.string(),
  start_s: z.number().min(0),
  end_s: z.number().min(0),
  /**
   * The text template for this segment. May contain {{listing.cell_count_formatted}}
   * style placeholders. MUST NOT contain hardcoded numbers (validated below).
   */
  text_template: z.string(),
  /**
   * Optional emphasis mark for TTS pacing — e.g., a 200ms pause before reading the cell count.
   */
  emphasis: z
    .object({
      pre_pause_ms: z.number().optional(),
      post_pause_ms: z.number().optional(),
      rate: z.enum(["slow", "normal", "fast"]).optional(),
    })
    .optional(),
});

export type NarrationSegment = z.infer<typeof NarrationSegmentSchema>;

export const NarrationScriptSchema = z.object({
  template_id: z.string(),
  language_code: z.string(),
  /**
   * The composition this script targets. Mirrors templates.timeline_json.segments[*].kind
   * but only for segments that produce spoken audio (hooks, voiceover, CTA).
   */
  segments: z.array(NarrationSegmentSchema).min(1),
});

export type NarrationScript = z.infer<typeof NarrationScriptSchema>;

/**
 * The text_template MUST NOT contain raw digit sequences with thousand separators
 * (e.g., "15,000" or "62,500"). Numbers must come through {{listing.cell_count_formatted}}
 * variables. This rejects scripts at definition time, before they ever reach TTS.
 */
const HARDCODED_NUMBER_PATTERN = /\d{1,3}(,\d{3})+|\d{4,}/;

export function assertNoHardcodedNumbers(script: NarrationScript): void {
  for (const [index, segment] of script.segments.entries()) {
    if (HARDCODED_NUMBER_PATTERN.test(segment.text_template)) {
      throw new Error(
        `Narration script ${script.template_id}/${script.language_code} segment[${index}] (kind=${segment.kind}) contains a hardcoded number in text_template: "${segment.text_template}". ` +
          `Replace the number with a {{listing.*}} variable. This is structural lock #2 against the 250k bug class.`,
      );
    }
  }
}

/**
 * Resolves a script's text_templates by substituting variables from the listing record.
 * Returns the spoken text per segment.
 */
const LOCALE_MAP: Record<string, string> = {
  en: "en-US",
  es: "es-MX",
  ja: "ja-JP",
  "pt-BR": "pt-BR",
};

export function resolveScript(
  script: NarrationScript,
  listing: Listing,
  languageCode?: string,
): { segment: NarrationSegment; resolved_text: string }[] {
  const lang = languageCode ?? script.language_code;
  return script.segments.map((segment) => {
    const resolved_text = segment.text_template.replace(
      /\{\{(listing\.[a-z_]+)\}\}/g,
      (_match, variable: string) => resolveVariable(variable, listing, lang),
    );
    return { segment, resolved_text };
  });
}

function resolveVariable(variable: string, listing: Listing, languageCode: string): string {
  switch (variable) {
    case "listing.cell_count":
      return String(listing.cell_count);
    case "listing.cell_count_formatted": {
      const locale = LOCALE_MAP[languageCode] ?? "en-US";
      return listing.cell_count.toLocaleString(locale);
    }
    case "listing.grid_size":
      return listing.grid_size;
    case "listing.puzzle_count":
      return String(listing.puzzle_count);
    case "listing.name":
      return listing.name;
    case "listing.theme":
      return listing.theme;
    case "listing.difficulty":
      return listing.difficulty;
    default:
      throw new Error(`Unknown narration variable: ${variable}`);
  }
}
