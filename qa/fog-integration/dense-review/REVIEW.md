# Dense remembered-building readability review

## Result

**A local presentation remedy is warranted.** Legal, ordinarily snapped adjacent buildings can have distinct compact markers while their full last-seen badges paint over one another's names, levels and observation times. This occurs at default zoom and at the field dimensions recorded by the previous desktop pass. It does not require the engine's tighter 108-world-unit minimum spacing or an impossible building pile.

This is **executable synthetic renderer evidence**, not native-browser pixels, phone certification, a played match, paid gameplay, performance evidence or a screen-reader/device test. No browser was used. The denied mobile path was not retried or replaced. Candidate runtime and tests were not edited.

## Findings, ordered by practical impact

### 1. Ordinary same-road placement loses meaningful text at default scale

The normal renderer snap columns are 140 world units apart. The primary layout uses four legal enemy sites on the middle road: `(1950,450)`, `(2090,450)`, `(2230,450)`, `(2370,450)`, with Arcane sanctum, Archery range, Siege foundry and Gryphon aerie, respectively. Each passed the real `Game.canBuild` and `Game.build`; all are in `buildSites(map,1)`. A disposable synthetic game supplied funds and scout positions to create genuine observation records, then withdrew the scout. No saved/paid game or storage was used.

At the previous desktop pass's **1139 × 398 field**, default zoom 1 gives scale `398/900 = 0.442222…`, so adjacent sites project **61.9111 CSS px** apart. The marker width is only **30.9556 px**, so these are not overlapping building markers.

Actual calls from unmodified `FogRenderer.drawMemories`, with two substitute sans-serif metric sources:

| Metric source | Badge widths, left to right | Adjacent badge intersections |
|---|---|---|
| DejaVu Sans | 138.3672, 126.6875, 125.2930, 126.5859 px | 70.6162, 64.0791, 64.0283 px wide × 29 px high |
| Noto Sans | 122.4023, 111.3242, 109.3398, 111.6563 px | 54.9522, 48.4209, 48.5869 px wide × 29 px high |

For example, the DejaVu first badge occupies `x=517.0386… to 655.4058…`, `y=202 to 231`. The next badge starts at `x=584.7896…`. Both text lines of the first badge have already been painted before that next fill.

The later badge uses `#122720f2`, alpha `242/255 = 94.90%`. Synthetic glyph-ink analysis of the same transcripts shows:

- **All of the `2:05` timestamp digits in each of the first three badges are under a later badge rectangle**, with both substitute font families. The original pixels retain only about 5.10% of their contribution after one such fill, before later text/strokes are considered.
- Around **37–48% of the earlier full-title ink** is under later badge fills across those two font families. This is actual name/level text interference, not merely decorative rectangle overlap.
- The last-painted memory remains legible, so draw/ID order arbitrarily determines which details survive.

This also occurs with a less elaborate **two-building Watchtower + Barracks pair**, `(2090,450)` and `(2230,450)`. At the same desktop field, badge overlap is 32.53–45.93 px wide; **89–100% of the earlier timestamp digits** are under the later badge fill. At the 390 × 350 field model, both font families cover all those timestamp digits. The issue is not restricted to the longest building names.

### 2. Camera-edge clamping can collapse two distinct labels onto the same edge

At the 390 × 350 **synthetic field model**, scale `0.388888…`, a legal Arcane sanctum/Archery range pair at `(2090,450)` and `(2230,450)` was tested centered, at either horizontal edge, partially crossing either edge and entirely past the right cull boundary.

At the left edge, actual camera `2591.428571…` projects marker centers to `x=0` and `x=54.444444…`. Both full badges clamp their **left edge to x=4**, although the markers remain distinct. With DejaVu metrics their horizontal spans are `[4,142.3672]` and `[4,130.6875]`.

The later fill covers **94–95% of the first title's ink and 100% of its timestamp line**, across the two font families. The mirrored right-edge case likewise collapses the two badges against the same right inset. These are inside-viewport collisions, so a horizontal containment assertion passes.

Positive boundary result: once the rightmost marker is fully beyond its marker-width cull boundary, its badge is not drawn. The review does not claim that wholly offscreen memories always teleport labels to the edge. Partial marker visibility and separate label clamping are enough to produce the collision.

