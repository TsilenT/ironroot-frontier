# v0.13 exact-candidate browser gate repair

The first private candidate was `0823cb6776df37e2aa309e20fa329c565ca0a356`. Its 844 browser instances finished with **715 passed, 126 failed, and 3 intentional skips**. Root tests passed 806 with one optional desktop dependency skip. This was a failed release gate, not a production release.

## Failure contracts

- **64 copy assertions** still required earlier wording. The shipped proposal intentionally changed seven specific labels/descriptions. Corrections must retain the substantive protections, economics, accessibility alternatives, and practice/reward distinctions, not replace checks with generic text presence.
- **40 damaged-save cases** expected Start to overwrite an unreadable save. The current start guard opens Preferences and retains those original bytes. Background Pause is correctly inert while Preferences is open. Repairs must first verify refusal and retained bytes, then exercise explicitly confirmed compatible-backup replacement before allowing a new battle.
- **16 drawing observations** identified build slots by a fixed 1.5 world-unit stroke. The accepted renderer instead uses `max(1.5, 1 / scale)` to retain a visible one-pixel outline when zoomed out. The replacement observation must verify actual slot geometry and its delivered transform/stroke, not accept arbitrary strokes.
- **4 orientation assertions** expected the battlefield canvas to fill the viewport width. The shared mobile landscape controls occupy a side rail. Canvas backing pixels must match its actual CSS bounds times device scale, and controls, camera, placement, and resize safety must remain checked.
- **2 Rootwarden cases** reached hidden Volley immediately after resuming from the guide. Their helper saw the visible Build control temporarily disabled, returned without opening it, then waited for hidden Volley. Actual handler tests reproduce the stale flag between Resume and the next normal HUD refresh (up to roughly 100ms). After that refresh the real Cancel, Build, and Volley controls work for both rulesets across three mobile layouts. The helper must wait for enabled and use native input rather than abandon the drawer transition.

## Coverage already passed on the first candidate

Campaign onboarding/replay passed 36/36; shared mobile drawer and unsafe-resize cases passed 8/8; backup/accessibility passed 72/72; reports/controller cases passed 96/96. The real production-v0.12 upgrade suite passed 20/20, including all 16 worker-upgrade scenarios. Minimap and held-game-result transitions passed.

These passes do not validate later assertions skipped by the failures above. The repaired exact candidate still needs its entire browser matrix rerun, including those later assertions.

## Recovery limitation

Without a compatible backup, the current damaged-save guard does not offer an in-app fresh-start/reset operation. It deliberately preserves the original save. A future recovery design should provide an explicit export-and-reset choice with clear consequences rather than silently changing or discarding unreadable data.

## Verification status

The repaired root suite passes **818 tests, zero failures, one existing optional desktop-dependency skip**. Eight separate dependency-free harness contracts pass, including thin/wrong-style slot negatives and permanently disabled-control refusal. Runtime syntax/inventory, browser fixture checks, and the real-production upgrade preflight pass. All **41 runtime files / 788,320 bytes** are byte-identical to the first candidate. Final independent contract review found no blocking issue; see `GATE_REPAIR_0_13_REVIEW.md`. The complete repaired browser matrix remains unrun. No repaired browser pass or release is claimed here.
