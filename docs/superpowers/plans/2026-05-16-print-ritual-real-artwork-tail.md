# PrintRitualReal ArtworkTail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After the Kling background video ends at ~16s (480 frames), crossfade (~0.7s) into a slow Ken-Burns push on `listing.solved_artwork_url` for the remaining narration duration; fall back to the current Loop behavior when the URL is null.

**Architecture:** A new `ArtworkTail` component is added inside `PrintRitualReal.tsx`. It renders the artwork image with an opacity fade-in (crossfade) and a subtle scale animation (Ken-Burns). It sits in the JSX stack between the Kling video and the gradient overlay so the vignette and all brand overlays remain above it. The Kling video block is conditionally rendered without `<Loop>` when an artwork URL is present (so the video plays once and holds its last frame during the crossfade), and keeps `<Loop>` when the artwork URL is null.

**Tech Stack:** Remotion (`useCurrentFrame`, `useVideoConfig`, `interpolate`, `AbsoluteFill`, `Img`), React, TypeScript

---

## File Map

| File | Action | What changes |
|------|--------|--------------|
| `video-pipeline/src/compositions/PrintRitualReal.tsx` | Modify | Add `ArtworkTail` component; conditionally split Loop/no-Loop for the Kling video block; insert `<ArtworkTail>` between the video and gradient overlay |

No other files need changes. `BrandOverlays.tsx`, `types.ts`, and `data/types.ts` are read-only for this task.

---

## Constants (reference throughout)

```typescript
const KLING_DURATION_FRAMES = 480; // 16 s × 30 fps — crossfade trigger point
const CROSSFADE_FRAMES = Math.round(0.7 * 30); // 21 frames ≈ 0.7 s
```

---

### Task 1: Add `ArtworkTail` and wire it into `PrintRitualRealComposition`

**Files:**
- Modify: `video-pipeline/src/compositions/PrintRitualReal.tsx`

There is no meaningful unit-testable logic here — `interpolate` is a Remotion primitive, and the component is pure JSX. Verification is done by visual inspection in Remotion Studio (see Step 4).

- [ ] **Step 1: Update the remotion import to include `useCurrentFrame` and `Img`**

Open `video-pipeline/src/compositions/PrintRitualReal.tsx`. The current import is:

```typescript
import {
  AbsoluteFill,
  Audio,
  Loop,
  Sequence,
  Video,
  interpolate,
  staticFile,
  useVideoConfig,
} from "remotion";
```

Replace with:

```typescript
import {
  AbsoluteFill,
  Audio,
  Img,
  Loop,
  Sequence,
  Video,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
```

- [ ] **Step 2: Add the two constants just below the existing `DEFAULT_LOOP_DURATION_FRAMES` constant**

Current line 30:
```typescript
const DEFAULT_LOOP_DURATION_FRAMES = 15 * 30;
```

Add immediately after:
```typescript
const KLING_DURATION_FRAMES = 480; // 16 s × 30 fps — crossfade trigger point
const CROSSFADE_FRAMES = Math.round(0.7 * 30); // ~21 frames
```

- [ ] **Step 3: Add the `ArtworkTail` component**

Add this component anywhere in the file after the constants and before the export (e.g. just before `TopStatsBar`). It must not be inside another component.

