/**
 * Print Ritual composition.
 *
 * 9:16 (1080x1920), 30fps, 15s. Four segments:
 *   hook (0-2s), ritual (2-8s), payoff (8-13s), cta (13-15s).
 *
 * Theme: calm, meditative, physical. Paper + pencil = focus.
 * Warm sepia tones; very gentle animation pacing (iyashi-aligned).
 *
 * STRUCTURAL LOCK #4: All numeric on-screen text comes through
 * `listing.cell_count.toLocaleString()` etc. No hardcoded numbers.
 */

import { AbsoluteFill, Audio, Sequence, useCurrentFrame, useVideoConfig, interpolate, staticFile } from "remotion";
import React from "react";

import type { CompositionProps } from "./types";

const FPS = 30;

export const PrintRitualComposition: React.FC<CompositionProps> = ({
  listing,
  narrationSegments,
  narrationAudioPath,
  musicPath,
  musicDuckingDb,
}) => {
  const { fps } = useVideoConfig();
  const musicLinearVol = Math.pow(10, (musicDuckingDb ?? -10) / 20);
  const frame = useCurrentFrame();

  const breathe = 0.92 + 0.04 * Math.sin((frame / FPS) * 0.35);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#1A1710",
        fontFamily: "Georgia, 'Times New Roman', serif",
        color: "#F5EDD6",
        overflow: "hidden",
      }}
    >
      {/* Paper texture overlay — subtle grain */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at 50% 30%, rgba(244,180,0,0.05), transparent 60%)," +
            "radial-gradient(ellipse at 50% 80%, rgba(180,140,60,0.04), transparent 50%)",
          opacity: breathe,
        }}
      />

      <PaperGrid gridSize={listing.grid_size} />

      {narrationSegments.map((segment) => (
        <Sequence
          key={segment.kind}
          from={Math.round(segment.start_s * fps)}
          durationInFrames={Math.round((segment.end_s - segment.start_s) * fps)}
        >
          <RitualSegmentOverlay segment={segment} listing={listing} />
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

const PaperGrid: React.FC<{ gridSize: string }> = ({ gridSize }) => {
  const frame = useCurrentFrame();
  const lineOpacity = interpolate(frame, [0, 2 * FPS], [0, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div
        style={{
          width: 700,
          height: 700,
          border: "2px solid rgba(245,237,214,0.2)",
          borderRadius: 8,
          opacity: lineOpacity,
          backgroundImage:
            "linear-gradient(rgba(245,237,214,0.07) 1px, transparent 1px)," +
            "linear-gradient(90deg, rgba(245,237,214,0.07) 1px, transparent 1px)",
          backgroundSize: "35px 35px",
        }}
      />
      <div
        style={{
          marginTop: 18,
          fontSize: 26,
          opacity: 0.5,
          letterSpacing: 4,
          textTransform: "uppercase",
          fontFamily: "system-ui, sans-serif",
          fontWeight: 400,
        }}
      >
        {gridSize}
      </div>
    </AbsoluteFill>
  );
};

const RitualSegmentOverlay: React.FC<{
  segment: { kind: string; resolved_text: string };
  listing: { cell_count: number; grid_size: string; name: string };
}> = ({ segment, listing }) => {
  if (segment.kind === "ritual") {
    return (
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-start", paddingTop: 230 }}>
        <div
          style={{
            fontSize: 66,
            fontWeight: 400,
            letterSpacing: 2,
            opacity: 0.9,
            fontFamily: "Georgia, serif",
          }}
        >
          {listing.cell_count.toLocaleString("en-US")}
        </div>
        <div style={{ fontSize: 28, opacity: 0.5, marginTop: 6, fontFamily: "system-ui, sans-serif" }}>
          cells
        </div>
        <CaptionBar text={segment.resolved_text} />
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-end", paddingBottom: 320 }}>
      <CaptionBar text={segment.resolved_text} />
    </AbsoluteFill>
  );
};

const CaptionBar: React.FC<{ text: string }> = ({ text }) => (
  <div
    style={{
      marginTop: 40,
      maxWidth: 900,
      padding: "18px 32px",
      borderRadius: 12,
      backgroundColor: "rgba(26,23,16,0.75)",
      border: "1px solid rgba(245,237,214,0.15)",
      fontSize: 38,
      fontWeight: 400,
      lineHeight: 1.4,
      textAlign: "center",
      fontFamily: "Georgia, serif",
      letterSpacing: 0.5,
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
      fontSize: 24,
      fontWeight: 400,
      opacity: 0.6,
      letterSpacing: 2,
      fontFamily: "system-ui, sans-serif",
    }}
  >
    GrandGridStudio
  </div>
);

const CtaStrip: React.FC<{ listingName: string }> = ({ listingName }) => (
  <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-end", paddingBottom: 80 }}>
    <div
      style={{
        padding: "20px 44px",
        borderRadius: 999,
        backgroundColor: "#D4A84B",
        color: "#1A1710",
        fontSize: 32,
        fontWeight: 700,
        letterSpacing: 1,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      Download {listingName} on Etsy
    </div>
  </AbsoluteFill>
);
