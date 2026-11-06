# Map and controller input repair candidate

Status: local source/Node verification only. Exact corrected cloud browser execution is required before either defect is considered fixed in the browser. No local browser or server was launched.

## Confirmed original behavior

Independent cloud audit of candidate `181c859e8c47a2497e190ee39874ff3fedda4b98` observed:

- On all three touch profiles, the same tap one CSS pixel inside the minimap's right edge could deliver `pointerdown` to the neighboring `front` button. An inset tap worked; mouse tests passed. This was native browser touch targeting, not the camera-width assertion.
- On all four profiles, `padControls()` included descendants of a closed report disclosure. Down navigation selected an invisible nested summary; native focus refused it and remained on Return to title. The visible outer summary could be reached from another direction.

Source: independent exact-candidate cloud audit and original full browser run; original browser evidence remains retained by the authorized runner.

## Changes

- `dist/app.js`: minimap activation now uses the native `click` event, making the canvas itself eligible for browser touch adjustment. Release activation passes through the existing document click guard. Camera calculation, clamping, map width, and Home/Front behavior are unchanged.
- `dist/app.js`: `controlIsVisible()` checks every closed `details` ancestor. Only content within that ancestor's first summary is admitted. Both keyboard-dialog and controller candidate lists use this predicate, in addition to their existing hidden/inert, rectangle and visibility checks.
- `qa/browser/maps.spec.mjs`: the original 73%, right-edge and left-edge coordinates and camera tolerances are unchanged. Read-only event observation now additionally requires native, trusted pointerdown/up/click targeting of the minimap, and verifies the requested pixel belongs to the canvas before input. There is no event injection, alternative click, or input-guard bypass.
- `tests/report-ui-integration.test.mjs`: closed-details models deliberately retain nonempty rectangles, exercise nested/open/reclosed ancestors, and reproduce the original Down-navigation trap.
- `tests/minimap-input-integration.test.mjs`: native release listener, actual registered map widths, exact edge projection, and compatibility with stale-gesture rejection are covered.

`dist/input-scope.js`, `dist/controller.js`, the held-game-result browser test, and shared map helpers were not changed by this repair.

## Local evidence

- Six new targeted regressions fail against the frozen original app source and pass against the repaired source. Original geometry reproduces `playAgain → resultMenu → resultMenu → resultMenu`; repaired geometry reaches `playAgain → resultMenu → inspectBattle → report-summary`.
- Focused controller/input-scope/report/minimap Node suite: 74 passed, zero failures at the repair checkpoint.
- Root syntax, release preflight, and browser syntax/fixture checks passed.
- A concurrent aggregate run returned 579 passed, one failed, one optional skip. The failure was the older training test's byte-identity assertion for the intentionally modified main app. Other storage/training repairs were concurrently changing this shared candidate, so this is not final aggregate evidence.
- Logs for the source regressions and focused run are in `qa/input-repair-evidence/`.

## Required browser verification

On the authorized cloud runner, with the exact final candidate fixed for the run:

```sh
cd qa/browser
npm test -- maps.spec.mjs battle-report.spec.mjs campaign.spec.mjs \
  --grep 'minimap ends|controller focuses report|gesture held across'
npm test
```

The first command should select 20 profile instances: twelve minimap, four controller-report, and four held-game-result cases. Preserve event-target and camera assertions as written. A focused green run does not substitute for the complete matrix. Physical devices, Safari, and actual controller hardware remain unverified.
