/**
 * Solve Reveal template scripts — one per language.
 *
 * Hook: the mystery moment — blank grid, pattern waiting to emerge.
 * Middle: cells clicking into place, logic at work.
 * Reveal: the image appears. The payoff.
 * CTA: find on Etsy.
 */

import type { NarrationScript } from "../schema.js";

export const solveRevealEn: NarrationScript = {
  template_id: "solve-reveal",
  language_code: "en",
  segments: [
    {
      kind: "hook",
      start_s: 0,
      end_s: 2,
      text_template: "Every cell is a clue. Can you see what's hiding?",
      emphasis: { rate: "normal", post_pause_ms: 150 },
    },
    {
      kind: "solve_motion",
      start_s: 2,
      end_s: 8,
      text_template:
        "{{listing.cell_count_formatted}} cells. {{listing.grid_size}}. Pure logic builds the picture.",
    },
    {
      kind: "reveal",
      start_s: 8,
      end_s: 13,
      text_template: "One by one, the image reveals itself.",
    },
    {
      kind: "cta",
      start_s: 13,
      end_s: 15,
      text_template: "Get {{listing.name}} on Etsy at Grand Grid Studio.",
    },
  ],
};

export const solveRevealEs: NarrationScript = {
  template_id: "solve-reveal",
  language_code: "es",
  segments: [
    {
      kind: "hook",
      start_s: 0,
      end_s: 2,
      text_template: "Cada casilla es una pista. ¿Puedes ver lo que se esconde?",
      emphasis: { rate: "normal", post_pause_ms: 150 },
    },
    {
      kind: "solve_motion",
      start_s: 2,
      end_s: 8,
      text_template:
        "{{listing.cell_count_formatted}} casillas. {{listing.grid_size}}. La logica pura construye la imagen.",
    },
    {
      kind: "reveal",
      start_s: 8,
      end_s: 13,
      text_template: "Una a una, la imagen se revela.",
    },
    {
      kind: "cta",
      start_s: 13,
      end_s: 15,
      text_template: "Consigue {{listing.name}} en Etsy: Grand Grid Studio.",
    },
  ],
};

export const solveRevealJa: NarrationScript = {
  template_id: "solve-reveal",
  language_code: "ja",
  segments: [
    {
      kind: "hook",
      start_s: 0,
      end_s: 2,
      // Iyashi: gentle curiosity, not urgency
      text_template: "一マスずつ、隠れた絵が現れてくる。",
      emphasis: { rate: "slow", post_pause_ms: 300 },
    },
    {
      kind: "solve_motion",
      start_s: 2,
      end_s: 8,
      text_template:
        "{{listing.cell_count_formatted}}マス、{{listing.grid_size}}。ロジックだけで解いていく。",
    },
    {
      kind: "reveal",
      start_s: 8,
      end_s: 13,
      text_template: "静かに、確実に、絵が完成する。",
    },
    {
      kind: "cta",
      start_s: 13,
      end_s: 15,
      text_template: "EtsyでGrand Grid Studioの{{listing.name}}を探してね。",
    },
  ],
};

export const solveRevealPtBr: NarrationScript = {
  template_id: "solve-reveal",
  language_code: "pt-BR",
  segments: [
    {
      kind: "hook",
      start_s: 0,
      end_s: 2,
      text_template: "Cada celula e uma dica. Consegue ver o que esta escondido?",
      emphasis: { rate: "normal", post_pause_ms: 150 },
    },
    {
      kind: "solve_motion",
      start_s: 2,
      end_s: 8,
      text_template:
        "{{listing.cell_count_formatted}} celulas. {{listing.grid_size}}. So logica monta a imagem.",
    },
    {
      kind: "reveal",
      start_s: 8,
      end_s: 13,
      text_template: "Uma a uma, a imagem se revela.",
    },
    {
      kind: "cta",
      start_s: 13,
      end_s: 15,
      text_template: "Encontre {{listing.name}} no Etsy: Grand Grid Studio.",
    },
  ],
};

export const solveRevealScripts = {
  en: solveRevealEn,
  es: solveRevealEs,
  ja: solveRevealJa,
  "pt-BR": solveRevealPtBr,
} as const;
