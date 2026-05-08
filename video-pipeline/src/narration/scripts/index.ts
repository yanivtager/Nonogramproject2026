export { scaleShockScripts } from "./scale-shock.js";
export { solveRevealScripts } from "./solve-reveal.js";
export { beforeAfterScripts } from "./before-after.js";
export { printRitualScripts } from "./print-ritual.js";

import { scaleShockScripts } from "./scale-shock.js";
import { solveRevealScripts } from "./solve-reveal.js";
import { beforeAfterScripts } from "./before-after.js";
import { printRitualScripts } from "./print-ritual.js";

export const ALL_SCRIPTS = {
  "scale-shock": scaleShockScripts,
  "solve-reveal": solveRevealScripts,
  "before-after": beforeAfterScripts,
  "print-ritual": printRitualScripts,
} as const;

export type TemplateId = keyof typeof ALL_SCRIPTS;
export type LanguageCode = "en" | "es" | "ja" | "pt-BR";
