# Long March Hard: response diagnosis and isolated prototype

Date: 2026-11-06 UTC. This is a deterministic bot diagnosis, not human balance certification. No runtime, existing test, campaign, save schema, deployment or release has been changed. The production engine remained SHA-256 `e47a168c099c2a4e1f45b238d5224cb44a02433a7cff06adbfb87095c4d56bc7`.

## Decision

**Retain the validated frozen baseline. Do not integrate any prototype from this investigation.** Record the fast scripted center opening as a reproducible advanced-play weakness, rather than declaring a human no-counter win or shipping an economic/overtime regression to suppress a bot's win rate.

The original prototype removes that scripted opening, but falsely treats the one free rear barracks as an infantry-rush commitment. It sacrifices early road pressure, lets every tested greedy mine repay, and makes every AI mirror reach overtime. The narrowed fallback tests restore economic pressure but fail to solve the naturally delayed center rush. The final screened-response fallback also produces very long mirrors. The bounded sweep has stopped, and no speculative one-screen branch was started.

The **rejected original prototype** has four coordinated response changes inside `_ai`, rather than extra resources or stronger troops:

1. Treat only production more than 550 pixels from the AI's own edge as frontline coverage, extending the existing Normal concept to Long March Hard.
2. When lane scores tie, prefer a lane with observed hostile production over an empty road.
3. Once that lane has a forward barracks, allow a mixed opening purchase instead of forcing another barracks for the first five seconds.
4. Permit one sanctum early against observed production that is at least 75% barracks. Preserve the existing three-warrior trigger, flying-enemy priority, tower/foundry rules, prices, action count, timers, spell logic and later development.

For the rejected original prototype and bounded fallback family, Classic, Twin Span, and Long March Easy/Normal take their previous branches exactly. Early exploratory engines were tested only in the stated Long March Hard cells. No new serialized state, geometry, combat statistic, hidden income, free construction or spawn bonus is introduced. All prototype purchases pass through the unchanged public paid APIs. New-map saves remain structurally compatible; a resumed Long March Hard game would naturally use the new AI decisions if the patch were adopted. Exact future behavior of that difficulty is not promised across an AI revision.

## Reproduced weakness, and what is not a defect

The balance audit's 32 stratified seeds confirm immediate Long March Hard center rush wins 128/128, north 60/128, south 0/128. Each includes both physical sides and both first-event orders. Center and south do not depend on winning the first-frame action race. North does: 60/64 when the player spends first, 0/64 when AI spends first. Results source: `/workspace/shared/ironroot-map-balance/spread-seeds-games.jsonl` and its recorded seed manifest.

The rush is legal. It places barracks at own-edge distances 1250, 1110, 970, 830, 690, 550, 410, 270 on one road, waits to afford each 140-gold purchase, then upgrades when the chosen road has no free site. The starting barracks occupies 410 on the center road, so that slot is skipped there. There are no player spells. Nominal five-second decisions are 5.05s apart under this harness's floating-point timer.

There are three interacting causes, not a coordinate reflection bug:

- **Geometry:** first damage in seed 51001 moves from 5.8s on Classic to 12.05s on Long March. The front-site gap is 1500 rather than 700 pixels. Forward production is genuinely more valuable. A rear barracks is 840 pixels, or 13.125 seconds of warrior travel, behind the first forward site. Counting it as an equally immediate defensive screen is misleading on the longer field.
- **Opening concentration and ordering:** the center rush includes the free center producer, while a side rush initially has it on a different road. Hard's fixed three-barracks opening spends all 420 gold. The lane tie-break can change its offensive pressure, not just its defense. If the player opens north before the AI, the AI buys north/south/north. If AI opens before the player, it buys north/south/center. South player-first gives south/north/center, and center player-first gives center/north/south. Thus north's surprising first-actor result is substantially an off-lane base race. It is not evidence of unfair physical-side income or a north-only combat buff.
- **Response timing and budget:** the AI notices unit composition after opening funds are committed. It can wait for an expensive counter, spend 75 on a volley, then change to a 220-gold emergency tower before buying that counter. The counter logic is legal but tactically late. Preventing every such volley is not a safe fix: those spells also help the AI win races.

The all-center policy's success alone is not a human difficulty rating. The initial simultaneous first-action case is especially artificial. This diagnosis therefore also starts players 2, 5 and 10 seconds after the AI, preserves both physical sides, and tests mixed arms, screened siege, screened economy, greedy economy and AI mirrors.

