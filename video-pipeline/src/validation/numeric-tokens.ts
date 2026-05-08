/**
 * The pre-TTS numeric assertion gate (structural lock #3).
 *
 * After a narration script is resolved against a listing record, this gate scans the
 * rendered text for every digit-sequence and asserts each one matches a known fact
 * on the listing. Unknown numbers fail the build with a precise error.
 *
 * This is what would have caught the 250k bug. The deliberately-corrupted-record
 * acceptance test in Phase 0 verifies this: setting Dragon's Wrath cell_count to
 * 250000 must fail with "numeric token '250,000' does not match listing.cell_count".
 */

import type { Listing } from "../data/types.js";

export interface NumericTokenIssue {
  segmentKind: string;
  resolvedText: string;
  unknownToken: string;
  listingId: string;
  knownFacts: Record<string, string>;
}

/**
 * Pulls every standalone numeric token out of a string. Recognizes:
 * - integers ("15000")
 * - thousand-separated ("15,000", "1.500.000" — locale-aware via separator chars)
 * - decimals ("3.99" — for prices)
 *
 * Strips out trailing words and re-emits a normalized representation (digits only,
 * with commas as thousand separators) for comparison.
 */
const TOKEN_REGEX = /\b\d{1,3}(?:[.,]\d{3})+(?:[.,]\d+)?\b|\b\d+(?:\.\d+)?\b/g;

export function extractNumericTokens(text: string): string[] {
  const matches = text.match(TOKEN_REGEX);
  if (!matches) return [];
  return matches;
}

/**
 * Returns the set of "known" numeric facts for a listing. Any number appearing
 * in the resolved narration must match one of these (in any locale formatting).
 */
export function knownNumericFacts(listing: Listing): Record<string, number> {
  const facts: Record<string, number> = {
    "listing.cell_count": listing.cell_count,
    "listing.puzzle_count": listing.puzzle_count,
  };

  // Grid size like "100x150" or "200x200" — extract the dimensions as numbers.
  const gridDims = listing.grid_size.match(/\d+/g);
  if (gridDims) {
    gridDims.forEach((dim, i) => {
      facts[`listing.grid_size.dim_${i}`] = Number(dim);
    });
  }

  return facts;
}

/**
 * Normalizes a token string to a number for comparison.
 * "15,000" -> 15000; "1.500" (es locale, 1500) -> needs context; "3.99" -> 3.99
 *
 * For our use case (cell counts up to ~120,000, grid dims, puzzle counts), we treat
 * a token as a fully integer string with commas/dots as thousand separators when it
 * has 4+ digits total. We don't have decimal facts in our schema yet.
 */
export function tokenToNumber(token: string): number {
  // Remove all non-digit chars except a single trailing decimal separator.
  // For our facts (all integers), strip every separator and parse as integer.
  const stripped = token.replace(/[.,]/g, "");
  return Number(stripped);
}

/**
 * The core assertion. Returns an empty array on pass, or an array of issues on fail.
 * Caller throws / marks variant Needs Fix.
 */
export function checkNumericTokens(
  resolved_segments: { segment: { kind: string }; resolved_text: string }[],
  listing: Listing,
): NumericTokenIssue[] {
  const issues: NumericTokenIssue[] = [];
  const facts = knownNumericFacts(listing);
  const factValues = new Set(Object.values(facts));

  // Display facts as locale strings so error messages are readable.
  const knownFactsDisplay = Object.fromEntries(
    Object.entries(facts).map(([k, v]) => [k, v.toLocaleString("en-US")]),
  );

  for (const { segment, resolved_text } of resolved_segments) {
    const tokens = extractNumericTokens(resolved_text);
    for (const token of tokens) {
      const value = tokenToNumber(token);
      if (Number.isNaN(value)) continue;
      if (!factValues.has(value)) {
        issues.push({
          segmentKind: segment.kind,
          resolvedText: resolved_text,
          unknownToken: token,
          listingId: listing.id,
          knownFacts: knownFactsDisplay,
        });
      }
    }
  }

  return issues;
}

export function formatIssueMessage(issue: NumericTokenIssue): string {
  const facts = Object.entries(issue.knownFacts)
    .map(([k, v]) => `${k}=${v}`)
    .join(", ");
  return (
    `validation error: numeric token "${issue.unknownToken}" does not match any known fact on listing "${issue.listingId}". ` +
    `Segment: ${issue.segmentKind}. ` +
    `Resolved text: "${issue.resolvedText}". ` +
    `Known facts: { ${facts} }.`
  );
}

/**
 * Convenience wrapper that throws if any issue is found.
 */
export function assertNumericTokensValid(
  resolved_segments: { segment: { kind: string }; resolved_text: string }[],
  listing: Listing,
): void {
  const issues = checkNumericTokens(resolved_segments, listing);
  if (issues.length > 0) {
    throw new Error(formatIssueMessage(issues[0]!));
  }
}
