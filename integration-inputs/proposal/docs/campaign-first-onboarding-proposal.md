# Campaign-first onboarding proposal

Based on private main `24eddda` (v0.12 candidate 3). Isolated for review; no merge or deployment.

The campaign opens by default at the first unfinished unlocked mission. Skirmish and field trials remain explicit mode choices. Existing saved battles still have their own Resume action. Saving and exiting focuses Resume; continuing a completed mission opens the next briefing and focuses Begin Mission. The campaign result screen also labels its menu destination as Campaign missions.

One- and two-star campaign wins offer **Replay for more stars** alongside Continue. Replay starts the same authored mission through the normal start path. It does not clear the recorded completion, best stars, best time, or unlocked missions. Three-star results keep Continue as the primary action. Failed missions retain Retry.

The early campaign teaches through the existing battlefield, build cards, selection details, and normal `Game.build` / `Game.upgrade` commands. A compact line in the command deck explains the current action. Gold outlines mark the real control and, when placing, one currently legal site. The site is a suggestion; players can build elsewhere. Hints respond to living buildings and income in the actual battle and can be hidden or shown. The battle clock continues normally; there is no separate practice simulation, tutorial reward, auto-placement, or stored tutorial state in this path.

New mission attempts introduce a smaller build bar:

| Mission | Added options |
| --- | --- |
| Emberwatch | Barracks, archery |
| Three Roads | Watchtower |
| Winter Stores | Gold mine, with contextual mine-upgrade guidance |
| Wings of Ash | Keep the current roster; archery answers flyers |
| Stonegate | Foundry, with contextual siege guidance |
| The Long Vigil | Sanctum |
| The Cold Forge and later | Full roster, including aerie |

**All buildings** exposes the full roster immediately. These are presentation defaults, not technology locks or a rebalance. Resumed battles always show all seven options, and repeat attempts start with the full roster. Existing buildings can always be inspected and upgraded. Keyboard and controller selection respect the displayed roster; expanding it makes every normal shortcut available again. The old standalone guided practice remains an optional title link for players who want a safe rehearsal.

## Save and integration contract

- No changes to the engine, authored missions, maps, objectives, profile protocol, backup schema, storage keys, or battle serialization.
- Existing v0.12 mission IDs still create the same battle. Hints derive from the saved state; they never convert a save into a different ruleset.
- Preserve all existing control IDs. New deck controls are `campaignCoach`, `coachTitle`, `coachText`, `toggleCoach`, and `allBuildings`; the new result action is `replayMission`.
- `campaign-flow.js` contains the presentation policy, pure guidance inference, and canvas overlay. `app.js` calls it around the existing gameplay path. No HUD controls are reparented and no input scopes or dialog machinery are replaced.
- A mobile layout experiment can move these controls with the command deck. The overlay reads the existing renderer's canvas, camera, and scale. Hints must remain outside any separate sidebar.
- The offline manifest includes the new module. Public build metadata/cache version should be advanced with the eventual consolidated release, not independently by this proposal.

## Validation and limits

Executable policy tests use real mission Games to verify progressive choices, full saved-battle access, valid suggested sites, real construction/upgrade observations, and unchanged serialized state. Browser regressions cover entry/navigation, real paid construction, optional hints, expansion/collapse, legacy construction, replay at each star count, retained best records, and the existing campaign flow at four viewport sizes. Existing frozen engine/rendering, save/backup compatibility, storage safety, and campaign regressions remain in place.

Verified on 2026-11-06:

- `npm test`: 642 passed, 1 existing skip, 0 failures (including 7 new campaign-flow policy tests).
- `npm run check`: all runtime JavaScript modules parse.
- `npm run check:release`: 34 runtime files; offline manifest and imports are complete.
- From `qa/browser`, `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npx playwright test '(^|/)campaign(-onboarding)?\.spec\.mjs$' --reporter=line`: 76 passed across phone, narrow phone, landscape, and desktop. This is the focused campaign/onboarding suite, not the entire browser matrix.
- Manually inspected phone and landscape screenshots of the actual battle UI and phone placement guidance.

This is a navigation/onboarding proposal. Lane progression, cross-lane units, map balance, broad prose revision, and the separate practice layout are outside this branch. Hints are advisory and do not pause the battle. The initial roster therefore remains expandable so this UI proposal cannot prevent an existing strategy or medal route. Physical controller testing and human campaign balance playtesting remain useful before release.

