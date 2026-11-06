# Browser regression harness

## Provenance and status

Adapted from private source repository TsilenT/ironroot-frontier, branch
`test/mobile-browser-regressions`, commit
`b06258fe1266299f855204f1eca3271a2057f6fc` (baseline `db685c6`).
Original files were retrieved through the authorized GitHub connector.

Original reported run: 48 passed, 9 failed, 3 skipped on Chromium 155 /
Playwright 1.65.0. **Those are historical baseline results, not current results.**
The authorized cloud worker subsequently reported **81 passed, 0 failed,
3 skipped** after correcting two stale Field Guide access tests on branch
`test/field-guide-pause-harness`, commit
`aef4155c15399825aef54e674f780bf45a03cbf2`, based on `a502451`.
That commit's test-only diff was verified through GitHub and integrated locally:
the guide is opened from pause, and dismissing it must return to pause before
resuming. This is a reported cloud-worker result, not a local browser run or a
claim that the newer v0.6 campaign integration has passed the matrix.

Local v0.6 source review confirmed the existing save helper already unwraps outer
save versions 1 and 2. A narrow additional adaptation checks the new invalid-save
contract: retain the original bytes with a visible load warning, then replace
them only when the player starts a new battle. Both old invalid fixtures remain.
These v0.6 assertions have passed syntax checks but await browser execution.
No browser run was performed in the managed local environment, where browser
actions require CUA. Run this suite only in a cloud coding environment authorized
to launch Playwright. The managed preview on port 4173 is not used by this harness.

## Isolated, reproducible tool package

