# Independent bounded review of the dense-memory remedy

## Decision

**The requested stale-memory geometry contract passes this independent synthetic recheck.** The remedy preserves true-position glyphs and admits only contained full badges clear of every on-screen stale glyph and every other admitted badge. Omission is intentional, with complete frozen details retained for the Pause list. There is no requirement that every full label fit simultaneously.

**One narrow cross-layer limitation remains:** known-citadel text is not part of the reservation set. A separate two-pass substitute-font probe can intersect the known citadel title in a legal long-name case. This is not a failure of the stale-versus-stale contract, is not established as a new regression, and needs native pixels before treating it as a meaningful native readability defect. Details below.

No candidate source was edited. No browser was used. The original review artifacts remain byte-identical; `original-evidence-verification.txt` records all 12 original artifact checks passing.

## Exact candidate reviewed

SHA-256:

- `dist/fog-view.js`: `be9a2aac5128b2160ac8bae99409ad42fb9f0c11c7d360d972c07ac6511315cc`
- `dist/app.js`: `6b1973c3bc03329caa29822d542d6358855010bd8fd58f8e57c2a969537e343c`
- `dist/index.html`: `58497be9ffd3fa5c298f1424934e500f6f8621fddb51798834b0e395563e0663`
- `dist/styles.css`: `1ef35bf952b3d4d37cd2883ff537d4af7f57f2ff478f5a2f77ca6b745f8e35e5`

The full 12-input hash manifest, including renderer, engine, fog, rulesets, harness and focused tests, is `source-hashes.json`. Inputs were rechecked unchanged after execution/report preparation. These hashes supersede the original review's source hashes only for this remedy review; the old report is not rewritten or relabelled.

## Bounded independent checks

The previous executable review was adapted only in this new `remedy/` folder. It still imports the actual candidate engine/observation/renderer methods. Capture was adjusted for the separate glyph and badge passes, the 10px compact glyph text, and truthful badge omission. Assertions inspect recorded paint calls, **not the `layoutMemoryBadges` return value**.

Thirteen representative cases × three metric backends = **39 draw runs**:

- Default-scale desktop mixed same-road, common Watchtower/Barracks pair, neighboring roads and two-column grid.
- Compact left/right edge, partially visible edge marker, and fully offscreen right marker.
- Short-field neighboring roads at default zoom.
- Short-field vertical culling and shallow-field cross-row geometry at renderer stress zooms.
- Secondary engine-valid 108-world-unit spacing, explicitly distinct from ordinary 140-unit snapped sites.
- Tall-field mixed row.

Backends are independently measured DejaVu Sans, measured Noto Sans, and the existing fixed 7px/character stub. Font widths/ink bounds are local Pillow/FreeType substitutes, **not browser Canvas font measurements or native rasterization**. Fonts and hashes are retained in the metric artifact.

Every run passed:

1. **Glyph preservation:** every remembered marker rectangle with positive visible area produces exactly one glyph rectangle at the actual projected world position. No glyph relocation follows a badge. Partial markers remain; wholly offscreen markers are culled in both dimensions.
2. **2D badge containment:** every admitted badge is within the conservative field safe region: left ≥4, right ≤width−64, top ≥84, bottom ≤height−90.
3. **No stale-glyph collisions:** every admitted badge clears every on-screen stale glyph by the implementation's 2px separation, including glyphs drawn later in the prior layout.
4. **No badge collisions:** every admitted badge clears other admitted badges by the implementation's 3px separation.
5. **Anchored association:** admitted badges remain centered on their own marker, at projected y+3. There is no edge clamping, displacement or leader-line ambiguity.
6. **Complete accepted text:** each accepted badge paints the expected frozen full name/level and timestamp. With both measured font substitutes, the sampled ink bounds fit within its backing rectangle.
7. **Truthful omission:** every memory, including one without a full badge or offscreen glyph, has exactly one complete `observationHUD.memoryDetails` string containing frozen full name, level, time, “Current health and production unknown,” road and map x position. Omitted text is not silently discarded from the detail model.
8. **Observation stability:** rendering leaves each input observation unchanged.

### Representative DejaVu outcomes

| Case | Visible glyphs | Accepted badges | Complete detail entries |
|---|---:|---:|---:|
| 1139×398 mixed row | 4 | 2 | 4 |
| 1139×398 Watchtower/Barracks pair | 2 | 1 | 2 |
| 1139×398 two-column, three-road grid | 6 | 2 | 6 |
| 1139×398 neighboring roads | 3 | 2 | 3 |
| 390×350 left edge | 2 | 0 | 2 |
| 390×350 right edge | 2 | 0 | 2 |
| 390×350 partially visible left marker | 2 | 0 | 2 |
| 390×350 fully offscreen right marker | 1 | 0 | 2 |
| 320×125 neighboring roads | 3 | 0 | 3 |
| 320×125 zoom-1.7 culling stress | 1 | 0 | 3 |
| 844×220 zoom-0.7 cross-row stress | 3 | 0 | 3 |
| 390×350 secondary 108-unit spacing | 3 | 1 | 3 |
| 1180×757 mixed row | 4 | 2 | 4 |

