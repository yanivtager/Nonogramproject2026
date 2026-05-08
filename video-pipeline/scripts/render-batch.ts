#!/usr/bin/env node

import { spawnSync } from "node:child_process";

const fixtures = ["dragons-wrath", "cafe-serenade", "frozen-gaze"] as const;
const language = process.argv.includes("--language")
  ? process.argv[process.argv.indexOf("--language") + 1] ?? "en"
  : "en";
const dryRun = process.argv.includes("--dry-run");

for (const listing of fixtures) {
  const args = ["scripts/render-variant.ts", "--listing", listing, "--language", language];
  if (dryRun) args.push("--dry-run");
  const result = spawnSync("npx.cmd", ["tsx", ...args], {
    cwd: process.cwd(),
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
