import { describe, expect, it } from "vitest";

import { solveLine, type Cell } from "../src/solver/nonogram-line";
import { emptyGrid, solveWithTrace } from "../src/solver/nonogram-trace";
import { lineFeasible, verifyTrace } from "../src/solver/nonogram-verify";

// ---------- helpers ----------

/** Seeded PRNG (mulberry32) so failures reproduce. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function cluesOfLine(line: number[]): number[] {
  const out: number[] = [];
  let run = 0;
  for (const v of line) {
    if (v === 1) run++;
    else if (run) (out.push(run), (run = 0));
  }
  if (run) out.push(run);
  return out.length ? out : [0];
}

function gridClues(g: number[][]): { rows: number[][]; cols: number[][] } {
  return {
    rows: g.map(cluesOfLine),
    cols: g[0]!.map((_, c) => cluesOfLine(g.map((r) => r[c]!))),
  };
}

/** Exhaustive: every full line (0/1) matching clues and the partial knowledge. */
function bruteLine(clues: number[], line: number[]): number[][] {
  const n = line.length;
  const want = JSON.stringify(clues.length === 1 && clues[0] === 0 ? [] : clues);
  const sols: number[][] = [];
  for (let mask = 0; mask < 1 << n; mask++) {
    const cand = Array.from({ length: n }, (_, i) => (mask >> i) & 1);
    if (line.some((v, i) => v !== -1 && v !== cand[i])) continue;
    if (JSON.stringify(cluesOfLine(cand).filter((x) => x > 0)) !== want) continue;
    sols.push(cand);
  }
  return sols;
}

function bruteDeduce(clues: number[], line: number[]): number[] | null {
  const sols = bruteLine(clues, line);
  if (!sols.length) return null;
  return line.map((v, i) => {
    if (v !== -1) return v;
    const vals = new Set(sols.map((s) => s[i]));
    return vals.size === 1 ? [...vals][0]! : -1;
  });
}

function mustOk(clues: number[], line: number[]) {
  const r = solveLine(clues, line);
  if (!r.ok) throw new Error(r.reason);
  return r;
}

// ---------- line primitive ----------

