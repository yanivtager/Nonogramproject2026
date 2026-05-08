/**
 * Curated Edge TTS voice slate.
 *
 * Strategic Blueprint research recommends multiple voices per language ("voice numerosity effect")
 * to break auditory monotony for products with repetitive visuals. We rotate among 3-5 voices
 * per language at variant generation time.
 *
 * These are MS Edge neural voices, free of charge. The ShortName is the API id.
 * Voices listed here are CANDIDATES. After Phase 0 curation page, Yaniv approves
 * a final shortlist (3-5 per language) and `voices.approved = TRUE` is set in the DB.
 */

import type { LanguageCode } from "../data/types.js";
import type { VoiceMeta } from "./types.js";

/**
 * Source of truth for the candidate voice slate. Used by `npm run curate:voices`
 * to generate sample MP3s and a browse page so Yaniv can pick favorites.
 */
export const CANDIDATE_VOICES: VoiceMeta[] = [
  // English (en-US, en-GB)
  { short_name: "en-US-AriaNeural", display_name: "Aria (US, female)", locale: "en-US", language: "en", gender: "female" },
  { short_name: "en-US-GuyNeural", display_name: "Guy (US, male)", locale: "en-US", language: "en", gender: "male" },
  { short_name: "en-US-JennyNeural", display_name: "Jenny (US, female)", locale: "en-US", language: "en", gender: "female" },
  { short_name: "en-US-DavisNeural", display_name: "Davis (US, male)", locale: "en-US", language: "en", gender: "male" },
  { short_name: "en-US-AmberNeural", display_name: "Amber (US, female)", locale: "en-US", language: "en", gender: "female" },
  { short_name: "en-GB-RyanNeural", display_name: "Ryan (UK, male)", locale: "en-GB", language: "en", gender: "male" },
  { short_name: "en-GB-SoniaNeural", display_name: "Sonia (UK, female)", locale: "en-GB", language: "en", gender: "female" },

  // Spanish (es-ES, es-MX)
  { short_name: "es-ES-ElviraNeural", display_name: "Elvira (Spain, female)", locale: "es-ES", language: "es", gender: "female" },
  { short_name: "es-ES-AlvaroNeural", display_name: "Alvaro (Spain, male)", locale: "es-ES", language: "es", gender: "male" },
  { short_name: "es-MX-DaliaNeural", display_name: "Dalia (Mexico, female)", locale: "es-MX", language: "es", gender: "female" },
  { short_name: "es-MX-JorgeNeural", display_name: "Jorge (Mexico, male)", locale: "es-MX", language: "es", gender: "male" },
  { short_name: "es-US-PalomaNeural", display_name: "Paloma (US Spanish, female)", locale: "es-US", language: "es", gender: "female" },

  // Japanese (ja-JP)
  { short_name: "ja-JP-NanamiNeural", display_name: "Nanami (Japan, female)", locale: "ja-JP", language: "ja", gender: "female" },
  { short_name: "ja-JP-KeitaNeural", display_name: "Keita (Japan, male)", locale: "ja-JP", language: "ja", gender: "male" },
  { short_name: "ja-JP-AoiNeural", display_name: "Aoi (Japan, female)", locale: "ja-JP", language: "ja", gender: "female" },
  { short_name: "ja-JP-DaichiNeural", display_name: "Daichi (Japan, male)", locale: "ja-JP", language: "ja", gender: "male" },

  // Portuguese (Brazil) (pt-BR)
  { short_name: "pt-BR-FranciscaNeural", display_name: "Francisca (Brazil, female)", locale: "pt-BR", language: "pt-BR", gender: "female" },
  { short_name: "pt-BR-AntonioNeural", display_name: "Antonio (Brazil, male)", locale: "pt-BR", language: "pt-BR", gender: "male" },
  { short_name: "pt-BR-ThalitaMultilingualNeural", display_name: "Thalita (Brazil, female)", locale: "pt-BR", language: "pt-BR", gender: "female" },
  { short_name: "pt-BR-BrendaNeural", display_name: "Brenda (Brazil, female)", locale: "pt-BR", language: "pt-BR", gender: "female" },
  { short_name: "pt-BR-DonatoNeural", display_name: "Donato (Brazil, male)", locale: "pt-BR", language: "pt-BR", gender: "male" },
];

export function getCandidatesByLanguage(language: LanguageCode): VoiceMeta[] {
  return CANDIDATE_VOICES.filter((v) => v.language === language);
}

/**
 * Sample text used by the curation page for each language. Generic but on-brand;
 * doesn't reference cell counts or grids so we can compare voices fairly.
 */
export const SAMPLE_TEXT_BY_LANGUAGE: Record<LanguageCode, string> = {
  en: "Welcome to Grand Grid Studio. Printable expert nonogram puzzles, made by hand. Find us on Etsy.",
  es: "Bienvenido a Grand Grid Studio. Nonogramas expertos para imprimir, hechos a mano. Encuentranos en Etsy.",
  ja: "Grand Grid Studioへようこそ。手作りの上級ノノグラムパズル。Etsyで検索してください。",
  "pt-BR":
    "Bem-vindo ao Grand Grid Studio. Nonogramas experts para imprimir, feitos a mao. Nos encontre no Etsy.",
};
