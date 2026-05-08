# GrandGridStudio Video Pipeline

The Claude-owned backend half of the short-form video factory. Lovable owns the review UI in a separate repo (`nonogram-review-ui`).

## What lives here

- **Data model & migrations** — Supabase migrations live in `../supabase/migrations/006_*` and `007_*`.
- **Remotion compositions** — `src/compositions/` (one component per template).
- **TTS** — `src/tts/` (Microsoft Edge TTS wrapper + audio cache).
- **Narration** — `src/narration/` (structured script templates with `{{listing.cell_count}}` interpolation).
- **Validation gate (the anti-250k structural lock)** — `src/validation/`. Four layers: single-source-of-truth + structured scripts + pre-TTS numeric assertion + render-time visual assertion.
- **Self-review** — `src/self-review/`. Five-layer QA pipeline: format/integrity, audio fidelity (Whisper transcription), visual inspection (multimodal keyframes), effectiveness scorecard, subjective grading.
- **Render worker** — `src/render-worker/`. Runs on the Hetzner VM as a systemd service polling Supabase for queued renders.

## Hard rules

1. **No product facts in code.** Cell counts, grid sizes, Etsy URLs, listing names live ONLY in the `listings` table. Never hardcoded in compositions, narration templates, or scripts.
2. **Narration is structured, not prose.** A script is `{ segments: [{ kind: "scale", template: "scale_shock_v1" }, ...] }`. Numbers come from `listing.cell_count.toLocaleString()` interpolation, never typed by a human.
3. **Every numeric token must trace back to a column.** The pre-TTS gate (`src/validation/numeric-tokens.ts`) extracts every number from the rendered narration and asserts it equals `listing.cell_count`, `listing.grid_size`, `listing.puzzle_count`, or another known field. Unknown numbers fail the build.

## Commands

```bash
npm install
npm run typecheck
npm run test
npm run render -- --listing dragons-wrath --language en --out out/renders
npm run self-review -- <path-to-mp4>
npm run lovable-qa -- --repo <path-to-nonogram-review-ui>
```

Phase-0 local smoke commands:

```bash
npm run render -- --listing dragons-wrath --language en --out out/renders
npm run self-review -- out/renders/dragons-wrath-scale-shock-en.mp4 --keyframes
npm run curate:voices -- --dry-run
npm run curate:music
npm run upload:artwork
npm run gen:types
```

Notes:

- `curate:voices -- --dry-run` writes the browse page without synthesizing all voice samples. Remove `--dry-run` when ready to generate the full Edge TTS sample slate.
- `curate:music` writes a Pixabay shortlist and approval manifest; actual downloaded track files must be recorded before production renders use music.
- `gen:types` writes `../shared/types.ts`, the read-only contract that Lovable imports.

## Hosting

- **Phase 0 dev:** local Windows machine for fast iteration.
- **Phase 1+ production renders:** Hetzner CPX22 VM (178.104.137.140). Systemd service polls Supabase for `renders` rows in `queued` state.

## Why this exists separately from `short-form-studio/`

`short-form-studio/` is the failed Lovable attempt. It mixed correctness-critical render code with React UI in a single client-only app, with hardcoded product data duplicated across two files. The 250,000-vs-15,000 narration bug was a direct consequence of that architecture. This new pipeline puts the data model behind Supabase, the render behind Remotion compositions with typed props, and forbids Lovable from touching either.
