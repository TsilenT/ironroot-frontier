# Optional fog Skirmish: local v0.21.0 candidate

## Scope

This is an unpublished local v0.21.0 integration candidate. Its fog work began on released v0.20.2 (`0cdd1f5f3ff35c538c36b6cfe30848b2cfb632e7`) and the combined tree now includes the approved PR #20 documentation and PR #21 audio changes from current main. The 8 November release handoff identifies **v0.20.3 as live**, from private main `f8eec7afb417a2d6616388c524f733e7853e8fa8`, tree `92da8b6c80560ad52240890acabcc24d38ff9080`. This documentation reconciliation did not independently query the remote or deployment.

The fog candidate is not published, merged, deployed or approved for release. It retains its distinct `ironroot-v0.21.0` cache/version. The isolated prototype and both frozen prototype snapshots are unchanged. Held PR #14, unshipped Ward and the queued Chapter 6 / ten-chapter design remain outside this work.

The new candidate identity is `frontier-fog-skirmish-open`, revision 1. It is available only for standard Skirmish on Classic revision 1, open endgame, without bridge income. The old QA identity remains rejected by ordinary save/history/backup admission. The candidate uses profile protocol 12 to fence older writers while preserving existing progress, settings and save formats. The live v0.20.3 music release retains protocol 11. Core and profile details are in `FOG_SKIRMISH_CORE.md` and `FOG_SKIRMISH_PERSISTENCE.md`.

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

## Assembly and historical focused checks

Candidate versions are coherently 0.21.0 in browser, root package, desktop package and desktop lock metadata. The cache is `ironroot-v0.21.0`. The only new precached production modules are `fog.js` and `fog-view.js`; QA shells/scenes, reports and prototype scope files are outside `dist` and are not cached.

The original integration-stage focused evidence remains in `qa/fog-integration/app/` from the repository root. These counts describe that earlier source stage, not the final combined candidate:

- `fog-app-tests.log`: 16 new actual-function/DOM/audio tests, including hidden-state differential canvas/minimap transcripts, setup rejection before writes, paid actions, citadel null-HP readiness, lifecycle/reset, identity labels, one shared frame observation, interruption, fullscreen and ended-follow regressions.
- `app-focused-tests.log`: 506 selected app-dependent tests: 505 passed, zero failed, one optional skipped check. The skipped check is not a pass.
- `syntax.txt`: all production JavaScript parses.
- `runtime-preflight.json`: exact 56-file production dist, relative import/precache closure and hashes. This is source-dist validation only, not a publication approval or native offline check.

### Final combined aggregate

The subsequent parent-owned final aggregate completed with **1,635 discovered tests: 1,634 passed, zero failed and one unchanged optional skip**, in 57.7 seconds. `npm test`, `npm run check` and `npm run check:release` all exited zero. Production syntax passed, and the final runtime inventory remains **56 files / 1,081,989 bytes**, with no post-check runtime drift. The skip is not a pass. Evidence is preserved in `qa/fog-integration/aggregate/` from the repository root; this reconciliation read those records and did not rerun a broad suite.

Earlier aggregate stages remain separate, including the initial stale protocol-literal failure and the corrected pre-readability result of 1,617 passed, zero failed and one optional skip. The final combined review (`qa/fog-integration/independent/FINAL_COMBINED_REVIEW.md`) found no new observation-boundary, persistence, action-safety or audio-interface blocker within this bounded local scope. None of these source checks constitutes release approval.

### Released audio in the candidate

The combined candidate includes the exact PR #21 `audio.js` (SHA-256 `7e5921c056ab468b5de8c97cee1b5b930ef2e501136eb08cb715822f3c7b782a`). The released score has 64 bars, 142.22 seconds and four sections; priority cues duck only music, and the same 19 SFX sequences/aliases remain. The observation audio adapter is unchanged and supplies only its existing observed intensity/cues. Combined source tests preserve hidden-state parity and prevent paused/off-camera cue replay or duplicate own-command ducking. The separate audio technical pass was not actual listening and does not establish a combined full-game audio or fog release pass.

## Native evidence epochs

The native records are bounded desktop evidence, kept separately with their original hashes and screenshots. Evidence paths below are relative to the repository root:

