/**
 * Print Ritual (live-action) composition — V2 with multi-artwork support.
 *
 * V1 behavior: pre-rendered Kling video + branding overlays + single-image tail.
 * V2 adds:
 *   - Single-product listings with ≥2 artworks → PiP rotation over Kling video.
 *   - Bundle listings (puzzle_count > 1) → stacked-plate layout of 2-3 cards.
 *   - Aspect-aware Ken-Burns via artworkSelection.assets[].focusWindow.
 *
 * Falls back to the V1 single-image tail when no artworkSelection is present
 * (legacy path used by dragons-wrath in Phase 1).
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
import type {
  ArtworkSelectionAsset,
  CompositionArtworkSelection,
  CompositionProps,
} from "./types";

const DEFAULT_LOOP_DURATION_FRAMES = 15 * 30;
const KLING_DURATION_FRAMES = 480;
const CROSSFADE_FRAMES = Math.round(0.7 * 30);
const CROSSFADE_START = KLING_DURATION_FRAMES - CROSSFADE_FRAMES;

// V2 multi-art body: rotation begins after a brief Kling-only intro.
const BODY_START_FRAME = 90; // 3s of Kling-only intro

export const PrintRitualRealComposition: React.FC<CompositionProps> = ({
  listing,
  narrationSegments,
  narrationAudioPath,
  musicPath,
  musicDuckingDb,
  backgroundVideoPath,
  artworkSelection,
}) => {
  const { fps, durationInFrames } = useVideoConfig();
  const musicLinearVol = Math.pow(10, (musicDuckingDb ?? -10) / 20);
  const ctaStartSeconds =
    narrationSegments.find((s) => s.kind === "cta")?.start_s ??
    Math.max(0, durationInFrames / fps - 2);
  const ctaStartFrame = Math.round(ctaStartSeconds * fps);

  const isBundle = listing.puzzle_count > 1;
  const assets = [...(artworkSelection?.assets ?? [])].sort(
    (a, b) => a.displayOrder - b.displayOrder,
  );
  const hasMultiArt = assets.length >= 2;

  return (
    <AbsoluteFill
      style={{
        overflow: "hidden",
        backgroundColor: "#0b0805",
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
      }}
    >
      {backgroundVideoPath ? (
        hasMultiArt || listing.solved_artwork_url ? (
          <Sequence durationInFrames={KLING_DURATION_FRAMES}>
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
          </Sequence>
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

      {/* V2 multi-art body: PiP rotation (singles) or stacked plate (bundles) */}
      {hasMultiArt && isBundle ? (
        <PrintRitualBundlePlate assets={assets} />
      ) : hasMultiArt ? (
        <PrintRitualSingleRotation assets={assets} />
      ) : null}

      {/* Tail crossfade: hero artwork holds full-frame at end */}
      {hasMultiArt ? (
        <ArtworkTailMulti assets={assets} />
      ) : listing.solved_artwork_url ? (
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

/**
 * Single-listing multi-art body: PiP card rotates through 2–6 artworks while
 * the Kling video plays behind. Each card holds ~4s with mode-aware Ken-Burns.
 */
const PrintRitualSingleRotation: React.FC<{ assets: ArtworkSelectionAsset[] }> = ({ assets }) => {
  const bodyEndFrame = CROSSFADE_START; // PiP fades out as tail crossfade begins
  const bodyDuration = Math.max(1, bodyEndFrame - BODY_START_FRAME);
  // Cap the rotation at 4 artworks; show variety without rushing.
  const rotated = assets.slice(0, 4);
  const framesPerAsset = Math.floor(bodyDuration / rotated.length);
  const fadeFrames = 12; // ~0.4s

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      {rotated.map((asset, index) => {
        const startFrame = BODY_START_FRAME + index * framesPerAsset;
        const endFrame = startFrame + framesPerAsset;
        return (
          <Sequence
            key={asset.assetId}
            from={startFrame}
            durationInFrames={framesPerAsset}
          >
            <PipArtworkCard
              asset={asset}
              localStartFrame={0}
              localEndFrame={framesPerAsset}
              fadeFrames={fadeFrames}
            />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

/**
 * Picture-in-picture artwork card: ~60% width, drop-shadowed, slightly tilted.
 * Applies aspect-aware Ken-Burns derived from focusWindow.
 */
const PipArtworkCard: React.FC<{
  asset: ArtworkSelectionAsset;
  localStartFrame: number;
  localEndFrame: number;
  fadeFrames: number;
}> = ({ asset, localStartFrame, localEndFrame, fadeFrames }) => {
  const frame = useCurrentFrame();
  const localFrame = frame - localStartFrame;
  const duration = localEndFrame - localStartFrame;

  // Fade in/out
  const opacity = Math.min(
    interpolate(localFrame, [0, fadeFrames], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
    interpolate(localFrame, [duration - fadeFrames, duration], [1, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );

  const burns = kenBurnsTransform(asset.focusWindow, localFrame, duration);
  const tilt = (parseInt(asset.assetId.slice(-1), 16) % 4) - 2; // -2..1 deg, stable per asset

  return (
    <div
      style={{
        opacity,
        width: 760,
        height: 950,
        transform: `rotate(${tilt}deg)`,
        boxShadow: "0 28px 70px rgba(0,0,0,0.55), 0 6px 18px rgba(0,0,0,0.35)",
        background: "#fff",
        padding: 24,
        borderRadius: 6,
        overflow: "hidden",
        marginTop: -40,
      }}
    >
      <div style={{ width: "100%", height: "100%", overflow: "hidden" }}>
        <Img
          src={toArtworkAsset(asset.renderUrl ?? asset.publicUrl)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: burns,
            transformOrigin: "center center",
          }}
        />
      </div>
    </div>
  );
};

/**
 * Bundle plate: 2–3 artwork cards arranged like prints scattered on the table.
 * Cards appear staggered with fade-in, hold through the body, fade to single tail.
 */
const PrintRitualBundlePlate: React.FC<{ assets: ArtworkSelectionAsset[] }> = ({ assets }) => {
  const frame = useCurrentFrame();
  const cards = assets.slice(0, 3);

  // Stagger: card 0 enters at BODY_START_FRAME, card 1 +20f, card 2 +40f
  const staggerFrames = 20;

  // Each card has a fixed tilt/offset to feel like physical prints on a table.
  const layouts = [
    { rotate: -6, x: -180, y: 30, z: 2 },  // back-left
    { rotate: 4, x: 30, y: -20, z: 3 },     // foreground
    { rotate: -3, x: 220, y: 60, z: 1 },    // back-right
  ];

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      {cards.map((asset, index) => {
        const enterFrame = BODY_START_FRAME + index * staggerFrames;
        const exitFrame = CROSSFADE_START;
        const layout = layouts[index] ?? layouts[0]!;
        const opacity = Math.min(
          interpolate(frame, [enterFrame, enterFrame + 15], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          interpolate(frame, [exitFrame, exitFrame + 15], [1, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        );
        const burns = kenBurnsTransform(
          asset.focusWindow,
          frame - enterFrame,
          exitFrame - enterFrame,
        );
        return (
          <div
            key={asset.assetId}
            style={{
              position: "absolute",
              opacity,
              width: 540,
              height: 680,
              zIndex: layout.z,
              transform: `translate(${layout.x}px, ${layout.y}px) rotate(${layout.rotate}deg)`,
              boxShadow: "0 22px 60px rgba(0,0,0,0.55), 0 4px 14px rgba(0,0,0,0.4)",
              background: "#fff",
              padding: 18,
              borderRadius: 4,
              overflow: "hidden",
            }}
          >
            <div style={{ width: "100%", height: "100%", overflow: "hidden" }}>
              <Img
                src={toArtworkAsset(asset.renderUrl ?? asset.publicUrl)}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  transform: burns,
                  transformOrigin: "center center",
                }}
              />
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

/**
 * V2 tail: full-frame crossfade to the hero asset (highest displayOrder among
 * those tagged 'hero', else the last sorted asset).
 */
const ArtworkTailMulti: React.FC<{ assets: ArtworkSelectionAsset[] }> = ({ assets }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const hero =
    assets.find((a) => a.segmentRole === "hero") ?? assets[assets.length - 1] ?? assets[0]!;

  const opacity = interpolate(
    frame,
    [CROSSFADE_START, KLING_DURATION_FRAMES],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const tailLocalFrame = frame - CROSSFADE_START;
  const tailDuration = Math.max(1, durationInFrames - CROSSFADE_START);
  const burns = kenBurnsTransform(hero.focusWindow, tailLocalFrame, tailDuration, 1.06);

  return (
    <AbsoluteFill style={{ opacity }}>
      <Img
        src={toArtworkAsset(hero.renderUrl ?? hero.publicUrl)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: burns,
          transformOrigin: "center center",
        }}
      />
    </AbsoluteFill>
  );
};

/** Legacy single-URL tail (V1 path; used when no artworkSelection provided). */
const ArtworkTail: React.FC<{ artworkUrl: string }> = ({ artworkUrl }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const opacity = interpolate(
    frame,
    [CROSSFADE_START, KLING_DURATION_FRAMES],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const scale = interpolate(
    frame,
    [CROSSFADE_START, durationInFrames],
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

/**
 * Mode-aware Ken-Burns transform derived from focusWindow.
 *  - horizontal-pan: translateX across the duration
 *  - vertical-drift / vertical: translateY across the duration
 *  - zoom (default): scale increase
 */
function kenBurnsTransform(
  fw: ArtworkSelectionAsset["focusWindow"] | undefined,
  localFrame: number,
  duration: number,
  fallbackZoom = 1.04,
): string {
  const progress = duration > 0 ? Math.min(1, Math.max(0, localFrame / duration)) : 0;
  const zoom = fw?.zoom ?? fallbackZoom;
  const mode = fw?.mode ?? "zoom";

  if (mode === "horizontal-pan" || mode === "horizontal") {
    const tx = interpolate(progress, [0, 1], [-60, 60]);
    return `scale(${zoom}) translateX(${tx}px)`;
  }
  if (mode === "vertical-drift" || mode === "vertical") {
    const startY = fw?.startY ?? 0.4;
    const endY = fw?.endY ?? 0.6;
    const y = interpolate(progress, [0, 1], [startY, endY]);
    const ty = (0.5 - y) * 220;
    return `scale(${zoom}) translateY(${ty}px)`;
  }
  // zoom: subtle scale increase
  const s = interpolate(progress, [0, 1], [1.0, zoom]);
  return `scale(${s})`;
}

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

function toArtworkAsset(pathOrUrl: string): string {
  if (/^https?:\/\//.test(pathOrUrl)) return pathOrUrl;
  return staticFile(pathOrUrl.replace(/\\/g, "/").replace(/^\/+/, ""));
}