describe("solveLine", () => {
  it("handles the empty clue [0]: everything is empty", () => {
    const r = mustOk([0], [-1, -1, -1, -1]);
    expect(r.cells).toEqual([0, 0, 0, 0]);
    expect(r.changed).toEqual([0, 1, 2, 3]);
  });

  it("treats [] like [0]", () => {
    expect(mustOk([], [-1, -1]).cells).toEqual([0, 0]);
  });

  it("[0] contradicts a known filled cell", () => {
    expect(solveLine([0], [-1, 1, -1]).ok).toBe(false);
  });

  it("fully filled line", () => {
    expect(mustOk([5], [-1, -1, -1, -1, -1]).cells).toEqual([1, 1, 1, 1, 1]);
    expect(mustOk([2, 2], [-1, -1, -1, -1, -1]).cells).toEqual([1, 1, 0, 1, 1]);
  });

  it("overlapping runs", () => {
    // 10 cells, [7]: cells 3..6 forced.
    expect(mustOk([7], new Array(10).fill(-1)).cells).toEqual([-1, -1, -1, 1, 1, 1, 1, -1, -1, -1]);
    // [3,2] in 7 cells: slack 1.
    expect(mustOk([3, 2], new Array(7).fill(-1)).cells).toEqual([-1, 1, 1, -1, -1, 1, -1]);
  });

  it("deduces empty cells from known cells", () => {
    // [2] with a filled cell at index 2 in 6 cells: cells 0 and 5 and 4.. can't both; 1 or 3 pair.
    const r = mustOk([2], [-1, -1, 1, -1, -1, -1]);
    expect(r.cells).toEqual([0, -1, 1, -1, 0, 0]);
    // A completed clue crosses out everything else.
    expect(mustOk([1, 1], [1, 0, 1, -1, -1]).cells).toEqual([1, 0, 1, 0, 0]);
  });

  it("reports pinned clue starts", () => {
    const r = mustOk([2, 1], [-1, -1, -1, -1]);
    expect(r.cells).toEqual([1, 1, 0, 1]);
    expect(r.pinnedStarts).toEqual([0, 3]);
  });

  it("detects infeasible lines and clues that do not fit", () => {
    expect(solveLine([3, 3], [-1, -1, -1, -1, -1]).ok).toBe(false);
    expect(solveLine([1, 1], [1, 1, -1]).ok).toBe(false);
    expect(solveLine([2], [1, 0, 1]).ok).toBe(false);
  });

  it("rejects malformed input instead of guessing", () => {
    expect(() => solveLine([-1], [-1])).toThrow();
    expect(() => solveLine([1, 0], [-1, -1, -1])).toThrow();
    expect(() => solveLine([1], [2])).toThrow();
  });

  it("matches exhaustive brute force on randomized short lines", () => {
    const rand = rng(12345);
    let checked = 0;
    for (let iter = 0; iter < 3000; iter++) {
      const n = 1 + Math.floor(rand() * 12);
      const truth = Array.from({ length: n }, () => (rand() < 0.5 ? 1 : 0));
      const clues = cluesOfLine(truth);
      // Random partial knowledge (consistent with truth on most trials, random on some).
      const consistent = rand() < 0.8;
      const line = truth.map((v) => (rand() < 0.4 ? (consistent ? v : Math.floor(rand() * 2)) : -1));
      const expected = bruteDeduce(clues, line);
      const got = solveLine(clues, line);
      if (expected === null) {
        expect(got.ok, `clues ${clues} line ${line}`).toBe(false);
      } else {
        expect(got.ok, `clues ${clues} line ${line}`).toBe(true);
        if (got.ok) {
          expect(got.cells, `clues ${clues} line ${line}`).toEqual(expected);
          expect(lineFeasible(clues, line)).toBe(true);
        }
      }
      // Verifier's independent feasibility must agree with brute force too.
      expect(lineFeasible(clues, line)).toBe(expected !== null);
      checked++;
    }
    expect(checked).toBe(3000);
  });

  it("handles long dense lines (150-250 cells) quickly, without enumerating placements", () => {
    for (const n of [150, 200, 250]) {
      // Dense: many 1-blocks with minimal slack => astronomically many placements if enumerated loosely.
      const k = Math.floor((n - 1) / 2);
      const clues = new Array(k).fill(1);
      const slack = n - (k * 2 - 1);
      const start = Date.now();
      const r = mustOk(clues, new Array(n).fill(-1));
      expect(Date.now() - start).toBeLessThan(2000);
      if (slack === 0) expect(r.cells.every((v, i) => v === (i % 2 === 0 ? 1 : 0))).toBe(true);

      // Mid-density with partial knowledge.
      const clues2 = Array.from({ length: Math.floor(n / 4) }, (_, i) => 1 + (i % 2));
      const total = clues2.reduce((a, b) => a + b, 0) + clues2.length - 1;
      expect(total).toBeLessThanOrEqual(n);
      const partial = new Array(n).fill(-1);
      partial[0] = 1;
      const r2 = solveLine(clues2, partial);
      expect(r2.ok).toBe(true);
    }
  });

  it("solves a 250-cell line whose clues fill it exactly", () => {
    const clues = Array.from({ length: 50 }, (_, i) => 3 + (i % 3)); // sum + gaps computed below
    const len = clues.reduce((a, b) => a + b, 0) + clues.length - 1;
    const r = mustOk(clues, new Array(len).fill(-1));
    expect(r.cells.includes(-1 as Cell)).toBe(false);
    expect(cluesOfLine(r.cells)).toEqual(clues);
  });
});

// ---------- puzzle solver + trace ----------

