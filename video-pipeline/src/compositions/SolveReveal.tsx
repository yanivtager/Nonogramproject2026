/**
 * Solve Reveal composition.
 *
 * 9:16 (1080x1920), 30fps, 15s. Four segments:
 *   hook (0-2s), solve_motion (2-8s), reveal (8-13s), cta (13-15s).
 *
 * STRUCTURAL LOCK #4: All numeric on-screen text comes through
 * `listing.cell_count.toLocaleString()` etc. No hardcoded numbers.
 */

import { AbsoluteFill, Audio, Sequence, useCurrentFrame, useVideoConfig, interpolate, staticFile } from "remotion";
import React from "react";

import type { CompositionProps } from "./types";

const FPS = 30;

export const SolveRevealComposition: React.FC<CompositionProps> = ({
  listing,
  narrationSegments,
  narrationAudioPath,
  musicPath,
  musicDuckingDb,
}) => {
  const { fps } = useVideoConfig();
  const musicLinearVol = Math.pow(10, (musicDuckingDb ?? -10) / 20);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0A0D1A",
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        color: "#FFFFFF",
        overflow: "hidden",
      }}
    >
      <ScanningGrid frame={0} />

      <CellRevealGraphic gridSize={listing.grid_size} />

      {narrationSegments.map((segment) => (
        <Sequence
          key={segment.kind}
          from={Math.round(segment.start_s * fps)}
          durationInFrames={Math.round((segment.end_s - segment.start_s) * fps)}
        >
          <SolveSegmentOverlay segment={segment} listing={listing} />
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

const ScanningGrid: React.FC<{ frame: number }> = () => {
  const frame = useCurrentFrame();
  const scanY = interpolate(frame, [0, 10 * FPS], [0, 100], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill
      style={{
        background:
          "linear-gradient(180deg, rgba(40,80,180,0.08) 0%, rgba(10,13,26,0) 100%)",
        backgroundSize: "100% 100%",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: `${scanY}%`,
          left: 0,
          right: 0,
          height: 2,
          background: "linear-gradient(90deg, transparent, rgba(80,140,255,0.6), transparent)",
          filter: "blur(1px)",
        }}
      />
    </AbsoluteFill>
  );
};

const CellRevealGraphic: React.FC<{ gridSize: string }> = ({ gridSize }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, FPS * 1], [0.3, 0.6], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div
        style={{
          width: 720,
          height: 720,
          border: "3px solid rgba(80,140,255,0.25)",
          borderRadius: 16,
          opacity,
          backgroundImage:
            "linear-gradient(rgba(80,140,255,0.08) 1px, transparent 1px)," +
            "linear-gradient(90deg, rgba(80,140,255,0.08) 1px, transparent 1px)",
          backgroundSize: "30px 30px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at 50% 50%, rgba(80,140,255,0.12), transparent 70%)",
          }}
        />
      </div>
      <div style={{ marginTop: 16, fontSize: 28, opacity: 0.55, letterSpacing: 2 }}>{gridSize}</div>
    </AbsoluteFill>
  );
};

const SolveSegmentOverlay: React.FC<{
  segment: { kind: string; resolved_text: string };
  listing: { cell_count: number; grid_size: string; name: string };
}> = ({ segment, listing }) => {
  if (segment.kind === "hook") {
    return (
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-start", paddingTop: 200 }}>
        <div
          style={{
            fontSize: 52,
            fontWeight: 700,
            letterSpacing: -1,
            textAlign: "center",
            maxWidth: 900,
            padding: "0 40px",
            textShadow: "0 2px 12px rgba(80,140,255,0.4)",
          }}
        >
          {segment.resolved_text}
        </div>
      </AbsoluteFill>
    );
  }
  if (segment.kind === "solve_motion") {
    return (
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-start", paddingTop: 240 }}>
        <div
          style={{
            fontSize: 72,
            fontWeight: 800,
            letterSpacing: -2,
            color: "#5C8FFF",
            textShadow: "0 4px 20px rgba(80,140,255,0.5)",
          }}
        >
          {listing.cell_count.toLocaleString("en-US")}
        </div>
        <div style={{ fontSize: 30, opacity: 0.7, marginTop: 6 }}>cells</div>
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
      backgroundColor: "rgba(10,13,26,0.7)",
      border: "1px solid rgba(80,140,255,0.2)",
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
      opacity: 0.7,
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
        backgroundColor: "#5C8FFF",
        color: "#FFFFFF",
        fontSize: 34,
        fontWeight: 800,
        letterSpacing: 0.5,
      }}
    >
      Find {listingName} on Etsy
    </div>
  </AbsoluteFill>
);
