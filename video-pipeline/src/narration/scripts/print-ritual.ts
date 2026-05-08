/**
 * Print Ritual template scripts — one per language.
 *
 * Hook: the physical moment — paper, pencil, quiet focus.
 * Middle: the ritual of printing and solving by hand.
 * Reveal: the satisfaction of pen on solved grid.
 * CTA: find on Etsy.
 *
 * Research note: "print ritual" resonates strongly with meditative/mindfulness
 * audiences. Tone should be calm and tactile, not energetic.
 */

import type { NarrationScript } from "../schema.js";

export const printRitualEn: NarrationScript = {
  template_id: "print-ritual",
  language_code: "en",
  segments: [
    {
      kind: "hook",
      start_s: 0,
      end_s: 2,
      text_template: "Print it. Grab a pencil. That's all you need.",
      emphasis: { rate: "normal", post_pause_ms: 150 },
    },
    {
      kind: "ritual",
      start_s: 2,
      end_s: 8,
      text_template:
        "{{listing.cell_count_formatted}} cells. {{listing.grid_size}}. No screen, no app — just you and the puzzle.",
    },
    {
      kind: "payoff",
      start_s: 8,
      end_s: 13,
      text_template: "This is focus. This is calm. This is {{listing.name}}.",
    },
    {
      kind: "cta",
      start_s: 13,
      end_s: 15,
      text_template: "Download it today on Etsy at Grand Grid Studio.",
    },
  ],
};

export const printRitualEs: NarrationScript = {
  template_id: "print-ritual",
  language_code: "es",
  segments: [
    {
      kind: "hook",
      start_s: 0,
      end_s: 2,
      text_template: "Imprimelo. Toma un lapiz. Es todo lo que necesitas.",
      emphasis: { rate: "normal", post_pause_ms: 150 },
    },
    {
      kind: "ritual",
      start_s: 2,
      end_s: 8,
      text_template:
        "{{listing.cell_count_formatted}} casillas. {{listing.grid_size}}. Sin pantallas, sin app — solo tu y el puzzle.",
    },
    {
      kind: "payoff",
      start_s: 8,
      end_s: 13,
      text_template: "Esto es concentracion. Esto es calma. Esto es {{listing.name}}.",
    },
    {
      kind: "cta",
      start_s: 13,
      end_s: 15,
      text_template: "Descargalo hoy en Etsy: Grand Grid Studio.",
    },
  ],
};

export const printRitualJa: NarrationScript = {
  template_id: "print-ritual",
  language_code: "ja",
  segments: [
    {
      kind: "hook",
      start_s: 0,
      end_s: 2,
      // Iyashi: healing through quiet ritual — very intentional slow pace
      text_template: "印刷して、鉛筆を持つ。それだけでいい。",
      emphasis: { rate: "slow", post_pause_ms: 400 },
    },
    {
      kind: "ritual",
      start_s: 2,
      end_s: 8,
      text_template:
        "{{listing.cell_count_formatted}}マス、{{listing.grid_size}}。画面もアプリも要らない。あなたとパズルだけ。",
    },
    {
      kind: "payoff",
      start_s: 8,
      end_s: 13,
      text_template: "これが集中。これが癒し。これが{{listing.name}}。",
    },
    {
      kind: "cta",
      start_s: 13,
      end_s: 15,
      text_template: "今日EtsyでGrand Grid Studioからダウンロードしてね。",
    },
  ],
};

export const printRitualPtBr: NarrationScript = {
  template_id: "print-ritual",
  language_code: "pt-BR",
  segments: [
    {
      kind: "hook",
      start_s: 0,
      end_s: 2,
      text_template: "Imprima. Pegue um lapis. So isso.",
      emphasis: { rate: "normal", post_pause_ms: 150 },
    },
    {
      kind: "ritual",
      start_s: 2,
      end_s: 8,
      text_template:
        "{{listing.cell_count_formatted}} celulas. {{listing.grid_size}}. Sem tela, sem app — so voce e o puzzle.",
    },
    {
      kind: "payoff",
      start_s: 8,
      end_s: 13,
      text_template: "Isso e foco. Isso e calma. Esse e o {{listing.name}}.",
    },
    {
      kind: "cta",
      start_s: 13,
      end_s: 15,
      text_template: "Baixe hoje no Etsy: Grand Grid Studio.",
    },
  ],
};

export const printRitualScripts = {
  en: printRitualEn,
  es: printRitualEs,
  ja: printRitualJa,
  "pt-BR": printRitualPtBr,
} as const;
