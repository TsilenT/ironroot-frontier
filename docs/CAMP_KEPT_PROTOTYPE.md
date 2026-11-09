# The Camp We Kept: isolated Chapter 9 opener hypothesis

This small QA-only prototype is not admitted campaign content. No runtime, mission catalog, ruleset identity, version, prerequisite, profile or release field is edited. Chapter 8's fifth mission must become canonical before future unlock wiring is chosen. Chapter 10 and the boss experiment stay separate.

## Source facts and new design

Baseline is canonical Long Screen commit `e3ef4e160b6d223484820dbe102961ef7d31e39b`, tree `9e764d661d2942af123ed0f65c277c2a728e06e6`. The full inventory's SHA256 is `9f10fdb5a4b59dfb227f0e7202c1f9e0bd29a56e497d424764a0d408bd9cfe07`. All 1328 locally present tracked files were verified against their Git blob IDs before copying to this isolated workspace; 1048 inventory-only files remain omitted, not deleted. No AGENTS.md is present in the complete inventory. Repository README run guidance and the engineering skill were read.

Existing mechanics, unchanged: 6000 maximum core HP; a single 190-gold citadel choice; regeneration at 3 HP/s after both the purchase wait and 8 quiet seconds, with no instant heal; ordinary building costs, baseline-plus-mine income, factory spawns, paid adaptive AI, 70-unit side cap and 5:00 escalation. All eight earned building types remain available. No fog, new engine system, damaged factories, magic drain or free arrivals are introduced. Core loss/draw takes precedence; 1 HP may win. The QA evaluator ends at 10:00 and is not a production mission evaluator.

The new numeric hypothesis deliberately differs from the planning slate's tentative 4000 HP / 600 gold: Classic, normal paid AI, 2700/6000 player HP and 700 gold, one intact mine and three intact producers. The opponent has a real mine, six ordinary producers and 100 gold. Middle ground pressure and an exposed southern air/ground road make leaving the perimeter alone an explicit risk to inspect. All placements, budgets, health, seed and timings are new untested design, not reconstructed historical values. Ordinary built-in near-ready opening factory progress is retained.

## Question and limits

Can the player reinforce an inherited force for an immediate middle counterattack, or spend the same purse on anti-air, income and a longer recovery? The wound is a risk budget, not an instruction to click Regeneration. Regeneration can restore at most 156 HP by 1:00 and 516 by 3:00 after a tick-zero purchase without any further damage; damage interrupts it. Those are upper-bound arithmetic examples, not a claim that healing is useful in this encounter. Extra Arrow and an attack without any citadel option are legal alternatives.

`qa/camp-kept/PLAN.json` fixes 20 known cases before the first tick: two seeds, the wounded scenario and an otherwise identical full-health control, and five fixed paid policies. They cover immediate supported offense, regeneration plus income, same-price Extra Arrow plus income, deliberately greedy recovery, and inactivity. The controls measure risk and pacing, not human strategy preference or a win-rate target. No route or building is mandatory. No-regen wins are welcome. Do not infer a useful recovery choice merely from nonzero healing or a larger final HP number.

The runner records actual payments and attempts, first damage, core damage and healing, inherited-building losses, five-second observations, minima, result and a final save roundtrip. Its reused ledger reconciles income, kill gold, spending and refunds each fixed tick. Source and plan drift stop the run. Raw results stay outside the source directory. Fixed policies have limited judgment and different spending orders; any comparison must preserve that limitation. Full-health pairs are total-effect comparisons, including ordinary AI responses after divergence.

## Before opening

Only no-tick structural tests are allowed initially:

- `node --test tests/camp-kept-prototype.test.mjs`
- `node qa/camp-kept/experiment.mjs --freeze /absolute/external/freeze.json`

Send the exact frozen packet to the coordinator for independent preopen review. Do not execute any case until that review and explicit coordinator permission are recorded in an external approval packet with format `camp-kept-reviewed-run-v1`, status `reviewed-and-authorized`, named `independentReviewer`, exact `coordinatorAuthorization`, and the unchanged `freeze` object. Then the only registered opening is:

- `node qa/camp-kept/experiment.mjs --run-reviewed /absolute/external/approval.json /absolute/external/new-empty-results`

The stop file is the output directory path plus `.stop`; it is checked every 100 fixed ticks and between cases. SIGINT/SIGTERM also request a stop. Completed cases and a stopped marker are retained outside source; no retries or source tuning are automatic. Do not run the broad aggregate while this unopened prototype is awaiting review, because some preexisting tests simulate unrelated missions. Broad checks belong to later integration, not this no-tick checkpoint.

## Remaining gates

First inspect every preregistered case, then obtain an independent interpretation and a bounded interactive pacing check. If the wound merely changes the health display, or recovery only produces nominal healing with no concrete risk/timing effect, revise the encounter or narrow the claim. Do not manufacture forced losses, mandatory regeneration or arbitrary acceptance thresholds. Production identity, catalog, continuation, persistence, UI, source-complete aggregates and release remain separate, unperformed gates. A synthetic prototype success would establish feasibility only.
