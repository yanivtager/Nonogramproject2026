# Nonogram deduction trace — integration guide

Module: `src/solver/` (pure TypeScript, no I/O, no image access).

| File | Role |
|---|---|
| `nonogram-line.ts` | `solveLine(clues, cells)` — DP line automaton, O(n·k) time/memory |
| `nonogram-trace.ts` | `solveWithTrace(rowClues, colClues, cells?)` → `NonogramTrace` |
| `nonogram-verify.ts` | `verifyTrace(trace, {expectedRowClues?, expectedColClues?})` — independent NFA-based replayer |

Cells: `-1` unknown, `0` empty (cross), `1` filled (pen). Clue `[0]` (or `[]`) = empty line.

```ts
const trace = solveWithTrace(rowClues, colClues);          // never mutates input
const check = verifyTrace(trace, { expectedRowClues: rowClues, expectedColClues: colClues });
if (!check.valid || trace.status !== "SOLVED") { /* do not render a "solve" video */ }
```

## Status contract
- `SOLVED` — every line verified against its clues by logic alone.
- `STALLED` — line logic ran out. Not an error and not "unsolvable"; the puzzle may still be unique. **Do not** render the remainder as solving progress. Either use only the verified prefix or reject the video.
- `CONTRADICTION` — inconsistent clues/cells; `trace.contradiction` names the line. Fail closed: no video.

Always run `verifyTrace` before rendering; gate on `valid && status === "SOLVED"`.

## Trace step (`trace.steps[i]`)
`index, axis ("row"|"col"), line, clues, before[], after[], changes[{index,row,col,from:-1,to:0|1}], reason{code,text}, pinnedClues[], lineComplete`.
`reason.code`: `overlap` (clue sizes alone force it), `clue_satisfied` (clue total met, rest empty), `constrained` (known cells narrow placements).
Sample: `docs/samples/nonogram-sample-trace.json` (regenerate: `npx tsx scripts/gen-nonogram-sample-trace.ts`).

## Rendering suggestions
One step = one "line action". Suggested beat per step:
1. **Highlight** the row/column band and its clue numbers (`axis`, `line`, `clues`).
2. **Pencil strokes** for `to: 1` cells and **small crosses / light shading** for `to: 0` cells. Both matter: empty marks are real deductions. Use `reason.code` to vary pacing (e.g. `overlap` steps can sweep the whole run at once; `clue_satisfied` steps cross out the remainder in a single stroke).
3. **Gradual change**: stagger `changes` left→right (or top→bottom) over the step duration with ease-in on each cell; interpolate between `before` and `after` only for cells listed in `changes` — never invent intermediate cell states. Pencil → pen: render a cell in pencil on its step, and "inked" once its row *and* column are both `lineComplete`.
4. **Completed clues**: when `lineComplete` is true, strike through/dim all clue numbers of that line. `pinnedClues` lists clue indices whose position is already unique in that line — safe to mark "located" (e.g. underline) before the whole line completes. Do not mark a clue done from anything else.
5. Step durations: allocate time proportional to `changes.length` with a floor/ceiling; for 150–250 cell puzzles batch/accelerate (e.g. group consecutive steps, show a counter) — grouping is presentation only and must preserve order.

## Not in scope here
Geometry/camera, music, real human footage and artwork reveal are separate stages. This module only produces and verifies the logical truth that those stages visualize. Large real puzzles may STALL; `STALLED` traces must not be presented as complete solves.
