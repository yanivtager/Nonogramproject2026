/**
 * Render orchestrator. End-to-end: listing → script → numeric-token gate →
 * Edge TTS → Remotion render → MP4. Returns the MP4 path on success or
 * throws with a precise error on validation failure.
 *
 * The four locks all run in this orchestrator:
 *  - Lock #1 (single source of truth): listing comes from a single record.
 *  - Lock #2 (no hardcoded numbers): assertNoHardcodedNumbers on the script.
 *  - Lock #3 (numeric-token gate): assertNumericTokensValid on resolved text.
 *  - Lock #4 (visual assertion): CompositionPropsSchema validates props before render.
 */

import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { basename, join } from "node:path";

import type { Listing, Track, Voice } from "../data/types.js";
import { resolveScript, assertNoHardcodedNumbers, type NarrationScript } from "../narration/schema.js";
import { assertNumericTokensValid } from "../validation/numeric-tokens.js";
import { synthesize } from "../tts/edge-tts.js";
import { CompositionPropsSchema, type CompositionProps } from "../compositions/types.js";

export interface RenderVariantOptions {
  variantId: string;
  listing: Listing;
  voice: Voice;
  track: Track | null;
  script: NarrationScript;
  outDir: string;
  /** Skip actual Remotion render; produce only the validated CompositionProps. Useful for testing. */
  dryRun?: boolean;
}

export interface RenderVariantResult {
  variantId: string;
  status: "ok" | "validation-failed";
  mp4Path?: string;
  durationSeconds?: number;
  audioPath?: string;
  captionsPath?: string;
  composedProps?: CompositionProps;
  error?: string;
}

export async function renderVariant(opts: RenderVariantOptions): Promise<RenderVariantResult> {
  // Lock #2: hardcoded-number rejection at script load.
  try {
    assertNoHardcodedNumbers(opts.script);
  } catch (err) {
    return {
      variantId: opts.variantId,
      status: "validation-failed",
      error: err instanceof Error ? err.message : String(err),
    };
  }

  // Resolve {{listing.*}} variables into concrete spoken text.
  const resolved = resolveScript(opts.script, opts.listing);

  // Lock #3: every numeric token in the resolved text must trace to a listing fact.
  try {
    assertNumericTokensValid(resolved, opts.listing);
  } catch (err) {
    return {
      variantId: opts.variantId,
      status: "validation-failed",
      error: err instanceof Error ? err.message : String(err),
    };
  }

  // Synthesize TTS for the full narration (joined by short pauses).
  const fullText = resolved.map((r) => r.resolved_text).join(" ... ");
  const tts = await synthesize({
    voiceId: opts.voice.vendor_voice_id,
    text: fullText,
  });

  // The captions VTT lives next to the MP3.
  const captionsPath = tts.audioPath.replace(/\.mp3$/, ".vtt");

  mkdirSync(opts.outDir, { recursive: true });
  const publicDir = join(opts.outDir, "_remotion-public");
  mkdirSync(publicDir, { recursive: true });
  const publicAudioName = `${opts.variantId}-${basename(tts.audioPath)}`;
  const publicAudioPath = join(publicDir, publicAudioName);
  copyFileSync(tts.audioPath, publicAudioPath);

  const musicPath = opts.track?.file_url
    ? stageMediaIfLocal(opts.track.file_url, publicDir, `${opts.variantId}-music`)
    : null;

  // Compose typed props for Remotion.
  const props: CompositionProps = {
    listing: opts.listing,
    narrationSegments: resolved.map(({ segment, resolved_text }) => ({
      kind: segment.kind,
      start_s: segment.start_s,
      end_s: segment.end_s,
      resolved_text,
    })),
    narrationAudioPath: publicAudioName,
    captionsVttPath: captionsPath,
    musicPath,
    musicDuckingDb: -8,
    voice: opts.voice,
    track: opts.track,
  };

  // Lock #4: the composition props themselves must pass the schema.
  CompositionPropsSchema.parse(props);

  if (opts.dryRun) {
    return {
      variantId: opts.variantId,
      status: "ok",
      audioPath: tts.audioPath,
      captionsPath,
      durationSeconds: tts.durationSeconds,
      composedProps: props,
    };
  }

  const mp4Path = join(opts.outDir, `${opts.variantId}.mp4`);

  // Lazy import Remotion renderer so unit tests don't pay the bundle cost.
  const { renderMedia, selectComposition } = await import("@remotion/renderer");
  const { bundle } = await import("@remotion/bundler");

  const bundleLocation = await bundle({
    entryPoint: join(process.cwd(), "src/compositions/index.ts"),
    publicDir,
  });
  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: "ScaleShock",
    inputProps: props as unknown as Record<string, unknown>,
  });

  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: "h264",
    outputLocation: mp4Path,
    inputProps: props as unknown as Record<string, unknown>,
  });

  if (!existsSync(mp4Path)) {
    return {
      variantId: opts.variantId,
      status: "validation-failed",
      error: `Render completed but ${mp4Path} not found`,
    };
  }

  return {
    variantId: opts.variantId,
    status: "ok",
    mp4Path,
    audioPath: tts.audioPath,
    captionsPath,
    durationSeconds: tts.durationSeconds,
    composedProps: props,
  };
}

function stageMediaIfLocal(fileOrUrl: string, publicDir: string, prefix: string): string {
  if (/^https?:\/\//.test(fileOrUrl)) return fileOrUrl;
  if (!existsSync(fileOrUrl)) return fileOrUrl;
  const publicName = `${prefix}-${basename(fileOrUrl)}`;
  copyFileSync(fileOrUrl, join(publicDir, publicName));
  return publicName;
}
