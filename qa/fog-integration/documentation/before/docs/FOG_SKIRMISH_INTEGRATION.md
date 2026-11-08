# Optional fog Skirmish: local v0.21.0 candidate

## Scope

This is a local integration draft based on released v0.20.2 (`0cdd1f5f3ff35c538c36b6cfe30848b2cfb632e7`). It is not published, merged, deployed, or approved for release. Current live remains v0.20.2. The isolated prototype and both frozen prototype snapshots are unchanged. PR14 is outside this work.

The new candidate identity is `frontier-fog-skirmish-open`, revision 1. It is available only for standard Skirmish on Classic revision 1, open endgame, without bridge income. The old QA identity remains rejected by ordinary save/history/backup admission. Core and profile details are in `FOG_SKIRMISH_CORE.md` and `FOG_SKIRMISH_PERSISTENCE.md`.

## Setup and unchanged modes

New Skirmish has one unchecked, session-only Fog of war control. It is not a preference, backup setting, or live toggle. An incompatible map/endgame/bridge selection disables fog; selected fog disables incompatible controls. The controls explain the restrictions. No map/endgame choice or saved bridge preference is silently rewritten. Begin checks the combination before profile synchronization, checkpoint ownership, construction, or saving.

Running, resumed and restarted battles use their immutable ruleset identity. Campaign, trials, practice and every existing fog-off map/endgame/bridge combination keep their prior identities. The prior first-barracks teaching/Volley guard is retained.

## Presentation boundary

The authoritative Game still advances simulation, validates/spends paid commands, and serializes saves. `refreshPresentation()` builds one detached side-0 observation per frame and after direct commands. `battleView()` shares it across the fog field, minimap, HUD/aria, enemy citadel text, Front camera and audio. An actual-frame test verifies that the field, HUD and audio receive the same object.

Only fog identities select `FogRenderer` and `ObservationAudio`. Ordinary identities retain the stock renderer and audio branch. Renderer selection resets VFX, unit motion, event consumers, selection and aim; reapplies reduced motion, effect quality and zoom; and resizes against the current map. Restored fog camera placement uses the observed own front, clamped by the ordinary camera geometry. Restart starts new knowledge while Resume retains validated memory.

Hidden enemy citadel HP is `?` with explicit unknown accessible text and a hatched track, not an empty health percentage or stale value. Current observed HP/choice can appear; loss of sight clears current HP and marks any remembered choice “Last seen.” No enemy purchase timing, recovery countdown, healed total or shot count is displayed. Own readiness and purchases use the authoritative command/status helpers, so unknown enemy HP cannot falsely end the player's purchase eligibility.

Stale structures retain frozen type, level and last-observed simulation timestamp without current health/production. Field/minimap particles and event sounds keep the prototype's birth/current-visibility filtering. Front/follow does not use hidden enemies. Fog audio consumes paused/off-camera events without replaying them. Immediate own-command sounds remain the sole source for build/upgrade/sale/Volley feedback, preventing duplicate event audio. Decorative projectile trajectories remain omitted in fog; this limitation is disclosed in setup.

Resume, pause, results, history and backup preview disclose Fog from identity. Full-information report creation/rendering remains terminal-only and identifies the fog post-battle context. Serialized saves intentionally contain full simulation data; this is a local single-player information boundary, not encryption or anti-cheat protection.

## Safety and regression repairs

Commands still use existing pointer, keyboard and controller routing, paid costs, cancellation and viewport/profile/input gates. Engine sight is rechecked at Volley execution; a formerly visible aim that loses sight cannot spend. Own upgrade/sale additionally check the ordinary interaction/checkpoint boundary before execution.

Help/Options previously could restore their pre-panel running state after a background interruption. A narrow latch now retains pause when an open panel receives blur, hidden-page or page-departure interruption. Uninterrupted ordinary panel closes retain prior behavior. Fullscreen availability is independent of fog setup. Follow interpolation retains the original winner and authored-outcome end guards.

Existing executable fixtures were supplied the new presentation/import dependencies without weakening assertions or changing pinned old fixtures.

## Assembly and checks

Candidate versions are coherently 0.21.0 in browser, root package, desktop package and desktop lock metadata. The cache is `ironroot-v0.21.0`. The only new precached production modules are `fog.js` and `fog-view.js`; QA shells/scenes, reports and prototype scope files are outside `dist` and are not cached.

Focused executable evidence is in `../app-evidence/` from the repository root:

- `fog-app-tests.log`: 16 new actual-function/DOM/audio tests, including hidden-state differential canvas/minimap transcripts, setup rejection before writes, paid actions, citadel null-HP readiness, lifecycle/reset, identity labels, one shared frame observation, interruption, fullscreen and ended-follow regressions.
- `app-focused-tests.log`: 506 selected app-dependent tests: 505 passed, zero failed, one optional skipped check. The skipped check is not a pass.
- `syntax.txt`: all production JavaScript parses.
- `runtime-preflight.json`: exact 56-file production dist, relative import/precache closure and hashes. This is source-dist validation only, not a publication approval or native offline check.

The parent owns the one final whole-repository aggregate after all owners freeze. Focused checks do not replace it.

## Open acceptance gates

No native main-app browser session or production/QA profile operation was performed during this integration assignment. Browser preview/profile isolation must be agreed before starting it. No backup upload/restore was attempted through a browser.

Native compact viewports remain blocked/unrun. The prior Chromium DevTools responsive path was expressly denied; no retry, alternate emulation/iframe or browser-protocol workaround was attempted. Canvas geometry tests are not phone evidence.

Still required before broader exposure: an ordinary-cost complete main-app match and real memory transition, native main-app readability/input/interruption/audio checks, sustained loaded browser performance, offline new-install/reload/update/Resume checks, and suitable AI playthroughs. Synthetic/model parity establishes neither mobile FPS nor gameplay balance. No new campaign fog levels are included.

## Subsequent local readability patch

The first native main-app evidence is preserved with its original source hashes. See [FOG_READABILITY_FOLLOWUP.md](FOG_READABILITY_FOLLOWUP.md) for the later bounded dense-memory badge/Pause-detail remedy and two copy corrections. Those newer bytes require their own final assembly and native evidence; the earlier native pass does not certify them.