## Exact seed 51001 center trace

`long-march/hard/one-lane/1/51001/0/alternating/0`:

- 0.05s: AI buys one forward barracks each on center, north and south. Gold 420.25 becomes 0.25.
- 7.75s: selects a center sanctum, with 38.75 gold and three visible hostile warriors. Cannot afford 230.
- 29.70s: still saving for sanctum, 150.5 gold, 13 hostile center warriors.
- 39.30s: still selects sanctum, 198.5 gold. Its late-decision volley spends 75 instead; the selected target cluster is already about 1549 pixels from the AI's edge.
- 49.50s: nearest hostile is about 1236 pixels from home, so emergency watchtower replaces sanctum. 180.5 gold is insufficient.
- 58.90s: buys a 220-gold center tower after the forward barracks has fallen. It has only one surviving center producer, the original rear barracks.
- 76.50s: center production is gone; another volley costs 75.
- 97.70s: first post-opening producer purchase, a replacement center barracks.
- 107.70s: player wins. No sanctum was ever purchased. AI spent 150 on volleys, 220 on the doomed tower and 140 on the replacement after its initial 420 opening.

The trace callback records selected lane/type, gold, pressure, production, building positions and every visible local foe. Instrumented terminal state hashes match all six existing seed 51001 Classic/Long March, three-lane controls exactly. Logging does not add random draws or alter simulation state.

## Rejected or limited ablations

Eight spread seeds were used for cheap immediate-opening pilots, both sides/orders, 32 games per road. These were exploratory searches, not independent confirmations. Complete engines, manifests and action logs are retained.

- Reserve the selected counter's cost before permitting volleys: center still 32/32, north 30/32, south 32/32 player wins. Reject. Suppressing useful spells worsens the other roads severely.
- Require a kill or an imminent base threat for a volley: center 32/32. Reject as a rush fix.
- Prioritize sanctum over emergency tower, early aerie, or add a second forward barracks under production pressure: center 32/32 in these pilots. No sufficient fix individually.
- Forward coverage alone: center 29/32, north 0/32, south 0/32. Too incomplete and changes the race elsewhere.
- Fixed one-forward-barracks reserve until 5s plus forward coverage: promising center 0/32 in the pilot, but a held-out sample gives 6/32 immediate, 9/16 at 2s, 14/16 at 5s and 16/16 at 10s. Mixed arms rises to 31/32 immediate. Reject the fixed time-window fix.
- Fixed two-forward-barracks reserve plus coverage remains strongly first-actor dependent and loses all 16 delayed center cases at each tested 2/5/10s delay.
- Contested-lane preference and adaptive mixed opening, without the observed-production counter: delayed 10s center remains 16/16. Waiting for units, rather than using the visible production mix, is still too late.
- Waiting for the opponent's first expansion while reserving enough for a sanctum, without contested-lane preference: reduces rushes but makes mixed arms, siege and screened-mine controls trivially successful in the tested set. More complex reservation logic was not selected.

The rejected original prototype keeps ordinary volleys and does not fall back to permanent cheapest-unit spam. The result is a tactical purchase change, not an economy handicap.

## Validation scope and limits

The audit runner is an unchanged copy of `qa/maps-balance.mjs`, explicitly pointed at each isolated engine with its SHA-256. It verifies honest income/spend/refund/kill gold, legal sites/lanes, unit/building caps, world bounds, no negative or nonfinite currency, termination by 600s, and repeated save roundtrip plus next-step continuation. Original-prototype comparisons use 8 development-check seeds in strata 1 mod 4 and 16 previously unused confirmation seeds in strata 2/3 mod 4. The original exploratory pilot used strata 0 mod 4. All strata come from the balance worker's 32-bit spread manifest. Adjacent numeric seeds are not treated as the only evidence.

Delays 2/5/10 use normal alternating order because AI necessarily acts first. Delay 0 includes both first-event orders. Mirror controls always start both AI controllers at their native initial event. Every non-mirror policy is the same between baseline and candidate. The mirror policy changes both controllers, so it diagnoses symmetry and duration rather than a human win chance.

