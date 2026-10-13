/**
 * Pure single-line nonogram deduction using a dynamic-programming automaton.
 *
 * Cell values: -1 unknown, 0 empty, 1 filled.
 *
 * A line of n cells with clues c[0..k-1] is matched against the language
 *   0* 1^c0 0+ 1^c1 0+ ... 1^c(k-1) 0*
 * Appending a virtual empty cell at index n lets every block consume exactly
 * one trailing separator, so a state is (position i, blocks placed j).
 * Forward/backward reachability tables (O(n*k) bytes, never enumerating
 * placements) tell us, for each cell, whether any valid placement compatible
 * with the known cells can make it filled and whether any can make it empty.
 * A cell is deduced only when exactly one of the two is possible.
 */

export type Cell = -1 | 0 | 1;
export const UNKNOWN = -1;

export type LineResult =
  | {
      ok: true;
      /** Line after deduction (same length as input). */
      cells: Cell[];
      /** Indices newly determined (were unknown, now 0 or 1). */
      changed: number[];
      /** For each clue, the unique start index if every valid placement agrees, else null. */
      pinnedStarts: Array<number | null>;
    }
  | { ok: false; reason: string };

/** Normalise clues: [0] and [] both mean "no blocks". Throws on malformed clues. */
export function normalizeClues(clues: readonly number[]): number[] {
  for (const c of clues) {
    if (!Number.isInteger(c) || c < 0) throw new Error(`invalid clue value: ${c}`);
  }
  if (clues.length === 1 && clues[0] === 0) return [];
  if (clues.some((c) => c === 0)) throw new Error("zero clue is only valid as the sole clue [0]");
  return [...clues];
}

export function minLength(clues: readonly number[]): number {
  const k = clues.length;
  if (k === 0) return 0;
  return clues.reduce((a, b) => a + b, 0) + (k - 1);
}

export function solveLine(rawClues: readonly number[], line: readonly number[]): LineResult {
  const clues = normalizeClues(rawClues);
  const n = line.length;
  const k = clues.length;
  for (const v of line) {
    if (v !== -1 && v !== 0 && v !== 1) throw new Error(`invalid cell value: ${v}`);
  }
  if (minLength(clues) > n) return { ok: false, reason: "clues do not fit in line" };

  // Extended line: virtual empty cell at index n.
  const N = n + 1;
  const cell = (p: number): number => (p === n ? 0 : (line[p] as number));
  const W = k + 1;

  // canBlock[j][i]: block j can occupy i..i+c-1 followed by an empty cell at i+c (all within N).
  // Computed via prefix counts of "cannot be filled" (cell==0 in extended line) and "cannot be empty".
  const zeros = new Int32Array(N + 1); // zeros[p] = # of cells < p that are known empty
  const ones = new Int32Array(N + 1); // ones[p]  = # of cells < p that are known filled
  for (let p = 0; p < N; p++) {
    zeros[p + 1] = zeros[p]! + (cell(p) === 0 ? 1 : 0);
    ones[p + 1] = ones[p]! + (cell(p) === 1 ? 1 : 0);
  }
  const blockFits = (i: number, c: number): boolean => {
    const end = i + c; // separator index
    if (end >= N) return false;
    if (zeros[end]! - zeros[i]! !== 0) return false; // a known-empty inside the block
    return cell(end) !== 1; // separator must not be known-filled
  };

  // fwd[i*W+j]: reachable from start having consumed cells [0,i) with j blocks.
  const fwd = new Uint8Array((N + 1) * W);
  fwd[0] = 1;
  for (let i = 0; i < N; i++) {
    for (let j = 0; j <= k; j++) {
      if (!fwd[i * W + j]) continue;
      if (cell(i) !== 1) fwd[(i + 1) * W + j] = 1; // empty
      if (j < k) {
        const c = clues[j]!;
        if (blockFits(i, c)) fwd[(i + c + 1) * W + j + 1] = 1;
      }
    }
  }
  if (!fwd[N * W + k]) return { ok: false, reason: "no placement is compatible with the known cells" };

  // bwd[i*W+j]: from state (i,j) the end (N,k) is reachable.
  const bwd = new Uint8Array((N + 1) * W);
  bwd[N * W + k] = 1;
  for (let i = N - 1; i >= 0; i--) {
    for (let j = 0; j <= k; j++) {
      let ok = 0;
      if (cell(i) !== 1 && bwd[(i + 1) * W + j]) ok = 1;
      if (!ok && j < k) {
        const c = clues[j]!;
        if (blockFits(i, c) && bwd[(i + c + 1) * W + j + 1]) ok = 1;
      }
      bwd[i * W + j] = ok;
    }
  }

  // Possibility marks via difference array for filled, direct marks for empty.
  const fillDiff = new Int32Array(N + 2);
  const canEmpty = new Uint8Array(N);
  const startCount = new Int32Array(k);
  const firstStart = new Int32Array(k).fill(-1);
  for (let i = 0; i < N; i++) {
    for (let j = 0; j <= k; j++) {
      if (!fwd[i * W + j]) continue;
      if (cell(i) !== 1 && bwd[(i + 1) * W + j]) canEmpty[i] = 1;
      if (j < k) {
        const c = clues[j]!;
        if (blockFits(i, c) && bwd[(i + c + 1) * W + j + 1]) {
          fillDiff[i]!++;
          fillDiff[i + c]!--;
          canEmpty[i + c] = 1; // the mandatory separator after the block
          startCount[j]!++;
          if (firstStart[j] === -1) firstStart[j] = i;
        }
      }
    }
  }

  const out: Cell[] = new Array(n);
  const changed: number[] = [];
  let run = 0;
  for (let p = 0; p < n; p++) {
    run += fillDiff[p]!;
    const canFill = run > 0;
    const can0 = canEmpty[p] === 1;
    const cur = line[p] as Cell;
    if (cur !== UNKNOWN) {
      out[p] = cur;
      // Sanity: a known cell must remain possible given a feasible line.
      if (cur === 1 ? !canFill : !can0) return { ok: false, reason: "internal inconsistency" };
    } else if (canFill && !can0) {
      out[p] = 1;
      changed.push(p);
    } else if (can0 && !canFill) {
      out[p] = 0;
      changed.push(p);
    } else if (!canFill && !can0) {
      return { ok: false, reason: "internal inconsistency" };
    } else {
      out[p] = UNKNOWN;
    }
  }
  const pinnedStarts = clues.map((_, j) => (startCount[j] === 1 ? firstStart[j]! : null));
  return { ok: true, cells: out, changed, pinnedStarts };
}
