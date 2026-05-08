#!/usr/bin/env node
/**
 * Lovable QA gate CLI.
 *
 * Usage:
 *   node scripts/lovable-qa.mjs --repo /path/to/nonogram-review-ui
 *   node scripts/lovable-qa.mjs --repo /path/to/nonogram-review-ui --grep-only
 *   node scripts/lovable-qa.mjs --repo /path/to/nonogram-review-ui --skip-install
 *
 * Prints a structured report. Exit 0 on pass, 1 on fail.
 * On fail, also prints a ready-to-paste follow-up prompt for Lovable.
 */

import { runLovableQA } from "../src/lovable-qa/runner.ts";

function parseArgs(argv) {
  const args = { repoPath: null, skipInstall: false, skipSmoke: true, grepOnly: false };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--repo") args.repoPath = argv[++i];
    else if (argv[i] === "--skip-install") args.skipInstall = true;
    else if (argv[i] === "--smoke") args.skipSmoke = false;
    else if (argv[i] === "--grep-only") args.grepOnly = true;
  }
  if (!args.repoPath) {
    console.error("Usage: node scripts/lovable-qa.mjs --repo <path> [--skip-install] [--smoke] [--grep-only]");
    process.exit(2);
  }
  return args;
}

const opts = parseArgs(process.argv);
const report = await runLovableQA(opts);

console.log(`\n=== Lovable QA Report ===`);
console.log(`Repo:    ${report.repoPath}`);
console.log(`Started: ${report.startedAt}`);
console.log(`Result:  ${report.passed ? "PASS" : "FAIL"}`);
console.log();
for (const r of report.results) {
  console.log(`[${r.passed ? "PASS" : "FAIL"}] ${r.id}: ${r.description}`);
  if (!r.passed && r.output) {
    console.log("  --- output ---");
    console.log(r.output.split("\n").map((l) => "  " + l).join("\n"));
    console.log("  --------------");
  }
}

if (!report.passed && report.followUpPrompt) {
  console.log(`\n=== Suggested follow-up prompt for Lovable ===`);
  console.log(report.followUpPrompt);
}

process.exit(report.passed ? 0 : 1);
