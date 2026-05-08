/**
 * Remotion entry: registers the available compositions.
 * Run via: `npm run remotion:studio` or `npx remotion render`.
 */

import { Composition } from "remotion";
import { z } from "zod";
import React from "react";

import { CompositionPropsSchema } from "./types";
import { ScaleShockComposition } from "./ScaleShock";
import { SolveRevealComposition } from "./SolveReveal";
import { BeforeAfterComposition } from "./BeforeAfter";
import { PrintRitualComposition } from "./PrintRitual";
import { dragonsWrath } from "../../__fixtures__/listings";

const DEFAULT_PROPS = {
  listing: dragonsWrath,
  narrationSegments: [
    { kind: "hook", start_s: 0, end_s: 2, resolved_text: "This printable nonogram has 15,000 cells." },
    { kind: "scale_pan", start_s: 2, end_s: 8, resolved_text: "100x150. Every cell solved by hand." },
    { kind: "reveal_motion", start_s: 8, end_s: 13, resolved_text: "No guessing. Pure logic." },
    { kind: "cta", start_s: 13, end_s: 15, resolved_text: "Find Dragon's Wrath on Etsy at Grand Grid Studio." },
  ],
  narrationAudioPath: "",
  captionsVttPath: "",
  musicPath: null,
  musicDuckingDb: -8,
  voice: {
    id: "00000000-0000-0000-0000-000000000000",
    vendor_voice_id: "en-US-AriaNeural",
    language: "en" as const,
    vendor: "edge-tts" as const,
    display_name: "Aria",
    gender: "female" as const,
    sample_url: null,
    approved: true,
  },
  track: null,
} as const;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="ScaleShock"
        component={ScaleShockComposition as any}
        durationInFrames={15 * 30}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={DEFAULT_PROPS}
        schema={CompositionPropsSchema as unknown as z.ZodTypeAny}
      />
      <Composition
        id="SolveReveal"
        component={SolveRevealComposition as any}
        durationInFrames={15 * 30}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={DEFAULT_PROPS}
        schema={CompositionPropsSchema as unknown as z.ZodTypeAny}
      />
      <Composition
        id="BeforeAfter"
        component={BeforeAfterComposition as any}
        durationInFrames={15 * 30}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={DEFAULT_PROPS}
        schema={CompositionPropsSchema as unknown as z.ZodTypeAny}
      />
      <Composition
        id="PrintRitual"
        component={PrintRitualComposition as any}
        durationInFrames={15 * 30}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={DEFAULT_PROPS}
        schema={CompositionPropsSchema as unknown as z.ZodTypeAny}
      />
    </>
  );
};