The isolated portability check verifies that bytes before/after `_ai` are unchanged; it compares whole serialized states through 90s for 128 unaffected map/difficulty/side/seed cases, 2272 checkpoints and 2272 paired paid build attempts. It also checks 64 Long March Hard save continuations and confirms the frozen engine can restore the candidate's save shape. This is targeted patch verification, not a claim that the repository's full release gate or browser review was rerun.

Human tests should include a genuinely delayed opening, center rush with timed paid volleys, mixed/air switches after revealing barracks, early mines, rebuilding after a failed push, and at least one sustained defensive game. The policy set does not search every placement, purchase timing, upgrade timing, volley timing or adaptive strategy. Large numbers of deterministic scripts cannot replace that review.


## Paired confirmation of the rejected all-production prototype

Sixteen previously unused spread seeds, both sides; immediate has 64 runs per route, each delayed cell 32. Entries are player wins/runs. This confirms the original prototype, not a release gate.

| Player policy | Delay | Frozen baseline | Rejected prototype |
| --- | ---: | ---: | ---: |
| one-lane north | 0s | 30/64 | 21/64 |
| one-lane north | 2s | 0/32 | 15/32 |
| one-lane north | 5s | 0/32 | 10/32 |
| one-lane north | 10s | 0/32 | 0/32 |
| one-lane center | 0s | 64/64 | 0/64 |
| one-lane center | 2s | 32/32 | 0/32 |
| one-lane center | 5s | 32/32 | 0/32 |
| one-lane center | 10s | 32/32 | 3/32 |
| one-lane south | 0s | 0/64 | 16/64 |
| one-lane south | 2s | 1/32 | 20/32 |
| one-lane south | 5s | 0/32 | 10/32 |
| one-lane south | 10s | 0/32 | 0/32 |
| mixed-aa | 0s | 45/64 | 38/64 |
| mixed-aa | 2s | 32/32 | 14/32 |
| mixed-aa | 5s | 32/32 | 12/32 |
| mixed-aa | 10s | 32/32 | 12/32 |
| screened-siege | 0s | 45/64 | 33/64 |
| screened-siege | 2s | 32/32 | 12/32 |
| screened-siege | 5s | 32/32 | 6/32 |
| screened-siege | 10s | 32/32 | 3/32 |
| screen3-mine | 0s | 45/64 | 38/64 |
| screen3-mine | 2s | 32/32 | 7/32 |
| screen3-mine | 5s | 32/32 | 3/32 |
| screen3-mine | 10s | 32/32 | 6/32 |
| greed | 0s | 0/64 | 50/64 |
| greed | 2s | 0/32 | 5/32 |
| greed | 5s | 0/32 | 8/32 |
| greed | 10s | 0/32 | 2/32 |
| mirror-ai | 0s | 32/64 | 32/64 |

The economy regression remains real when the greed policy loses. All 480/480 greedy mines repay their base cost in the prototype, versus 68/480 in baseline. At 2s delay, repayment is 96/96 versus 32/96. Mean receipts at that delay are 1028.68 versus 254.22 gold per mine. The prototype committed 370 gold to center defense against the lone free rear producer, leaving north/south production delayed enough for mines to survive.

- baseline-confirm mirrors: 64 runs, mean 234.05s, overtime 6, collapse 4, draws 0, unit-cap games 6.
- candidate-confirm mirrors: 64 runs, mean 376.63s, overtime 64, collapse 10, draws 0, unit-cap games 64.

## Bounded fallback tests after review

Four fresh SHA-derived seeds are recorded in `fallback-seeds.json`. Each immediate cell has 16 runs, each 2s/10s cell 8. These are small diagnostic samples; no further seed expansion was run for the fallbacks.

