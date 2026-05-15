/**
 * Before/After composition (v3 rebuild).
 *
 * Foundation pattern: real artwork PNG is the bottom-layer centerpiece.
 * A cream-cell overlay grid covers it (the "blank printable page" state).
 * A photoreal hand (hand-slide.png, mirrored so it grips the left edge)
 * drags a thin paper sheet left→right across the page. As the paper passes,
 * the cell-mask overlay is clipped away behind it, exposing the real artwork.
 * The hand provides scale anchor AND drives the wipe motion in one element.
 *
 * No invented clue numbers, no 3-card header, no glow seam, no artwork tint.
 */

import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import React from "react";

import { visualAssetUrl } from "./ArtworkLayers";
import type { CompositionArtworkSelection, CompositionProps } from "./types";

const FPS = 30;
const PAGE_WIDTH = 1000;
const PAGE_HEIGHT = 1200;
const GRID_TOP = 130;
const GRID_BOTTOM = 110;
const GRID_SIDE = 40;

const WIPE_START_S = 1.0;
const WIPE_END_S = 5.5;
const HAND_EXIT_END_S = 7.0;

export const BeforeAfterComposition: React.FC<CompositionProps> = ({
  listing,
  narrationSegments,
  narrationAudioPath,
  musicPath,
  musicDuckingDb,
  artworkSelection,
}) => {
  const { fps, durationInFrames } = useVideoConfig();
  const musicLinearVol = Math.pow(10, (musicDuckingDb ?? -10) / 20);
  const ctaStartSeconds =
    narrationSegments.find((segment) => segment.kind === "cta")?.start_s ??
    Math.max(0, durationInFrames / fps - 2);
  const ctaStartFrame = Math.round(ctaStartSeconds * fps);

  return (
    <AbsoluteFill style={{ overflow: "hidden", fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif" }}>
      <PaperBackdrop />
      <WipeStage
        gridSize={listing.grid_size}
        listingName={listing.name}
        cellCount={listing.cell_count}
        artworkUrl={artworkUrl(listing, artworkSelection)}
      />

      {narrationSegments.map((segment) => (
        <Sequence
          key={segment.kind}
          from={Math.round(segment.start_s * fps)}
          durationInFrames={Math.round((segment.end_s - segment.start_s) * fps)}
        >
          <SegmentOverlay segment={segment} />
        </Sequence>
      ))}

      <BrandCorner />

      <Sequence from={ctaStartFrame} durationInFrames={durationInFrames - ctaStartFrame}>
        <CtaStrip listingName={listing.name} />
      </Sequence>

      <Audio src={toRemotionAsset(narrationAudioPath)} />
      {musicPath !== null && (
        <Audio
          src={toRemotionAsset(musicPath)}
          volume={(audioFrame) =>
            Math.min(
              interpolate(audioFrame, [0, 8], [0, musicLinearVol], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
              interpolate(audioFrame, [ctaStartFrame, durationInFrames], [musicLinearVol, 0], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
            )
          }
        />
      )}
    </AbsoluteFill>
  );
};

const PaperBackdrop: React.FC = () => (
  <AbsoluteFill
    style={{
      background:
        "radial-gradient(ellipse at 50% 50%, #f0e3c7 0%, #d9c79f 60%, #b89a6b 100%)",
    }}
  >
    <div
      style={{
        position: "absolute",
        inset: 0,
        backgroundImage:
          "repeating-linear-gradient(0deg, rgba(120,90,50,0.04) 0 1px, transparent 1px 3px)," +
          "repeating-linear-gradient(90deg, rgba(120,90,50,0.03) 0 1px, transparent 1px 3px)",
        opacity: 0.6,
      }}
    />
  </AbsoluteFill>
);

const WipeStage: React.FC<{
  gridSize: string;
  listingName: string;
  cellCount: number;
  artworkUrl: string | null;
}> = ({ gridSize, listingName, cellCount, artworkUrl }) => {
  const frame = useCurrentFrame();
  const grid = parseGridSize(gridSize);

  const pageEnter = interpolate(frame, [0, 0.6 * FPS], [40, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  /** 0.0 at start, 1.0 when wipe completes. */
  const wipeProgress = interpolate(
    frame,
    [WIPE_START_S * FPS, WIPE_END_S * FPS],
    [0.0, 1.0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const handAndPaperX = interpolate(wipeProgress, [0, 1], [-0.05, 1.15], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const handAndPaperOpacity = interpolate(
    frame,
    [0.6 * FPS, 1.0 * FPS, WIPE_END_S * FPS, HAND_EXIT_END_S * FPS],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div
        style={{
          position: "relative",
          width: PAGE_WIDTH,
          height: PAGE_HEIGHT,
          transform: `translateY(${pageEnter}px)`,
          background: "#fffaef",
          borderRadius: 14,
          boxShadow: "0 32px 80px rgba(0,0,0,0.42)",
          overflow: "visible",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "#fffaef",
            borderRadius: 14,
            overflow: "hidden",
          }}
        >
          <PageHeader listingName={listingName} gridSize={gridSize} cellCount={cellCount} />

          {/* Bottom: real artwork */}
          <div
            style={{
              position: "absolute",
              left: GRID_SIDE,
              right: GRID_SIDE,
              top: GRID_TOP,
              bottom: GRID_BOTTOM,
              overflow: "hidden",
              background: "#fffaef",
            }}
          >
            {artworkUrl ? (
              <Img
                src={toArtworkAsset(artworkUrl)}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  objectPosition: "center center",
                  display: "block",
                }}
              />
            ) : (
              <div style={{ width: "100%", height: "100%", background: "#e8d8b4" }} />
            )}

            {/* Middle: cream-cell empty-grid overlay, clipped behind paper */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                clipPath: `inset(0 0 0 ${wipeProgress * 100}%)`,
                pointerEvents: "none",
              }}
            >
              <EmptyGrid columns={grid.columns} rows={grid.rows} />
            </div>
          </div>
        </div>

        {/* Sliding paper sheet — rendered inside page so it gets the page's coordinate frame */}
        <SlidingPaper progress={handAndPaperX} opacity={handAndPaperOpacity} />

        {/* Hand-as-scale-anchor, gripping left edge of the sliding paper */}
        <HandSlider progress={handAndPaperX} opacity={handAndPaperOpacity} />
      </div>
    </AbsoluteFill>
  );
};

const EmptyGrid: React.FC<{ columns: number; rows: number }> = ({ columns, rows }) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      display: "grid",
      gridTemplateColumns: `repeat(${columns}, 1fr)`,
      gridTemplateRows: `repeat(${rows}, 1fr)`,
      background: "#fffaef",
    }}
  >
    {Array.from({ length: columns * rows }, (_, idx) => (
      <div
        key={idx}
        style={{
          background: "#fffaef",
          boxShadow: "inset 0 0 0 1px rgba(80,60,30,0.16)",
        }}
      />
    ))}
  </div>
);

const SlidingPaper: React.FC<{ progress: number; opacity: number }> = ({ progress, opacity }) => {
  const paperLeftPx = progress * PAGE_WIDTH - 130;
  return (
    <div
      style={{
        position: "absolute",
        left: paperLeftPx,
        top: GRID_TOP - 20,
        width: 260,
        height: PAGE_HEIGHT - GRID_TOP - GRID_BOTTOM + 40,
        opacity,
        pointerEvents: "none",
        background:
          "linear-gradient(90deg, #f6ead0 0%, #fbf3df 50%, #f6ead0 100%)",
        backgroundImage:
          "repeating-linear-gradient(0deg, rgba(120,90,50,0.05) 0 1px, transparent 1px 3px)",
        boxShadow:
          "12px 0 28px rgba(0,0,0,0.28)," +
          "-2px 0 6px rgba(0,0,0,0.12)",
        borderRadius: 4,
      }}
    />
  );
};

const HandSlider: React.FC<{ progress: number; opacity: number }> = ({ progress, opacity }) => {
  const handCenterX = progress * PAGE_WIDTH - 220;
  return (
    <div
      style={{
        position: "absolute",
        left: handCenterX - 220,
        top: GRID_TOP + 60,
        width: 440,
        height: 440,
        opacity,
        pointerEvents: "none",
        transform: "scaleX(-1)",
      }}
    >
      <Img
        src={staticFile("hand-slide.png")}
        style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
      />
    </div>
  );
};

const PageHeader: React.FC<{ listingName: string; gridSize: string; cellCount: number }> = ({
  listingName,
  gridSize,
  cellCount,
}) => (
  <div
    style={{
      position: "absolute",
      left: GRID_SIDE,
      right: GRID_SIDE,
      top: 28,
      height: GRID_TOP - 28,
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "space-between",
      color: "#1c1710",
      fontFamily: "system-ui, sans-serif",
    }}
  >
    <div>
      <div style={{ fontSize: 38, fontWeight: 950, lineHeight: 1 }}>{listingName}</div>
      <div style={{ marginTop: 8, fontSize: 22, fontWeight: 800, color: "rgba(28,23,16,0.62)" }}>
        {gridSize} printable · {cellCount.toLocaleString("en-US")} cells
      </div>
    </div>
  </div>
);

const SegmentOverlay: React.FC<{
  segment: { kind: string; resolved_text: string };
}> = ({ segment }) => {
  if (segment.kind === "hook") {
    return (
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-start", paddingTop: 60 }}>
        <HeadlinePill text="Blank grid → solved art" />
      </AbsoluteFill>
    );
  }
  if (segment.kind === "cta") return null;
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-end", paddingBottom: 220 }}>
      <CaptionBar text={shortCaption(segment)} />
    </AbsoluteFill>
  );
};

function shortCaption(segment: { kind: string; resolved_text: string }): string {
  if (segment.kind === "transformation") return "one slide, one finished picture";
  if (segment.kind === "after_reveal") return "finished artwork payoff";
  return segment.resolved_text;
}

const HeadlinePill: React.FC<{ text: string }> = ({ text }) => (
  <div
    style={{
      maxWidth: 900,
      padding: "16px 32px",
      borderRadius: 999,
      background: "rgba(34,25,15,0.86)",
      border: "1px solid rgba(248,238,215,0.18)",
      color: "#fff8e8",
      fontSize: 38,
      fontWeight: 950,
      lineHeight: 1.12,
      textAlign: "center",
      boxShadow: "0 18px 50px rgba(0,0,0,0.36)",
    }}
  >
    {text}
  </div>
);

const CaptionBar: React.FC<{ text: string }> = ({ text }) => (
  <div
    style={{
      maxWidth: 880,
      padding: "16px 32px",
      borderRadius: 14,
      background: "rgba(34,25,15,0.84)",
      border: "1px solid rgba(248,238,215,0.16)",
      color: "#fff8e8",
      fontSize: 36,
      fontWeight: 800,
      lineHeight: 1.22,
      textAlign: "center",
    }}
  >
    {text}
  </div>
);

const BrandCorner: React.FC = () => (
  <div
    style={{
      position: "absolute",
      bottom: 30,
      right: 32,
      fontSize: 26,
      fontWeight: 700,
      letterSpacing: 1,
      color: "#1c1710",
      opacity: 0.78,
    }}
  >
    GrandGridStudio
  </div>
);

const CtaStrip: React.FC<{ listingName: string }> = ({ listingName }) => (
  <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-end", paddingBottom: 80 }}>
    <div
      style={{
        padding: "20px 42px",
        borderRadius: 999,
        background: "#D4A84B",
        color: "#15100a",
        fontSize: 34,
        fontWeight: 950,
        letterSpacing: 0.6,
        boxShadow: "0 18px 36px rgba(0,0,0,0.36)",
      }}
    >
      Get {listingName} on Etsy
    </div>
  </AbsoluteFill>
);

function artworkUrl(
  listing: CompositionProps["listing"],
  selection?: CompositionArtworkSelection,
): string | null {
  const sorted = [...(selection?.assets ?? [])].sort((a, b) => a.displayOrder - b.displayOrder);
  return sorted[0]?.renderUrl ?? sorted[0]?.publicUrl ?? visualAssetUrl(listing);
}

function toRemotionAsset(pathOrUrl: string): string {
  if (/^https?:\/\//.test(pathOrUrl)) return pathOrUrl;
  return staticFile(pathOrUrl.replace(/\\/g, "/"));
}

function toArtworkAsset(pathOrUrl: string): string {
  if (/^https?:\/\//.test(pathOrUrl)) return pathOrUrl;
  return staticFile(pathOrUrl.replace(/\\/g, "/").replace(/^\/+/, ""));
}

function parseGridSize(gridSize: string): { columns: number; rows: number } {
  const match = gridSize.match(/(\d+)\s*[xX]\s*(\d+)/);
  if (!match) return { columns: 18, rows: 24 };
  return {
    columns: Math.max(12, Math.min(18, Number(match[1]))),
    rows: Math.max(16, Math.min(24, Number(match[2]))),
  };
}
