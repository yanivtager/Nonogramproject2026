/**
 * Typed props for Remotion compositions.
 *
 * These props are the structural lock #4 against the 250k bug class:
 * compositions render data from the listing record only. They cannot fabricate
 * numbers because numbers must come through `listing.cell_count.toLocaleString()`
 * (or similar typed access). This is checked at runtime via assertCompositionPropsValid()
 * before render.
 */

import { z } from "zod";

import type { Listing, Track, Voice } from "../data/types.js";

export interface ResolvedNarrationSegment {
  kind: string;
  start_s: number;
  end_s: number;
  resolved_text: string;
}

export interface CompositionProps {
  /** The full listing record. The only source of product facts in render. */
  listing: Listing;
  /** Resolved narration script — the post-interpolation text per segment. */
  narrationSegments: ResolvedNarrationSegment[];
  /** Path to the synthesized TTS MP3 for the whole video. */
  narrationAudioPath: string;
  /** Path to the WebVTT captions for the narration. */
  captionsVttPath: string;
  /** Path to the looped background music MP3. May be null if no music. */
  musicPath: string | null;
  /** Music ducking dB value (negative); applied to music when narration is playing. */
  musicDuckingDb: number;
  /** The voice metadata that synthesized the narration. */
  voice: Voice;
  /** The music track metadata. */
  track: Track | null;
}

/**
 * Zod schema for runtime validation. Used by the render orchestrator before
 * mounting Remotion — catches malformed inputs before we burn a render.
 */
export const CompositionPropsSchema = z.object({
  listing: z.object({
    id: z.string(),
    name: z.string(),
    cell_count: z.number().int().positive(),
    grid_size: z.string(),
    puzzle_count: z.number().int().positive(),
    etsy_url: z.string().url(),
  }).passthrough(),
  narrationSegments: z
    .array(
      z.object({
        kind: z.string(),
        start_s: z.number().min(0),
        end_s: z.number().min(0),
        resolved_text: z.string().min(1),
      }),
    )
    .min(1),
  narrationAudioPath: z.string().min(1),
  captionsVttPath: z.string().min(1),
  musicPath: z.string().nullable(),
  musicDuckingDb: z.number().max(0),
  voice: z.object({
    id: z.string(),
    vendor_voice_id: z.string(),
    language: z.string(),
  }).passthrough(),
  track: z.union([z.null(), z.object({ id: z.string() }).passthrough()]),
});
