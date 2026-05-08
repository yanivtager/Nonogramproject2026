import { registerRoot } from "remotion";

import { RemotionRoot } from "./Root";

registerRoot(RemotionRoot);

export { RemotionRoot } from "./Root";
export { ScaleShockComposition } from "./ScaleShock";
export { SolveRevealComposition } from "./SolveReveal";
export { BeforeAfterComposition } from "./BeforeAfter";
export { PrintRitualComposition } from "./PrintRitual";
export type { CompositionProps } from "./types";

/** Maps DB template_id slug → Remotion composition id */
export const TEMPLATE_TO_COMPOSITION_ID: Record<string, string> = {
  "scale-shock": "ScaleShock",
  "solve-reveal": "SolveReveal",
  "before-after": "BeforeAfter",
  "print-ritual": "PrintRitual",
};