The conservative margins omit some badges that would fit in bare canvas space. That is consistent with the chosen policy and is **not counted as a failure**. Native checking still needs to establish that the Pause route and fixed margins suit the actual app layout.

## Fallback wiring checked from source

`dist/app.js:2398–2418` takes `observationHUD(view).memoryDetails`, inserts each string through `textContent` into the conditional Pause list, and preserves mounted entries when the detail signature is unchanged. Entries have `tabindex=0`. `index.html` supplies the conditional “Dashed markers: last seen · Details in Pause” hint and semantic `<details>` container; the Pause button is described by that hint when applicable. CSS supplies a scrollable list, wrapping, focus styling and 44px minimum entry height.

This source trace plus the complete-string assertions confirms the rendering fallback receives the required frozen detail data. It does **not** substitute for the other reviewer's focus/hidden-state audit or actual keyboard/touch/screen-reader use. No native accessibility compliance claim is made here.

## Focused existing/new tests

Command:

```sh
node --test tests/fog-memory-density.test.mjs tests/fog-memory-scene.test.mjs tests/fog-view.test.mjs
```

**25/25 passed**, recorded in `focused-tests.tap`. This includes the candidate's hidden-change differential, deterministic incoming-order check and dense synthetic replacement sequence. It is a focused check, not an aggregate/release pass.

The independent transcript run initially used strict floating-point equality when reconstructing one marker's y coordinate and hit a 1.4e−14 arithmetic difference. The review assertion was changed to a 1e−9 tolerance. This was a review-harness issue, not a candidate finding; no runtime adjustment was made.

## Remaining cross-layer limitation: known-citadel title

The layout reserves stale glyphs and admitted memory badges, plus fixed UI margins. It does not reserve known-citadel text, live observed actors, or every other canvas overlay. The stale-memory results above must not be described as a universal no-occlusion guarantee.

A small separate probe executes the actual `drawBase` and `drawMemories` methods with the same substitute font metrics and normal projection. It uses real legal sell/build calls in a disposable synthetic game to place either Barracks or Arcane sanctum at the ordinary site **(2790,450)**, observes it, then withdraws the scout. It compares the accepted memory badge with the known citadel text's measured ink bounding rectangle.

- At **1139×398**, scale .442222…, camera clamped to the right, a remembered **Arcane sanctum** badge is admitted at x≈888.505 to 1026.872, y=202 to 231. With **DejaVu**, it intersects the `ENEMY CITADEL` ink bounds by about **9.43×7.83px**. With **Noto**, this desktop intersection does not occur. A Barracks badge does not intersect those title bounds at this desktop size.
- At the **390×350 synthetic field model**, the long-name badge intersects the title bounds with both fonts, about 31.29×9.25px (DejaVu) or 11.52×9px (Noto). A very shallow bounding-box intersection with the top of `HEALTH UNKNOWN` also appears; this is not evidence that the meaningful health-status text becomes unreadable.

This probe is **two renderer passes with projected substitute-font bounds**, not a complete-frame screenshot, native pixel coverage, mobile evidence or a played match. Bounding-box intersection is weaker evidence than the prior measured timestamp ink coverage. The broad stale-marker/title issue is materially repaired, and this narrow cross-layer issue is not shown to be newly introduced.

Suggested next decision: inspect the legal long-name rear-site case in an authorized native desktop pass if useful. If actual pixels show meaningful interference, the smallest extension is to reserve the known citadel's public label footprint when admitting a badge. Do not use private enemy state or add general label packing. This review does not request further source edits while native QA is underway.

## Evidence and reproduction

All new files are under `/workspace/shared/ironroot-fog-dense-review/remedy/`:

- `run-remedy-review.mjs`: adapted independent actual-renderer transcript recorder and assertions.
- `prepare-metrics.py`, `font-metrics.json`: immutable original metric inputs plus compact/citadel metrics.
- `draw-transcripts.json`: 39 actual renderer-call streams and input geometry.
- `validation.json`, `run-summary.json`: independent pass results and omission/detail counts.
- `source-hashes.json`: exact reviewed candidate inputs.
- `focused-tests.tap`: 25/25 focused checks.
- `probe-citadel.mjs`, `citadel-probe.json`, `citadel-summary.jsonl`: separately scoped residual probe.
- `original-evidence-verification.txt`: unchanged original artifacts.
- `ARTIFACTS.sha256`: this remedy report and evidence hashes.

```sh
python /workspace/shared/ironroot-fog-dense-review/remedy/prepare-metrics.py
node /workspace/shared/ironroot-fog-dense-review/remedy/run-remedy-review.mjs
node /workspace/shared/ironroot-fog-dense-review/remedy/probe-citadel.mjs
```

No browser, mobile retry, responsive emulation, iframe, browser protocol, hosting, publication, profile/storage change or paid-gameplay operation occurred in this review.
