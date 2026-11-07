# Exact flight gate reconciliation

Source commit: `598925cbfea60acc734513d05dc14eeafe80a57d`.

The old full gate passed 1,468, failed 62 and intentionally skipped 46 cases. All failures are retained individually in `qa/flight-feedback/full-failure-reconciliation.json`; the unmodified source report is retained beside it. The focused run additionally exposed a desktop enabled/focus race, and supplemental screenshots exposed NEXT/banner overlap. Those findings remain in scope even when a full-run counterpart passed.

| Original failure group | Cases | Disposition |
| --- | ---: | --- |
| shoulder autorepeat plus explicit toggle | 1 | Sample discrete taps in the provider; retain deliberate held-confirm coverage. |
| bumper held-duration autorepeat | 4 | Release discrete taps after their pressed sample rather than runner wall time. |
| report-controller timeout text with raw failed status | 3 | All three passed unchanged at two workers; retain source assertions and deadlines. |
| steering stop overshoot | 1 | Stop stick input from provider-side read-only cursor observation; preserve target bound. |
| briefing historical-note contract | 4 | Include one historical-record notice for revision 3 and none for other revisions; preserve exact ordered list. |
| cumulative configured timeout | 15 | All fifteen passed unchanged at two workers; retain all cases, assertions and deadlines. |
| scouting mission/map label contract | 20 | Require exact mission name; retain map geometry, deployments and keyboard assertions. |
| compact deck closes during snapshot helper | 6 | Reopen the actual aerie after Options collapses inspector; wait enabled and verify focus. |
| fractional North control clipping | 4 | Correct ordinary scroll/focus boundary; retain 100% visibility and center-hit requirement. |
| new flight disclosure initial pause overflow | 1 | Keep primary pause actions in initial narrow view without shrinking controls or text. |
| fractional-boundary passive replay helper | 1 | Replay exact ticks independently from sub-tick accumulator and retain full state/RNG/identity comparison. |
| fixed elapsed-income allowance | 2 | Account for actual checkpoint elapsed income and paid cost, preserving upgrade/salvage continuation. |

## Retest rules

- The 27 bounded timing/setup/replay reproductions passed unchanged at two workers. This does not erase their original failures. The repeated narrow pause overflow was the one remaining failure in that 28-case rerun.
- Keep the configured two-worker release run while performance experiments remain separate. No deadline increase or coverage reduction is part of this repair.
- The six mobile inspector cases must still execute every subsequent order, exact-state, native keyboard, save and restore assertion. The new enabled/focus handshake must also cover the focused desktop race.
- The 24 scouting/briefing expectations remain exact, with authored map/objective geometry and historical-record compatibility checks intact.
- North remains subject to 100% visibility, 44px minimum controls and genuine center hit testing. Resume/Restart retain keyboard focus-trap and game-state assertions.
- NEXT layout separation is visual-only; engine, rules, campaign identity and profile protocol remain unchanged. Native and exact cloud visual evidence are required.
- The portrait income, paid first-build auto-start and complete hint-collapse changes are part of the next candidate and require their own combined browser coverage.

No upload, merge or deployment is authorized by this document or by local checks alone. Capture the final consolidated source, then test that exact SHA.

## Worker-count decision

A separate same-candidate benchmark measured two workers at 50m59s and 50m46s with no failures, versus four workers at 52m09s and 51m33s with six and seven failures. CPU throttling rose from 26% to 96%; four workers was about 1.9% slower. Keep the checked-in two-worker setting for the exact release gate. Two 716-case shard manifests cover the benchmark suite, but independent-runner wall time has not been measured. These benchmark results do not certify this revised source.

## Final local repair checks

The consolidated source passes 1,221 Node tests with one optional desktop-tooling skip and no failures. Runtime syntax, all 49 runtime files and the browser fixture preflight pass. Discovery lists 1,628 browser cases in 37 files; discovery uses the local 1.57 adapter and is not execution. The exact revised-source browser gate remains pending. Existing modified browser specs retain their original `test.skip`, `test.fixme` and `test.setTimeout` declarations, and the configured worker count remains two.

Native review has independently reproduced full North-control containment at 320×430 after a real paid aerie placement, and initial Restart containment at 320×568 with zero Pause-menu scroll. Keyboard action, focus trap and Resume checks pass. Flight warning/transit visual review and final profile cleanup are recorded separately in `FLIGHT_REPAIR_NATIVE_QA.md`.
