# Independent review: The Open Frontier campaign

Reviewed 2026-11-06. This is a read-only simulation and source review, not browser playtesting, a human difficulty estimate, or a competitive balance certification.

## Assessment

**The increment supplies real counter and protection decisions, and the first three missions do not require a single exact build order.** The hard finale is materially less forgiving. River Charter has the clearest optional economic challenge. Far Beacons' early citadel route works as disclosed, but the tested wins do not exercise its advertised 3:10 hold. Open Horizon and Common Ground's time/health medals add little separation among successful tested strategies.

No engine, difficulty, mission formation, objective, UI, or reference-test changes were made. No server, browser, or publication action was taken. This review added only its own harness and this document.

### Exact reviewed versions

- Engine SHA-256: `e47a168c099c2a4e1f45b238d5224cb44a02433a7cff06adbfb87095c4d56bc7`
- Campaign SHA-256: `aee4f193cc1435da6b3a423803c3550105598ea9420cafd62bd1ab647012a789`
- The final campaign hash includes the harmless briefing change from “pixel” to “unit” battlefield dimensions.
- After this review, native playtesting prompted a copy-only Open Horizon hint update, changing the campaign hash to `49ec88047efdf66f88a677a3f3a4de5b0067f97fef4df8a71cef05044da66781`. No formation, objective, medal, stat or engine rule changed. The preserved traces retain the exact originally reviewed hash.
- Harness: `qa/campaign-expansion-review.mjs`.

The harness asserts the frozen engine hash and checks both source hashes again after each run batch. It imports the runtime; it never rewrites it.

## Method and scope

The final matrix contains **112 executions** over four fresh, spread-out seeds: **733, 91237, 7281901, 3940101199**. There are 32 source-policy audit executions and 80 executions of an independently implemented policy family. The source mastery policy aliases its reference policy in three missions, so these are not 112 independent strategies. A separate, explicitly exploratory four-run Common Ground follow-up brings the reported evidence to **116 executions**.

A seed-17 pilot was used to correct the independent policy's counter selection before this held-out matrix. Those pilot results are not included in the table. The follow-up was not used to tune a winning result, and its worse outcome is retained.

The independent policy observes enemy lane compositions, buys archers against air, uses gryphons against unprotected siege/ground splash, adds infantry screens and siege pressure, and upgrades existing production. It reacts to nearby packs with paid rally strikes. It has no mission-ID-specific opening sequence. This is still a simple heuristic: it does not reason like a person about every endangered original building, and it can make poor spending or placement choices.

Variants:

- **Counter:** first action at 5s, at most one successful paid command every 2s. Considers income from 12s, after higher-priority counters.
- **Reverse/rear:** same policy, reverse lane tie-breaks and prefer x=1110 before x=1250. This changes both purchase order and frontage; it is not an isolated causal test of either variable.
- **Slow:** first action at 8s, at most one successful paid command every 3s.
- **Late income:** counter variant, but no new mine or mine upgrade before 65s.
- **No new income:** counter variant without mine construction/upgrades. Authored starting mines still earn ordinary income.
- **Screen first, Common Ground only:** one small follow-up increases infantry-screen priority above siege. All other counter-policy rules and 5s/2s timing stay unchanged.

Commands include builds, upgrades, and rally strikes. No gold, health, production, enemy AI, or outcomes are injected. Every game is strictly serialized/restored every ten seconds and validated at its natural campaign endpoint. There are no artificial waits after a citadel win.

Each result includes objective values at completion/failure, original target loss times, incoming attack types on marked buildings, first damage time for each citadel, paid actions, periodic states, and an exact income ledger. Kill bounties are separated from mine income, including kills caused immediately by paid rally strikes. An investment's receipts count only its own incremental income while its mine is alive; a starting mine's free baseline production does not repay a later upgrade on paper.

## Final matrix

Cells show **clears / three-star clears**, each out of four seeds.

