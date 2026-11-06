# Browser regression harness

## Provenance and status

Adapted from private source repository TsilenT/ironroot-frontier, branch
`test/mobile-browser-regressions`, commit
`b06258fe1266299f855204f1eca3271a2057f6fc` (baseline `db685c6`).
Original files were retrieved through the authorized GitHub connector.

Original reported run: 48 passed, 9 failed, 3 skipped on Chromium 155 /
Playwright 1.65.0. **Those are historical baseline results, not current results.**
This adaptation has passed JavaScript syntax checks only. No browser run was
performed in the managed local environment, where browser actions require CUA.
Run this suite only in a cloud coding environment authorized to launch Playwright.
The managed preview on port 4173 is not used by this harness.

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

There are 21 logical cases, producing 84 profile instances, including the three
intentional skips. This is an expected discovery count, not a pass claim.

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
upgrade behavior, memory stability or long-match frame rates. Newly added
challenge content is not exhaustively covered by this suite. Near-end fixtures
test actual engine-triggered UI transitions, not human-played full matches.
Screenshots, CUA reviews, unit tests and balance simulations remain separate gates.
