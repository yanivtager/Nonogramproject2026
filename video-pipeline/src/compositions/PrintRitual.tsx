/**
 * Print Ritual composition (v3 rebuild).
 *
 * Top-down view of a wooden desk with warm overhead lamp glow. The real
 * solved-artwork PNG sits centered on the desk as a printed page (1000×1200
 * container). A cream-cell overlay starts covering the whole artwork and
 * progressively "fills" (uncovers) row-by-row across 5 time-jump beats. A
 * different photoreal hand asset (hand-tl / hand-side / hand-br / hand-final)
 * appears at each beat, positioned where the current row is filling. The
 * time-jumps simulate hours of solving compressed into a 15s ad — the
 * puzzle's massiveness becomes legible through that compression.
 *
 * Foundation: real artwork as centerpiece (ScaleShock pattern). No fake
 * book frame, no procedural clue grid, no geometric pencil-glyph.
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

type BeatId = "intro" | "b1" | "b2" | "b3" | "b4" | "complete";

interface Beat {
  id: BeatId;
  startS: number;
  endS: number;
  fillRatio: number;
  hand: null | { src: string; xRatio: number; yRatio: number; flip: boolean };
}

const BEATS: Beat[] = [
  { id: "intro",    startS: 0.0,  endS: 2.0,  fillRatio: 0.00, hand: null },
  { id: "b1",       startS: 2.0,  endS: 4.5,  fillRatio: 0.10, hand: { src: "hand-tl.png",    xRatio: 0.28, yRatio: 0.18, flip: false } },
  { id: "b2",       startS: 4.5,  endS: 7.0,  fillRatio: 0.40, hand: { src: "hand-side.png",  xRatio: 0.32, yRatio: 0.48, flip: false } },
  { id: "b3",       startS: 7.0,  endS: 9.5,  fillRatio: 0.70, hand: { src: "hand-br.png",    xRatio: 0.72, yRatio: 0.78, flip: false } },
  { id: "b4",       startS: 9.5,  endS: 12.0, fillRatio: 0.95, hand: { src: "hand-final.png", xRatio: 0.62, yRatio: 0.85, flip: false } },
  { id: "complete", startS: 12.0, endS: 13.0, fillRatio: 1.00, hand: null },
];

export const PrintRitualComposition: React.FC<CompositionProps> = ({
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
      <DeskBackdrop />
      <RitualStage
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

/** Top-down view of a warm wooden desk with overhead lamp glow. CSS-generated. */
const DeskBackdrop: React.FC = () => (
  <AbsoluteFill
    style={{
      background:
        "radial-gradient(ellipse 700px 900px at 50% 32%, rgba(255,220,150,0.34) 0%, rgba(255,200,120,0.18) 30%, transparent 65%)," +
        "linear-gradient(180deg, #4b2e15 0%, #3a230f 50%, #2a1808 100%)",
    }}
  >
    {/* Wood grain — vertical fine lines + wider tonal bands */}
    <div
      style={{
        position: "absolute",
        inset: 0,
        backgroundImage:
          "repeating-linear-gradient(92deg, rgba(60,30,10,0.22) 0 1px, transparent 1px 11px)," +
          "repeating-linear-gradient(92deg, rgba(120,70,30,0.06) 0 4px, transparent 4px 24px)",
        opacity: 0.65,
      }}
    />
    {/* Subtle vignette */}
    <div
      style={{
        position: "absolute",
        inset: 0,
        background:
          "radial-gradient(ellipse 60% 60% at 50% 50%, transparent 40%, rgba(0,0,0,0.34) 100%)",
      }}
    />
  </AbsoluteFill>
);

