# Flight-order visual signals

`dist/flight-visuals.js` contains original Canvas2D geometry, not downloaded or generated raster art. It extends the game's existing ink, parchment, teal and rust palette with feather-shield waymarks for the player and pointed warning pennons for the enemy. Shape, YOU/FOE text and directional arrows supplement color.

## Integration contract

The module imports the registered capability and shared gate helper from `flight-orders.js`, which the engine also re-exports. It cannot enable flights in an older ruleset.

- `drawFlightRoutes(renderer, game, ui)` runs under the renderer's existing world transform. Insert it after terrain/ground accents and before bases, troops and protected-objective markers. It reads `renderer.c`, `scale`, `width`, `height`, `camera`, `reducedMotion`, `vfx.quality` and `ui.selected`. It returns its detached derived signal data. It does not modify those inputs.
- `drawFlightMinimap(ctx, game, {width, height, x = 0, y = 0, selected = null})` runs under the minimap's existing CSS-pixel/DPR transform. Insert it after roads and entity dots but before the camera rectangle. Pass `selected: ui.selected` to include the selected owned future route. The function clips its own work to the supplied rectangle, restores the context and returns derived signals. It does not clear/reset the minimap.
- Each entry point saves/restores canvas state. Neither entry point advances a clock, requests a frame, reads wall-clock time, stores entity references, consumes RNG, updates preferences or writes simulation/UI state.

The lead owns renderer/app integration and accessible text/order controls. This module installs no UI listeners or overlays and does not change simulation or profile data.

## Reading the signals

- Only the selected, living, owned aerie gets a gold **NEXT** arrow near its roof and a dotted gold gateway crossing preview. Hold has no crossing preview. Source and gateway visibility are culled independently, so an offscreen gate does not hide the selected aerie's direction. A visible aerie keeps its label when the original above-roof position is cropped. No unlaunched enemy order is read or exposed.
- World crossing signals begin during the actual warning phase, not the approach. The dashed line connects only the two adjacent roads at the engine's gateway. There is no long approach line across the battlefield.
- A pending warning displays its remaining time to one decimal, rounded up, with a minimum positive 0.1s until the engine leaves warning. Multiple warnings for the same directed route share a count and the earliest countdown.
- Solid lines and **AIR** identify transit. A second arrow follows the furthest currently crossing unit on that route. Multiple units share one route signal rather than accumulating individual labels.
- One local banner per side/adjacent-road gap contains at most two direction rows. A mixed row such as `↓ 0.6s×2 / AIR×2` means two gryphons are waiting for the next downward crossing in 0.6 seconds, while two are already in the crossing. With differing warning times, the timer is the earliest of that warning group, not a promise that all launch simultaneously.
- Banners normally extend toward their own territory, away from the center. Near a viewport edge they move inside the visible canvas. Essential lettering remains 12 CSS pixels at every world scale. All marks are drawn below troops/objective symbols.
- Committed banners are measured and reserved before the **NEXT** badge is placed. The future badge keeps a four-CSS-pixel gap from those rectangles and its own aerie's art where space is available, preferring a short vertical shift. A displaced badge has a static dotted leader to its source. Existing committed banners stay in their normal positions when clear; if viewport clamping makes wide banners intersect, a deterministic road/side-ordered vertical stack separates them when the field can fit the complete stack. Moved committed banners retain static leaders to their actual crossing. All leaders and crossing strokes are drawn before all text backgrounds.
- The minimap also shows already-launched approaches with a thin dotted route. This is committed unit information, not a producer's next order. Warning routes are dashed; transit routes are solid. Selected future routes are gold. Unit dots and team pennons provide location/team context; no tiny countdown text is placed on the minimap.
- Reduced-motion and low-effects settings remove optional feather ticks. Ownership, direction, warnings/countdowns, transit and the selected future preview remain. Nothing flashes or pulses in any mode.

## Pure helpers and bounds

`buildFlightSignals(game, {selected, viewport, scale, includeApproach})` aggregates copied scalar route data. It defaults to warning/transit only. `includeApproach` is used by the minimap. Culling bounds use `{minX,maxX,minY,maxY}` in world coordinates and allow a 12 CSS-pixel marker margin.

`flightRouteGeometry`, `flightViewport`, `flightBoundsVisible`, `groupFlightCorridors`, `flightSignalLabel`, `flightBannerLayout`, `flightBannerLayouts`, and `flightPreviewLayout` are exported for deterministic geometry/format tests. Route geometry always uses the same registered gate helper as simulation: the two gates are 200 world pixels either side of each map's midpoint, including Long March. Direction follows actual lane Y coordinates.

## 2026-11-07 selected-plan overlap repair

The frozen candidate's selected middle-road aerie put its fixed above-roof **NEXT ↑** badge over the committed **YOU ↑ AIR** banner at compact scales. This was independently observed in phone and landscape browser screenshots. The held next candidate fixes the label-layout collision entirely in this module. `render.js`, gameplay, clocks, RNG, input, saved orders, minimap semantics and reduced-motion behavior are unchanged.

New tests replay the actual canvas translations/scales to measure emitted rectangles. They require a four-pixel separation and four-pixel viewport inset for the original warning/transit scenario on 320px, 390px, 844px and desktop fields. They additionally cover every map, both teams, all directed corridors, source roads, camera edges and 64 units per side at 320/390/844px widths and 168/240/450px field heights. A changed future destination remains distinct from the already committed upward route. Frozen-input, source-art clearance, deterministic placement and unchanged normal committed positions are checked separately.

**Small-field fallback:** four complete two-direction banners require 168 CSS pixels of field height when stacked, including the margins. If that stack cannot fit, the implementation retains the full-size banners in their original viewport-clamped positions rather than dropping directions, timers, counts or team labels. If no free 70×20px rectangle remains for **NEXT**, it likewise keeps its full-size, clamped source position. Overlap is therefore still possible in an exceptionally short and crowded field; a dedicated 320×100px test records this limit, not a visual pass. A viewport smaller than an individual label plus its margins cannot promise complete containment either. No text is intentionally clipped or reduced below 12px.

These are deterministic source/canvas results, not screenshot sign-off. The next exact candidate still needs browser inspection of warning/transit in phone, landscape and crowded states, including buildings/troops drawn later by the renderer and the static leaders. The frozen uploaded candidate and its active full gate were not modified.

## Verification and remaining gate

Run `node --test tests/flight-visuals.test.mjs` and `node --check dist/flight-visuals.js`.

The focused tests cover every flight identity, all three production maps, mirrored sides and directions, registered-capability gating, old rules and copied rules, grouping independent of array order, world/minimap culling, future-plan privacy, malformed/dead/finished routes, fixed-pixel text and viewport-edge banners, finite canvas operations, balanced/restored canvas state, low-effects/reduced-motion essentials, deeply frozen no-mutation/no-RNG rendering, and observation of actual engine phases after changing an aerie's future order.

These are source and canvas-contract tests. Integrated desktop, 390px portrait and short-landscape visual review, crowded-battle overlap, objective marker layering, save/reload and native-control accessibility remain combined release gates. No browser/shared preview or publication was performed for this isolated module.
