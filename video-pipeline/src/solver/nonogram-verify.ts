/**
 * Independent trace verifier / replayer.
 *
 * Deliberately shares NO code with nonogram-line.ts: line feasibility is
 * decided by simulating an NFA of the clue pattern  0* 1^c0 0+ 1^c1 ... 0*
 * and a cell is "forced" only if the opposite value makes the line infeasible.
 * Cost is O(n^2 * k) per line, which is fine for verification.
 */

import type { NonogramTrace } from "./nonogram-trace";

type Sym = { v: 0 | 1; star: boolean };

function pattern(clues: readonly number[]): Sym[] {
  const pat: Sym[] = [{ v: 0, star: true }];
  clues.forEach((c, j) => {
    if (j > 0) pat.push({ v: 0, star: false }, { v: 0, star: true });
    for (let t = 0; t < c; t++) pat.push({ v: 1, star: false });
  });
  if (clues.length > 0) pat.push({ v: 0, star: true });
  return pat;
}

/** Can the (partially known) line be completed to match the clues? */
export function lineFeasible(clues: readonly number[], line: readonly number[]): boolean {
  const effective = clues.length === 1 && clues[0] === 0 ? [] : clues;
  const pat = pattern(effective);
  const m = pat.length;
  const closure = (set: Uint8Array): void => {
    for (let s = 0; s < m; s++) if (set[s] && pat[s]!.star) set[s + 1] = 1; // skip star (epsilon)
  };
  // state s = "next symbol to match is pat[s]"; accepting = state m.
  let cur = new Uint8Array(m + 1);
  cur[0] = 1;
  closure(cur);
  for (const x of line) {
    const next = new Uint8Array(m + 1);
    for (let s = 0; s < m; s++) {
      if (!cur[s]) continue;
      const sym = pat[s]!;
      if (x !== -1 && x !== sym.v) continue;
      next[sym.star ? s : s + 1] = 1;
    }
    closure(next);
    cur = next;
  }
  return cur[m] === 1;
}

/** Cell values that survive in at least one completion; used to find forced cells. */
function possibleValues(clues: readonly number[], line: number[], idx: number): Array<0 | 1> {
  const out: Array<0 | 1> = [];
  for (const v of [0, 1] as const) {
    const t = line.slice();
    t[idx] = v;
    if (lineFeasible(clues, t)) out.push(v);
  }
  return out;
}

/** Run-length check: do fully-known `line` cells spell exactly `clues`? */
function runsMatch(clues: readonly number[], line: readonly number[]): boolean {
  const runs: number[] = [];
  let run = 0;
  for (const x of line) {
    if (x === 1) run++;
    else {
      if (run) runs.push(run);
      run = 0;
    }
  }
  if (run) runs.push(run);
  const want = clues.length === 1 && clues[0] === 0 ? [] : clues;
  return runs.length === want.length && runs.every((r, i) => r === want[i]);
}

export interface VerifyResult {
  valid: boolean;
  errors: string[];
}

export interface VerifyOptions {
  /** If given, trace clues must equal these (after [0] normalisation). */
  expectedRowClues?: number[][];
  expectedColClues?: number[][];
}

const norm = (c: readonly number[]): number[] => (c.length === 1 && c[0] === 0 ? [] : [...c]);

