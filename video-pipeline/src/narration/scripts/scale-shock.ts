/**
 * Scale Shock template scripts — one per language.
 *
 * Note: text_template fields cannot contain hardcoded numbers. The
 * assertNoHardcodedNumbers() function rejects scripts that violate this rule.
 * Every number must come through {{listing.cell_count_formatted}} or similar.
 */

import type { NarrationScript } from "../schema.js";

export const scaleShockEn: NarrationScript = {
  template_id: "scale-shock",
  language_code: "en",
  segments: [
    {
      kind: "hook",
      start_s: 0,
      end_s: 2,
      text_template:
        "This printable nonogram has {{listing.cell_count_formatted}} cells.",
      emphasis: { rate: "normal", post_pause_ms: 200 },
    },
    {
      kind: "scale_pan",
      start_s: 2,
      end_s: 8,
      text_template:
        "{{listing.grid_size}}. Every cell solved by hand.",
    },
    {
      kind: "reveal_motion",
      start_s: 8,
      end_s: 13,
      text_template:
        "No guessing. Pure logic.",
    },
    {
      kind: "cta",
      start_s: 13,
      end_s: 15,
      text_template:
        "Find {{listing.name}} on Etsy at Grand Grid Studio.",
    },
  ],
};

export const scaleShockEs: NarrationScript = {
  template_id: "scale-shock",
  language_code: "es",
  segments: [
    {
      kind: "hook",
      start_s: 0,
      end_s: 2,
      text_template:
        "Este nonograma imprimible tiene {{listing.cell_count_formatted}} casillas.",
      emphasis: { rate: "normal", post_pause_ms: 200 },
    },
    {
      kind: "scale_pan",
      start_s: 2,
      end_s: 8,
      text_template:
        "{{listing.grid_size}}. Cada casilla resuelta a mano.",
    },
    {
      kind: "reveal_motion",
      start_s: 8,
      end_s: 13,
      text_template:
        "Sin adivinar. Pura logica.",
    },
    {
      kind: "cta",
      start_s: 13,
      end_s: 15,
      text_template:
        "Busca {{listing.name}} en Etsy: Grand Grid Studio.",
    },
  ],
};

export const scaleShockJa: NarrationScript = {
  template_id: "scale-shock",
  language_code: "ja",
  segments: [
    {
      kind: "hook",
      start_s: 0,
      end_s: 2,
      text_template:
        "この印刷用ノノグラムは{{listing.cell_count_formatted}}マス。",
      emphasis: { rate: "slow", post_pause_ms: 300 },
    },
    {
      kind: "scale_pan",
      start_s: 2,
      end_s: 8,
      text_template:
        "{{listing.grid_size}}。一マスずつ手で解く。",
    },
    {
      kind: "reveal_motion",
      start_s: 8,
      end_s: 13,
      text_template:
        "推測なし。純粋なロジック。",
    },
    {
      kind: "cta",
      start_s: 13,
      end_s: 15,
      text_template:
        "EtsyでGrand Grid Studioを検索。{{listing.name}}。",
    },
  ],
};

export const scaleShockPtBr: NarrationScript = {
  template_id: "scale-shock",
  language_code: "pt-BR",
  segments: [
    {
      kind: "hook",
      start_s: 0,
      end_s: 2,
      text_template:
        "Este nonograma imprimivel tem {{listing.cell_count_formatted}} celulas.",
      emphasis: { rate: "normal", post_pause_ms: 200 },
    },
    {
      kind: "scale_pan",
      start_s: 2,
      end_s: 8,
      text_template:
        "{{listing.grid_size}}. Cada celula resolvida a mao.",
    },
    {
      kind: "reveal_motion",
      start_s: 8,
      end_s: 13,
      text_template:
        "Sem chutes. Logica pura.",
    },
    {
      kind: "cta",
      start_s: 13,
      end_s: 15,
      text_template:
        "Encontre {{listing.name}} no Etsy: Grand Grid Studio.",
    },
  ],
};

export const scaleShockScripts = {
  en: scaleShockEn,
  es: scaleShockEs,
  ja: scaleShockJa,
  "pt-BR": scaleShockPtBr,
} as const;
