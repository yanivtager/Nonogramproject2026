/**
 * Before/After composition.
 *
 * 9:16 (1080x1920), 30fps, 15s. Four segments:
 *   hook (0-2s), transformation (2-8s), after_reveal (8-13s), cta (13-15s).
 *
 * Theme: empty → filled. Cold blank grid transforms to warm solved puzzle.
 *
 * STRUCTURAL LOCK #4: All numeric on-screen text comes through
 * `listing.cell_count.toLocaleString()` etc. No hardcoded numbers.
 */

import { AbsoluteFill, Audio, Sequence, useCurrentFrame, useVideoConfig, interpolate, staticFile } from "remotion";
import React from "react";

import type { CompositionProps } from "./types";

const FPS = 30;

export const BeforeAfterComposition: React.FC<CompositionProps> = ({
  listing,
  narrationSegments,
  narrationAudioPath,
  musicPath,
  musicDuckingDb,
}) => {
  const { fps } = useVideoConfig();
  const musicLinearVol = Math.pow(10, (musicDuckingDb ?? -10) / 20);
  const frame = useCurrentFrame();

  // Background morphs from cold (empty) to warm (solved) over 13s
  const warmth = interpolate(frame, [2 * FPS, 11 * FPS], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const bg = `rgb(${Math.round(15 + warmth * 18)}, ${Math.round(13 + warmth * 12)}, ${Math.round(18 + warmth * 4)})`;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: bg,
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        color: "#FFFFFF",
        overflow: "hidden",
      }}
    >
      <TransformGraphic cellCount={listing.cell_count} gridSize={listing.grid_size} />

      {narrationSegments.map((segment) => (
        <Sequence
          key={segment.kind}
          from={Math.round(segment.start_s * fps)}
          durationInFrames={Math.round((segment.end_s - segment.start_s) * fps)}
        >
          <BeforeAfterSegmentOverlay segment={segment} listing={listing} />
        </Sequence>
      ))}

      <BrandCorner />

      <Sequence from={13 * fps} durationInFrames={2 * fps}>
        <CtaStrip listingName={listing.name} />
      </Sequence>

      <Audio src={toRemotionAsset(narrationAudioPath)} />
      {musicPath !== null && (
        <Audio
          src={toRemotionAsset(musicPath)}
          volume={(frame) =>
            Math.min(
              interpolate(frame, [0, 8], [0, musicLinearVol], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
              interpolate(frame, [13 * fps, 15 * fps], [musicLinearVol, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
            )
          }
        />
      )}
    </AbsoluteFill>
  );
};

function toRemotionAsset(pathOrUrl: string): string {
  if (/^https?:\/\//.test(pathOrUrl)) return pathOrUrl;
  return staticFile(pathOrUrl.replace(/\\/g, "/"));
}

function parseGridSize(s: string): { across: number; down: number } {
  const match = s.match(/(\d+)\s*[xX×]\s*(\d+)/);
  if (!match) return { across: 20, down: 20 };
  return {
    across: Math.min(parseInt(match[1]!, 10), 30),
    down: Math.min(parseInt(match[2]!, 10), 30),
  };
}

const TransformGraphic: React.FC<{ cellCount: number; gridSize: string }> = ({ gridSize }) => {
  const frame = useCurrentFrame();
  // Fill fraction 0→1 over frames 2s to 11s
  const fillFraction = interpolate(frame, [2 * FPS, 11 * FPS], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const { across: cellsAcross, down: cellsDown } = parseGridSize(gridSize);
  const totalCells = cellsAcross * cellsDown;
  const filledCount = Math.round(fillFraction * totalCells);

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${cellsAcross}, 1fr)`,
          gridTemplateRows: `repeat(${cellsDown}, 1fr)`,
          width: 680,
          height: 680,
          gap: 2,
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        {Array.from({ length: totalCells }, (_, i) => (
          <div
            key={i}
            style={{
              backgroundColor:
                i < filledCount
                  ? `rgba(244, 180, 0, ${0.6 + Math.random() * 0.4})`
                  : "rgba(255,255,255,0.05)",
              borderRadius: 1,
              transition: "background-color 0.1s",
            }}
          />
        ))}
      </div>
      <div style={{ marginTop: 16, fontSize: 26, opacity: 0.6, letterSpacing: 2 }}>{gridSize}</div>
    </AbsoluteFill>
  );
};

const BeforeAfterSegmentOverlay: React.FC<{
  segment: { kind: string; resolved_text: string };
  listing: { cell_count: number; grid_size: string; name: string };
}> = ({ segment, listing }) => {
  if (segment.kind === "hook") {
    return (
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-start", paddingTop: 200 }}>
        <div
          style={{
            fontSize: 72,
            fontWeight: 800,
            letterSpacing: -2,
            textShadow: "0 2px 12px rgba(0,0,0,0.5)",
          }}
        >
          {listing.cell_count.toLocaleString("en-US")}
        </div>
        <div style={{ fontSize: 30, opacity: 0.65, marginTop: 4 }}>blank cells</div>
        <CaptionBar text={segment.resolved_text} />
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-end", paddingBottom: 300 }}>
      <CaptionBar text={segment.resolved_text} />
    </AbsoluteFill>
  );
};

const CaptionBar: React.FC<{ text: string }> = ({ text }) => (
  <div
    style={{
      marginTop: 36,
      maxWidth: 920,
      padding: "18px 32px",
      borderRadius: 16,
      backgroundColor: "rgba(0,0,0,0.6)",
      fontSize: 40,
      fontWeight: 600,
      lineHeight: 1.3,
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
      bottom: 32,
      right: 32,
      fontSize: 26,
      fontWeight: 600,
      opacity: 0.75,
      letterSpacing: 1,
    }}
  >
    GrandGridStudio
  </div>
);

const CtaStrip: React.FC<{ listingName: string }> = ({ listingName }) => (
  <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-end", paddingBottom: 80 }}>
    <div
      style={{
        padding: "20px 40px",
        borderRadius: 999,
        backgroundColor: "#F4B400",
        color: "#0F1115",
        fontSize: 34,
        fontWeight: 800,
        letterSpacing: 0.5,
      }}
    >
      Get {listingName} on Etsy
    </div>
  </AbsoluteFill>
);
