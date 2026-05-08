/**
 * Before/After template scripts — one per language.
 *
 * Hook: the blank grid. A wall of empty cells.
 * Middle: transformation — this becomes art. All done by hand.
 * Reveal: the printed, solved puzzle. Physical artifact.
 * CTA: find on Etsy.
 */

import type { NarrationScript } from "../schema.js";

export const beforeAfterEn: NarrationScript = {
  template_id: "before-after",
  language_code: "en",
  segments: [
    {
      kind: "hook",
      start_s: 0,
      end_s: 2,
      text_template: "Empty grid. {{listing.cell_count_formatted}} blank cells.",
      emphasis: { rate: "normal", post_pause_ms: 200 },
    },
    {
      kind: "transformation",
      start_s: 2,
      end_s: 8,
      text_template:
        "This becomes art. {{listing.grid_size}}. Every cell solved by logic alone.",
    },
    {
      kind: "after_reveal",
      start_s: 8,
      end_s: 13,
      text_template: "Same grid. Now a masterpiece. That's {{listing.name}}.",
    },
    {
      kind: "cta",
      start_s: 13,
      end_s: 15,
      text_template: "Print it. Solve it. Find it on Etsy at Grand Grid Studio.",
    },
  ],
};

export const beforeAfterEs: NarrationScript = {
  template_id: "before-after",
  language_code: "es",
  segments: [
    {
      kind: "hook",
      start_s: 0,
      end_s: 2,
      text_template: "Cuadricula vacia. {{listing.cell_count_formatted}} casillas en blanco.",
      emphasis: { rate: "normal", post_pause_ms: 200 },
    },
    {
      kind: "transformation",
      start_s: 2,
      end_s: 8,
      text_template:
        "Esto se convierte en arte. {{listing.grid_size}}. Cada casilla resuelta solo con logica.",
    },
    {
      kind: "after_reveal",
      start_s: 8,
      end_s: 13,
      text_template: "La misma cuadricula. Ahora una obra maestra. Eso es {{listing.name}}.",
    },
    {
      kind: "cta",
      start_s: 13,
      end_s: 15,
      text_template: "Imprimelo. Resuelve. Busca en Etsy: Grand Grid Studio.",
    },
  ],
};

export const beforeAfterJa: NarrationScript = {
  template_id: "before-after",
  language_code: "ja",
  segments: [
    {
      kind: "hook",
      start_s: 0,
      end_s: 2,
      // Iyashi: quiet transformation, before and after
      text_template: "空白のグリッド。{{listing.cell_count_formatted}}マスの静寂。",
      emphasis: { rate: "slow", post_pause_ms: 350 },
    },
    {
      kind: "transformation",
      start_s: 2,
      end_s: 8,
      text_template:
        "これがアートになる。{{listing.grid_size}}。ロジックだけで埋めていく。",
    },
    {
      kind: "after_reveal",
      start_s: 8,
      end_s: 13,
      text_template: "同じグリッドが、今は傑作に。これが{{listing.name}}。",
    },
    {
      kind: "cta",
      start_s: 13,
      end_s: 15,
      text_template: "印刷して、解いて。EtsyでGrand Grid Studioを探してね。",
    },
  ],
};

export const beforeAfterPtBr: NarrationScript = {
  template_id: "before-after",
  language_code: "pt-BR",
  segments: [
    {
      kind: "hook",
      start_s: 0,
      end_s: 2,
      text_template: "Grade vazia. {{listing.cell_count_formatted}} celulas em branco.",
      emphasis: { rate: "normal", post_pause_ms: 200 },
    },
    {
      kind: "transformation",
      start_s: 2,
      end_s: 8,
      text_template:
        "Isso vira arte. {{listing.grid_size}}. Cada celula resolvida so com logica.",
    },
    {
      kind: "after_reveal",
      start_s: 8,
      end_s: 13,
      text_template: "Mesma grade. Agora uma obra-prima. Esse e o {{listing.name}}.",
    },
    {
      kind: "cta",
      start_s: 13,
      end_s: 15,
      text_template: "Imprima. Resolva. Encontre no Etsy: Grand Grid Studio.",
    },
  ],
};

export const beforeAfterScripts = {
  en: beforeAfterEn,
  es: beforeAfterEs,
  ja: beforeAfterJa,
  "pt-BR": beforeAfterPtBr,
} as const;
