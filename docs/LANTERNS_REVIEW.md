# Lanterns integration review

Reviewed the local candidate on 2026-11-08. No remaining blocker was found within the bounded source and Node-fixture scope below. This is not release, native-browser or physical-device acceptance.

## Scope

Reviewed campaign fog admission and the presentation boundary in `dist/{rulesets,fog,engine,battle-codec,campaign,campaign-intelligence,scouting,fog-view,app,battle-report,report-view}.js`, `dist/styles.css`, and relevant focused tests. The final pass concentrated on app startup, chart controls, stale memory, terminal revelation and report delivery. Production source was not changed by this review; the reviewer added `tests/lanterns-report.test.mjs` and this note.

The mission uses its own immutable identity, ordinary paid adaptive AI and a disclosed 10:00 deadline. Charted original locations are separate from sightings. Dispatch confirmation of original-post destruction is an explicit information exception; HP, defenders and replacements otherwise remain subject to sight. Original IDs, rather than site occupancy, determine objective credit. Encounter balance and paid-policy limits are recorded separately in `LANTERNS_DESIGN.md`.

## Findings resolved

1. **Previous result revealed the next battle.** `start()` now clears `objectiveOutcome` before resetting/caching presentation or creating target controls. Victory and defeat transition tests cover fresh campaign and fog Skirmish starts without a compensating manual refresh.
2. **Cleared posts retained contradictory stale ghosts.** `chartedObjectiveObservation()` runs before `observationFacade()`. It removes only dispatch-confirmed original IDs from detached presentation memory. Engine knowledge, checkpoints, unrelated memories and independently identified replacements remain unchanged. Field, minimap and accessible memory details share this filtered view.
3. **Two chart cards inherited a three-column layout.** A chart-specific class and two-column CSS override now distinguish the two-post controls from three-position trial controls. This verifies source intent, not native text fit.
4. **Standalone campaign report lacked fog disclosure.** Actual `beginBattleReport()` now appends “Fog · post-battle full information” to authored fog names too. Live finish/export reject. Objective-only victory and deadline defeat produce reports without manufacturing an engine winner or mutating simulation state. Ordinary campaign names remain unchanged.

## Final bounded evidence

`node --test --test-concurrency=2 tests/lanterns-app.test.mjs tests/lanterns-intelligence.test.mjs tests/lanterns-report.test.mjs`

**23 passed, 0 failed:** 6 app-source VM cases, 14 intelligence/canvas-fixture cases and 3 app-source report cases. Coverage includes hidden-state permutations, chart focusing without sight changes, original destruction/rebuild, current-to-stale intelligence, primitive-only chart data, marker ordering, terminal revelation, startup transitions, memory filtering and report/export invariants.

An additional read-only source-VM probe exercised the actual integrated app on the production mission: visible original → lost sight → dispatch-confirmed loss → separately observed same-site replacement. The cleared original disappeared from presentation memory, remained in raw engine knowledge, and the replacement retained its independent memory. Presentation/HUD evaluation left serialized state unchanged.

## Limits

- These fixtures execute production source but do not establish native layout, input, screen-reader, audio-output, phone, PWA or physical-device behavior. Native acceptance remained pending at this review.
- Canvas command comparisons establish rendering/input invariants, not pixel-quality or legibility acceptance.
- The final review did not rerun the aggregate suite, release checks or the encounter's combat matrix. Those have separate ownership and evidence.
- No claim is made about human win rate, novice accessibility, long-session performance or broad strategy coverage.

## Final copy disposition

The subsequent copy-only changes are accepted within this review's scope. Lanterns' authored reward now says “Completes the current Chapter 6 route” before legacy reward generation; existing mission rewards are unaffected. Report totals say “This battle has no automatic citadel decay.” The report rules section preserves the no-forced-winner description for open Skirmish, while authored scenarios explicitly say that objectives and deadlines still apply. This resolves the remaining deadline ambiguity without changing battle rules.

The final `tests/lanterns-report.test.mjs` rerun passed **3/3**, including positive deadline wording and exclusion of the misleading open-ended/forced-time-limit claims. No aggregate or combat-matrix rerun was performed by this reviewer. The lead separately reported native gameplay/fog/save/replay acceptance and a passing replay-label retest. The final report wording remains Node-verified only; a completed native result was no longer available for that text retest. No remaining source/presentation blocker was identified in this bounded final inspection.
