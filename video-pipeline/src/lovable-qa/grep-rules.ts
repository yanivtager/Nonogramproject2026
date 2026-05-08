/**
 * Hard-rule grep checks for Lovable's UI repo.
 *
 * The single most important check in the QA gate. Lovable is forbidden from
 * defining product facts (cell counts, grid sizes, Etsy URLs, listing names,
 * puzzle counts). It only displays what the API returns. These rules catch
 * any violation by scanning Lovable's source files for forbidden patterns.
 *
 * The 7 known listing IDs and their canonical cell counts come from the
 * `listings` table seed (007_video_pipeline_seed.sql). They're hardcoded here
 * intentionally — Claude's checker file is allowed to reference them; Lovable's
 * UI files are not.
 */

export interface GrepRule {
  id: string;
  description: string;
  /** Regex to match the forbidden pattern. Multi-line not needed. */
  pattern: RegExp;
  /** Glob patterns relative to the repo root that should be scanned. */
  scanGlobs: string[];
  /** Files matching these globs are exempted (test fixtures, generated types). */
  exemptGlobs: string[];
}

const SOURCE_GLOBS = ["src/**/*.ts", "src/**/*.tsx", "src/**/*.js", "src/**/*.jsx"];
const FIXTURE_EXEMPTIONS = [
  "**/*.test.ts",
  "**/*.test.tsx",
  "**/*.spec.ts",
  "**/__fixtures__/**",
  "**/__tests__/**",
  "src/types/supabase.ts",
  "shared/types.ts",
];

export const HARD_RULE_GREP_RULES: GrepRule[] = [
  {
    id: "no-thousand-separated-numbers",
    description:
      "No thousand-separated digits (e.g. '15,000', '62,500', '117,500') anywhere in src/ — these are listing facts and must come from API.",
    pattern: /\b\d{1,3}(?:,\d{3})+\b/,
    scanGlobs: SOURCE_GLOBS,
    exemptGlobs: FIXTURE_EXEMPTIONS,
  },
  {
    id: "no-bare-cell-count-integers",
    description:
      "No literal integers matching the 4 known cell counts (15000, 40000, 62500, 117500) in src/ — these are listing facts.",
    pattern: /\b(15000|40000|62500|117500)\b/,
    scanGlobs: SOURCE_GLOBS,
    exemptGlobs: FIXTURE_EXEMPTIONS,
  },
  {
    id: "no-etsy-listing-urls",
    description:
      "No hardcoded Etsy listing URLs in src/. They live in the listings table; UI must consume listing.etsy_url.",
    pattern: /etsy\.com\/listing\/\d+/,
    scanGlobs: SOURCE_GLOBS,
    exemptGlobs: FIXTURE_EXEMPTIONS,
  },
  {
    id: "no-known-listing-ids",
    description:
      "No hardcoded listing IDs (the 7 GrandGridStudio Etsy listing IDs) in src/.",
    pattern: /\b(4454210115|4453773767|4454075252|4454100576|4455139351|4455144471|4455156318)\b/,
    scanGlobs: SOURCE_GLOBS,
    exemptGlobs: FIXTURE_EXEMPTIONS,
  },
  {
    id: "no-redefined-shared-types",
    description:
      "No file in src/ should declare interface/type for Listing|Variant|Template|Voice|Track|Render|Decision — those come from shared/types.ts.",
    pattern: /^(export\s+)?(interface|type)\s+(Listing|Variant|Template|Voice|Track|Render|Decision)\b/m,
    scanGlobs: SOURCE_GLOBS,
    exemptGlobs: FIXTURE_EXEMPTIONS,
  },
  {
    id: "no-product-name-strings",
    description:
      "No hardcoded product names ('Dragon\\'s Wrath', 'Cafe Serenade', 'Frozen Gaze', 'Ultimate Bundle', 'Titanic Series', 'Colossus Series', 'Behemoth Series') in src/. Display via {listing.name} from the API.",
    // Match anywhere — quoted, JSX text, comments alike. Lovable shouldn't reference these names at all.
    pattern: /(Dragon'?s Wrath|Cafe Serenade|Frozen Gaze|Ultimate Bundle|Titanic Series|Colossus Series|Behemoth Series)/,
    scanGlobs: SOURCE_GLOBS,
    exemptGlobs: FIXTURE_EXEMPTIONS,
  },
];

export interface GrepViolation {
  ruleId: string;
  description: string;
  file: string;
  line: number;
  text: string;
}