### 3. Neighboring roads are generally separated at default zoom, but short fields clip detail

The legal neighboring-road layout uses the same x=2230 on y=260, 450 and 640. At default zoom:

- At 1139 × 398, 390 × 350, 844 × 220 and 1180 × 757 field models, these vertically aligned memories do **not** overlap one another's badges or markers, and their badges fit vertically.
- At **320 × 125**, the scale floor remains 0.32. The bottom-road marker ends at y=123.3 and is visible, but its badge is drawn at **y=126.3 to 155.3**, completely below the 125px field. Both the full name/level and timestamp glyphs are clipped. The compact marker survives. This is a short-field model already represented in the existing geometry tests; this review does not establish that a native phone currently reaches this exact field size.
- The implementation has horizontal marker culling and horizontal label clamping, but no corresponding vertical badge placement or containment handling.

Additional renderer-only zoom stress, **not an asserted ordinary input path**:

- At 844 × 220 with zoom 0.7, scale 0.224, road separation becomes 42.56px. Each next-road 24px-tall marker overlaps the preceding road's badge by **26 × 13.44px**. It paints over about 35–36% of that preceding `Last seen 2:05` line's ink, primarily the wording rather than the time digits.
- At zoom 1.7, bottom-road text can clip in a shallow field.
- The current app initializes renderer zoom to 1 and preserves it during renderer replacement. No normal zoom-control mutation was found in `dist/app.js`; .7/1.7 mirror existing test inputs and must remain labelled stress cases.

### 4. Not every background overlap is a meaningful failure

At the tall 1180 × 757 field model, 140 world units project to 117.76px. Noto's long-name badges can have small background intersections without any sampled title or timestamp ink being covered. DejaVu has small trailing-title interference in that case, while all timestamp ink remains clear.

Therefore the acceptance goal should be **unambiguous stale-marker association and reliably reachable full details**, not “every full label is always visible” or “no two background rectangles may ever touch.” The default shorter field cases above are materially different because actual time/name information is painted over.

## Smallest robust presentation scheme recommended

Keep compact markers always visible and move full detail to **one on-demand inspector**:

1. Keep the muted dashed marker and short type/level glyph at the actual world position. Make stale status explicit through a persistent, accessible legend such as “Dashed markers: last seen.” Do not fabricate live HP, production or recency.
2. On inspecting a memory, show its full name, level and exact frozen observation time in one small viewport-contained card or existing selection panel. Only one full card is needed; its position can be clamped in both dimensions without moving or confusing the world marker.
3. Support **tap/click and keyboard inspection**, not hover alone. Existing ordinary selection only searches owned live buildings (`dist/app.js:2082–2088`), so memory inspection needs an explicit observation-only path. Do not accidentally turn a build/spell action into inspection, or make an old enemy memory actionable as a live owned building.
4. Provide comfortably sized touch targets and a deterministic nearest-marker or short chooser/list when hit regions overlap. Compact marker dimensions can be below a practical touch target size; making only the painted 26px box tappable would not solve touch access. A roughly 44px target is a useful design target, not a claim of measured compliance.
5. Make each memory reachable through a semantic, keyboard-focusable details list/inspector with name, level, frozen time and useful road/site association. Preserve “Current health and production unknown.” Existing `observationHUD` already supplies all memory details in the battle's description and minimap label, but that long aggregate description is not proof of usable per-marker navigation or native screen-reader behavior.
6. Hover may preview the same inspector on a pointer device, but cannot be the only route. Ensure selection/focus remains visible and is cleared or updated truthfully when the site is re-observed, replaced, or no longer remembered.

This is smaller and more predictable than a general label-packing system with arbitrary displacement. No remedy was implemented in this review.

### Even smaller bounded variant if the existing Pause UI is used

The UI owner may prefer to preserve the existing single-memory badge behavior and add a Pause details list instead of a new selectable field inspector. In that case:

