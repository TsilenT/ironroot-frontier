# Flight-order integration (local v0.16)

## Release boundary

This future checkout reconciles the flight feature onto released v0.15, merge `f26b88106bed3d4932f5bf086cf21d5da18b5923` / tested tree `8e41d9b03a4cabbaa1768b1ba4d25257df5bf268`. All final PR #8 focus, teaching, short-phone, protected-button and practice-history repairs are carried forward. PRs #5–8 are merged and live. The exact combined browser gate, production integration PR and release decision for flight remain pending. Draft PR #2 supplied the tactical prototype; its older engine was not substituted for the current engine.

## Player controls and tradeoffs

Select an owned gryphon aerie, then choose Hold or one adjacent road. The choice is free and applies to future launches. Existing gryphons keep the route they were launched with. No order teleports, reroutes a unit already in the air, grants another crossing or changes the producer's road.

A gryphon approaches the shared gateway, warns for two seconds, crosses at normal speed, then continues down the new road. It cannot attack during warning or crossing and remains vulnerable to archers/towers. Crossing can reach an exposed mine, but abandons the original road's escort. Paid destination archery can deny the raid. Rootwardens cannot intercept air.

The inspector uses the existing building panel and 44px minimum order controls. The battlefield shows route arrows/countdowns, the minimap shows committed flights, and Pause has a read-only Air routes disclosure. Signals distinguish sides using words and shapes, not color alone. The Field guide explains the mechanic. Fresh unfinished Wings of Ash/Stonegate attempts may pause to teach it; restored or completed attempts do not receive a surprise teaching hold.

Native AI only considers an enemy flight after it launches and commits to a destination. There is no hidden-plan read, income bonus, free counter or changed decision cadence. This first integration leaves enemy producers on Hold rather than claiming tactical AI flight planning is implemented.

## Versioned attempts and profile safety

- New skirmishes: frontier-flight-open or frontier-flight-timed, revision 1. The engine's raw default remains legacy for old callers.
- New High Pass-and-later campaign starts: thirteen explicit revision-3 missions using frontier-campaign-flight. All eight buildings, including the Rootwarden, remain available.
- The opening's three earned roster stages remain three stages. Flight is not an additional roster unlock or a change to the first three lessons.
- Published revision-1/2 descriptors, active attempts and confirmed restarts retain their identities and no-crossing behavior. A deliberate new replay uses the current mission version.
- Existing stars, clears and best times remain historical records. They do not establish equal difficulty across mission revisions.
- Engine/envelope schema remains 3. New rules strictly validate their own route metadata. Old raw compatibility handling does not execute ignored flight fields.
- Current profile protocol is 5. Actual frozen protocol-4 clients refuse profile reads/writes/recovery under the newer marker. Older clients' historical explicit recovery behavior remains a reason to close other tabs before an intentional import.

## Evidence and limits

`docs/FLIGHT_ORDER_KERNEL.md` and `qa/flight-production-engine/` record 1,584 authored tactical branches, 5,904 restored next-step continuations, legal purchase/cap checks and all 445 adverse counterfactuals. Unequal authored forces, fixed horizons and synthetic action policies mean these are not human win rates or difficulty certification. Long March's low mean surviving health in a pressured raid does not mean all branches survived; the negative ledger retains the exact outcomes.

The 15MB raw tactical report is retained locally and excluded from source capture. The compact outcome ledger preserves every adverse branch, source parameters, costs, timings and reproduction command. Its validation file records the raw report hash.

Independent kernel/identity review additionally checked 18 mixed-order games, 3,842 save snapshots, 37 old campaign factory/restore/restart pairs and 197 rejected mismatched identities. UI integration, current campaign routes and browser contracts have separate tests/reports; results must be recorded from the final combined source rather than inherited from the prototype. Physical mobile/PWA, non-Chromium, physical controller and subjective music quality remain unverified.

## Consolidation

Do not merge the old lab engine or publish its QA scenarios. Preserve PR #2 attribution/ancestry when opening the production integration PR after PR #8's tested merged baseline is known. Close the prototype PR only after the production replacement is reviewed and merged; do not delete useful experiment source merely to reduce the branch count.

## Earlier frozen flight checkpoint (before release reconciliation)

The final combined Node suite passed 1,120 tests with one existing optional desktop-tooling skip (1,121 discovered). Runtime syntax, the 49-file offline/runtime inventory, all browser preflights and eight browser-harness contract tests passed. The new browser suite has 31 scenarios/124 project cases; its 56 authored checkpoints passed 3,920 exact continuation comparisons. Discovery is not gameplay execution.

The current-campaign matrix passed 78 exact Hold pairs, 52 full restored continuations and a paid fresh-profile clear of all 19 missions (52/57 stars), retaining six optional-routing mission failures. See FLIGHT_CAMPAIGN_QA.md. Independent UI source review found two P2 feedback errors; both were fixed and regression-tested. See FLIGHT_UI_SOURCE_REVIEW.md.

Native browser review completed the 390px aerie inspector and future-only autosave checks, but renderer Error 9 stopped the remaining matrix. The cause is unestablished. The final two feedback repairs have source/VM coverage, not a completed native retest. FLIGHT_UI_QA.md lists the precise remaining layouts, visual phases, teaching, restore and accessibility gates. This source is suitable for the next draft PR/cloud test handoff, not merge or publication without those gates.
