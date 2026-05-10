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

import { copyFileSync, existsSync, mkdirSync, renameSync } from "node:fs";
import { basename, join } from "node:path";
import { promisify } from "node:util";
import { execFile } from "node:child_process";
import ffmpegPath from "ffmpeg-static";

import type { Listing, Track, Voice } from "../data/types.js";
import { resolveScript, assertNoHardcodedNumbers, type NarrationScript } from "../narration/schema.js";
import { assertNumericTokensValid } from "../validation/numeric-tokens.js";
import { synthesize } from "../tts/edge-tts.js";
import { CompositionPropsSchema, type CompositionProps } from "../compositions/types.js";
import { TEMPLATE_TO_COMPOSITION_ID } from "../compositions/index.js";
import { explainAudioAssetProblem } from "../music/audio-assets.js";

export interface RenderVariantOptions {
  variantId: string;
  templateId: string;
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
  if (!opts.dryRun) {
    if (opts.track && opts.track.approval_status !== "approved") {
      return {
        variantId: opts.variantId,
        status: "validation-failed",
        error: `Track "${opts.track.title}" is not approved (status: ${opts.track.approval_status}). Approve it in the Music tab first.`,
      };
    }
    const musicProblem = explainAudioAssetProblem(opts.track?.file_url);
    if (musicProblem) {
      return {
        variantId: opts.variantId,
        status: "validation-failed",
        error: `Invalid music track: ${musicProblem}`,
      };
    }
  }

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
  const resolved = resolveScript(opts.script, opts.listing, opts.script.language_code);

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
    musicDuckingDb: opts.track?.recommended_gain_db ?? -3.0,
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
  const outputVttPath = join(opts.outDir, `${opts.variantId}.vtt`);
  if (existsSync(captionsPath)) {
    copyFileSync(captionsPath, outputVttPath);
  }

  const compositionId = TEMPLATE_TO_COMPOSITION_ID[opts.templateId];
  if (!compositionId) {
    return {
      variantId: opts.variantId,
      status: "validation-failed",
      error: `Unknown templateId: ${opts.templateId}`,
    };
  }

  // Lazy import Remotion renderer so unit tests don't pay the bundle cost.
  const { renderMedia, selectComposition } = await import("@remotion/renderer");
  const { bundle } = await import("@remotion/bundler");

  const bundleLocation = await bundle({
    entryPoint: join(process.cwd(), "src/compositions/index.ts"),
    publicDir,
  });
  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: compositionId,
    inputProps: props as unknown as Record<string, unknown>,
  });

  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: "h264",
    videoBitrate: "3M",
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

  // Re-mux with moov atom at the front so browsers can stream without downloading the whole file.
  const tmpPath = mp4Path.replace(/\.mp4$/, "_tmp.mp4");
  await promisify(execFile)(ffmpegPath as string, [
    "-y", "-i", mp4Path,
    "-c", "copy",
    "-movflags", "+faststart",
    tmpPath,
  ]);
  renameSync(tmpPath, mp4Path);

  return {
    variantId: opts.variantId,
    status: "ok",
    mp4Path,
    audioPath: tts.audioPath,
    captionsPath: existsSync(outputVttPath) ? outputVttPath : captionsPath,
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
