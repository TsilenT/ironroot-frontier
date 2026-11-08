# A River Between Us validation

Local v0.26.0 candidate on released main `46b3e17a17d23cd6d3333044e0485ed5d9120979`. This adds Chapter 6's fifth encounter; Chapter 10 and the Last Ascent prototype remain isolated and excluded from release. Remote CI, review, merging, automatic publication and production smoke are separate gates.

## Final automated result

- **1,935 passed, 0 failed, 1 optional desktop-tooling skip** from 1,936 discovered tests, in 125.7 seconds. This stable aggregate includes the existing automatic publisher tests.
- Syntax and runtime inventory passed: **58 files / 1,148,489 bytes**, with exact hashes in `qa/river-between/runtime-final.json`.
- Browser harness source and fixture validation passed. These validators do not execute the Playwright browser matrix.
- New focused checks cover control (7), mission (6), profile (9) and UI (11). Broader profile/legacy coverage passed 132 checks and corrected-fixture coverage passed 62. These overlap the aggregate rather than add to its unique count.

The initial aggregate had five failures in older exact-current-catalog fixtures, covering totals, the new citadel/rules identity and a prior-Lanterns progress snapshot. Fixes update current counts or exclude the newly dependent identity from historical fixtures. Independent comparison found no removed assertions, changed historical hash literals or altered existing fixture bytes. The affected tests and final aggregate passed afterward. Initial and final raw logs remain local-only.

## Mechanics and preservation

Both the original North Command Post and cumulative any-two-bridge goal are required; enemy-citadel destruction is an alternative. The new rule alone opts out of ending at the control goal. Held time stays capped, but captures, contested states, ordinary combat and paid adaptive AI continue. The existing per-tick objective wrapper ends the combined encounter. Old Shared Crossing still ends at its own control goal, and historical rules fingerprints and seeded simulations remain unchanged.

Independent boundary probes confirmed exact 600-second completion, post-deadline failure, own-loss precedence and valid victory at 1 HP. Original target identity survives replacements. Profile protocol 17 only advances the admission marker; it preserves progress, preferences, records, history and battle data, and fences stale writers. The released protocol-16 module is retained byte-for-byte as a regression fixture.

## Paid routes

Fifteen runs cover five simple policies and three seeds, using one paid command per five simulated seconds. Both economies reconcile within 1e-6 gold and the adaptive enemy makes 5–15 paid transactions per run. On the authored seed, north-first destroys the post at 91.75 seconds and finishes control at 117.25; crossings-first banks control at 84.25 and destroys the post at 130.05. Both leave the enemy citadel untouched, demonstrating meaningful remaining work after the first goal.

Other seeds can change that order. Infantry-led core victories remain legal, north-only has mixed results, and all three idle runs lose. These results support feasible alternatives, not optimal balance, human enjoyment, a guaranteed difficulty curve or forced close victories. See `RIVER_BETWEEN_DESIGN.md` and the independent `RIVER_SCENARIO_REVIEW.md` for the full bounded interpretation.

## Native review and limits

`RIVER_UI_REVIEW.md` records the bounded native desktop acceptance separately. The preview uses synthetic prerequisite records and ordinary paid-engine checkpoints in namespaced session storage, with no production-profile fallback. A checkpoint-to-terminal continuation is not a full browser-played mission from the beginning.

Physical phone/PWA behavior, non-Chromium browsers, full screen-reader/controller access, sustained performance and subjective audio were not newly verified. Compact Node DOM/canvas sizes establish source behavior, not device usability. No full browser matrix was run. New screenshots and raw logs remain outside the repository; sparse handoff must retain all unlisted historical source paths.
