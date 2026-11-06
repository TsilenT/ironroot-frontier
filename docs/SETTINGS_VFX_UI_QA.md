# Settings, audio controls and VFX UI review

Reviewed the v0.5 integration on 2026-11-06 through the managed preview in real Chromium. This review used ordinary UI actions and read-only DOM inspection, without changing game state through scripts. A temporary iframe supplied 320 × 568 and 844 × 390 CSS viewports. These are responsive pointer tests, not physical touchscreen tests.

## Passed

- Opened Preferences from the title, active battlefield gear and paused menu.
- Changed all six preferences: audio, music and sound effects off, volume 25%, reduced motion on, effect quality low. Reloaded and independently checked that all six values persisted. Restored the original enabled audio/music/SFX, 50% volume, normal motion and high effects afterward.
- Keyboard volume adjustment worked in 5% steps. Space toggled a focused checkbox without triggering the game pause shortcut.
- Tab from the final button wrapped to Close, and Shift+Tab from Close wrapped to the final button. Escape dismissed Preferences and restored the triggering gear focus.
- Opening Preferences from a running game froze its clock, then closing resumed it. Opening from Pause, then closing, returned to the paused state and restored focus to the Preferences link.
- Pause → Field guide → Ready returned to Pause. Resume continued the battle.
- Recent battles correctly listed the prior Holdfast defeat at 00:59, Shieldbreaker victory at 01:10 and skirmish defeat at 01:30.
- At 320 × 568, settings labels and inputs stayed within the panel. The panel scrolled to the history and final Back button. At 844 × 390, the same lower controls were reachable by scrolling. The close control was reachable at the top in both sizes.
- Pause actions, including Preferences and Field guide, fit both tested mobile viewports. Four battlefield toolbar controls fit without colliding with the minimap.
- Built a Siege foundry and Arcane sanctum during an actual skirmish. Construction confirmation, building appearance and production remained coherent. Purple magic impacts and the Rally ring/sparks were visible during combat without obscuring the units or HUD.
- Switched low effects/reduced motion on during the mobile game, resumed and navigated the map successfully, then restored high effects/normal motion. No gameplay interruption was observed.
- Narrow Barracks selection opened and remained open with a normal pointer tap. Save & return to title produced a resumable 01:51 battle.

## Important limits

- Music/SFX controls, persistence and state handling were exercised, but no audio capture or listening path was available. This does not verify audible balance, musical quality, latency, clipping or behavior on phone speakers/headphones.
- Transient construction dust and individual debris timing were not measured. Screenshots showed combat effects, but do not establish smoothness, FPS or frame-time stability.
- Real iOS/Android touch, synthetic click sequencing, pinch gestures, browser audio suspension and device rotation still require device coverage. A separately reported touch click-through issue could not be reproduced with the ordinary pointer tap tested here; it remains independently relevant.
- Native desktop packaging, Steam integration, production offline caching and accessibility with a screen reader were not tested in this UI pass.

## Validation state

- `npm run check`: passed.
- The first aggregate `npm test` during concurrent integration included five failing new AI tests. This was reported promptly to the builder rather than treating the older 81-test count as current. Final validation should be recorded after the AI patch and any follow-up UI fixes settle.
- Browser diagnostic inspection returned extension metadata errors. It did not establish an application-specific error; a clean full-console assertion is not claimed.

## Assessment

No new blocking issue was found in the scoped settings, pause lifecycle or responsive layout checks. The preferences are usable and the additional combat feedback stays restrained. This is an incremental browser-playable quality check, not evidence of Steam release readiness.

## Follow-up panel guard check

After the builder added delayed panel opening and a Close pointerdown guard, a 390 × 650 pointer retest built a lower-lane Barracks near world (550, 450), opened its details and confirmed that the panel remained visible. Both a direct pointer click on Close and Enter on Close dismissed it after reopening. This verifies ordinary pointer and keyboard regression coverage, not the original synthetic-touch sequence. The temporary responsive fixture was removed from `dist` after the pass; the retained preview is the normal game URL.

- Final aggregate rerun after the AI integration: 104 tests passed, 0 failed. `npm run check` passed again. The five earlier AI failures are resolved in this shared-tree rerun.