| Policy | Open Horizon | River Charter | Far Beacons | Common Ground |
| --- | ---: | ---: | ---: | ---: |
| Source reference | 4 / 4 | 4 / 0 | 4 / 4 | 4 / 4 |
| Source mastery | 4 / 4 | 4 / 4 | 4 / 4 | 4 / 4 |
| Counter | 4 / 4 | 4 / 4 | 4 / 4 | 2 / 2 |
| Reverse/rear | 4 / 4 | 4 / 4 | 4 / 4 | 3 / 3 |
| Slow | 4 / 4 | 4 / 0 | 4 / 4 | 1 / 1 |
| Late income | 4 / 4 | 4 / 0 | 4 / 0 | 3 / 3 |
| No new income | 4 / 4 | 4 / 0 | 4 / 0 | 3 / 3 |
| Screen-first follow-up | not run | not run | not run | 1 / 1 |

The first three missions cleared **60/60 independent-policy runs**. Common Ground cleared **12/20** in the main independent matrix and **1/4** in the follow-up. These are local policy observations, not probabilities for human players. In particular, a four-seed sample cannot establish a universal balance claim.

## Finding 1: starting-force disclosure is accurate

The harness reconstructs each deployment from the *actual initialized buildings*, including their actual upgrade levels, then compares it with the generated player/enemy briefing text. All four match. Starting gold, citadel health, initial income, map/lane/site counts, and fixed/adaptive mode also match.

| Mission | Actual gold | Actual player HP | Initial income | Map | Sites per side |
| --- | ---: | ---: | ---: | --- | ---: |
| Open Horizon | 1,100 | 5,200 | 7.5/sec | Long March, 3 lanes | 24 |
| River Charter | 1,100 | 3,800 | 7.5/sec | Twin Span, 2 lanes | 16 |
| Far Beacons | 1,350 | 5,400 | 7.5/sec | Long March, 3 lanes | 24 |
| Common Ground | 1,500 | 6,000 | 7.5/sec | Twin Span, 2 lanes | 16 |

Notable correct details: Open Horizon has two level-3 central aeries in addition to the outer aeries; River Charter has three level-3 southern aeries and two northern foundries of different levels; Far Beacons has a level-3 central foundry plus two level-3 sanctums; Common Ground's protected southern level-2 barracks is at x=690, and its adaptive enemy starts with 80 gold and one ordinary mine. The three-mine cap works on two lanes without a fictional middle-lane site.

This verifies the data feeding the briefing, not the visual readability of a rendered screen.

## Finding 2: the citadel alternative changes what completion proves

The shortcut is explicit in the mission copy and inherited from the original campaign. It is **not an undisclosed exploit**. The evaluator still rejects player defeat, a lost protected original building, and a breached mandatory HP floor before considering the shortcut. The following distinctions matter:

### Open Horizon

All 28 matrix runs destroyed both marked towers and retained the original relief barracks. None needed a citadel shortcut. Independent wins ranged from **98.65–126.6s**, versus **87.1–88.1s** for the source policies. The substantial margin under the 200s speed medal supports order/timing flexibility, but also makes that medal relatively undemanding for this policy family.

### River Charter

All 28 runs ended with an early citadel destruction, between **113.3–154.25s**, before the 210s income checkpoint. The formal income objective was therefore still `met: false`, even when its numeric amount was already sufficient.

More substantively, **all four no-new-income runs won at only 7.5/sec**, below the required 17.5/sec, with both protected towers alive. Each still earned two stars because it satisfied the six-upgraded-buildings medal. The late-income route won at 16.25/sec. Thus a basic clear does not establish that the granary income was achieved. The separate **20/sec medal does restore an economic requirement for three stars**.

The slow route reached 18.75/sec but earned only one star on this sample; it missed both 20/sec and six upgraded living buildings. This is useful differentiation without requiring exact-frame inputs.

### Far Beacons

All 28 runs destroyed **both original marked mines**, preserved the HP floor, and then destroyed the enemy citadel at **109.85–131.65s**, before the 190s hold. The omitted objective was the hold, not the pay stations. Three stars were available on all main early-income variants without spending 3:10 in battle.