1. **First actual main-app pass:** `qa/fog-integration/native-main/NATIVE_MAIN_QA.md` describes genuine paid UI play at 1180 × 757. It covered default-off/incompatible setup, paid Regeneration and construction, hidden/visible Volley behavior, unknown enemy health, basic save/reload/Resume, restart, fog/ordinary/fog switching and displayed progress/settings preservation. It reached 00:50, not a complete match, and did not produce a stale-memory transition or restore nonempty memories. Its preparation-time statement that v0.20.2 was live is historical. The final combined runtime differs from this frozen stage in exactly six files: `app.js`, `audio.js`, `citadel-view.js`, `fog-view.js`, `index.html` and `styles.css`.
2. **Dense-memory desktop fixture:** `qa/fog-integration/native-dense/NATIVE_DENSE_QA.md` describes an explicitly synthetic renderer review at a measured 1139 × 398 field, not paid main-app play. Eleven captures support bounded adjacent/multi-road/edge readability, distinct compact glyphs, frozen names/timestamps, hidden-change invariance, empty re-observation, replacement memory and keyboard access to the fixture's detail list. It did not exercise the real main-app Pause disclosure. The final runtime differs from this stage only in `audio.js` and `citadel-view.js`; the dense renderer and actual-app disclosure bytes are unchanged, but only the fixture was exercised there.
3. **Final readability source stage:** after the dense pixels were preserved, `citadel-view.js` received a text-only refinement for unknown/remembered/visible enemy status, with a throwing-proxy regression retaining the observation boundary. The final combined runtime differs from that stage only in `audio.js`.

[FOG_READABILITY_FOLLOWUP.md](FOG_READABILITY_FOLLOWUP.md) retains the intermediate four-file remedy, focused checks and later copy refinement. Its earlier aggregate-pending and five-file-difference statements describe the pre-music stage, not the final combined inventory. These records are not relabelled as proof of the current combined source.

### Final combined paid native attempt

`qa/fog-integration/native-paid/FINAL_PAID_ATTEMPT.md` records one genuine Hard/Warlord, Classic/open/no-bridge Fog attempt on the exact final combined 56-file runtime. It ended naturally in **defeat at 01:18**, before an enemy-building memory was observed; the last live minimap description reported zero last-seen buildings. Normal paid controls placed a forward Gryphon aerie and Barracks. The terminal summary reported three buildings raised, including the initial formation, and 14 enemies felled. UI inspection/action turnaround delayed early construction to roughly 00:32, so this single weakly defended attempt is not a balance/fairness finding or an established gameplay defect.

The terminal message disclosed that the fog battle had ended and full information was now available. The full field/report was not separately inspected. All six displayed Options values and rendered campaign chapter totals matched before/after; Wings of Ash remained selected. After reload the title had Fog unchecked, bridge income false and **no unfinished Resume checkpoint**, because the attempt had completed. This verifies displayed preservation, not every raw profile domain or history row. Four screenshots, normal-UI JSON and source/stage hashes are preserved in that evidence directory; the runtime remained unchanged.

**The target nonempty-memory acceptance gate was not reached.** Actual main-app Pause last-seen disclosure access, its keyboard/scroll/Back/close behavior and save → reload → Resume with nonempty knowledge remain unverified. No repeated runs or synthetic state substitution were used to force a pass. The native session and preview are closed; no further browser pass is claimed or scheduled by this reconciliation.

## Open acceptance gates

Native mobile/compact and short-landscape validation remain blocked and unrun. The prior native responsive/DevTools route was denied; no alternate emulation, iframe or browser-protocol route was attempted. Canvas geometry tests and desktop screenshots are not phone evidence.

The earlier first main-app pass did not prove genuine background blur/hidden events. The final paid attempt reached a natural terminal defeat, but terminal full-field/report reveal and persisted history were not separately inspected. Real seen → lost → remembered building behavior, nonempty Pause interaction and nonempty-memory save/restore remain unverified. Sustained loaded browser/device performance, offline new-install/reload/update/Resume behavior, controller/screen-reader hardware, cross-browser coverage and suitable AI playthroughs are still open. Audio technical measurements do not replace actual listening. Synthetic/model parity establishes neither mobile FPS nor gameplay balance/fairness.

A narrow cross-layer residual remains: an independent synthetic font-metric probe found a possible long stale-badge/known-enemy-citadel-title intersection. It was not observed in the bounded native scenes and is not claimed fixed. Badge admission separates stale glyphs, admitted badges and conservative UI edge bands, not every world label. Full frozen details remain available in the disclosure, whose native actual-main-app access with nonempty memory remains an open gate.

No new campaign fog levels, Ward, Chapter 6 or ten-chapter implementation are included. Existing modes, progress and settings remain preserved. The final aggregate, independent review and bounded native evidence support continued local review only, not merge, publication or release readiness.