```typescript
const ArtworkTail: React.FC<{ artworkUrl: string }> = ({ artworkUrl }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const opacity = interpolate(
    frame,
    [KLING_DURATION_FRAMES, KLING_DURATION_FRAMES + CROSSFADE_FRAMES],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const scale = interpolate(
    frame,
    [KLING_DURATION_FRAMES, durationInFrames],
    [1.0, 1.06],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill style={{ opacity }}>
      <Img
        src={artworkUrl}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${scale})`,
          transformOrigin: "center center",
        }}
      />
    </AbsoluteFill>
  );
};
```

Why `Img` and not `<img>`? Remotion's `<Img>` waits for the image to load before the frame is considered ready — prevents a blank flash on the first frame of the crossfade.

Why no `overflow: hidden` wrapper? `AbsoluteFill` already clips to the composition bounds, so the Ken-Burns scale won't bleed outside the frame.

- [ ] **Step 4: Replace the background video block to conditionally loop or play once**

Current background video block (lines 55–68):

```typescript
{backgroundVideoPath ? (
  <Loop durationInFrames={DEFAULT_LOOP_DURATION_FRAMES}>
    <Video
      src={toRemotionAsset(backgroundVideoPath)}
      muted
      style={{
        width: "100%",
        height: "100%",
        objectFit: "cover",
        objectPosition: "center center",
      }}
    />
  </Loop>
) : null}
```

Replace with:

```typescript
{backgroundVideoPath ? (
  listing.solved_artwork_url ? (
    <Video
      src={toRemotionAsset(backgroundVideoPath)}
      muted
      style={{
        width: "100%",
        height: "100%",
        objectFit: "cover",
        objectPosition: "center center",
      }}
    />
  ) : (
    <Loop durationInFrames={DEFAULT_LOOP_DURATION_FRAMES}>
      <Video
        src={toRemotionAsset(backgroundVideoPath)}
        muted
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "center center",
        }}
      />
    </Loop>
  )
) : null}
```

When `solved_artwork_url` is present: no `<Loop>` — Remotion's `<Video>` holds its last frame once playback ends, so the artwork crossfades over a frozen Kling last-frame. When null: current Loop behavior is preserved unchanged.

- [ ] **Step 5: Insert `<ArtworkTail>` into the JSX after the video block and before the gradient overlay**

Current gradient overlay (lines 70–75):

```typescript
<AbsoluteFill
  style={{
    background:
      "radial-gradient(ellipse 80% 90% at 50% 50%, rgba(0,0,0,0) 30%, rgba(0,0,0,0.42) 100%)",
  }}
/>
```

Insert the following **immediately before** that gradient block:

```typescript
{listing.solved_artwork_url ? (
  <ArtworkTail artworkUrl={listing.solved_artwork_url} />
) : null}
```

The gradient, TopStatsBar, captions, BrandCorner, and CtaStrip all remain above it in the JSX stack — so the vignette and all brand elements continue to render on top of both the Kling video and the artwork tail.

- [ ] **Step 6: TypeScript check**

Run from `video-pipeline/`:

```
npx tsc --noEmit
```

Expected: zero errors. If there are errors related to `Img` not being in the remotion types, confirm that the installed remotion version exports `Img` (it does since v3). Fix any import issues before proceeding.

- [ ] **Step 7: Visual verification in Remotion Studio**

Start the preview server:

```
cd video-pipeline && npx remotion studio
```

Open the `PrintRitualReal` composition in the browser. Scrub to frame 480 and confirm:
- The Kling video is frozen on its last frame
- The artwork image begins fading in
- By frame ~501 the artwork fills the frame
- A gentle Ken-Burns zoom is visible (scale 1.0 → 1.06 over the tail)
- The gradient vignette, caption bars, BrandCorner, and gold CTA strip all render above the artwork

Also confirm that a listing with `solved_artwork_url = null` still loops the Kling video as before.

- [ ] **Step 8: Commit**

```bash
git add video-pipeline/src/compositions/PrintRitualReal.tsx
git commit -m "feat(print-ritual-real): crossfade to Ken-Burns artwork tail after Kling video ends"
```

---

## Self-Review

**Spec coverage:**
- [x] ArtworkTail component inside `PrintRitualReal.tsx` — Task 1 Step 3
- [x] Crossfade ~0.7s starting at frame 480 — constants + ArtworkTail opacity interpolation
- [x] Slow Ken-Burns push — scale 1.0→1.06 interpolation in ArtworkTail
- [x] CTA strip sits on top — CTA is later in the JSX stack, unchanged
- [x] Null fallback → Loop behavior preserved — conditional in Step 4
- [x] No other files modified — confirmed; only `PrintRitualReal.tsx` changes

**Placeholder scan:** None found.

**Type consistency:** `artworkUrl: string` passed to `ArtworkTail` matches `listing.solved_artwork_url` which is `string | null` — the null guard in Step 5 ensures only non-null values reach the component.
