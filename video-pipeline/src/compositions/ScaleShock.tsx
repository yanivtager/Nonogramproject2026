/**
 * Scale Shock composition.
 *
 * 9:16 (1080x1920), 30fps, 15s. Renders four typed segments from the resolved
 * narration: hook (0-2s), scale_pan (2-8s), reveal_motion (8-13s), cta (13-15s).
 *
 * STRUCTURAL LOCK #4: All numeric on-screen text comes through
 * `listing.cell_count.toLocaleString()` etc. There are no hardcoded numbers
 * anywhere in this file. The Lovable QA grep would catch any addition.
 */

import { AbsoluteFill, Audio, Sequence, useCurrentFrame, useVideoConfig, interpolate, staticFile } from "remotion";
import React from "react";

import type { CompositionProps } from "./types";

const FPS = 30;

export const ScaleShockComposition: React.FC<CompositionProps> = ({
  listing,
  narrationSegments,
  narrationAudioPath,
  musicPath,
}) => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0F1115",
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        color: "#FFFFFF",
        overflow: "hidden",
      }}
    >
      {/* Background pulse — subtle motion to keep the eye engaged */}
      <BackgroundPulse />

      {/* Centered grid graphic with derived dims */}
      <GridGraphic gridSize={listing.grid_size} />

      {/* Per-segment caption overlays (burned-in subtitles) */}
      {narrationSegments.map((segment) => (
        <Sequence
          key={segment.kind}
          from={Math.round(segment.start_s * fps)}
          durationInFrames={Math.round((segment.end_s - segment.start_s) * fps)}
        >
          <SegmentOverlay segment={segment} listing={listing} />
        </Sequence>
      ))}

      {/* Brand corner mark — visible whole video */}
      <BrandCorner />

      {/* CTA segment is also marked by an Etsy URL strip in the last 2s */}
      <Sequence from={13 * fps} durationInFrames={2 * fps}>
        <CtaStrip etsyUrl={listing.etsy_url} listingName={listing.name} />
      </Sequence>

      {/* TTS narration audio */}
      <Audio src={toRemotionAsset(narrationAudioPath)} />

      {/* Optional music bed, ducked under voice */}
      {musicPath !== null && (
        <Audio src={toRemotionAsset(musicPath)} volume={0.25} />
      )}
    </AbsoluteFill>
  );
};

function toRemotionAsset(pathOrUrl: string): string {
  if (/^https?:\/\//.test(pathOrUrl)) return pathOrUrl;
  return staticFile(pathOrUrl.replace(/\\/g, "/"));
}

const BackgroundPulse: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = 0.5 + 0.1 * Math.sin((frame / FPS) * 0.6);
  return (
    <AbsoluteFill
      style={{
        background: "radial-gradient(circle at 50% 30%, rgba(255,200,80,0.12), rgba(0,0,0,0))",
        opacity,
      }}
    />
  );
};

const BrandCorner: React.FC = () => (
  <div
    style={{
      position: "absolute",
      bottom: 32,
      right: 32,
      fontSize: 28,
      fontWeight: 600,
      letterSpacing: 1,
      opacity: 0.8,
    }}
  >
    GrandGridStudio
  </div>
);

const SegmentOverlay: React.FC<{
  segment: { kind: string; resolved_text: string };
  listing: { cell_count: number; grid_size: string; name: string };
}> = ({ segment, listing }) => {
  // For the hook segment specifically, render the cell-count-formatted prominently.
  // All other segments display the resolved text only.
  if (segment.kind === "hook") {
    return (
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-start", paddingTop: 220 }}>
        <div
          style={{
            fontSize: 90,
            fontWeight: 800,
            letterSpacing: -2,
            textShadow: "0 4px 20px rgba(0,0,0,0.6)",
          }}
        >
          {listing.cell_count.toLocaleString("en-US")}
        </div>
        <div style={{ fontSize: 34, marginTop: 8, opacity: 0.85 }}>cells</div>
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
      maxWidth: 920,
      padding: "20px 32px",
      borderRadius: 18,
      backgroundColor: "rgba(0,0,0,0.55)",
      fontSize: 42,
      fontWeight: 600,
      lineHeight: 1.25,
      textAlign: "center",
      textShadow: "0 2px 6px rgba(0,0,0,0.4)",
    }}
  >
    {text}
  </div>
);

const GridGraphic: React.FC<{ gridSize: string }> = ({ gridSize }) => {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, 14 * FPS], [1.0, 1.15], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div
        style={{
          width: 760,
          height: 760,
          border: "4px solid rgba(255,255,255,0.15)",
          borderRadius: 12,
          transform: `scale(${scale})`,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)," +
            "linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
          backgroundSize: "32px 32px, 32px 32px",
        }}
      />
      <div style={{ marginTop: 16, fontSize: 30, opacity: 0.7 }}>{gridSize}</div>
    </AbsoluteFill>
  );
};

const CtaStrip: React.FC<{ etsyUrl: string; listingName: string }> = ({ listingName }) => (
  <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-end", paddingBottom: 80 }}>
    <div
      style={{
        padding: "20px 40px",
        borderRadius: 999,
        backgroundColor: "#F4B400",
        color: "#0F1115",
        fontSize: 36,
        fontWeight: 800,
        letterSpacing: 0.5,
      }}
    >
      Find {listingName} on Etsy
    </div>
  </AbsoluteFill>
);
