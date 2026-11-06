# Modal gesture isolation

## Reproduced release blocker

The exact 0.8 candidate `1d6522d56a4afd69152ff268c52a98df04356046`
failed the cloud browser gate: 205 passed, four failed, three skipped. The
landscape case was a real leak, reproduced three times: at 844 × 390, touch
began on the minimap at approximately (422, 255.8), the campaign deadline
opened the result dialog, and releasing the same touch activated Retry.
The other three failures were insufficient overlap calibration, not successful
protection or independently reproduced leaks.

## Runtime change

`dist/input-scope.js` is a DOM-independent input-origin state machine.
`dist/app.js` observes the active dialog, pause veil, and ended/live battlefield
scope. A scope transition advances a generation. Document capture listeners
record physical pointer/key origins before the existing action handlers.

- A pointer begun in an older generation cannot activate a newly displayed
  scope through pointer release or its subsequent browser compatibility click.
- Each pointer is independent. A new press is usable immediately, even while
  another older contact remains held. There is no debounce timeout and no
  unconditional “ignore the next click” flag.
- Cancellation is retained for trailing clicks. Lost capture clears battlefield
  drag state without discarding the physical gesture's original generation.
- Native Enter/Space repeats and releases cannot activate a newly focused
  control or a different scope. Independent presses, same-control native
  activation, Tab navigation, range controls, keyboard/assistive zero-detail
  clicks, and the controller's synthetic `.click()` remain available.
- Scope changes and window interruptions reset battlefield drag/multi-touch
  state. Window interruption invalidates held gestures without delaying new
  input. Interrupted pointers are retired into the 32-entry completed history
  even if the browser never sends up/cancel. The same cancelled gesture objects
  preserve primary compatibility-click attribution. Tests cover 1,000 repeated
  lost-terminal interruptions, repeated ID reuse, duplicate interruptions, and
  primary fallback after history eviction.

The service-worker precache list adds **`./input-scope.js`**. Candidate package
and cache versions remain unchanged, pending the parent's release decision.
No engine, map, campaign, layout, or frozen update-fixture code is changed.

## Regression construction

The existing mission-end gesture case keeps each project's actual mouse/touch
mode and first uses its native viewport. A separate page loads a legitimate,
validated deadline-failure save and reaches the real result UI. It samples
visible result buttons using read-only geometry and hit tests, then uses the
real Inspect battlefield control to check the underlying playable surfaces.
Sampling is no longer clipped to the canvas: portrait result buttons can
cover the command deck or minimap.

If a native layout truly has no overlap, the same profile/input mode is
explicitly constrained to 844 × 390 and annotated as such. A missing overlap
is a failure, never a skip or a blank-area safety pass. The live test loads a
validated save five seconds before its real deadline, verifies the press
begins on a battlefield/minimap or enabled gameplay control, holds actual
CDP touch or Playwright mouse input through the deadline, and verifies that
an actual result action occupies the exact release coordinate. No forced
click events or private app-state mutation is used. Only the saved fixture is
seeded before app startup.

After release, the test verifies the result stays open, no save/retry/title
transition occurred, and only one result was added to history. The first
independent press must successfully Retry and produce a fresh paused mission.
A second real deadline crossing then sends a fresh native Retry press
immediately after releasing the old gesture, without an observation delay or
intervening assertion. This separately catches a blanket next-click shield or
input debounce. The first run’s 350 ms observation period is test-only, to
observe compatibility clicks; it is not an application input delay.

## Local verification and remaining gate

- Focused `node --test tests/input-scope.test.mjs`: **21/21 passed**.
- Current 0.9 aggregate `npm test`: **382/382 passed**, no failures or skips.
- Isolated corrected 0.8 aggregate `npm test`: **278 passed, zero failed,
  one existing skip** (279 discovered); its focused 21 tests and runtime
  parsing also passed.
- Current 0.9 `npm run check`: passed for all runtime modules.
- Current 0.9 `qa/browser` `npm run check`: passed, including unchanged pinned
  0.7/0.8 update-fixture integrity checks.
- Browser discovery via `npm run list` was unavailable in this workspace:
  the resolved `playwright` executable is the Python CLI, which has no `test`
  command; the isolated Node browser package is not installed here.
- **No browser or server was run locally.** These checks are not a browser
  pass. The parent must run the exact corrected candidate in the authorized
  cloud browser environment, including all four profiles, native keyboard,
  drag/multi-touch, cancellation, controller, and offline/update suites.

The 0.9 engine remains SHA-256
`e47a168c099c2a4e1f45b238d5224cb44a02433a7cff06adbfb87095c4d56bc7`.
The frozen 0.8 review snapshot and ongoing isolated 0.10 source are not edited.
The handoff includes a narrow patch and a separate corrected 0.8 copy for the
parent to review and stage. Publication remains a separate authorized step.
