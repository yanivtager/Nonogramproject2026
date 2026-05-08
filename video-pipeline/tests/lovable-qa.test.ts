/**
 * Tests for the Lovable QA grep-rule engine. Synthesizes a fake repo on disk,
 * plants known violations, runs the grep-only path, and asserts each rule fires.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";

import { runLovableQA } from "../src/lovable-qa/runner.js";

let repoDir: string;

beforeEach(() => {
  repoDir = mkdtempSync(join(tmpdir(), "lovable-qa-test-"));
  mkdirSync(join(repoDir, "src"), { recursive: true });
});

afterEach(() => {
  rmSync(repoDir, { recursive: true, force: true });
});

function file(rel: string, contents: string): void {
  const full = join(repoDir, rel);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, contents);
}

describe("Lovable QA — grep-only mode", () => {
  it("passes a clean repo with no violations", async () => {
    file(
      "src/components/ReviewQueue.tsx",
      `import type { Variant } from "../../shared/types.ts";
       export function ReviewQueue({ variants }: { variants: Variant[] }) {
         return <div>{variants.map((v) => <div key={v.id}>{v.listing_id}</div>)}</div>;
       }`,
    );
    const report = await runLovableQA({ repoPath: repoDir, grepOnly: true });
    expect(report.passed).toBe(true);
  });

  it("catches a hardcoded thousand-separated number (the 250k bug pattern)", async () => {
    file(
      "src/components/Hero.tsx",
      `export function Hero() {
         return <p>Solve all 15,000 cells today.</p>;
       }`,
    );
    const report = await runLovableQA({ repoPath: repoDir, grepOnly: true });
    expect(report.passed).toBe(false);
    const grep = report.results.find((r) => r.id === "grep-hard-rules")!;
    expect(grep.details!.some((d) => d.ruleId === "no-thousand-separated-numbers")).toBe(true);
  });

  it("catches a hardcoded bare cell-count integer", async () => {
    file(
      "src/util/stats.ts",
      `export const FALLBACK_CELLS = 62500;`,
    );
    const report = await runLovableQA({ repoPath: repoDir, grepOnly: true });
    expect(report.passed).toBe(false);
    expect(report.results.find((r) => r.id === "grep-hard-rules")!.details!.some((d) => d.ruleId === "no-bare-cell-count-integers")).toBe(true);
  });

  it("catches a hardcoded Etsy listing URL", async () => {
    file(
      "src/links.ts",
      `export const DRAGON_URL = "https://www.etsy.com/listing/4455139351/dragons-wrath";`,
    );
    const report = await runLovableQA({ repoPath: repoDir, grepOnly: true });
    expect(report.passed).toBe(false);
    const grep = report.results.find((r) => r.id === "grep-hard-rules")!;
    // Both the URL rule and the listing-id rule fire on this line. Either match counts.
    const rulesHit = new Set(grep.details!.map((d) => d.ruleId));
    expect(rulesHit.has("no-etsy-listing-urls") || rulesHit.has("no-known-listing-ids")).toBe(true);
  });

  it("catches a hardcoded listing ID", async () => {
    file(
      "src/util/listings.ts",
      `export function isUltimateBundle(id: string): boolean {
         return id === "4454210115";
       }`,
    );
    const report = await runLovableQA({ repoPath: repoDir, grepOnly: true });
    expect(report.passed).toBe(false);
    expect(
      report.results.find((r) => r.id === "grep-hard-rules")!.details!.some((d) => d.ruleId === "no-known-listing-ids"),
    ).toBe(true);
  });

  it("catches a redefined Listing interface", async () => {
    file(
      "src/types.ts",
      `export interface Listing {
         id: string;
         name: string;
       }`,
    );
    const report = await runLovableQA({ repoPath: repoDir, grepOnly: true });
    expect(report.passed).toBe(false);
    expect(
      report.results.find((r) => r.id === "grep-hard-rules")!.details!.some((d) => d.ruleId === "no-redefined-shared-types"),
    ).toBe(true);
  });

  it("catches a hardcoded product name string", async () => {
    file(
      "src/components/Header.tsx",
      `export function Header() { return <h1>Welcome to Dragon's Wrath</h1>; }`,
    );
    const report = await runLovableQA({ repoPath: repoDir, grepOnly: true });
    expect(report.passed).toBe(false);
    expect(
      report.results
        .find((r) => r.id === "grep-hard-rules")!
        .details!.some((d) => d.ruleId === "no-product-name-strings"),
    ).toBe(true);
  });

  it("exempts test fixtures and __fixtures__ paths from grep rules", async () => {
    mkdirSync(join(repoDir, "src", "__fixtures__"), { recursive: true });
    file(
      "src/__fixtures__/listings.ts",
      `export const fixture = { cell_count: 15000, name: "Dragon's Wrath", url: "https://www.etsy.com/listing/4455139351/" };`,
    );
    const report = await runLovableQA({ repoPath: repoDir, grepOnly: true });
    expect(report.passed).toBe(true);
  });

  it("composes a follow-up prompt that names the rule and quotes the offending line", async () => {
    file(
      "src/Bad.tsx",
      `export function Bad() { return <span>{"15,000 cells"}</span>; }`,
    );
    const report = await runLovableQA({ repoPath: repoDir, grepOnly: true });
    expect(report.passed).toBe(false);
    expect(report.followUpPrompt).toBeDefined();
    expect(report.followUpPrompt!).toContain("HARD RULE");
    expect(report.followUpPrompt!).toContain("Bad.tsx");
    expect(report.followUpPrompt!).toContain("15,000");
  });

  it("returns a clear error if the repo path doesn't exist", async () => {
    const report = await runLovableQA({ repoPath: join(repoDir, "no-such-dir"), grepOnly: true });
    expect(report.passed).toBe(false);
    expect(report.results[0]!.id).toBe("repo-exists");
  });
});
