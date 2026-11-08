# Combined citadel and mobile setup repairs

## Scope and source

Private source baseline: `bb8d4c2cf334adb851ff2f52d40206c03955f8e4`, tree `7906b5aafef2658d5d486f39c4f12e600c2bf408` (merged Lanterns PR #25).

This candidate combines the reviewed home-citadel interaction and portrait Skirmish focus repair. Source, desktop metadata, visible version and offline cache advance together to **0.24.1 / ironroot-v0.24.1**. The exact base tree is preserved outside the changed files. This is a private-source change, not a deployment or production acceptance claim.

## Behavior

- Clicking or tapping the own citadel artwork or visible upgrade/status badge opens its existing upgrade dialog and pauses the battle. The pause-menu shortcut remains available.
- The drawn badge and pointer target share the same edge-clamped geometry. Fog uses detached own-side observations and leaves enemy private status unavailable.
- Construction and spell targeting take precedence. Drag, modal, stale ownership, teaching, recovery, terminal and viewport guards remain in force.
- Prices, one-choice purchase limit, engine behavior, profile protocol, save format and fog compatibility are unchanged.
- When pointer input leaves focus outside a dialog, passive repair uses `focus({ preventScroll: true })`. Tapping a disabled Fog label or non-focusable explanation therefore preserves reading position. Explicit dialog entry and deliberate keyboard navigation retain their normal focus/reveal behavior.

## Automated verification

On the combined candidate:

- `npm test`: **1,795 tests, 1,794 passed, one existing optional skip, zero failures**.
- `npm run check`: all game JavaScript modules parse.
- `npm run check:release`: exact **58-file** runtime/offline-shell closure passed. A patch-created backup was moved out before validation and is not in the runtime or commit.
- `npm run check` in `qa/browser`: browser-source syntax and fixture validation passed, including both new specs.
- Independent focused review: **223/223** Node checks passed across citadel, fog, input scope, passive focus, campaign mobile and protected-objective UI. No blocking source defect found; no review edits were required.

The current GitHub workflow runs root Node tests and JavaScript syntax. It does not execute the authored Playwright matrix. The previous local browser-launch attempt was blocked by the executor's socket restrictions, so it was not retried. Browser syntax/fixture checks are not browser execution.

## Native combined-candidate check

Actual Chromium rendering and native pointer/keyboard input were exercised on 2026-11-08 in isolated, phone-sized preview documents. No production profile or application-state hook was used.

At 390×650, repeated unavailable Fog label and explanation taps retained the measured scroll position at 718. Enabled label/checkbox on-off-on toggles also retained 718. Starting that fog battle, clicking the home citadel, purchasing Extra Arrow, resuming and reopening through its visible badge all worked. Both purchase buttons locked after purchase and enemy health remained unknown.

Back and Escape both returned to the paused battle at the observed 00:16 / 312-gold state, with enemy health still unknown. At 320×568, an unavailable Fog tap preserved scroll position 757 and the menu had no horizontal overflow. At desktop 1180×720, Skirmish start and clicking the home citadel opened the upgrade dialog successfully.

One rapid desktop navigation/action batch initially started Campaign rather than Skirmish. Selecting Skirmish and observing its selected state before Start then passed. This unclassified initialization/input-timing observation is not claimed as a product regression or repaired by this change.

All 58 preview-directory runtime files matched the candidate by SHA-256. This verifies the served directory identity and observed behavior, not a separate response-body digest.

## Exact runtime review identity

SHA-256 of the final combined runtime files:

- `dist/app.js`: `eeb2108fa5ddfd4f3a8600f6c4daf5bea9f82bf16198029600ea7a0c09d1fbdd`
- `dist/render.js`: `d3be07536a06c76a65ed93e5f29319db5889cfb1bdbdfaed00e2a29f8ef9ecaa`
- `dist/fog-view.js`: `a4a4fbbe63f676b4a86917dbefa5e89668f021dc68d82cf69620d2b3b5559145`
- `dist/index.html`: `41f1c1add4144cf60f15d7f764e4370d1e63e8c46dfc8369e16ffc29cd0d0b20`
- `dist/service-worker.js`: `198204534d0c2a77415d7023d76d3b5b6aa57cdc2ea976735bb997c8791614ca`

## Limits

The prior standalone [citadel validation](CITADEL_CLICK_VALIDATION.md) retains its own scope; the checks above cover the combined source. These are bounded Chromium checks, not physical-phone, touch-emulation, Safari/non-Chromium, controller or broad accessibility certification. No full Playwright matrix or production service-worker update is claimed. Publication and its smoke checks remain separate.
