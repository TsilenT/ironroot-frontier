# Income and first-build native browser QA

Bounded review on 2026-11-07 using actual cloud Chromium CUA, Sites managed preview at its returned URL, and responsive iframe viewports. Runtime copied without edits into `/workspace/shared/ironroot-income-first-build-preview`; wrapper based on prior isolated fixture, with flight imports/checkpoints removed. Empty ordinary in-memory profile; live animation clock throughout. No production tabs accessed, no security changes, and no real storage seeding/clearing.

## Observed passes

- First ordinary Roadside Watch began directly on battlefield with Build controls and visible HUD guidance outside Build: “Paused. Build → Barracks.” No pause-or-play dialog and no coach Start button. Gold 420 and 00:00 remained fixed throughout inspection, resize, Pause/Options/Resume and attempted Archery selection.
- Actual Archery click before Barracks showed “Build a barracks first to begin.” Gold remained 420, clock 00:00, and first-build guidance remained active.
- Normal Pause opened Battle Menu; Options opened ordinary options with Back to pause menu. Resume returned to planning, not running battle, before first barracks.
- Actual paid barracks placement immediately displayed 280 gold from 420 (140 cost), showed “Barracks raised. First troops in a moment,” removed placement state, and changed HUD instruction to Add archers. Battle advanced to 00:06, generated income, and spawned troops without another Start/Resume action.
- Normal Pause after construction opened Battle Menu at 00:06. Save & return to title, wrapper Reload retained memory, then Resume Mission restored the paid barracks and running battle at 00:06/314 gold. Another pause at saved 13.6 seconds/348 gold worked; Resume advanced to 00:16/363. No first-build planning gate repeated after reload.
- +5 /s fully visible in screenshots at 390×650, 320×568 and 320×430; no visual collision with gold/health. First-build guidance remained outside Build at each size. At 320×430, income rect x52.546875,y2,w25.28125,h16; gold right48.546875 (4px gap); game document exactly320×430. At 320×568, income x62.71875,y6,w25.28125,h16; gold right55.71875 (7px gap); document exactly320×568. At390×650 after running, income x65.5625,y6,w25.28125,h16. Computed font11px, line-height16px. Computed display is block (flex-item blockification), while visually inline alongside gold. Header/battle starts remained72px tall for taller portraits and48px at320×430.

## Limits / interpretation

- An attempted off-road click intended as invalid actually snapped to a valid site and built the first barracks. It is NOT an invalid-placement pass or a defect: existing renderer.snap clamps to nearest allowed column/lane. Actual invalid first-build rejection therefore remains unverified in this bounded native pass; use deterministic coverage for that branch.
- No physical mobile device, notch, OS browser chrome, safe-area inset, touch-only behavior, or fullscreen validation. No synthetic safe-area CSS was applied.
- Later campaign lessons were not reached in this empty-profile bounded pass. Resumed paid Roadside Watch behavior was verified, but pre-barracks restored saves and other legacy saves were not.
- Source-level proof that income economics are unchanged belongs to implementation diff/tests; browser observed displayed+5/s and accumulating income, not a precise wall-clock economic benchmark.
- One exact-name locator timed out after resize closed Build. Inspection confirmed closed controls; opening Build then native indexed click succeeded. No denied action or uncertain write was retried.

## Shared profile preservation and cleanup

The wrapper read-only fingerprint covers all actual localStorage keys at preview origin, not production origins. Every measured allSharedKeysExact was true. Final original/current SHA256 identical:
`a9c9b81a8ab25736ac9d1117cbcba27443990d65d2111088b2d3d4d801ae1104`.
Game local/session storage was isolated in memory. Sites preview stopped successfully after final verification. No runtime changes made by this reviewer.

## Runtime SHA256

- `app.js`: `cc9148d7a5c2f7f244eb361d139e8004898aa43f7778bed3dca2a51e775b6077`; preview identical: True
- `index.html`: `3386f65ca0a2545d4fc8ff3ad70a80366da6061ac6d1fb21ccd1e377cb6cd129`; preview identical: True
- `styles.css`: `006a784c4c0f71eae49f7569e6e978395d22bcc3053bd9d70afd4b630d15fb91`; preview identical: True
- `engine.js`: `16320893e83d7819b3103117803845e061fdb79cbb8adc2a8e6e95d76ec168bf`; preview identical: True
