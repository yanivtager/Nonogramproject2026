/**
 * Regenerate docs/samples/nonogram-sample-trace.json from a tiny hand-written
 * 5x5 picture. The picture is used ONLY to derive clues; the solver never sees it.
 * Usage: npx tsx scripts/gen-nonogram-sample-trace.ts
 */
import { writeFileSync } from "node:fs";

import { solveWithTrace } from "../src/solver/nonogram-trace";
import { verifyTrace } from "../src/solver/nonogram-verify";

const pic = [
  [0, 1, 1, 0, 0],
  [1, 1, 1, 1, 0],
  [1, 1, 1, 1, 1],
  [0, 1, 1, 1, 0],
  [0, 0, 1, 0, 0],
];
const clues = (l: number[]): number[] => {
  const out: number[] = [];
  let run = 0;
  for (const v of [...l, 0]) (v ? run++ : run && (out.push(run), (run = 0)));
  return out.length ? out : [0];
};
const rows = pic.map(clues);
const cols = pic[0]!.map((_, c) => clues(pic.map((r) => r[c]!)));

const trace = solveWithTrace(rows, cols);
const v = verifyTrace(trace, { expectedRowClues: rows, expectedColClues: cols });
if (!v.valid) throw new Error(v.errors.join("; "));
const out = new URL("../docs/samples/nonogram-sample-trace.json", import.meta.url);
writeFileSync(out, JSON.stringify(trace, null, 1) + "\n");
console.log(`wrote ${out.pathname}: ${trace.status}, ${trace.steps.length} steps`);
