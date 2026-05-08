/**
 * The Phase-0 acceptance test suite.
 *
 * These tests are the "the 250k bug must be impossible by construction" proof:
 * - Hardcoded-number scripts are rejected at script-definition time.
 * - Resolved scripts pass numeric-token validation when all numbers trace to listing facts.
 * - Corrupted listing records produce the exact error message we want to see.
 */

import { describe, it, expect } from "vitest";

import { cafeSerenade, dragonsWrath, frozenGaze, ultimateBundle } from "../__fixtures__/listings.js";
import {
  NarrationScriptSchema,
  assertNoHardcodedNumbers,
  resolveScript,
  type NarrationScript,
} from "../src/narration/schema.js";
import {
  assertNumericTokensValid,
  checkNumericTokens,
  extractNumericTokens,
  tokenToNumber,
} from "../src/validation/numeric-tokens.js";
import { scaleShockEn, scaleShockJa, scaleShockEs, scaleShockPtBr } from "../src/narration/scripts/scale-shock.js";

describe("narration schema — hardcoded number rejection (lock #2)", () => {
  it("rejects a script with a hardcoded thousand-separated number in text_template", () => {
    const bad: NarrationScript = {
      template_id: "scale-shock",
      language_code: "en",
      segments: [
        {
          kind: "hook",
          start_s: 0,
          end_s: 2,
          text_template: "This printable nonogram has 15,000 cells.",
        },
      ],
    };
    expect(() => assertNoHardcodedNumbers(bad)).toThrow(/hardcoded number/);
  });

  it("rejects a script with a 4+-digit raw number in text_template", () => {
    const bad: NarrationScript = {
      template_id: "scale-shock",
      language_code: "en",
      segments: [
        {
          kind: "hook",
          start_s: 0,
          end_s: 2,
          text_template: "62500 cells of pure logic.",
        },
      ],
    };
    expect(() => assertNoHardcodedNumbers(bad)).toThrow();
  });

  it("accepts the canonical scale-shock-en script (variables only, no hardcoded numbers)", () => {
    expect(() => assertNoHardcodedNumbers(scaleShockEn)).not.toThrow();
    expect(() => NarrationScriptSchema.parse(scaleShockEn)).not.toThrow();
  });

  it("accepts the canonical scale-shock script for every language", () => {
    expect(() => assertNoHardcodedNumbers(scaleShockEs)).not.toThrow();
    expect(() => assertNoHardcodedNumbers(scaleShockJa)).not.toThrow();
    expect(() => assertNoHardcodedNumbers(scaleShockPtBr)).not.toThrow();
  });
});

describe("token extractor", () => {
  it("extracts thousand-separated tokens", () => {
    expect(extractNumericTokens("15,000 cells of logic")).toEqual(["15,000"]);
    // "250x250" intentionally does NOT extract as separate tokens — `x` is a word char,
    // so there's no word-boundary between digits and 'x'. This avoids false positives
    // on grid_size strings like "250x250" where dims aren't standalone facts.
    expect(extractNumericTokens("grid is 250x250, with 62,500 cells")).toEqual(["62,500"]);
    expect(extractNumericTokens("250 cells per row, 62,500 total")).toEqual(["250", "62,500"]);
  });

  it("extracts raw integers", () => {
    expect(extractNumericTokens("solved in 117500 cells")).toEqual(["117500"]);
  });

  it("normalizes tokens to plain integers", () => {
    expect(tokenToNumber("15,000")).toBe(15000);
    expect(tokenToNumber("62,500")).toBe(62500);
    expect(tokenToNumber("250")).toBe(250);
  });
});

describe("numeric-token gate against real listings (lock #3)", () => {
  it("Cafe Serenade scale-shock-en resolves cleanly: '62,500' matches listing.cell_count", () => {
    const resolved = resolveScript(scaleShockEn, cafeSerenade);
    expect(() => assertNumericTokensValid(resolved, cafeSerenade)).not.toThrow();
  });

  it("Dragon's Wrath scale-shock-en resolves cleanly: '15,000' matches listing.cell_count", () => {
    const resolved = resolveScript(scaleShockEn, dragonsWrath);
    expect(() => assertNumericTokensValid(resolved, dragonsWrath)).not.toThrow();
  });

  it("Frozen Gaze scale-shock-en resolves cleanly: '40,000' matches listing.cell_count", () => {
    const resolved = resolveScript(scaleShockEn, frozenGaze);
    expect(() => assertNumericTokensValid(resolved, frozenGaze)).not.toThrow();
  });

  it("Ultimate Bundle scale-shock-en resolves cleanly: '117,500' matches listing.cell_count", () => {
    const resolved = resolveScript(scaleShockEn, ultimateBundle);
    expect(() => assertNumericTokensValid(resolved, ultimateBundle)).not.toThrow();
  });

  it("scale-shock-ja resolves cleanly with Japanese formatting", () => {
    const resolved = resolveScript(scaleShockJa, cafeSerenade);
    expect(() => assertNumericTokensValid(resolved, cafeSerenade)).not.toThrow();
  });
});

describe("THE 250K BUG must be impossible by construction (the marquee test)", () => {
  it("a corrupted Dragon's Wrath listing with cell_count=250000 produces the exact error we want", () => {
    const corrupted = { ...dragonsWrath, cell_count: 250000 };
    const resolved = resolveScript(scaleShockEn, corrupted);

    // Verify the gate detects the issue. Note: cell_count is now 250000,
    // so the resolved text says "250,000 cells" — but we're passing the ORIGINAL
    // (uncorrupted) listing as the "expected facts" source. That mirrors the real
    // failure mode: a script writer (or LLM) hallucinates a number that doesn't
    // match the source-of-truth listing.
    const issues = checkNumericTokens(resolved, dragonsWrath);

    expect(issues).toHaveLength(1);
    const issue = issues[0]!;
    expect(issue.unknownToken).toBe("250,000");
    expect(issue.listingId).toBe("dragons-wrath");
    expect(issue.knownFacts["listing.cell_count"]).toBe("15,000");
  });

  it("the thrown error message includes the diagnostic detail Yaniv would want to see", () => {
    const corrupted = { ...dragonsWrath, cell_count: 250000 };
    const resolved = resolveScript(scaleShockEn, corrupted);

    expect(() => assertNumericTokensValid(resolved, dragonsWrath)).toThrowError(
      /numeric token "250,000" does not match any known fact on listing "dragons-wrath"/,
    );
  });

  it("the same corruption applied to Cafe Serenade's actual cell_count (62,500) is also caught when the listing facts disagree", () => {
    // If a script writer accidentally types 62,500 thinking they're working on Cafe Serenade
    // but the variant is for Dragon's Wrath (15,000), the gate catches it.
    // We simulate that by resolving against Cafe Serenade and validating against Dragon's Wrath.
    const resolved = resolveScript(scaleShockEn, cafeSerenade);
    const issues = checkNumericTokens(resolved, dragonsWrath);

    const tokens = issues.map((i) => i.unknownToken);
    expect(tokens).toContain("62,500");
  });
});