const RitualStage: React.FC<{
  gridSize: string;
  listingName: string;
  cellCount: number;
  artworkUrl: string | null;
}> = ({ gridSize, listingName, cellCount, artworkUrl }) => {
  const frame = useCurrentFrame();
  const grid = parseGridSize(gridSize);
  const tNow = frame / FPS;
  const beat = currentBeat(tNow);
  const beatT = tNow - beat.startS;
  const beatDuration = beat.endS - beat.startS;

  /** Brief cream flash at the start of each beat to soften the cuts. */
  const flashIntensity = beatT < 0.12 && beat.id !== "intro" ? 1 - beatT / 0.12 : 0;
  /** Subtle hand drift within a beat to feel alive. */
  const driftX = beat.hand ? Math.sin(beatT * 1.4) * 3 : 0;
  const driftY = beat.hand ? Math.cos(beatT * 1.2) * 2 : 0;
  /** Page entrance. */
  const pageEnter = interpolate(frame, [0, 0.6 * FPS], [40, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div
        style={{
          position: "relative",
          width: PAGE_WIDTH,
          height: PAGE_HEIGHT,
          transform: `translateY(${pageEnter}px) rotate(-0.6deg)`,
          background: "#fffaef",
          borderRadius: 14,
          boxShadow: "0 36px 90px rgba(0,0,0,0.58)",
          overflow: "visible",
        }}
      >
        {/* Inner clipped page area */}
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

          {/* Real artwork + cell mask */}
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

            <CellMaskOverlay
              columns={grid.columns}
              rows={grid.rows}
              fillRatio={beat.fillRatio}
            />

            {/* Beat-cut cream flash */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "#fff6dd",
                opacity: flashIntensity * 0.65,
                mixBlendMode: "screen",
                pointerEvents: "none",
              }}
            />
          </div>
        </div>

        {/* Hand asset for this beat */}
        {beat.hand ? (
          <BeatHand
            src={beat.hand.src}
            xRatio={beat.hand.xRatio}
            yRatio={beat.hand.yRatio}
            flip={beat.hand.flip}
            driftX={driftX}
            driftY={driftY}
          />
        ) : null}
      </div>
    </AbsoluteFill>
  );
};

const CellMaskOverlay: React.FC<{
  columns: number;
  rows: number;
  fillRatio: number;
}> = ({ columns, rows, fillRatio }) => {
  const total = columns * rows;
  const filledCount = Math.round(total * fillRatio);
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
      {Array.from({ length: total }, (_, idx) => {
        const covered = idx >= filledCount;
        return (
          <div
            key={idx}
            style={{
              background: covered ? "#fffaef" : "transparent",
              boxShadow: "inset 0 0 0 1px rgba(80,60,30,0.18)",
            }}
          />
        );
      })}
    </div>
  );
};

const BeatHand: React.FC<{
  src: string;
  xRatio: number;
  yRatio: number;
  flip: boolean;
  driftX: number;
  driftY: number;
}> = ({ src, xRatio, yRatio, flip, driftX, driftY }) => {
  const centerX = GRID_SIDE + xRatio * (PAGE_WIDTH - GRID_SIDE * 2);
  const centerY = GRID_TOP + yRatio * (PAGE_HEIGHT - GRID_TOP - GRID_BOTTOM);
  const size = 520;
  return (
    <div
      style={{
        position: "absolute",
        left: centerX - size / 2 + driftX,
        top: centerY - size / 2 + driftY,
        width: size,
        height: size,
        transform: flip ? "scaleX(-1)" : "none",
        pointerEvents: "none",
        filter: "drop-shadow(0 12px 22px rgba(0,0,0,0.45))",
      }}
    >
      <Img
        src={staticFile(src)}
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
        Printable nonogram · {gridSize} · {cellCount.toLocaleString("en-US")} cells
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
        <HeadlinePill text="Paper. Pencil. Quiet focus." />
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
  if (segment.kind === "ritual") return "hours, by hand";
  if (segment.kind === "payoff") return "finished page payoff";
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
      color: "#fff8e8",
      opacity: 0.78,
      textShadow: "0 2px 8px rgba(0,0,0,0.6)",
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
      Download {listingName} on Etsy
    </div>
  </AbsoluteFill>
);

function currentBeat(tSeconds: number): Beat {
  for (const beat of BEATS) {
    if (tSeconds >= beat.startS && tSeconds < beat.endS) return beat;
  }
  return BEATS[BEATS.length - 1]!;
}

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