Do not describe these results as evidence that the player survived a 3:10 defensive scenario. They demonstrate the advertised alternative attack route. The 15/sec medal differentiates the no-income and late-income routes, but the speed medal was automatic for these successful routes.

### Common Ground

Source reference/mastery, **seed 733**, won at **117.8s with three stars** after destroying only the southern sanctum. The northern marked foundry at x=2650 received no direct attack and remained alive. Both protected originals survived. The screen-first follow-up also produced one three-star citadel win with a marked work still standing.

This is allowed and disclosed. It means neither completion nor three stars proves that both toll works were destroyed. If a future design goal is to reward fulfillment of the specific paired-target narrative, a mastery goal tied to those original targets would communicate it more directly than another generous time/health medal. That is a future content choice, not a request to force idle waiting or change this frozen engine.

## Finding 3: early mines repay, late mines generally buy score rather than profit

The actual marginal economics are:

| Paid investment | Cost | Extra income | Survival time to repay |
| --- | ---: | ---: | ---: |
| Build level-1 mine | 190 | 2.5/sec | 76s |
| Upgrade mine 1 → 2 | 133 | 1.25/sec | 106.4s |
| Upgrade mine 2 → 3 | 199 | 1.25/sec | 159.2s |

The level-3 upgrade price is **199 in the runtime**, due to the existing JavaScript calculation and rounding. Receipts here use the actual paid price, not an assumed 200.

Positive findings:

- All eight source-reference new mines in each of River Charter, Far Beacons, and Common Ground repaid before the run ended.
- Far Beacons' reference upgrade at 2s paid back at 108.4s in all four seeds; the upgrade at 11s did not quite repay before its roughly 111s finish.
- In the slower independent River Charter route, the two earliest level-2 upgrades repaid in every seed: **8/24** mine-upgrade transactions repaid. This is actual economic return, not only a medal threshold.

Limits and concrete receipts, seed 733:

- River Charter reference: mines built at 0s and 13s returned **291.13 and 258.63**, net **+101.13 and +68.63**. None of its four mine upgrades repaid.
- River Charter mastery: the two extra level-3 upgrades at 62s and 72s returned **70 and 57.5** by the 118s win against **199 each**. Those are paid medal investments. Across all four mastery seeds, **0/24** mine upgrades repaid, although the new mine buildings themselves did.
- Far Beacons counter: mines built at 57s and 73s and upgrades at 81s and 91s earned the 15/sec third star at 109.85s. Every one of these investments had a negative cash return at completion. The no-new-income route also won at 109.85s, with two stars. In this example economic spending buys the medal without changing the winning offensive timing.
- Across all four missions, **0/32** new mines in the late-income variant repaid. No late-income mine upgrade repaid either.
- Common Ground counter, seed 733, had two new mines repay at 91s/93s, but still lost its protected original mine at 106.9s. Positive cash ROI is not the same as a safe strategic investment.

There is a real early income decision in several routes. There is little evidence of a profitable *late* economy in these short victories. A player can reasonably skip late mines unless seeking an income medal. This is compatible with a quick campaign, but does not support a claim of sustained early/mid/late economic depth. River Charter's two optional goals also overlap: its two authored level-3 watchtowers and three upgraded mines already supply five of the six upgraded buildings.

## Finding 4: Common Ground tests the northern protected mine, not the citadel

All eight failures in the main matrix, and all three screen-first failures, lost the **original northern council mine at x=410**. The protected southern barracks survived. Every failed run still had **6,000 citadel HP**. The main-matrix last direct attacks on the mine came from warriors or archers; the screen-first follow-up added one siege-finisher case.

Reproducible main-matrix failures:

| Variant | Seed | Failure time | Enemy citadel HP | Last direct attacker on council mine |
| --- | ---: | ---: | ---: | --- |
| Counter | 733 | 106.9s | 6,000 | warrior |
| Counter | 7,281,901 | 136.4s | 5,599.96 | archer |
| Reverse/rear | 3,940,101,199 | 139.35s | 866.48 | warrior |
| Slow | 733 | 123.75s | 3,269.84 | warrior |
| Slow | 7,281,901 | 123.5s | 6,000 | warrior |
| Slow | 3,940,101,199 | 126.25s | 3,972.44 | warrior |
| Late income | 733 | 119.75s | 3,709.68 | warrior |
| No new income | 733 | 119.75s | 3,533.56 | warrior |

