# Browser harness repair for 0.13.0

## Evidence boundary

The cloud run of commit `0823cb6776df37e2aa309e20fa329c565ca0a356` finished **715 passed, 126 failed, 3 skipped**. Its report is in cloud thread `01a1af09-12e4-75f9-9b43-88065838102b`. The immutable candidate under `ironroot-qa-0.13.0/private` is unchanged.

This repair changes test expectations, observation helpers and test documentation, not runtime behavior. **The corrected browser matrix has not run.** Dependency-free checks and model-based tests cannot establish native input delivery, browser layout, canvas numeric precision, or service-worker behavior. The next gate must run the exact corrected checkout, not reuse the prior report.

`qa/browser/evidence/0.13-harness-failure-map.json` maps all 126 failed instances to their exact project, original test title, stale expectation, current contract and repair. The titles come from the frozen original registrations and the categories from the cloud report. Orientation pixel explanations are derived from configured DPR; they are not transcriptions of every trace.

## Complete failure mapping

| Category | Failed instances | Repair and retained contract |
| --- | ---: | --- |
| Protected-building description | 16 | Current prefix is “Keep this building standing.” Disabled salvage and ordinary-building salvage remain required. |
| Scouting accessibility sentence | 16 | Require “Building names, levels and roads are listed below the map.” Exact mission geometry, deployments, levels and objectives remain checked. |
| Unit training label | 4 | Exact `dt` is “Training interval”; warrior value remains exactly `9 s`, with the other units, structures and counter costs still checked. |
| Backup replacement warning | 16 | Require the complete current warning covering campaign stars, trials, preferences, history, saved battle and current battle, plus export advice. Replacement and storage equality checks remain. |
| Empty history message | 4 | Exact message is “Completed battles appear here.” Both stale history and preference retry fences remain checked. |
| Mine-upgrade feedback | 4 | Require the entire current level-2 upgrade message. Paid cost, unchanged time and improved income remain checked. |
| Temporary training review | 4 | Require the complete current review, including skipped lessons not counting and no saved rewards/progress. Completion/skip counts and storage checks remain. |
| Protected corrupt-save recovery | 40 | Ten existing corrupt-map cases now require blocked Start, retained bytes and explicit backup recovery, rather than silently replacing rejected data. |
| Build-site observation | 16 | Recognize the renderer’s scale-aware minimum-one-CSS-pixel stroke without dropping exact sites/counts, pointer placement, drag, costs or camera assertions. |
| Orientation canvas width | 4 | Require the 152 CSS px landscape rail, remaining field edges and actual canvas backing dimensions on both axes. |
| Rootwarden mobile drawer wait | 2 | Normal locator tap/click waits for the HUD-enabled Build control. No hidden/forced clicks or application-state mutation. |
| **Total** | **126** | **Every original browser test remains.** |

Copy changes use specific current phrases or complete messages, not permissive alternatives. The complete backup warning now asserted is:

> This replaces this browser’s campaign stars, trial records, preferences, battle history and saved battle, including your current battle. Export a backup first to keep your current progress.

## Recovery contract

The ten corrupt-map cases already checked export refusal, original raw-byte retention and reload behavior. Their former tail tried to start a fresh battle over a protected rejected save. The real Start guard intentionally opens Preferences and makes the app beneath it inert; an inert Pause control is not a runtime failure.

The corrected tail checks the full refusal message, the inert app, hidden pause overlay and unchanged storage. It selects a compatible Long March backup, checks its summary and complete replacement warning, verifies unchanged bytes during preview, cancels and verifies unchanged bytes again. Only the explicit **Replace local saves** action may replace the five profile domains. After reload, the test compares all five domains to the backup, preserves an unrelated key, resumes the legacy Long March layout, saves/exits, then starts a fresh v3 Twin Span battle. Closing Preferences or forcing Start cannot satisfy this case.

## Canvas and orientation contracts

`canvas-observation.mjs` wraps native calls and passes them through unchanged. A build-site observation requires an exact 110×110 world rectangle, a positive uniform unskewed world transform, and one of the two actual site colors normalized through the browser’s own `strokeStyle` property. Its CSS stroke must equal `max(1.5 × scale, 1)` within **one millionth of a CSS pixel (1e-6)**. This bound accommodates native matrix/style roundoff, not visible geometry differences. Original world centers and complete expected site-list equality remain unchanged. Placement/selection outlines have different width/color and are rejected. Minimap telemetry and the strict delivered-coordinate oracle are unchanged.

The orientation test no longer assumes that the battle fills the browser width. At 844×390 landscape, the separate control rail takes 152 CSS px, leaving 692 CSS px. That is 1,384 backing pixels at DPR 2, or 692 at desktop DPR 1. The browser assertion independently pins the rail width/right edge and field left/right edges; it also compares both backing axes to the measured canvas rectangle and capped DPR. This is not an assertion that accepts any measured rectangle. Original control-fit, guide, pause and post-rotation paid-build checks remain.

## Mobile interaction contract

Immediately after Resume, `compactBuild.disabled` may still reflect the prior paused HUD for up to the normal 100ms refresh interval. The old helper read it once, returned early and then waited on hidden Arrow volley without ever opening Build. The helper now uses normal locator actionability waiting, then the existing real Cancel-placement → Build sequence. A permanently disabled control still blocks. Existing touch projects still use tap; pointer-held interruptions and delivered-coordinate checks are not replaced by direct event dispatch or state edits.

## Validation and limits

- `npm --prefix qa/browser run check`: syntax and all fixture validators, including the pinned real production 0.12 fixture and **8/8** harness Node contracts.
- `npm --prefix qa/browser run check:upgrade`: strict candidate version/worker eligibility.
- Browser registrations remain **211 definitions / 844 project entries / 17 spec files**. No skips, timeouts, workers, test names or behavior tolerances were changed.
- The eight harness tests include actual candidate renderer command replay across all maps/scales/DPRs, old-width/ghost/color/shape/shear negatives, the strict stroke bound, minimap supplied-path preservation, transient/permanent disabled helper models, and supplied-rectangle backing conversion. They are deliberately named `.node.mjs` and excluded from browser discovery.
- Locator models and command traces are **not native browser evidence**. Supplied rectangle tests check `Renderer.resize`, not actual CSS layout. Native stroke-color normalization, transform precision, orientation layout and touch actionability require the corrected cloud gate.
- No runtime, historical source fixture, external service or published site is changed by this repair. Root aggregate results are tracked separately by the parent in `GATE_REPAIR_0_13.md`.
