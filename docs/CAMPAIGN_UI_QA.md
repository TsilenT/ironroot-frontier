# Campaign UI and gameplay review

Date: 2026-11-06. Integration: v0.6, managed Chromium preview. Ordinary UI input only; no browser script changed simulation, gold, progression or save data. A temporary iframe supplied responsive CSS viewports, not device emulation.

## Played and verified

- Locked Three Roads could be inspected but not launched. Its briefing named Emberwatch as the prerequisite. Objectives, starting resources, bonuses and hints were available before play.
- Emberwatch launched with 460 starting gold, campaign header, target count and countdown. Built two Barracks and one Archery range in the middle lane using paid UI actions. Saved at 00:07, reloaded and resumed the same mission, buildings, resources and objective. Won at 00:39 with three stars, 8 kills and 4 total buildings.
- Continue returned to the campaign map with Three Roads selected and unlocked, Emberwatch marked with three stars, and totals 1/12 missions and 3/36 stars.
- Three Roads was won at 01:56 with three stars, 29 kills and 6 buildings. Ordinary play used a central Watchtower, a Barracks and Archery range in each outer lane, an upgrade and Rally. The target count advanced from 0/2 to 1/2, then victory. Continue unlocked Winter Stores. Progress survived reload: 2/12 missions, 6/36 stars.
- Winter Stores showed live income, protected target count and countdown. Starting mines had cyan protection diamonds. Selecting a mine displayed “Keep this objective alive” and a disabled “Protected objective” Salvage button; upgrading remained available.
- Leaving Winter Stores undefended caused failure at 00:43 when a protected mine died. The result identified the failed protection objective and offered Retry. Retry started the same mission with initial resources, two protected mines and a fresh 2:30 deadline.
- After closing another test tab that held an old campaign, Winter Stores save → title → reload → resume retained the correct mission and objectives.
- Pause → Preferences → close returned to Pause. Campaign → Skirmish removed campaign objectives; Skirmish → Shieldbreaker showed the correct trial name and 0/3 target objective. The earlier Shieldbreaker medal and best time were preserved separately.
- At 320 × 568, campaign content scrolled while the Begin Mission button remained accessible. Briefing text, optional stars, hint and unlock description could all be reached.
- At 390 × 650, the campaign failure result and its Retry / title / inspect actions fit the viewport.

## Findings sent to the builder

1. **Landscape briefing is nearly unusable.** At 844 × 390 with Resume visible, the fixed title, actions and footer left the campaign content only 10 CSS pixels tall (`clientHeight=10`, `scrollHeight=613`). It showed one clipped hint line. Recommended compact landscape header/actions or a larger scroll region.
2. **Result focus can escape during an in-flight gameplay click.** Emberwatch completed around a Rally canvas click; focus was BODY after the result opened. The later Three Roads result correctly focused Continue. This appears timing-dependent, not a universal missing-focus problem.
3. **An older browser tab can overwrite a newer battle save.** A separate paused Emberwatch tab was confirmed still open by the builder. Its lifecycle save resurrected an old 00:00 mission after the review had completed two missions. Normal single-tab save/resume passed after that tab closed. Save ownership needs cross-tab protection.
4. **Minor navigation friction.** Reload selected Emberwatch despite two completed missions and Winter Stores being next. Defaulting to the next unlocked mission would avoid accidental replay.

## Validation before follow-up fixes

- Aggregate suite: 109 passed, 0 failed, 16 controller TODO tests. The TODO tests are not counted as verified controller behavior.
- JavaScript syntax check passed.

## Scope limits

This pass directly played the first two wins and the third mission’s protection/failure/retry paths. It did not complete all twelve missions, verify later chapter battlefield themes, inspect the full ending, or confirm every star route in-browser. Deterministic simulation sweeps cover different questions than this UI pass. Physical touch devices, controller hardware, audible sound quality, native Steam packaging and production offline caching remain separate checks.

## Game feel

The opening mission supplies a quick, comprehensible win. Three Roads makes splitting production meaningful without adding new controls, and Winter Stores changes the goal from pure attack to protecting income. Mission dialogue, explicit bonuses and Continue create a clearer reason to keep playing than isolated skirmishes. The failed protection objective is specific enough to guide a retry. The landscape briefing must be fixed before calling the campaign mobile-ready.

## Follow-up fixes reviewed

- Landscape briefing repair passed at 844 × 390 with Resume visible: the scroll region increased from 10 to 244 CSS pixels. Objectives, briefing bullets, bonuses, hint and unlock text were readable by scrolling; Begin and Resume stayed visible side by side.
- Reload now correctly selects the next unlocked mission, Winter Stores, rather than defaulting to Emberwatch.
- The first protected mine could be upgraded normally while Salvage stayed disabled. On a later success attempt, constructing a third mine and buying normal upgrades immediately raised the live objective from 10.0 to 12.5, 15.0, 16.3 and 17.5 gold/sec. Meeting the income threshold did not end the mission early, as the briefing correctly requires holding it at the deadline.
- A full Winter Stores success was played with paid UI actions: two outer Watchtowers, a third mine, upgrades to reach 17.5 gold/sec, and defensive upgrades. It held both original mines and 64% citadel health through the deadline, earning three stars. Before the display rounding fix, the result read 02:29 for the 150-second threshold; the builder queued a presentation correction.
- Continue after the chapter finale opened The High Pass with Wings of Ash and Stonegate both ready and The Long Vigil locked. Totals were 3/12 missions and 9/36 stars. Chapter two's pale, rocky battlefield palette was visually distinct from the woodland chapter; the level-3 aerie targets were clearly marked.
- Browser cross-tab save ownership passed after the repair. An old paused Wings of Ash tab received an explicit newer-save warning after a second tab started and saved Stonegate. Attempting to resume the old battle returned to title. Closing the old tab and reloading the new one still resumed Stonegate with 0/3 targets and its 4:00 deadline. No old Wings save was resurrected.
- The repaired result transition initially focused Continue during the last Rally action. A backdrop click momentarily read as BODY in the same call; a later title backdrop check retained/recovered its first control. A further explicit backdrop guard was queued rather than claiming this edge was fully settled.

The direct play coverage now includes all three chapter-one wins and chapter-two launch/theme, in addition to the earlier failure/retry checks. Later chapter wins and the full ending remain outside this browser pass.

## Final smoke and cleanup

- After the final backdrop patch, clicking outside Preferences preserved `closeSettings` focus even in an immediate DOM read. Shift+Tab still wrapped to the final Back button; Escape dismissed the dialog. This is a direct shared-dialog guard check, not a repeat of the entire result timing race.
- Selecting the completed first chapter displayed its epilogue: the granaries are full, the roads are open, and the valley answers the same signal fire.
- Temporary responsive fixture removed from `dist`. The retained browser tab is the normal game URL on the High Pass campaign menu. No obsolete test battle tab remains open.
- Final independent aggregate run: 186 tests passed, zero failed, skipped or TODO. Syntax check passed. Some tests cover controller and backup modules that are not yet exposed in the v0.6 UI; those unit tests do not establish hardware/controller or backup UI readiness.

The scoped campaign review is complete with no remaining observed blocker after the targeted fixes. Full twelve-mission browser completion, physical mobile devices, later chapter palettes and the final ending remain explicitly unverified here.
