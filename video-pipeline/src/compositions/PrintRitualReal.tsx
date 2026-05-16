/**
 * Print Ritual (live-action) composition.
 *
 * Visual layer is a pre-rendered video file (e.g. Kling-generated footage of
 * a person printing/solving a nonogram). The composition mutes the source
 * audio and overlays the standard promo branding on top: top stats bar with
 * the listing's name + grid size + cell count, segment captions, GrandGridStudio
 * mark, and the gold "Download on Etsy" CTA in the last ~2 seconds. TTS narration
 * and background music drive the audio.
 *
 * Behaviorally identical to PrintRitual.tsx's overlay stack — only the
 * background changes (desk-photo + synthetic puzzle → live-action video).
 */

import {
  AbsoluteFill,
  Audio,
  Img,
  Loop,
  Sequence,
  Video,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import React from "react";

import { BrandCorner, CaptionBar, CtaStrip, HeadlinePill } from "./shared/BrandOverlays";
import type { CompositionProps } from "./types";

const DEFAULT_LOOP_DURATION_FRAMES = 15 * 30;
const KLING_DURATION_FRAMES = 480; // 16 s × 30 fps — crossfade trigger point
const CROSSFADE_FRAMES = Math.round(0.7 * 30); // ~21 frames

export const PrintRitualRealComposition: React.FC<CompositionProps> = ({
  listing,
  narrationSegments,
  narrationAudioPath,
  musicPath,
  musicDuckingDb,
  backgroundVideoPath,
}) => {
  const { fps, durationInFrames } = useVideoConfig();
  const musicLinearVol = Math.pow(10, (musicDuckingDb ?? -10) / 20);
  const ctaStartSeconds =
    narrationSegments.find((s) => s.kind === "cta")?.start_s ??
    Math.max(0, durationInFrames / fps - 2);
  const ctaStartFrame = Math.round(ctaStartSeconds * fps);

  return (
    <AbsoluteFill
      style={{
        overflow: "hidden",
        backgroundColor: "#0b0805",
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
      }}
    >
      {backgroundVideoPath ? (
        listing.solved_artwork_url ? (
          <Video
            src={toRemotionAsset(backgroundVideoPath)}
            muted
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center center",
            }}
          />
        ) : (
          <Loop durationInFrames={DEFAULT_LOOP_DURATION_FRAMES}>
            <Video
              src={toRemotionAsset(backgroundVideoPath)}
              muted
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "center center",
              }}
            />
          </Loop>
        )
      ) : null}

      {listing.solved_artwork_url ? (
        <ArtworkTail artworkUrl={listing.solved_artwork_url} />
      ) : null}

      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse 80% 90% at 50% 50%, rgba(0,0,0,0) 30%, rgba(0,0,0,0.42) 100%)",
        }}
      />

      <TopStatsBar
        listingName={listing.name}
        gridSize={listing.grid_size}
        cellCount={listing.cell_count}
      />

      {narrationSegments.map((segment) => (
        <Sequence
          key={segment.kind}
          from={Math.round(segment.start_s * fps)}
          durationInFrames={Math.max(1, Math.round((segment.end_s - segment.start_s) * fps))}
        >
          <SegmentOverlay segment={segment} />
        </Sequence>
      ))}

      <BrandCorner />

      <Sequence from={ctaStartFrame} durationInFrames={Math.max(1, durationInFrames - ctaStartFrame)}>
        <CtaStrip listingName={listing.name} />
      </Sequence>

      <Audio src={toRemotionAsset(narrationAudioPath)} />
      {musicPath !== null ? (
        <Audio
          src={toRemotionAsset(musicPath)}
          volume={(audioFrame) =>
            Math.min(
              interpolate(audioFrame, [0, 8], [0, musicLinearVol], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
              interpolate(audioFrame, [ctaStartFrame, durationInFrames], [musicLinearVol, 0], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
            )
          }
        />
      ) : null}
    </AbsoluteFill>
  );
};

const ArtworkTail: React.FC<{ artworkUrl: string }> = ({ artworkUrl }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const opacity = interpolate(
    frame,
    [KLING_DURATION_FRAMES, KLING_DURATION_FRAMES + CROSSFADE_FRAMES],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const scale = interpolate(
    frame,
    [KLING_DURATION_FRAMES, durationInFrames],
    [1.0, 1.06],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill style={{ opacity }}>
      <Img
        src={artworkUrl}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${scale})`,
          transformOrigin: "center center",
        }}
      />
    </AbsoluteFill>
  );
};

const TopStatsBar: React.FC<{ listingName: string; gridSize: string; cellCount: number }> = ({
  listingName,
  gridSize,
  cellCount,
}) => (
  <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-start", paddingTop: 64 }}>
    <div
      style={{
        maxWidth: 980,
        padding: "18px 36px",
        borderRadius: 22,
        background: "rgba(20,14,8,0.72)",
        border: "1px solid rgba(248,238,215,0.18)",
        color: "#fff8e8",
        textAlign: "center",
        boxShadow: "0 18px 50px rgba(0,0,0,0.42)",
      }}
    >
      <div style={{ fontSize: 44, fontWeight: 950, lineHeight: 1.05 }}>{listingName}</div>
      <div
        style={{
          marginTop: 8,
          fontSize: 24,
          fontWeight: 800,
          letterSpacing: 0.4,
          color: "rgba(255,248,232,0.86)",
        }}
      >
        Printable nonogram · {gridSize} · {cellCount.toLocaleString("en-US")} cells
      </div>
    </div>
  </AbsoluteFill>
);

const SegmentOverlay: React.FC<{
  segment: { kind: string; resolved_text: string };
}> = ({ segment }) => {
  if (segment.kind === "hook") {
    return (
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-start", paddingTop: 260 }}>
        <HeadlinePill text="Paper. Pencil. Quiet focus." />
      </AbsoluteFill>
    );
  }
  if (segment.kind === "cta") return null;
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-end", paddingBottom: 240 }}>
      <CaptionBar text={shortCaption(segment)} />
    </AbsoluteFill>
  );
};

function shortCaption(segment: { kind: string; resolved_text: string }): string {
  if (segment.kind === "ritual") return "hours, by hand";
  if (segment.kind === "payoff") return "finished page payoff";
  return segment.resolved_text;
}

function toRemotionAsset(pathOrUrl: string): string {
  if (/^https?:\/\//.test(pathOrUrl)) return pathOrUrl;
  return staticFile(pathOrUrl.replace(/\\/g, "/").replace(/^\/+/, ""));
}