- Reserve **all visible compact glyph rectangles first**. Then, in a stable order based only on observation data, draw a full badge at its existing near-marker/clamped position only if it is within the field in both dimensions and does not collide with another glyph or an accepted badge. Otherwise omit that full badge, never the marker.
- Keep an explicit, readable stale indicator and a clear “Full last-seen details in Pause” route. The conditional Pause list must expose every memory's frozen full name, level, time and road/site association to sighted, touch and keyboard users, not only in an ARIA attribute.
- This needs no general 2D packing search, displaced leader lines, shrinking fonts or arbitrary demand to show all names at once. It directly addresses the measured loss while retaining already-clear isolated labels. Reserve-first avoids later-road glyphs painting over earlier accepted badges.
- Layout and suppression must depend only on sanitized remembered/observed geometry and measured presentation dimensions. A hidden sale, upgrade or production change must not reshuffle the visible result.

This bounded fallback is adequate to the finding if the details route is discoverable and usable in native checks. The parent/UI owner should choose it or the inspector scheme; the review does not require both.

## Proposed native desktop fixture after the UI owner implements a remedy

Use a separate, clearly labelled synthetic fixture with the real observation boundary. Do not connect it to a saved/profile/paid match. No native retest has been performed here. The parent will schedule desktop browser access later; do not use a responsive/mobile emulator, iframe or browser protocol to replace the denied mobile path.

Suggested scenes, created through real legal build calls on Classic:

1. **Two common adjacent sites:** Watchtower `(2090,450)` and Barracks `(2230,450)`.
2. **Four mixed adjacent sites:** the primary `(1950,450)` through `(2370,450)` layout above. Show the current contacts, then withdraw the scout and hold observation time at 2:05. A moving render clock must not turn this into an age or reveal hidden changes.
3. **Two columns on neighboring roads:** x=2090 and 2230, y=260/450/640. This checks association across rows, focus order, and the inspector without requiring all full labels to fit.
4. **Desktop-reachable right edge:** Arcane sanctum `(2510,260)` and Archery range `(2650,260)`, both ordinary snapped sites. A scout around `(2430,260)` can observe these without needing to see the default enemy middle-road barracks. Withdraw it, then pan the second marker to the actual field's right edge. For the previously measured 1139 × 398 field, camera `2650 - 1139/(2*(398/900)) = 1362.185929…` is within normal camera bounds. This reproduces edge clamping at real desktop geometry without a mobile emulation path. Use actual measured field geometry if it changes.
5. **Out-of-view boundary:** continue a normal camera pan until a marker is fully outside. Its field badge should not linger at the edge; the minimap memory and accessible memory detail should remain truthful.

Native checks should inspect actual pixels for stale/current distinction, marker-card association, full frozen name/level/time, and no obscuring badge chain. Exercise ordinary desktop pointer selection plus keyboard focus/activation/escape, repeated selection, panning while inspecting, and re-observing empty/replacement sites. Record actual field CSS size, renderer scale, camera, memory IDs/order, timestamp and screenshot hashes. Test real touch/phone access only through a separately permitted native path; this desktop fixture does not certify it.

Suggested automated follow-up after implementation: use legal buildSites fixtures for mixed/common pairs, a grid and edge placements; assert that compact markers remain distinct and full details are reachable/contained for the chosen inspector interaction. Add a vertical boundary case. Keep hidden-state noninterference and observation immutability tests. Do not simply assert that all full badges fit simultaneously.

## Method, tests and reproducibility

The review wrote only `/workspace/shared/ironroot-fog-dense-review/`.