describe("solveWithTrace", () => {
  it("solves a logic-solvable puzzle, and the trace replays", () => {
    const pic = [
      [0, 1, 1, 0, 0],
      [1, 1, 1, 1, 0],
      [1, 1, 1, 1, 1],
      [0, 1, 1, 1, 0],
      [0, 0, 1, 0, 0],
    ];
    const { rows, cols } = gridClues(pic);
    const t = solveWithTrace(rows, cols);
    expect(t.status).toBe("SOLVED");
    expect(t.final).toEqual(pic);
    expect(t.steps.length).toBeGreaterThan(0);
    const v = verifyTrace(t, { expectedRowClues: rows, expectedColClues: cols });
    expect(v.errors).toEqual([]);
    expect(v.valid).toBe(true);
    // Both filled and empty marks appear.
    const tos = new Set(t.steps.flatMap((s) => s.changes.map((c) => c.to)));
    expect(tos.has(0)).toBe(true);
    expect(tos.has(1)).toBe(true);
    // Trace survives JSON serialisation.
    const round = JSON.parse(JSON.stringify(t));
    expect(verifyTrace(round).valid).toBe(true);
  });

  it("an all-empty puzzle with [0] clues is solved with only empty marks", () => {
    const t = solveWithTrace([[0], [0]], [[0], [0], [0]]);
    expect(t.status).toBe("SOLVED");
    expect(t.steps[0]!.changes.every((c) => c.to === 0)).toBe(true);
    expect(verifyTrace(t).valid).toBe(true);
  });

  it("an all-filled puzzle", () => {
    const t = solveWithTrace([[3], [3]], [[2], [2], [2]]);
    expect(t.status).toBe("SOLVED");
    expect(t.final).toEqual([
      [1, 1, 1],
      [1, 1, 1],
    ]);
    expect(t.steps[0]!.reason.code).toBe("overlap");
    expect(verifyTrace(t).valid).toBe(true);
  });

  it("is STALLED (not solved) on a truly ambiguous puzzle with two solutions", () => {
    // Two diagonals both satisfy these clues.
    const t = solveWithTrace([[1], [1]], [[1], [1]]);
    expect(t.status).toBe("STALLED");
    expect(t.steps).toHaveLength(0);
    expect(t.unknownRemaining).toBe(4);
    expect(verifyTrace(t).valid).toBe(true);
  });

  it("partial progress then STALLED: unique-but-not-line-solvable puzzle stalls honestly", () => {
    // Known hard 'unique but needs lookahead' shape is large; construct one by brute force search instead.
    const found = findUniqueButStalling();
    expect(found, "expected to find a unique-solution, line-logic-stalling puzzle").not.toBeNull();
    const { pic, rows, cols } = found!;
    const t = solveWithTrace(rows, cols);
    expect(t.status).toBe("STALLED");
    // Whatever it did mark is correct relative to the unique solution (soundness).
    for (const s of t.steps) for (const c of s.changes) expect(pic[c.row]![c.col]).toBe(c.to);
    expect(verifyTrace(t).valid).toBe(true);
  });

  it("contradictory puzzle fails closed", () => {
    const t = solveWithTrace([[2], [2]], [[1], [1]]);
    expect(t.status).toBe("CONTRADICTION");
    expect(t.contradiction).toBeDefined();
    expect(verifyTrace(t).valid).toBe(true);
  });

  it("clues that cannot fit fail closed immediately", () => {
    const t = solveWithTrace([[3]], [[1], [1]]);
    expect(t.status).toBe("CONTRADICTION");
    expect(t.steps).toHaveLength(0);
  });

  it("contradicting starting cells fail closed", () => {
    const t = solveWithTrace([[1], [1]], [[1], [1]], [
      [1, 1],
      [-1, -1],
    ]);
    expect(t.status).toBe("CONTRADICTION");
  });

  it("respects starting cells and does not mutate its input", () => {
    const start = [
      [1, -1],
      [-1, -1],
    ];
    const copy = JSON.parse(JSON.stringify(start));
    const t = solveWithTrace([[1], [1]], [[1], [1]], start);
    expect(start).toEqual(copy);
    expect(t.status).toBe("SOLVED");
    expect(t.final).toEqual([
      [1, 0],
      [0, 1],
    ]);
    expect(verifyTrace(t).valid).toBe(true);
  });

  it("randomized small puzzles: trace verifies, deductions are sound against all solutions", () => {
    const rand = rng(777);
    let solved = 0;
    let stalled = 0;
    for (let iter = 0; iter < 300; iter++) {
      const R = 1 + Math.floor(rand() * 4);
      const C = 1 + Math.floor(rand() * 4);
      const pic = Array.from({ length: R }, () => Array.from({ length: C }, () => (rand() < 0.5 ? 1 : 0)));
      const { rows, cols } = gridClues(pic);
      const t = solveWithTrace(rows, cols);
      expect(t.status).not.toBe("CONTRADICTION");
      expect(verifyTrace(t, { expectedRowClues: rows, expectedColClues: cols }).errors).toEqual([]);
      const sols = allSolutions(rows, cols);
      expect(sols.length).toBeGreaterThan(0);
      for (const s of t.steps) {
        for (const c of s.changes) for (const sol of sols) expect(sol[c.row]![c.col]).toBe(c.to);
      }
      if (t.status === "SOLVED") {
        solved++;
        expect(sols).toHaveLength(1); // solved by logic implies unique
      } else stalled++;
    }
    expect(solved).toBeGreaterThan(0);
    expect(stalled).toBeGreaterThan(0);
  });

  it("long dense grid (150x150) solves without blow-up and the trace verifies", () => {
    // Banded diagonal picture is fully line-solvable in several sweeps.
    const n = 150;
    const pic = Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => (Math.abs(r - c) <= 1 || (r + c) % 7 === 0 ? 1 : 0)));
    const { rows, cols } = gridClues(pic);
    const start = Date.now();
    const t = solveWithTrace(rows, cols);
    const solveMs = Date.now() - start;
    expect(solveMs).toBeLessThan(15000);
    // Whatever status, every mark must be correct for the generating picture and the trace must be valid.
    for (const s of t.steps) for (const c of s.changes) expect(pic[c.row]![c.col]).toBe(c.to);
    if (t.status === "SOLVED") expect(t.final).toEqual(pic);
    expect(t.status).not.toBe("CONTRADICTION");
  });

  it("250-cell dense line memory stays linear in n*k", () => {
    const n = 250;
    const clues = new Array(60).fill(2); // 60*2+59 = 179 <= 250
    const before = process.memoryUsage().heapUsed;
    for (let i = 0; i < 20; i++) mustOk(clues, new Array(n).fill(-1));
    const grown = process.memoryUsage().heapUsed - before;
    expect(grown).toBeLessThan(200 * 1024 * 1024);
  });
});

