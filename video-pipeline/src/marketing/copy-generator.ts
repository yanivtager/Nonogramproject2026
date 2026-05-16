import Anthropic from "@anthropic-ai/sdk";
import type { LanguageCode, TemplateId } from "../data/types.js";

const client = new Anthropic();

const SYSTEM_PROMPT = `You write social media copy for an Etsy printable nonogram puzzle shop named GrandGridStudio.
Always output valid JSON matching the schema exactly — no markdown fences, no commentary, just the JSON object.

Platform conventions:
- instagram-reels: caption ≤ 2200 chars, front-load hook in first 125 chars, 8-15 hashtags blended in body or as trailing block.
- tiktok: caption ≤ 150 chars visible, hashtags inline, 3-5 hashtags max.
- youtube-shorts: title ≤ 100 chars, description ≤ 500 chars, hashtags in description.

Language rules:
- Write entirely in the target language natively.
- ja: use real Japanese hashtags (e.g. #ノノグラム, #パズル好き) not transliterated English.
- es: Spanish hashtag conventions.
- pt-BR: Brazilian Portuguese specifically.

Content rules:
- Never invent numeric facts. Use only the numbers provided in the input (cell_count, grid_size, puzzle_count).
- Always include the etsy_url as the CTA line.
- Tone: confident, slightly mysterious, screen-free lifestyle positioning.

Output schema (JSON only):
{
  "title": "string (platform title or hook line)",
  "caption": "string (full caption body)",
  "hashtags": ["string"],
  "etsy_cta_line": "string (the Etsy URL line)"
}`;

export interface CopyInput {
  listing: {
    name: string;
    grid_size: string;
    cell_count: number;
    puzzle_count: number;
    theme: string;
    etsy_url: string;
  };
  template: TemplateId;
  language: LanguageCode;
  platform: "instagram-reels" | "tiktok" | "youtube-shorts";
  narrationResolvedText: string;
}

export interface CopyOutput {
  title: string;
  caption: string;
  hashtags: string[];
  etsy_cta_line: string;
}

export async function generateCopy(input: CopyInput): Promise<CopyOutput> {
  const attempt = async (): Promise<CopyOutput> => {
    const res = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 800,
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: JSON.stringify(input) }],
    });

    const text = res.content.find((b) => b.type === "text")?.text ?? "";
    const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
    return JSON.parse(cleaned) as CopyOutput;
  };

  try {
    return await attempt();
  } catch {
    // Retry once on bad JSON
    return await attempt();
  }
}