| Route | Delay | Baseline | Visible-only fallback | Two-screen budget | Second-screen response |
| --- | ---: | ---: | ---: | ---: | ---: |
| one-lane north | 0s | 8/16 | 0/16 | 0/16 | 0/16 |
| one-lane north | 2s | 2/8 | 2/8 | 2/8 | 0/8 |
| one-lane north | 10s | 0/8 | 0/8 | 0/8 | 0/8 |
| one-lane center | 0s | 16/16 | 8/16 | 8/16 | 8/16 |
| one-lane center | 2s | 8/8 | 8/8 | 8/8 | 8/8 |
| one-lane center | 10s | 8/8 | 8/8 | 8/8 | 8/8 |
| one-lane south | 0s | 0/16 | 2/16 | 2/16 | 0/16 |
| one-lane south | 2s | 2/8 | 2/8 | 0/8 | 0/8 |
| one-lane south | 10s | 0/8 | 0/8 | 0/8 | 0/8 |
| mixed-aa | 0s | 10/16 | 16/16 | 16/16 | 6/16 |
| mixed-aa | 2s | 8/8 | 8/8 | 8/8 | 4/8 |
| mixed-aa | 10s | 8/8 | 8/8 | 8/8 | 3/8 |
| screened-siege | 0s | 10/16 | 16/16 | 16/16 | 11/16 |
| screened-siege | 2s | 8/8 | 8/8 | 8/8 | 2/8 |
| screened-siege | 10s | 8/8 | 8/8 | 8/8 | 5/8 |
| screen3-mine | 0s | 10/16 | 16/16 | 16/16 | 6/16 |
| screen3-mine | 2s | 8/8 | 8/8 | 8/8 | 4/8 |
| screen3-mine | 10s | 8/8 | 8/8 | 8/8 | 3/8 |
| greed | 0s | 0/16 | 0/16 | 0/16 | 0/16 |
| greed | 2s | 0/8 | 0/8 | 0/8 | 0/8 |
| greed | 10s | 0/8 | 0/8 | 0/8 | 0/8 |
| idle | 0s | 0/16 | 0/16 | 0/16 | 0/16 |
| idle | 2s | 0/8 | 0/8 | 0/8 | 0/8 |
| idle | 10s | 0/8 | 0/8 | 0/8 | 0/8 |
| mirror-ai | 0s | 8/16 | 8/16 | 8/16 | 5/16 |

Fallback mechanisms and findings:

- **Visible-only:** new rules require an actual forward hostile producer; the early composition ratio excludes rear/free producers. With no forward enemy production, use the frozen opening. This restores greed/idle pressure but cannot afford a fast counter after all 420 opening gold is spent. Every natural 2s/10s center case still wins. The level-one paid barracks-upgrade ablation also fails those center cells.
- **Two-screen budget:** buy two 140-gold forward barracks, retain 140 while the opponent shows only the initial producer, and use normal third-road development when mines are revealed. Release the passive reserve once 230 is affordable. Seed 3049451342 with 2s player delay buys the center sanctum at 19.05s, yet loses at 129.95s: one forward screen falls and the empty third road removes offensive race pressure.
- **Second-screen response:** use the reserved 140 for a second forward barracks on the revealed warrior road before saving for a sanctum. In the same case it buys that barracks at 4.6s but cannot buy the sanctum until 46.55s, losing at 120.15s. It makes several other routes harder without curing delayed center rush. Reject.
- baseline-small mirrors: mean 240.18s, overtime 2/16, collapse 0, draws 0.
- visible-forward-small mirrors: mean 358.34s, overtime 12/16, collapse 4, draws 0.
- two-screen-budget-small mirrors: mean 388.0s, overtime 16/16, collapse 6, draws 0.
- two-screen-response-small mirrors: mean 505.14s, overtime 16/16, collapse 14, draws 6.

All 1184 baseline and 1184 rejected-prototype confirmation runs, and all bounded fallback runs, terminate within 600s with zero save/geometry/ledger failures. Zero measured ledger error does not make a strategy fun or balanced. The final screening variant has 14 collapse games across 272 runs, against zero in the matched baseline, another reason not to integrate it.

## Human-input contrast

During this investigation the parent relayed a native review of the unchanged Long March Hard game through the ordinary UI at 1× speed. The reviewer placed seven paid middle-road barracks plus the free starter, with no other purchases, upgrades, Rally or pause. Three paid barracks were present by 00:18, the fourth by 00:42, and the fifth by 01:06. The reviewer lost at 01:59; at 01:50 the player base was at 9% and the enemy at 65%. The center push broke through, but flank pressure won the race.

This was not an independently replayed run by this diagnosis worker. It is valuable contrasting evidence from the parent's native reviewer, not a general human win-rate estimate. The rapid scripted opening buys its first three paid barracks by 00:10.15 and continues purchasing as soon as its decision cadence and funds allow. A mere initial-delay control does not reproduce the native review's later purchase timing. The successful scripted policy remains reproducible, but the one human-input loss means “unavoidable human win” is unsupported.

## Limited future work, only if separately authorized