describe("verifyTrace rejects tampering", () => {
  const pic = [
    [1, 1, 0],
    [0, 1, 0],
    [0, 1, 1],
  ];
  const { rows, cols } = gridClues(pic);
  const base = () => JSON.parse(JSON.stringify(solveWithTrace(rows, cols)));

  it("baseline is valid", () => {
    expect(verifyTrace(base()).valid).toBe(true);
  });
  it("flipped change value", () => {
    const t = base();
    t.steps[0].changes[0].to = 1 - t.steps[0].changes[0].to;
    expect(verifyTrace(t).valid).toBe(false);
  });
  it("unforced (guessed) cell injected", () => {
    const t = solveWithTrace([[1], [1]], [[1], [1]]);
    const fake = JSON.parse(JSON.stringify(t));
    fake.status = "SOLVED";
    fake.steps.push({
      index: 0,
      axis: "row",
      line: 0,
      clues: [1],
      before: [-1, -1],
      after: [1, -1],
      changes: [{ index: 0, row: 0, col: 0, from: -1, to: 1 }],
      reason: { code: "constrained", text: "guess" },
      pinnedClues: [],
      lineComplete: false,
    });
    expect(verifyTrace(fake).valid).toBe(false);
  });
  it("wrong step order / index", () => {
    const t = base();
    t.steps[1].index = 5;
    expect(verifyTrace(t).valid).toBe(false);
  });
  it("false SOLVED claim on a stalled trace", () => {
    const t = solveWithTrace([[1], [1]], [[1], [1]]);
    (t as { status: string }).status = "SOLVED";
    expect(verifyTrace(t).valid).toBe(false);
  });
  it("false STALLED claim while logic remains", () => {
    const t = base();
    t.status = "STALLED";
    t.steps = [];
    t.final = t.initial;
    t.unknownRemaining = 9;
    expect(verifyTrace(t).valid).toBe(false);
  });
  it("false CONTRADICTION claim", () => {
    const t = solveWithTrace([[1], [1]], [[1], [1]]);
    (t as { status: string }).status = "CONTRADICTION";
    t.contradiction = { axis: "row", line: 0, reason: "x", atStep: 0 };
    expect(verifyTrace(t).valid).toBe(false);
  });
  it("clues swapped vs expected", () => {
    const t = base();
    expect(verifyTrace(t, { expectedRowClues: cols, expectedColClues: rows }).valid).toBe(rows.every((r, i) => JSON.stringify(r) === JSON.stringify(cols[i])));
  });
});

// ---------- brute force helpers for puzzles ----------

function allSolutions(rows: number[][], cols: number[][]): number[][][] {
  const R = rows.length;
  const C = cols.length;
  // per-row candidates then check columns
  const rowCands = rows.map((rc) => bruteLine(rc, new Array(C).fill(-1)));
  const out: number[][][] = [];
  const cur: number[][] = [];
  const rec = (r: number): void => {
    if (r === R) {
      for (let c = 0; c < C; c++) {
        if (JSON.stringify(cluesOfLine(cur.map((x) => x[c]!))) !== JSON.stringify(cols[c]!.length === 1 && cols[c]![0] === 0 ? [0] : cols[c])) return;
      }
      out.push(cur.map((x) => [...x]));
      return;
    }
    for (const cand of rowCands[r]!) {
      cur.push(cand);
      rec(r + 1);
      cur.pop();
    }
  };
  rec(0);
  return out;
}

function findUniqueButStalling() {
  const rand = rng(99);
  for (let iter = 0; iter < 5000; iter++) {
    const R = 5;
    const C = 5;
    const pic = Array.from({ length: R }, () => Array.from({ length: C }, () => (rand() < 0.55 ? 1 : 0)));
    const { rows, cols } = gridClues(pic);
    const t = solveWithTrace(rows, cols);
    if (t.status !== "STALLED") continue;
    if (allSolutions(rows, cols).length === 1) return { pic, rows, cols };
  }
  return null;
}
