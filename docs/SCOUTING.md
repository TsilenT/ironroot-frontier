# Mission scouting

`dist/scouting.js` is a DOM-free, deterministic presentation helper. It reads the authored mission's map, starting building tuples and objective markers. It does not create or inspect a live game, reveal a new source of enemy information, change combat, predict a result, or request assets. Campaign briefings already disclose both starting deployments.

## Integration API

```js
import {
  getMissionScouting,
  renderMissionScouting,
  renderScoutingSvg,
} from './scouting.js';

// The parent owns a native, initially collapsed disclosure:
// <details class="mission-scouting-disclosure">
//   <summary>Scout the battlefield</summary>
//   <div class="mission-scouting-content"></div>
// </details>
content.innerHTML = renderMissionScouting(mission);

// Alternatively build a custom text layout from the structured report.
const report = getMissionScouting(mission);
mapFacts.textContent = report.map.summary;
mapContainer.innerHTML = renderScoutingSvg(mission);
```

`renderMissionScouting(mission)` returns the complete safe HTML body: map facts, SVG, text legend, objective counts, two army summaries, and per-road deployment lists. It does **not** add a disclosure, controls, IDs, listeners, stylesheets, or a mount. Every text interpolation is escaped. Only the two render helpers' return values are safe to put into `innerHTML`; raw report strings must be assigned through `textContent` or escaped by the caller.

`getMissionScouting(mission)` returns a deeply frozen report:

- `missionName`: raw display text.
- `map`: `id`, `name`, `width`, `height`, copied `lanes`, `roadCount`, `siteLimit`, `placement`, `territories` and a display `summary`. `siteLimit` means the engine's **building limit per side**. Classic permits free placement, so do not call its cap 24 fixed sites. Long March and Twin Span use marked building sites.
- `armies`: left/player side `0` followed by right/enemy side `1`. Each has `position`, `label`, `shape`, `buildingCount`, `summary`, `groups`, `buildings`, and `roads`.
- Each group contains the engine building `type`/`name`, its total `count`, and `levels: [{level, count}]`.
- Each building contains `type`, `name`, `side`, authored `x`, actual lane-center `y`, zero-based `lane`, `roadName`, `level` and `targetKind` (`null`, `protect`, or `destroy`). Buildings are ordered by road then world x, independently of input order.
- Each road contains `lane`, `y`, `name`, `count` and a compact `summary`, including levels and objective kinds. Empty roads remain explicit. Twin Span contains only North and South roads.
- `objectives`: `protectedCount`, `markedCount` and `summary`. Repeated references to one objective building are counted once.
- `legend` and `summary`: plain text for nonvisual or custom layouts.

`renderScoutingSvg(mission)` returns only the safe SVG, with the same validation and geometry. It accepts a mission, not an arbitrary report. This avoids a renderer accidentally trusting a modified report's numeric fields or markup.

## Geometry and accessibility

The SVG uses the map's real `0 0 width height` viewBox with uniform scaling. Long March is 4000 units wide; Classic and Twin Span are 3200. Road centers and authored building x positions are not stretched to old Classic coordinates. Shaded build territories derive from the engine's `buildBounds`. There are no decorative extra lanes or invented deployment sites.

Friendly buildings are squares and enemy buildings are diamonds, so allegiance does not depend on color. Protected allied objectives have a shield outline; enemy destruction targets have dashed rings. A written legend explains every shape. Symbols are deliberately enlarged and are not collision footprints. The map is an overview, without tiny building names or level numerals. Full names, counts, levels, road assignments, and objective kinds remain in readable text below it.

The SVG has `role="img"`, an escaped descriptive `aria-label`, a meaningful `title` and `desc`, and no keyboard stop. Its decorative geometry is hidden from the accessibility tree. No generated IDs means multiple previews cannot collide. The map uses the game's existing dark green, cream, gold, friendly green and enemy terracotta palette. There is no animation or network dependency.

## Responsive guidance for the parent

- Keep the disclosure **collapsed on each new mission briefing**. Do not replace the briefing objective or hide the launch button inside it.
- Preserve native `<details>/<summary>` keyboard behavior and a visible focus ring. Give the summary a comfortable touch target of at least 44 px.
- The SVG already has `width:100%; height:auto` and a matching intrinsic ratio. Do not use `preserveAspectRatio="none"`, fixed stretched heights, or a wide minimum width. An optional wrapper can add padding without changing its geometry.
- Use `.scouting-armies` as two columns only when space permits, and one column on narrow screens. Keep roster and road text at readable body size and allow wrapping. Avoid fixed-height text, tiny tooltip-only labels, or horizontal scrolling.
- All classes are prefixed `scouting-`, except the outer `.mission-scouting`. `.scouting-roads` is a semantic unordered list. Parent CSS may need to override broad briefing-list styles that flatten list items.
- Prefer the existing briefing's vertical scroll region. Keep the start/back actions outside the disclosure and visible or reachable on short phone viewports.
- In a custom layout, keep both army labels and text legend near the image. A generic image label alone is not a substitute for the deployment lists.
- If authored data fails validation, show a small text fallback and keep the briefing and launch flow usable. Do not silently substitute Classic for an invalid named map.

## Input contract and limits

Missing `mapId` defaults to Classic for older missions. Missing deployment/target arrays mean empty; no default skirmish barracks are invented. An omitted building level means level 1. Unknown maps/building names, nonfinite or out-of-world x positions, nonexistent lanes, invalid levels, duplicate deployment coordinates and unmatched or wrong-side objective references throw a descriptive error. Optional mission `name` must be a string when supplied. Original arrays and engine definitions are never mutated or frozen by the helper.

This is a briefing renderer, not a second build validator. It deliberately does not duplicate costs, collision distance, mine caps, placement legality or combat rules. Campaign/engine validation remains authoritative for whether an authored formation can run. Only `markedTargets` and `protectedTargets` are read for objective icons; narrative fields or arbitrary `objectives` content are not reinterpreted.

## Verification

Run `node --test tests/scouting.test.mjs`, then the normal `npm test` and `npm run check` gates. Tests cover all maps and all registered campaign missions, with explicit legacy-Classic compatibility; actual mission starts are compared against report placements and levels. Additional checks cover two-road geometry, objective shapes, aggregation, unknown and malformed data, input order, deterministic markup, frozen reports, escaping and mutation safety.

The module/tests were verified without serving the app or executing a browser. Parent integration still needs browser review of the native disclosure, narrow/short screens, deployment-list wrapping, focus, and launch-button reachability.

### Resolved level-label review (2026-11-06)

An independent browser review initially reported that The Black Ledger's enemy watchtower read as level 3 in the aggregate but level 1 in the road list. The reviewer retracted the report after zoomed inspection of the same card: the small digit had been misread, and both labels correctly showed level 1. Read-only source and factory checks independently confirmed the correct level in every representation. There was no runtime defect or runtime change.

Two focused regressions now pin the Black Ledger tower across aggregate, road and SVG text, and compare every mission's rendered aggregates, per-road rosters and individually positioned SVG titles against actual `createCampaignMission` buildings. The oracle includes counts, levels and objective kinds, including mixed-level groups. At this review the checks cover all 132 starting buildings across all 16 missions; the all-mission test expands with the registered campaign. The focused scouting suite passes 12/12 tests. This review follow-up changed tests and this document only.