Do not widen this tuning sweep or change Classic to chase zero scripted wins. If the weakness warrants another pass after human play, freeze one behavior-principled variant before confirmation: distinguish actual forward investment or sustained committed troops from the default rear producer, while preserving offensive development against passive/economic play. Any resource reservation must be measured for uncovered-road time and pressure, not justified only by the longer map.

Another principled future direction is a small, disclosed, seeded mix of honest opening doctrines, rather than one deterministic spread opening or a counter that must predict future commitments. A fast center rush could then be a matchup choice rather than universally favored by a single script. Preserve the same budgets, observable construction, Classic behavior and save/restore determinism, and measure the weaker matchups as carefully as the stronger ones. This is a design suggestion only; no doctrine mix was implemented or tested.

Use a small paired gate with human-scale 0.5/2-second starts, recorded or varied purchase cadence, all three rush roads, greed, and matched screened-mine/no-mine policies. Add immediate both-order center/greed controls and a few legal transitions from infantry into air/mixed forces. Track producer-purchase latency, per-road pressure, actual mine lifetime/receipts, spell spending, mirror overtime/collapse and ordinary UI play. Do not expand seeds or integrate unless those controls improve without a material new weakness. This future experiment was **not run** in this task.


## Reproduction artifacts and exact identities

Artifacts are in `/workspace/shared/ironroot-long-march-ai`. `artifact-index.json` records exact hashes for all isolated engines, manifests, result streams and checks. `diagnosis-summary.json` contains structured paired results. No file here is an approved runtime patch.

| Artifact | SHA-256 |
| --- | --- |
| `baseline-engine.mjs` | `e47a168c099c2a4e1f45b238d5224cb44a02433a7cff06adbfb87095c4d56bc7` |
| `balance.mjs` | `c83b64eb3194a559a8fd8046b082419f68ce8f15fbafd036a1222e9c90d77e9c` |
| `traced-engine.mjs` | `cf2804f196d93506162285a1a72d4576c558668715b57160f3159bc851da09de` |
| `candidate-engine.mjs` | `79c815d4d95b5afef575888e5d032617179e52e1f33fc8843cb75fb4d8ecbf64` |
| `candidate.patch` | `f3869e1f82792823ccf0134ddf57304b2c1e91ce88221c2d2a1198424072a8ec` |
| `visible-forward-engine.mjs` | `73c1bcf41409c207f3dfb4d875a9f23e183f4063fb74239056237810dbcc8db8` |
| `two-screen-budget-engine.mjs` | `d0d84d74b9628b0193e092c808a0e1a2e0ea8f4771263b39903562f5ee3df42b` |
| `two-screen-response-engine.mjs` | `0c8b9ef55b5d257c12f013b41802e3e34914ca1cf204e3ecb6d2a4d4b1ae0236` |
| `check-candidate.mjs` | `fdab56e4faf9446d7cf14f8e7ae467989aebc644bd36ed1b09ecd0f1416a6c52` |

- `trace-games.jsonl`: six non-invasive seed 51001 decision traces; their final hashes match the independent frozen audit.
- `candidate-confirm-*` and `baseline-confirm-*`: 1,184 paired configurations each for the rejected broad prototype.
- `fallback-specs.json`, `fallback-seeds.json`, and `*-small-*`: 272 configurations per bounded variant, including idle.
- `candidate-checks.json`: 128 exact unaffected cases, 2,272 whole-state checkpoints, 2,272 paid attempts, 64 compatible restored continuations.
- `candidate.patch`: a portable diff for the **rejected** broad prototype, retained only to reproduce the finding. Do not apply it as a fix.
- `check-candidate.mjs`: portable isolation/parity test accepting an isolated engine path. The main audit already verifies paid actions and repeated restores in every match.

Example reproduction (does not edit the game):

```sh
D=/workspace/shared/ironroot-long-march-ai
node "$D/balance.mjs" --engine "$D/two-screen-response-engine.mjs" \
  --expected-hash "$(sha256sum "$D/two-screen-response-engine.mjs" | cut -d' ' -f1)" \
  --out "$D/reproduced" --tag response --specs "$D/fallback-specs.json"
node "$D/check-candidate.mjs" "$D/candidate-engine.mjs"
```

No source under `dist/`, existing tests, package metadata, campaign, renderer, backup code or deployed release was edited. The production engine hash was rechecked after all simulations.
