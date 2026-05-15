/**
 * Solve Reveal composition (v3 rebuild).
 *
 * Foundation pattern lifted from ScaleShock: the real artwork is the visual
 * centerpiece. A cream-cell overlay grid covers the artwork at the start
 * with only a small ~12-cell cluster "remaining unsolved" near the center.
 * Over 0.8s → 4.0s, those final cells fade out one by one (the Zeigarnik
 * closure beat), revealing the actual artwork beneath. A photoreal hand
 * PNG (`hand-final.png`) sits over the cluster as a scale anchor and
 * narrative anchor — a real person is finishing the last bit.
 *
 * No fake clue numbers, no procedural cells, no artwork tint. Brand color
 * lives only in the headline pill / CTA / brand corner.
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

/** Page container that holds the artwork + cell mask. Same across all 3 rebuilt templates. */
const PAGE_WIDTH = 1000;
const PAGE_HEIGHT = 1200;
const GRID_TOP = 130;
const GRID_BOTTOM = 110;
const GRID_SIDE = 40;

/** Final cluster: 12 cells around col ~55% / row ~48% of an 18×24 display grid. */
const FINAL_CLUSTER: Array<{ col: number; row: number }> = [
  { col: 9, row: 11 }, { col: 10, row: 11 }, { col: 11, row: 11 },
  { col: 9, row: 12 }, { col: 10, row: 12 }, { col: 11, row: 12 }, { col: 12, row: 12 },
  { col: 9, row: 13 }, { col: 10, row: 13 }, { col: 11, row: 13 }, { col: 12, row: 13 },
  { col: 10, row: 14 },
];

export const SolveRevealComposition: React.FC<CompositionProps> = ({
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
      <ClosureStage
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

const ClosureStage: React.FC<{
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
  const finalProgress = interpolate(frame, [0.8 * FPS, 4.0 * FPS], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const flash = interpolate(frame, [3.7 * FPS, 4.0 * FPS, 4.6 * FPS], [0, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const gridLinesOpacity = interpolate(frame, [4.6 * FPS, 5.5 * FPS], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const handOpacity = interpolate(frame, [0.5 * FPS, 0.9 * FPS, 3.8 * FPS, 4.2 * FPS], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const handLift = interpolate(frame, [3.8 * FPS, 4.2 * FPS], [0, -40], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const cellWidth = (PAGE_WIDTH - GRID_SIDE * 2) / grid.columns;
  const cellHeight = (PAGE_HEIGHT - GRID_TOP - GRID_BOTTOM) / grid.rows;
  const clusterCentroidCol = average(FINAL_CLUSTER.map((c) => c.col)) + 0.5;
  const clusterCentroidRow = average(FINAL_CLUSTER.map((c) => c.row)) + 0.5;
  const handCenterX = GRID_SIDE + clusterCentroidCol * cellWidth;
  const handCenterY = GRID_TOP + clusterCentroidRow * cellHeight;

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
          overflow: "hidden",
        }}
      >
        <PageHeader listingName={listingName} gridSize={gridSize} cellCount={cellCount} />

        {/* Artwork layer */}
        <div
          style={{
            position: "absolute",
            left: GRID_SIDE,
            right: GRID_SIDE,
            top: GRID_TOP,
            bottom: GRID_BOTTOM,
            background: "#fffaef",
            overflow: "hidden",
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

          {/* Cell mask + grid lines */}
          <CellMaskOverlay
            columns={grid.columns}
            rows={grid.rows}
            finalProgress={finalProgress}
            gridLinesOpacity={gridLinesOpacity}
          />

          {/* Closure flash */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "#fff6dd",
              opacity: flash,
              mixBlendMode: "screen",
              pointerEvents: "none",
            }}
          />
        </div>

        {/* Hand-as-scale-anchor */}
        <div
          style={{
            position: "absolute",
            left: handCenterX - 220,
            top: handCenterY - 220 + handLift,
            width: 440,
            height: 440,
            opacity: handOpacity,
            pointerEvents: "none",
          }}
        >
          <Img
            src={staticFile("hand-final.png")}
            style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};

const CellMaskOverlay: React.FC<{
  columns: number;
  rows: number;
  finalProgress: number;
  gridLinesOpacity: number;
}> = ({ columns, rows, finalProgress, gridLinesOpacity }) => {
  const totalFinal = FINAL_CLUSTER.length;
  const filledCount = Math.floor(finalProgress * totalFinal);
  const finalIndices = new Map(FINAL_CLUSTER.map((c, idx) => [`${c.col},${c.row}`, idx]));

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "grid",
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gridTemplateRows: `repeat(${rows}, 1fr)`,
        pointerEvents: "none",
      }}
    >
      {Array.from({ length: columns * rows }, (_, idx) => {
        const col = idx % columns;
        const row = Math.floor(idx / columns);
        const finalOrder = finalIndices.get(`${col},${row}`);
        const isFinalCell = finalOrder !== undefined;
        const isCovered = isFinalCell && finalOrder >= filledCount;
        return (
          <div
            key={idx}
            style={{
              background: isCovered ? "#fffaef" : "transparent",
              boxShadow: `inset 0 0 0 1px rgba(80,60,30,${gridLinesOpacity * 0.18})`,
              outline: isFinalCell && isCovered ? "2px solid rgba(212,168,75,0.9)" : "none",
              outlineOffset: -2,
              transition: "none",
            }}
          />
        );
      })}
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
        {gridSize} printed nonogram · {cellCount.toLocaleString("en-US")} cells
      </div>
    </div>
    <div
      style={{
        padding: "10px 18px",
        borderRadius: 999,
        background: "#2b2116",
        color: "#fff3d6",
        fontSize: 20,
        fontWeight: 950,
        whiteSpace: "nowrap",
      }}
    >
      95% solved
    </div>
  </div>
);

const SegmentOverlay: React.FC<{
  segment: { kind: string; resolved_text: string };
}> = ({ segment }) => {
  if (segment.kind === "hook") {
    return (
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-start", paddingTop: 60 }}>
        <HeadlinePill text="Only the last cells remain" />
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
  if (segment.kind === "solve_motion") return "finishing the final gap";
  if (segment.kind === "reveal") return "completion triggers the reveal";
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
      Find {listingName} on Etsy
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

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}
