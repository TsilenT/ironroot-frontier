# Bounded native desktop dense-memory review

## Scope

This is a separate, explicitly labelled synthetic fixture, not a played match or main-app Pause test. It uses real legal build calls to construct deterministic scenes, then the actual candidate observation and FogRenderer modules. No live match or profile was injected, imported, exported or read.

The documented managed preview returned `http://127.0.0.1:4173/`. A new tab (95) opened that exact URL and followed the landing link to `qa/fog-prototype/dense-memory.html`. The title and visible heading identified synthetic dense-memory QA. No stale-controller issue appeared. No other existing tabs, DevTools, emulation, storage or service-worker operations were used. Browser session completed and preview stopped after the bounded pass.

The stage contains the exact 56 runtime files in `dist`, plus five separately staged QA-only files and a landing page. Hashes are in `stage-hashes.json`; no runtime source changed during this pass. Version/cache stayed 0.21.0 / `ironroot-v0.21.0`. Main-app source later changed for a requested citadel-copy refinement must be tracked separately, not retroactively assigned these pixels.

## Actual observations

The rendered field measured **1139 × 398 CSS px**, scale **0.4422**, in the desktop browser. No viewport resize or phone path was attempted.

- **Mixed adjacent sites:** four dashed true-position markers and two full badges. Arcane sanctum and Siege foundry names/levels/frozen 2:05 timestamps were readable below their own markers. The other two compact markers remained distinct; all four complete entries were in the detail list. No timestamp was painted over by a neighboring badge.
- **Two common sites:** two distinct Watchtower/Barracks markers and one unobscured Watchtower badge. Both full details remained listed.
- **Neighboring roads:** all six markers remained on their roads; two full badges were admitted. No displaced label suggested a different location. The bottom-road full labels were intentionally omitted by the safe-area policy, with complete information retained below the field.
- **Keyboard access in the fixture:** Tab reached the last frozen detail entry and brought it into view. Screenshot 06 shows every road/position/name/level/time entry and focus on the final Gryphon aerie. This verifies the fixture's list, not the main app's Pause disclosure/controller/screen-reader interaction.
- **Reachable right edge:** normal camera coordinate 1362.19 placed the last of the (2510,260)/(2650,260) pair at the right field edge. Both true markers remained (the last partially clipped at the true boundary), zero full badges were admitted, and both complete entries remained visible below. No labels clamped into an overlapping edge pile.
- **Further pan:** camera 1287.81 made the last marker fully offscreen. It did not leave a field badge at the edge; the other marker remained. Both minimap memories and both frozen detail entries remained unchanged.
- **Current versus stale:** current contacts used the bright sight area and full building sprites. Lost sight used muted dashed abbreviated markers and old-observation labels. Hidden upgrades/sales did not alter the four frozen 2:05 entries or geometry. Native DOM snapshots of the frozen details and metrics compared exactly equal across the stale/hidden-change steps.
- **Empty re-observation:** all four stale markers/badges and entries cleared; the observed empty sites were lit and the list said no current or remembered building at those sites.
- **Replacement:** four current Barracks appeared at the same legal sites; withdrawing sight produced four Barracks memories with new frozen **2:50** timestamps. Keyboard panning changed the camera to 1686.06 without changing their frozen detail. Two non-overlapping full badges remained admitted.

No hover tooltip was added; the visual association is the unmoved marker and centered badge, with road/known-map position in the complete detail list. No live health or production was presented for memories.

## Files and limits

Eleven verified captures are in `native/`:

1. `01-mixed-stale.jpg`
2. `02-current-contacts.jpg`
3. `03-hidden-changes.jpg`
4. `04-common-pair.jpg`
5. `05-neighboring-roads.jpg`
6. `06-keyboard-reached-details.jpg`
7. `07-reachable-right-edge.jpg`
8. `08-offscreen-boundary.jpg`
9. `09-empty-reobserved.jpg`
10. `10-replacement-current.jpg`
11. `11-replacement-stale-panned.jpg`

`native/native-observations.json` contains the displayed layout/stage/geometry/detail text. Source/stage hashes and screenshots have a separate evidence manifest. The original `native-main/` evidence remains unchanged, including its correction addendum.

This does not establish native actual-app Pause disclosure access, native compact/phone/controller/screen-reader behavior, actual paid stale-memory transitions, a full match, audio quality, performance, offline updating, or release readiness. The 135 focused source/model checks and independent synthetic geometry review remain distinct from these pixels.

The independent reviewer also reported a narrow possible badge/known-citadel-label intersection at another synthetic position/font combination. That probe was not exercised in this native pass and is not silently treated as resolved by these screenshots. Its evidence is in the separate dense-review `remedy/citadel-probe.json`; coordinator decides follow-up scope.
