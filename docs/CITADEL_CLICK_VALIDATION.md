# Home citadel upgrade interaction

## Change

Clicking or tapping the home citadel, its towers/flag/gate/name, or its visible upgrade/status badge opens the existing Citadel upgrades dialog. The battle pauses while the player reads or purchases. Resume battle returns to combat; Back, Escape and browser Back retain the existing paused boundary. The pause-menu entry remains available for keyboard/accessibility navigation.

The unbought home citadel shows an `UPGRADES` badge. Both drawing and badge picking use the same edge-clamped geometry. Previously purchased choices keep their actual status label. Legacy rules do not acquire new choices. Selecting upgrades does not alter the engine, price, damage, recovery rules, one-choice limit or save format.

Placement and spells retain priority. Dragging, middle/right mouse input, held input across a modal boundary, teaching holds, terminal battles, viewport holds, stale ownership and recovery/profile restrictions cannot initiate a citadel purchase. Enemy citadels do not open the player's upgrades.

Fog uses only the detached own observation to show and select the home badge. Hidden enemy health, choices and counters are not introduced into rendering or picking. Enemy rendering remains on its existing observation path.

## Source baseline and integration

- Private source baseline: `bb8d4c2cf334adb851ff2f52d40206c03955f8e4` (merged PR #25).
- Base tree: `7906b5aafef2658d5d486f39c4f12e600c2bf408`.
- This patch does not bump release metadata, merge, deploy or publish.
- The separate mobile fog-checkbox repair changes only passive dialog focus restoration in `keepDialogFocus()`, so its app hunk does not overlap these citadel handlers.

## Automated checks

On the final source candidate:

- `npm test`: **1,792 passed, one existing optional skip, zero failures**.
- `npm run check`: all runtime JavaScript parses.
- `node scripts/verify-runtime.mjs`: exact 58-file runtime/offline-shell closure passes.
- `npm run check` in `qa/browser`: browser-source syntax and fixture validation pass, including the new citadel spec.
- Focused renderer, command safety, fog privacy and protected-objective checks: **53 passed**.
- The native preview's 58 runtime files match this candidate byte for byte. Viewport wrappers are outside the runtime.

The new Node tests cover citadel sprite/badge targets, map geometry, bought/legacy/terminal/offscreen display, detached fog handling, and the actual shared command handler under interruption/stale/modal guards. Existing narrow DOM fixtures explicitly exclude citadel dialogs while continuing their original building/tutorial assertions.

The browser spec contains 24 desktop/phone/narrow/landscape cases for both purchases, one-choice persistence/reload, Back/Escape/Forward, held Space, dragging/placement priority, the visible badge and fog-safe enemy disclosure. The local standalone Chromium runner cannot launch because the environment prohibits the browser's local socket creation. Its attempted runs did not execute test bodies and are not a browser pass. The pinned browser project's full native test matrix remains for CI or a supported browser executor.

## Native review

Passed on 2026-11-08 in actual Chromium using native mouse and keyboard input, with unchanged candidate runtime inside 1180×757, 390×650 and 320×568 viewport wrappers. No page state injection or simulation clock shortcut was used.

- Desktop: clicking the citadel tower opened upgrades and paused at 00:06 with 452 gold. Extra Arrow was bought, both purchase buttons became disabled, Resume returned to play with 263 gold (ordinary elapsed income after the 190-gold purchase), and clicking the visible Extra Arrow badge reopened the purchased status.
- Escape closed the upgrade dialog to the pause menu. Save & return and a new iframe document retained Extra Arrow and the elapsed checkpoint.
- At 390×650, dragging from the home citadel did not open the dialog. A subsequent normal click opened it. Browser Back returned to the same paused battle.
- A fresh 390×650 fog Skirmish showed the home UPGRADES badge. Clicking it opened upgrades. Regeneration was bought at 431 gold; both purchase buttons became disabled, with the eight-second wait and 0 HP restored disclosed. The enemy stayed explicitly unknown before and after purchase.
- After Save & return, a new 320×568 document resumed the fog checkpoint at 241 gold, preserving Regeneration. The edge-clamped Regeneration badge opened the dialog even with part of the citadel artwork cropped by the existing Home camera framing. The narrow dialog remained scrollable and readable.

One setup sentence still directed players only through the old pause-menu label. It was updated after this smoke to describe clicking the home citadel and the pause-menu alternative. This prose-only correction does not change any input or mechanics code.

No physical-phone, touch-emulation, controller, offline-update or broad accessibility claim is made. The 24-case Playwright matrix remains unexecuted locally; the bounded native checks above are separate evidence.
