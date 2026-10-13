/**
 * Line-logic nonogram solver that emits a machine-readable deduction trace.
 *
 * Input: row/column clues and current cells (-1 unknown, 0 empty, 1 filled).
 * It never sees a solution image. It only writes cells that are common to
 * every placement of a line compatible with current knowledge, so every trace
 * step is a sound deduction. If line logic cannot finish, the result is
 * STALLED (never "solved by guessing"). Inconsistent input fails closed.
 */

import { normalizeClues, solveLine, UNKNOWN, type Cell } from "./nonogram-line";

export const TRACE_VERSION = 1;

export type Axis = "row" | "col";
export type TraceStatus = "SOLVED" | "STALLED" | "CONTRADICTION";

export type ReasonCode =
  /** Line had no known cells; clue sizes alone force these cells (overlap / slack argument). */
  | "overlap"
  /** Clue total is now met by known filled cells; remaining unknowns must be empty. */
  | "clue_satisfied"
  /** Known cells in the line restrict every valid placement to agree on these cells. */
  | "constrained";

export interface TraceCellChange {
  /** Index along the line. */
  index: number;
  row: number;
  col: number;
  from: -1;
  /** 1 = pen/filled, 0 = empty (cross-out). */
  to: 0 | 1;
}

export interface TraceStep {
  index: number;
  axis: Axis;
  line: number;
  clues: number[];
  before: Cell[];
  after: Cell[];
  changes: TraceCellChange[];
  reason: { code: ReasonCode; text: string };
  /** Clue indices whose start position is identical in every valid placement (safe to mark "located"). */
  pinnedClues: number[];
  /** True when the line has no unknown cells after this step (all its clues are complete). */
  lineComplete: boolean;
}

export interface Contradiction {
  axis: Axis;
  line: number;
  reason: string;
  /** Step index the failed check would have had (== number of steps emitted). */
  atStep: number;
}

export interface NonogramTrace {
  version: number;
  rows: number;
  cols: number;
  rowClues: number[][];
  colClues: number[][];
  initial: Cell[][];
  final: Cell[][];
  status: TraceStatus;
  steps: TraceStep[];
  contradiction?: Contradiction;
  unknownRemaining: number;
}

export function emptyGrid(rows: number, cols: number): Cell[][] {
  return Array.from({ length: rows }, () => new Array<Cell>(cols).fill(UNKNOWN));
}

function readLine(grid: Cell[][], axis: Axis, idx: number): Cell[] {
  return axis === "row" ? [...grid[idx]!] : grid.map((r) => r[idx]!);
}

function validateShape(rowClues: number[][], colClues: number[][], cells: number[][]): void {
  if (cells.length !== rowClues.length) throw new Error("cells row count != rowClues length");
  for (const r of cells) {
    if (r.length !== colClues.length) throw new Error("cells column count != colClues length");
    for (const v of r) if (v !== -1 && v !== 0 && v !== 1) throw new Error(`invalid cell value ${v}`);
  }
}

function classify(clues: number[], before: Cell[], after: Cell[]): { code: ReasonCode; text: string } {
  const total = clues.reduce((a, b) => a + b, 0);
  const filledBefore = before.filter((v) => v === 1).length;
  const filledAfter = after.filter((v) => v === 1).length;
  const unknownBefore = before.filter((v) => v === UNKNOWN).length;
  if (unknownBefore === before.length) {
    return {
      code: "overlap",
      text: `Clues [${clues.join(",") || "0"}] in ${before.length} cells leave slack ${
        before.length - (total + Math.max(0, clues.length - 1))
      }; the cells shared by every placement are forced.`,
    };
  }
  if (filledBefore === total && filledAfter === total) {
    return {
      code: "clue_satisfied",
      text: `Known filled cells already account for all ${total} clue cells; the remaining unknown cells must be empty.`,
    };
  }
  return {
    code: "constrained",
    text: "Given the cells already known, every valid placement of the clues agrees on these cells.",
  };
}

/**
 * Run line logic to a fixpoint. `cells` is never mutated. Lines are visited in
 * a deterministic order (rows 0..R-1 then columns 0..C-1), only re-queued when
 * a crossing cell changed, and a step is emitted only when a line changes.
 */
export function solveWithTrace(
  rowClues: number[][],
  colClues: number[][],
  cells?: number[][],
): NonogramTrace {
  const R = rowClues.length;
  const C = colClues.length;
  const rc = rowClues.map(normalizeClues);
  const cc = colClues.map(normalizeClues);
  const init = (cells ?? emptyGrid(R, C)) as Cell[][];
  validateShape(rowClues, colClues, init);
  const grid: Cell[][] = init.map((r) => [...r]);
  const initial: Cell[][] = init.map((r) => [...r]);

  const dirtyRows = new Array<boolean>(R).fill(true);
  const dirtyCols = new Array<boolean>(C).fill(true);
  const steps: TraceStep[] = [];

  const finish = (status: TraceStatus, contradiction?: Contradiction): NonogramTrace => ({
    version: TRACE_VERSION,
    rows: R,
    cols: C,
    rowClues: rc,
    colClues: cc,
    initial,
    final: grid.map((r) => [...r]),
    status,
    steps,
    ...(contradiction ? { contradiction } : {}),
    unknownRemaining: grid.reduce((s, r) => s + r.filter((v) => v === UNKNOWN).length, 0),
  });

  let progress = true;
  while (progress) {
    progress = false;
    for (const axis of ["row", "col"] as const) {
      const count = axis === "row" ? R : C;
      const dirty = axis === "row" ? dirtyRows : dirtyCols;
      for (let li = 0; li < count; li++) {
        if (!dirty[li]) continue;
        dirty[li] = false;
        const clues = (axis === "row" ? rc : cc)[li]!;
        const before = readLine(grid, axis, li);
        const res = solveLine(clues, before);
        if (!res.ok) {
          return finish("CONTRADICTION", { axis, line: li, reason: res.reason, atStep: steps.length });
        }
        if (res.changed.length === 0) continue;
        progress = true;
        const changes: TraceCellChange[] = res.changed.map((idx) => ({
          index: idx,
          row: axis === "row" ? li : idx,
          col: axis === "row" ? idx : li,
          from: -1,
          to: res.cells[idx] as 0 | 1,
        }));
        for (const ch of changes) {
          grid[ch.row]![ch.col] = ch.to;
          if (axis === "row") dirtyCols[ch.col] = true;
          else dirtyRows[ch.row] = true;
        }
        steps.push({
          index: steps.length,
          axis,
          line: li,
          clues: [...clues],
          before,
          after: res.cells,
          changes,
          reason: classify(clues, before, res.cells),
          pinnedClues: res.pinnedStarts.flatMap((s, j) => (s === null ? [] : [j])),
          lineComplete: !res.cells.includes(UNKNOWN as Cell),
        });
      }
    }
  }

  const unknown = grid.some((r) => r.includes(UNKNOWN as Cell));
  return finish(unknown ? "STALLED" : "SOLVED");
}