The reverse/rear failure is particularly useful: the player was close to an enemy-citadel finish, but protection correctly vetoed the win. This is a race between an attack and loss of a mission-critical mine, not a two-citadel race.

The small screen-first change did **not** reliably fix the problem: it cleared only seed 91,237. That supports the campaign author's warning about non-monotonic adaptive responses. The test policy's broad counter labels and a front barracks alone are insufficient. The existing source policy clearing all four seeds shows this is not evidence of an impossible finale or a need to reduce difficulty. It is reason to preserve the mine-specific hint and avoid claiming that all reasonable slow policies are guaranteed wins.

**No conventional two-citadel base race occurred in any of the 116 reported runs.** Every player citadel retained its starting HP, including failed protection runs. Consequently the 4,200/4,500 HP optional medals and Far Beacons' mandatory 2,000 HP floor were not meaningfully pressured by this family of successful openings. This does not mean they cannot matter under other play; it means these results cannot establish that they add depth here.

## What the review supports

- Accurate authored deployment disclosure and ordinary paid play.
- Multiple viable order, placement, income, and timing variants on the first three missions.
- Real air/siege/infantry counter differences across lanes.
- A meaningful River Charter economic mastery goal and a meaningful Common Ground protection failure condition.
- Honest early mine payback, including a small number of early upgrades in longer routes.

## What remains unproven or weakly differentiated

- A genuinely played 3:10 Far Beacons hold route under these policies.
- Long-lived late economic investment, rather than purchasing an income medal before an imminent win.
- Optional time/health depth in Open Horizon or Common Ground; all successful tested variants earned those medals.
- Broad human robustness of the adaptive finale, subjective game feel, touch-input burden, scouting readability, or live mobile performance.

No change is required to characterize this increment honestly. Do not market it as four equivalent difficulty samples or as proof that every advertised primary objective is necessarily fulfilled. If future content seeks deeper mastery, consider objectives that distinguish all-target completion or sustained economy from the already disclosed citadel route, rather than forcing players to wait after winning.

## Validation

- Harness syntax check passed.
- All final matrix and follow-up states passed strict restore validation and reconciled gold/mine ledgers.
- Focused campaign suite: **26/26 passed**, with no skipped or failed tests.
- Engine and campaign hashes remained unchanged throughout the final review.

## Reproduction

From the isolated `ironroot-v010` directory:

```sh
node --check qa/campaign-expansion-review.mjs
node qa/campaign-expansion-review.mjs > /tmp/ironroot-review-final.json
node qa/campaign-expansion-review.mjs --mission=common-ground --routes=screenFirst > /tmp/ironroot-review-screen-first.json
node qa/campaign-expansion-review.mjs --mission=common-ground --routes=counter --seeds=733
node qa/campaign-expansion-review.mjs --mission=river-charter --routes=noIncome --seeds=733
node --test tests/campaign.test.mjs tests/campaign-expansion.test.mjs
```

JSON output contains full reproducible action/economy/target traces. It is intentionally not written into runtime, campaign data, or reference tests. Incoming attack logs identify the last direct attack *issued* to a target; attack counts are not presented as an exact applied-damage allocation when simultaneous damage overkills a target.

## Later independent evidence

This report preserves its original 116-run findings. A later separate audit, `CAMPAIGN_PRIMARY_ROUTES.md`, demonstrates actual River Charter income-checkpoint and Far Beacons hold completions with ordinary paid actions and a standing enemy citadel. It does not retroactively count the alternate wins above as primary successes. The native UI review also records two failed Open Horizon openings followed by a 3:55 two-star clear, showing why scripted difficulty findings must not be treated as human game-feel proof.