- `run-review.mjs` imports the candidate's **unmodified** `Game`, `observe`, `refreshFog`, `FogRenderer`, `observationFacade`, `memoryLabel`, `observationHUD`, and existing renderer-construction harness. It uses real renderer `resize`, camera clamping, projection and `drawMemories` method calls, recording complete draw and measurement transcripts.
- The recorder supplies either the existing fixed `7 × character-count` measurement model or actual locally measured DejaVu Sans/Noto Sans 11px metrics. Those latter measurements come from Pillow/FreeType at 4× sampling, divided by four. **They are not the browser's `CanvasRenderingContext2D.measureText`, font selection, hinting or rasterizer.** Two fonts make the conclusion less dependent on the existing unusually wide stub; native quantitative pixel loss remains unmeasured.
- `analyze-ink.py` samples the substitute font glyphs against subsequent recorded fill rectangles and canvas bounds. It reports ink intersected/painted over, not certainty that every affected pixel becomes invisible. Later text/strokes can add interference and are intentionally not included in those percentages.
- 59 geometry/layout cases × 3 measurement backends = **177 draw runs**. These are not 177 independent gameplay observations. Six layouts passed real build validation. The 108-unit engine-valid layout is secondary and explicitly not ordinary snapped-input placement.
- Command `node --test tests/fog-memory-scene.test.mjs tests/fog-view.test.mjs` passed **20/20** unchanged tests. This is a focused run, not the full test suite or release gate.
- Existing `fog-memory-scene.test.mjs:35–43` checks only one remembered building and horizontal containment of whichever target labels were drawn. `renderer-canvas.mjs:20` uses `text.length * 7`. It does not detect later text occlusion, multiple-marker collision or vertical clipping. The compact-field geometry test only establishes finite coordinates and balanced canvas state.
- All nine reviewed source/harness files were hashed and rechecked unchanged at the end of each review run. No runtime/test edits, hosting, publishing, storage/profile changes, browser actions, mobile retries or paid-match operations occurred.

Reproduce in the same local environment:

```sh
python /workspace/shared/ironroot-fog-dense-review/measure-fonts.py
node /workspace/shared/ironroot-fog-dense-review/run-review.mjs
python /workspace/shared/ironroot-fog-dense-review/analyze-ink.py
cd /workspace/shared/ironroot-fog-integration/work
node --test tests/fog-memory-scene.test.mjs tests/fog-view.test.mjs
```

Dependencies are the existing Node 24.22.1 runtime, Python/Pillow/NumPy and locally installed DejaVu/Noto fonts. No packages were installed. `font-metrics.json` includes exact font paths and hashes.

## Evidence files

- `source-hashes.json`: all nine reviewed inputs and their SHA-256 values.
- `draw-transcripts.json`: all 177 exact recorded renderer draw/measurement streams, scales, actual clamped cameras, legal build receipts, memory coordinates/labels, backing rectangles and intersections.
- `font-metrics.json`: substitute metric definition, font hashes, widths and ink bounds.
- `ink-analysis.json`: per-text and timestamp-digit coverage/clipping measurements for both measured fonts.
- `ink-summary.txt`: selected readable cases.
- `run-summary.json`: counts and unchanged-source assertion.
- `existing-tests.tap`: the focused 20/20 existing test results.
- `selected-transcripts.json`: smaller extracts for the main desktop/common/edge/vertical cases.
- `ARTIFACTS.sha256`: hashes of review scripts and evidence artifacts.

Principal source SHA-256 values:

- `dist/fog-view.js`: `7113a4c118585d7472f914ef5ca1a98b369ee61a8945230bf51ce5e6b634b723`
- `dist/render.js`: `f3e668dc607485fc7ab368bd7df916b8b7389d4f7c75482975d342c75dca291d`
- `dist/engine.js`: `5045c0d3ab142cba0fe6d9466c031d6922dd5a2dff9a64363d3b0c6b6c8a1729`
- `tests/fog-memory-scene.test.mjs`: `94f676ae3231fc30baf2e82aafa029d24f93643ee59d6caba4b276c35571b664`
- `tests/fog-view.test.mjs`: `8d3dbdc699c8e59ab9adb71e4c44914a61238c239eae6f8731bed0904a94975a`

Relevant implementation references: `dist/fog-view.js:168–190` (memory painting and clamp); `dist/render.js:181–195,286–325` (scale/projection/snap); `dist/engine.js:15–32,80–94` (sites and legal build validation); `dist/fog.js:44–57` (frozen memories and ID order); `dist/app.js:2082–2088,2382–2385` (owned selection and aggregate accessibility description).

The previous report at `/workspace/shared/ironroot-fog-prototype/reports/memory-pass/NATIVE_MEMORY_QA.md` remains separate. Its one-marker desktop evidence and prior source hashes must not be relabelled as a native test of these current dense cases or this candidate's exact current hashes.
