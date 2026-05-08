/**
 * Lovable QA runner. Validates a cloned nonogram-review-ui repo end-to-end:
 *
 *  1. Hard-rule grep checks (the most important step — catches 250k-class violations)
 *  2. npm install (idempotent)
 *  3. npm run typecheck
 *  4. npm run build
 *  5. npm test (vitest)
 *  6. npm run lint
 *  7. Playwright smoke test (optional; only if the dev server starts cleanly)
 *
 * On any failure, generates a follow-up prompt for Lovable that names the failure,
 * references the offending file/line, and re-states the hard rule. This is what
 * Yaniv pastes back into Lovable to iterate.
 */

import { existsSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { spawnSync } from "node:child_process";

import { HARD_RULE_GREP_RULES, type GrepViolation } from "./grep-rules.js";

export interface RunnerOptions {
  repoPath: string;
  /** Skip npm install (faster on subsequent runs). Default false. */
  skipInstall?: boolean;
  /** Skip Playwright smoke test (default true for now; UI must exist first). */
  skipSmoke?: boolean;
  /** Run only the grep checks. Useful for fast pre-flight. */
  grepOnly?: boolean;
}

export interface CheckResult {
  id: string;
  description: string;
  passed: boolean;
  output?: string;
  details?: GrepViolation[];
}

export interface RunnerReport {
  repoPath: string;
  passed: boolean;
  results: CheckResult[];
  followUpPrompt?: string;
  startedAt: string;
  finishedAt: string;
}

export async function runLovableQA(opts: RunnerOptions): Promise<RunnerReport> {
  const startedAt = new Date().toISOString();
  const results: CheckResult[] = [];

  if (!existsSync(opts.repoPath) || !statSync(opts.repoPath).isDirectory()) {
    return {
      repoPath: opts.repoPath,
      passed: false,
      results: [
        {
          id: "repo-exists",
          description: "Repo path must exist and be a directory",
          passed: false,
          output: `Path not found: ${opts.repoPath}`,
        },
      ],
      followUpPrompt: undefined,
      startedAt,
      finishedAt: new Date().toISOString(),
    };
  }

  // 1. Hard-rule grep checks (always first; cheapest and most diagnostic)
  results.push(await runGrepChecks(opts.repoPath));

  if (opts.grepOnly) {
    return finalize(opts.repoPath, results, startedAt);
  }

  // 2-6. npm scripts
  if (!opts.skipInstall) {
    results.push(runNpmCheck(opts.repoPath, "install", ["install", "--prefer-offline", "--no-audit", "--no-fund"]));
  }
  results.push(runNpmCheck(opts.repoPath, "typecheck", ["run", "typecheck"]));
  results.push(runNpmCheck(opts.repoPath, "build", ["run", "build"]));
  results.push(runNpmCheck(opts.repoPath, "test", ["test"]));
  results.push(runNpmCheck(opts.repoPath, "lint", ["run", "lint"]));

  // 7. Smoke test (placeholder; requires UI to exist with a /review route)
  if (!opts.skipSmoke) {
    results.push({
      id: "smoke",
      description: "Playwright smoke test of /review route (deferred to Phase 1)",
      passed: true,
      output: "skipped (UI not yet built)",
    });
  }

  return finalize(opts.repoPath, results, startedAt);
}

function finalize(repoPath: string, results: CheckResult[], startedAt: string): RunnerReport {
  const passed = results.every((r) => r.passed);
  const followUpPrompt = passed ? undefined : composeFollowUpPrompt(results);
  return {
    repoPath,
    passed,
    results,
    followUpPrompt,
    startedAt,
    finishedAt: new Date().toISOString(),
  };
}

async function runGrepChecks(repoPath: string): Promise<CheckResult> {
  const violations: GrepViolation[] = [];

  // Use a stripped-down glob walker to avoid extra deps.
  const filesToScan = await collectSourceFiles(repoPath);

  for (const rule of HARD_RULE_GREP_RULES) {
    for (const file of filesToScan) {
      // Per-rule exemption check.
      if (rule.exemptGlobs.some((g) => fileMatchesGlob(file, g))) continue;

      const content = readFileSync(file, "utf8");
      const lines = content.split(/\r?\n/);
      lines.forEach((line, i) => {
        if (rule.pattern.test(line)) {
          violations.push({
            ruleId: rule.id,
            description: rule.description,
            file: relative(repoPath, file),
            line: i + 1,
            text: line.trim().slice(0, 200),
          });
        }
      });
    }
  }

  if (violations.length === 0) {
    return {
      id: "grep-hard-rules",
      description: "No hardcoded product facts in Lovable's source",
      passed: true,
    };
  }

  return {
    id: "grep-hard-rules",
    description: `Hard-rule grep failed: ${violations.length} violation(s) found`,
    passed: false,
    details: violations,
    output: violations
      .slice(0, 20)
      .map((v) => `[${v.ruleId}] ${v.file}:${v.line}  ${v.text}`)
      .join("\n"),
  };
}

function runNpmCheck(repoPath: string, label: string, args: string[]): CheckResult {
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  const result = spawnSync(npm, args, {
    cwd: repoPath,
    stdio: "pipe",
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  const output = `${result.stdout || ""}\n${result.stderr || ""}`.slice(-2000);
  return {
    id: `npm-${label}`,
    description: `npm ${args.join(" ")}`,
    passed: result.status === 0,
    output,
  };
}

async function collectSourceFiles(repoPath: string): Promise<string[]> {
  const { readdir } = await import("node:fs/promises");
  const out: string[] = [];

  async function walk(dir: string): Promise<void> {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      if (ent.name === "node_modules" || ent.name === ".git" || ent.name === "dist" || ent.name === "build") continue;
      const full = join(dir, ent.name);
      if (ent.isDirectory()) {
        await walk(full);
      } else if (/\.(ts|tsx|js|jsx)$/i.test(ent.name)) {
        out.push(full);
      }
    }
  }
  await walk(join(repoPath, "src"));
  return out;
}

/**
 * Tiny glob matcher (handles `**`, `*`, and direct path segments). Sufficient
 * for our exemption patterns; no need for a full glob library.
 */
function fileMatchesGlob(filePath: string, glob: string): boolean {
  const norm = filePath.replace(/\\/g, "/");
  const pattern =
    "^" +
    glob
      .replace(/[.+^${}()|[\]\\]/g, "\\$&")
      .replace(/\*\*/g, "::DOUBLESTAR::")
      .replace(/\*/g, "[^/]*")
      .replace(/::DOUBLESTAR::/g, ".*") +
    "$";
  return new RegExp(pattern).test(norm);
}

function composeFollowUpPrompt(results: CheckResult[]): string {
  const failed = results.filter((r) => !r.passed);
  const summary = failed.map((r) => `- ${r.id}: ${r.description}`).join("\n");
  const detail = failed
    .map((r) => `### ${r.id}\n\`\`\`\n${(r.output ?? "").trim()}\n\`\`\``)
    .join("\n\n");

  return `The previous build failed Lovable QA. Please fix and re-push.

FAILURES:
${summary}

DETAIL:
${detail}

REMINDERS:
- The HARD RULE: never define product facts (cell counts, grid sizes, Etsy URLs, listing names, puzzle counts) in src/. Only display fields from the Supabase API response. If a field is missing, render \`—\` and stop.
- Import all entity types from \`shared/types.ts\`. Never define local Listing/Variant/Template/Voice/Track/Render/Decision interfaces.
- Run \`npm run typecheck && npm run build && npm test && npm run lint\` and verify all pass before declaring done.
`;
}