export function verifyTrace(trace: NonogramTrace, opts: VerifyOptions = {}): VerifyResult {
  const errors: string[] = [];
  const fail = (msg: string): VerifyResult => {
    errors.push(msg);
    return { valid: false, errors };
  };

  const R = trace.rows;
  const C = trace.cols;
  if (trace.rowClues.length !== R || trace.colClues.length !== C) return fail("clue arrays do not match rows/cols");
  if (trace.initial.length !== R || trace.initial.some((r) => r.length !== C)) return fail("initial grid has wrong shape");
  const compare = (label: string, got: number[][], want?: number[][]): void => {
    if (!want) return;
    if (want.length !== got.length || want.some((c, i) => JSON.stringify(norm(c)) !== JSON.stringify(norm(got[i]!)))) {
      errors.push(`${label} in trace differ from expected clues`);
    }
  };
  compare("rowClues", trace.rowClues, opts.expectedRowClues);
  compare("colClues", trace.colClues, opts.expectedColClues);
  if (errors.length) return { valid: false, errors };

  const grid: number[][] = trace.initial.map((r) => [...r]);
  for (const r of grid) for (const v of r) if (v !== -1 && v !== 0 && v !== 1) return fail(`invalid initial cell ${v}`);

  const line = (axis: "row" | "col", i: number): number[] =>
    axis === "row" ? [...grid[i]!] : grid.map((r) => r[i]!);
  const cluesOf = (axis: "row" | "col", i: number): number[] => (axis === "row" ? trace.rowClues : trace.colClues)[i]!;

  // Initial grid must itself be consistent for any step to be meaningful.
  for (let t = 0; t < trace.steps.length; t++) {
    const s = trace.steps[t]!;
    const tag = `step ${t}`;
    if (s.index !== t) return fail(`${tag}: index is ${s.index}`);
    const count = s.axis === "row" ? R : s.axis === "col" ? C : -1;
    if (count < 0 || !Number.isInteger(s.line) || s.line < 0 || s.line >= count) return fail(`${tag}: bad axis/line`);
    if (JSON.stringify(s.clues) !== JSON.stringify(cluesOf(s.axis, s.line))) return fail(`${tag}: clues do not match puzzle`);
    const cur = line(s.axis, s.line);
    if (JSON.stringify(cur) !== JSON.stringify(s.before)) return fail(`${tag}: before-state differs from replayed state`);
    if (!lineFeasible(s.clues, cur)) return fail(`${tag}: line already infeasible before step`);
    if (s.changes.length === 0) return fail(`${tag}: step changes nothing`);

    const expectedAfter = cur.slice();
    const seen = new Set<number>();
    for (const ch of s.changes) {
      if (seen.has(ch.index)) return fail(`${tag}: duplicate change at ${ch.index}`);
      seen.add(ch.index);
      if (ch.index < 0 || ch.index >= cur.length) return fail(`${tag}: change index out of range`);
      const r = s.axis === "row" ? s.line : ch.index;
      const c = s.axis === "row" ? ch.index : s.line;
      if (ch.row !== r || ch.col !== c) return fail(`${tag}: change coordinates inconsistent`);
      if (cur[ch.index] !== -1 || ch.from !== -1) return fail(`${tag}: change must go from unknown`);
      if (ch.to !== 0 && ch.to !== 1) return fail(`${tag}: bad target value`);
      const poss = possibleValues(s.clues, cur, ch.index);
      if (poss.length !== 1 || poss[0] !== ch.to) {
        return fail(`${tag}: cell ${ch.index} to ${ch.to} is not forced (possible: ${poss.join("/") || "none"})`);
      }
      expectedAfter[ch.index] = ch.to;
    }
    if (JSON.stringify(expectedAfter) !== JSON.stringify(s.after)) return fail(`${tag}: after-state is not before+changes`);
    if (s.lineComplete !== !s.after.includes(-1)) return fail(`${tag}: lineComplete flag wrong`);
    for (const ch of s.changes) grid[ch.row]![ch.col] = ch.to;
  }

  if (JSON.stringify(grid) !== JSON.stringify(trace.final)) return fail("final grid differs from replay");
  const unknown = grid.reduce((n, r) => n + r.filter((v) => v === -1).length, 0);
  if (unknown !== trace.unknownRemaining) return fail("unknownRemaining wrong");

  const allLines = (): Array<["row" | "col", number]> => [
    ...Array.from({ length: R }, (_, i) => ["row", i] as ["row", number]),
    ...Array.from({ length: C }, (_, i) => ["col", i] as ["col", number]),
  ];

  if (trace.status === "SOLVED") {
    if (unknown) return fail("SOLVED but unknown cells remain");
    for (const [a, i] of allLines()) if (!runsMatch(cluesOf(a, i), line(a, i))) return fail(`SOLVED but ${a} ${i} violates its clues`);
    if (trace.contradiction) return fail("SOLVED trace carries a contradiction");
  } else if (trace.status === "STALLED") {
    if (!unknown) return fail("STALLED but no unknown cells remain");
    if (trace.contradiction) return fail("STALLED trace carries a contradiction");
    for (const [a, i] of allLines()) {
      const l = line(a, i);
      if (!lineFeasible(cluesOf(a, i), l)) return fail(`STALLED but ${a} ${i} is infeasible`);
      for (let p = 0; p < l.length; p++) {
        if (l[p] === -1 && possibleValues(cluesOf(a, i), l, p).length === 1) {
          return fail(`STALLED but ${a} ${i} cell ${p} is still forced`);
        }
      }
    }
  } else if (trace.status === "CONTRADICTION") {
    const k = trace.contradiction;
    if (!k) return fail("CONTRADICTION without detail");
    if (k.atStep !== trace.steps.length) return fail("contradiction atStep mismatch");
    const count = k.axis === "row" ? R : C;
    if (k.line < 0 || k.line >= count) return fail("contradiction line out of range");
    if (lineFeasible(cluesOf(k.axis, k.line), line(k.axis, k.line))) return fail("claimed contradiction line is actually feasible");
  } else {
    return fail(`unknown status ${(trace as { status: string }).status}`);
  }
  return { valid: true, errors };
}