Only `qa/browser/` and this document are added. Root dependencies, build scripts,
workflows and production `dist/` are unchanged. The separate package pins
`@playwright/test`, `playwright` and `playwright-core` to 1.65.0 through its
package manifest / lockfile. Node **20 or newer** is required (the original
document's Node 18 statement conflicted with the actual dependency engines).

In an authorized cloud coding environment, from the repository root:

```sh
cd qa/browser
npm ci
npx playwright install chromium
npm run check
npm run list
npm test
# Or, if this environment explicitly permits using its existing Chromium:
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm test
# Focused regressions:
npm test -- --project=phone --grep 'keeps its details'
npm test -- --grep 'failed save|Space activates|malformed history'
```

The server binds only 127.0.0.1:4187 and serves this checkout's dist directory.
It does not reuse an existing server. Use the commands above from qa/browser.
Reports, failure screenshots and traces go under qa/browser/playwright-report
and qa/browser/test-results, both ignored. Record commit, Node, Playwright,
browser version and actual pass/fail/skip counts alongside any reported run.

## Retained and adapted coverage

All original 15 test cases remain, with four viewport profiles: 390×650 touch,
320×568 touch, 844×390 touch landscape and 1180×757 desktop. Touch cases include
hardware-keyboard checks. Three intentional skips restrict the coordinate-specific
click-through regression to the 390px phone; no known product failures are marked
expected or skipped.

The source suite's placement, drag rejection, occupied slot, upgrade, salvage,
viewport resize, pause/help timing, save round trip, invalid save, focus,
near-end victory/defeat/draw, failed save, native Space and click-through checks
still apply. The adaptation changes these obsolete assumptions:

- Saved game assertions unwrap the current ironroot-save envelope. Legacy raw
  engine saves are still exercised by near-end fixtures; round trips exercise
  the new envelope through real UI writes.
- Welcome focus wraps from Preferences to the Skirmish mode tab, rather than
  from Field guide to Easy difficulty.
- A denied save must keep the battle open and paused, not navigate to title.
  SecurityError coverage now opens actual preferences, rather than only toggling
  the toolbar audio button.
- Paused keyboard building selection is tested without trying to click through
  an overlay. The new Settings toolbar control is included in viewport checks.
- Failed-save coverage now asserts battle retention as well as a warning.
  A separate case confirms the previous durable snapshot remains unchanged
  and that saving works after storage is restored.
- Four malformed-history fixtures (broken JSON, null, object, invalid array
  entries) reach a real engine-driven victory, assert exactly one history row
  and open the recent-history preferences view.
- Preferences reload persistence and native Space on a checkbox are covered.

The original/adapted regression file has 21 logical cases (84 profile instances).
The campaign file adds nine cases (36 instances), for an expected total of
120 profile instances, including three intentional skips. This is an expected
discovery count, not a pass claim. The historical 81-pass run covers only the
previous 84-instance matrix.

## v0.6 campaign critical flows (prepared, not browser-executed)

Run in an authorized cloud coding environment:

```sh
cd qa/browser
npm ci
npx playwright install chromium
npm run check
npm test -- campaign.spec.mjs
# Then run the complete combined suite:
npm test
```

`campaign.spec.mjs` adds nine tests on all four profiles, with no new skips or
expected-failure annotations:

- Locked Three Roads has a disabled launch action and prerequisite explanation;
  selecting Emberwatch enables launch. Enter on the locked selection stays on
  the title screen without creating a save.
- Keyboard activation of chapter and mission choices retains focus on the
  replacement choice after the list rerenders.
- A campaign started through the UI builds an Archery range, saves with outer
  version 2, reloads, resumes Emberwatch and preserves construction and time.
- A victory fixture produces three stars and exactly one history entry. Continue
  selects/unlocks Three Roads, which can then launch through the UI.
- A timeout-failure fixture initially focuses Retry, keeps progress empty, traps
  result focus, and starts a fresh instance of the same mission on Enter.
- A protected mine exposes a disabled salvage action and explanation; an ordinary
  barracks remains salvageable. Both protected mines remain in the saved state.
- Campaign briefing controls and Begin Mission remain reachable after narrow,
  landscape and portrait viewport changes; the fully visible launch button works.

Fixture provenance is explicit: `campaign-fixtures.mjs` creates missions using
the public campaign factory and serializes them with the public engine contract.
Victory removes the marked Emberwatch target at time 10 with an intact citadel;
failure sets its clock to the deadline with the target alive; protected selection
loads Winter Stores with synthetic valid completion records for its prerequisites.
These fixtures seed only browser storage. They do not call private application
functions, force a result DOM or set an engine winner. The real application
evaluates the objectives and performs result, history and progress transitions.

Locked/focus/responsive tests use fresh UI-started campaigns. The save/resume
test builds through actual pointer input and does not seed storage. Synthetic
outcome fixtures validate transitions, not player skill, combat balance or
earned campaign progression.

`npm run check` checks all harness module syntax and runs
`validate-campaign-fixtures.mjs`. Its three fixtures passed Game.restore,
campaign-outcome assertions, prerequisite checks and progress normalization
locally. Browser assertions remain unrun here. Two independent-review defects now have
explicit regressions, described below; cloud failures must be investigated, not
automatically skipped. Campaign audio, all twelve missions, every branch, progression-write
failure and complete campaign accessibility still need separate coverage.

## Independent-review defects: regression assertions pending fixes

Two additional campaign-file tests encode desired behavior and are expected to
fail against the reviewed pre-fix implementation. They are not skipped or marked
`test.fail`: once production fixes land, they must pass normally. Their current
local execution status is syntax-checked, browser-unrun.

- **Stale multi-tab save ownership.** Page A starts and pauses Emberwatch through
  the UI. Page B, in the same browser context and origin, starts and pauses a new
  Hard skirmish. Closing A explicitly runs beforeunload and must preserve B's
  exact durable save bytes and skirmish identity. The test permits accepting a
  leave-page warning but never authorizes overwriting the newer save. Both pages
  are checked for uncaught errors. This uses real pages and UI-created saves,
  not seeded storage or a manually dispatched lifecycle event. It specifically
  covers unload; visibility-only lifecycle handling still needs separate review.
- **Collapsed landscape campaign scroll area.** A UI-started campaign is saved
  back to title so Resume occupies its real layout space. At 844×390, the
  campaign content's client height and viewport-visible height must both exceed
  120 CSS pixels. This catches the independently observed approximately 10px
  content strip rather than merely checking that Begin Mission is reachable.

Focused cloud command:
```sh
cd qa/browser
npm test -- campaign.spec.mjs --grep 'stale paused|120px'
```

## Targeted mobile click-through reproduction

On a fresh 390×650 touch viewport, start a skirmish, choose Go to base, build an
Archery range at world (550,450), cancel placement and tap that same location.
The details panel must remain open after the compatibility click settles.
Close it deliberately, then tap the building again; it must reopen.

Coordinates are derived from the actual canvas rectangle rather than guessed:
s = max(0.32, canvas.height / 900); half = canvas.width / (2*s);
camera = half >= 1600 ? 1600 : max(half,450);
tapX = canvas.left + canvas.width/2 + (550-camera)*s;
tapY = canvas.top + canvas.height/2.
These are CSS pixel dimensions, not the DPR-scaled canvas backing store.
The current zoom starts at 1. This recipe intentionally avoids interacting
with zoom controls before computing the point.

On the historical baseline, pointerup targeted #battle and opened the panel;
the following compatibility click hit the newly exposed #closeSelection.
The source review does not prove whether the current implementation is fixed.
The retained assertion and deliberate close/reopen check must be rerun on the
final product code, using actual touch input rather than only dispatching a
synthetic click.

## Limits

Chromium emulation is not Safari, Firefox, real iOS/Android, physical rotation,
safe-area or browser-bar testing. These tests do not establish audio quality,
touch ergonomics, controller usability, balance, complete accessibility, offline
upgrade behavior, memory stability or long-match frame rates. Campaign and field-trial mission content is not exhaustively covered by this
suite; the 81-pass historical cloud result predates the local v0.6 integration. Near-end fixtures
test actual engine-triggered UI transitions, not human-played full matches.
Screenshots, CUA reviews, unit tests and balance simulations remain separate gates.
