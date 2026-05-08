#!/usr/bin/env node

import { runLovableQA } from "../src/lovable-qa/runner.js";

function parseArgs(argv: string[]) {
  const args = { repoPath: "", skipInstall: false, skipSmoke: true, grepOnly: false };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === "--repo") args.repoPath = argv[++i] ?? "";
    else if (argv[i] === "--skip-install") args.skipInstall = true;
    else if (argv[i] === "--smoke") args.skipSmoke = false;
    else if (argv[i] === "--grep-only") args.grepOnly = true;
  }
  if (!args.repoPath) {
    throw new Error("Usage: npm run lovable-qa -- --repo <path> [--skip-install] [--smoke] [--grep-only]");
  }
  return args;
}

const opts = parseArgs(process.argv);
const report = await runLovableQA(opts);

console.log("\n=== Lovable QA Report ===");
console.log(`Repo:    ${report.repoPath}`);
console.log(`Started: ${report.startedAt}`);
console.log(`Result:  ${report.passed ? "PASS" : "FAIL"}`);
console.log();
for (const result of report.results) {
  console.log(`[${result.passed ? "PASS" : "FAIL"}] ${result.id}: ${result.description}`);
  if (!result.passed && result.output) {
    console.log("  --- output ---");
    console.log(result.output.split("\n").map((line) => `  ${line}`).join("\n"));
    console.log("  --------------");
  }
}

if (!report.passed && report.followUpPrompt) {
  console.log("\n=== Suggested follow-up prompt for Lovable ===");
  console.log(report.followUpPrompt);
}

process.exit(report.passed ? 0 : 1);
