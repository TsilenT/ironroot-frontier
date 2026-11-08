> Lean repository checkpoint: screenshots, raw simulation rows, terminal logs and accessibility dumps from this investigation remain in the local development workspace and are intentionally omitted from this PR. References to those artifacts below describe the reviewed local evidence, not files included in the repository. Concise findings, reproducible code, essential tests/fixtures and limitations are retained. Historical base evidence is not removed.

# The Last Ascent: isolated finale experiment

Status: local prototype, 8 November 2026. **Selected setup: `supply-road`.** No fourth setup or further tuning was performed. `dist/` was not edited; there are no new engine rules, campaign entries, awards, profile changes, remote writes or deployments in this work.

## Finding

The final setup supports at least two meaningfully different **synthetic purchase routes**: cheap distributed infantry/archery and economy-first combined arms with three foundries. Both won the three calibration seeds and two held-out seeds. A central-first supported recipe was fragile (two wins in five); screened siege, Rootwarden/ranged and air-heavy recipes did not establish winning routes. This does not make their units useless or prove those approaches impossible.

**The requested nail-biting human finale is not established.** Cheap coverage won all five sampled seeds without additional citadel damage. Its calibration wins did lose 7–11 buildings, so some pressure involved real replacement costs. Adaptive purchases won with no building losses in the calibration sample and healed the battered core. Strong wins have not been weakened or invalidated. The most dramatic observed finish was a legitimate player loss with the enemy on 5.28 HP, not an engineered near-death victory.

This is suitable for a bounded interactive comprehension/playability experiment, not campaign integration or a claim of human difficulty. No human playtest was performed by this worker.

## Frozen API

- `createLastAscent({variant = 'supply-road', seed = 101})` returns an ordinary `Game` using `frontier-citadel-open`.
- `describeLastAscent({variant})` returns briefing, warning, formations, exact setup investment, initial HP, treasury and income metadata.
- `evaluateLastAscent(game)` returns `running`, `won`, `lost` or `draw`. It neither writes progress nor awards anything. Player 1 HP plus enemy 0 HP is a win; both cores dead is a draw.
- `LAST_ASCENT_VARIANTS` contains only `ramparts`, `foothold`, `supply-road`. All are available to reproduce the bounded experiment.
- Scenario identity lives outside the engine state. Engine `serialize`/`Game.restore` remains supported. This is not a new supported campaign save identity. The interactive wrapper must not register or award a campaign mission.

## Final visible setup and exact cost

Classic geometry, clear visibility, full eight-building roster, automatic flyers, citadel choices, ordinary **normal** AI. Coordinates below use distance from that side's own map edge; lanes are north/center/south. All final starting buildings are level 1 and full HP. Only the player's citadel starts damaged.

| Side | Visible initial formation | Paid investment |
|---|---|---:|
| Player | Barracks at 690 on all three roads; archery at 550 center; towers at 830 north/south; mine at 270 center | 1,225 |
| Enemy | Barracks at 1,250 on all three roads; archery at 1,110 north/south and 270 center; towers at 970 north/south; foundry at 970 center; mines at 270 north/south and 1,110 center | 2,225 |

| Resource | Player | Enemy |
|---|---:|---:|
| Opening treasury | 1,050 | 120 |
| Initial citadel HP, ordinary maximum 6,000 | 3,800 | 6,000 |
| Initial income per second | 7.5 | 12.5 |
| Initial mines | 1 | 3 |
| Buildings plus opening treasury | 2,275 | 2,345 |

The enemy's established investment is 1.82 times the player's, but the player's larger flexible treasury nearly closes the total resource gap. Do not describe this as a two-to-one total-money disadvantage. The visible disadvantage includes lower core health, less initial income and an established forward line. There is no unannounced damage, health or income multiplier.

Authoring follows the existing campaign setup pattern: clear constructor defaults, call ordinary paid `build`/`upgrade` from a 10,000-gold setup bank on each side, replace that bank with the declared treasury, and set declared initial citadel HP. Starting investment is retained in buildings, including their normal salvage value. No units, spawn timers or battle-time combat state are manipulated in paid runs. Factories begin with the engine's ordinary initial progress and spawn normally.

Both sides receive normal baseline income, surviving mine income and unit-kill bounties. Purchases, upgrades, volleys and citadel options use their ordinary prices. No secret grants, reserve injections, free replacements, health clamps, required units or health floors exist. There is no minimum duration.

## Escalation and the experimental cap

The existing five-minute escalation is deliberately retained and stated in the briefing:

- At 5:00 production accelerates by 1.65.
- Troop damage against structures multiplies by 1.75.
- Citadel shots fall from 32 to 18; Extra Arrow scales with the same ordinary rule.
- There is no forced citadel drain and no authored mission deadline here.

The simulation cap is 720 seconds. A surviving game at that limit is reported as a **censored stall**, never a gameplay defeat. None of the 80 distinct paid configurations reached the cap, or organically reached five minutes. Escalation and no-drain behavior were checked separately in an isolated mechanics fixture.

## Bounded experiment and complete outcomes

Calibration used eight policies × seeds 101/202/303 for each of exactly three setups: 72 distinct runs. After selecting the final setup, only four promising policies were tested on held-out seeds 404/505: eight more runs. Those seeds were not used to tune the selected setup or policies. Geometry is fixed, so these are held-out RNG seeds, not held-out layouts. There were **80 distinct paid configurations**, plus deterministic replays for accounting and regression checks.

| Policy | Ramparts: wins / 3 | Foothold: wins / 3 | Supply road: wins / 3 | Supply road held-out: wins / 2 |
|---|---:|---:|---:|---:|
| Central-first supported recipe | 0 | 1 | 1 | 1 |
| Screened siege | 0 | 0 | 0 | Not run |
| Rootwarden/ranged | 0 | 0 | 0 | Not run |
| Distributed cheap coverage | 0 | 3 | 3 | 2 |
| Economy first | 0 | 2 | 3 | 2 |
| Air heavy | 0 | 0 | 0 | Not run |
| Adaptive engine purchases | 0 | 2 | 3 | 2 |
| Idle | 0 | 0 | 0 | Not run |

Every non-win in this table was a loss; there were no draws or censored stalls. Initial stages were not discarded:

1. `ramparts`: hard AI, player 750 gold and 3,400 HP; player buildings farther back; enemy front barracks level 2, 2,519 total investment. All 24 lost in 74–127.65 seconds without damaging the enemy core. Rejected as unsupported by these routes.
2. `foothold`: normal AI; player 1,050 gold, 3,800 HP and a forward-shifted defensive edge; all enemy buildings level 1, 2,225 investment. Eight wins and 16 losses, lasting 94.45–218.6 seconds.
3. `supply-road`: same exact budget, health and assets as foothold; exchange only the center enemy mine and archery positions. Ten wins and 14 losses in calibration; seven wins and one loss held out. No subsequent tuning.

Selected-setup observations:

- Cheap coverage wins: 112.25–124.3 seconds across five seeds; final HP always 3,800, with no additional core damage.
- Economy-first wins: 137.15–216.95 seconds; final HP 2,510–4,039.7. Some runs bought regeneration normally, explaining final HP above 3,800.
- Adaptive purchases: five wins in 120.6–147.05 seconds, final HP 4,137.65–4,217. This is not evidence that a human can do the same with comparable attention or reaction speed.
- Central-first supported recipe: wins at 128.4 and 134.7 seconds; three losses at 126.05–141.1 seconds. The seed-101 loss left enemy HP 5.28. This remains a loss.
- Idle: loss at 86.6–91.9 seconds. Its first actual contact occurred at 10.1 seconds; active policies generally caused first contact at 4.5–5.7 seconds by buying forward production immediately.

## Actual policy behavior, not intended recipes

These are deliberately crude automated purchase policies, not human strategies or optimal play:

- Fixed recipes decide every one simulated second and buy **all consecutively affordable unoccupied planned sites in that single decision**. They stop at the next unaffordable purchase. After completing the plan they may buy a citadel choice and make at most one upgrade per decision. Destroyed buildings can cause the same earlier slot to be repurchased before later plans are reached. This batching has no human-speed claim.
- Live friendly structures within normal spacing occupy a planned slot regardless of type. The policy skips that item; it does not move the authored building, sell it automatically or silently find another site. Every result includes initial occupied slots and the full actual transaction log.
- The central-first recipe's planned foundry at 690 center is occupied by an initial barracks. Its side-road foundries at 690 and additional archery at 830 are also occupied. **It is not a siege-supported race in the completed evidence.** Actual seed-101 purchases were warriors, archery, a sanctum and mines; replacements account for repeated purchases.
- Rootwarden/ranged skips its later side foundries because towers occupy 830. Cheap coverage and air-heavy skip planned side archery at 830. Economy-first skips planned side sanctums at 830, but its center sanctum and all three foundries are legal. Screened siege has no initial occupied-plan conflicts, although repeated losses can prevent it reaching later support purchases.
- The economy-first route actually bought both missing mines, infantry/archery across the roads, three foundries and a center sanctum in seed 101. Cheap coverage bought infantry/archery and mines, with no siege, flyers, Rootwardens or citadel purchase. Their purchase timing and troop mixes are genuinely different, though both eventually cover several roads. A separate dedicated economy raid route was not demonstrated.
- The adaptive policy calls existing `_ai(0)` every four seconds and inherits the scenario difficulty. On the selected setup this is **normal AI**, whereas enemy decisions occur every five to eight seconds. Its fixed faster cadence and shared ordinary RNG mean this is not a fair AI-versus-AI benchmark.
- Defensive volley logic considers visible enemy units left of x=600, requires at least four within the ordinary spell radius and at least 150 gold before casting the 75-gold spell. It selects the first densest qualifying cluster using `best=n`; it does not select the last merely qualifying cluster. This behavior was unchanged throughout the cohort.
- Citadel choices happen only if a policy reaches that part of its plan, never at an enforced time. Flyers always use autonomous targeting; no policy issues flight orders.

## Economy evidence and its limit

The funding is real. In the selected calibration sample, ordinary enemy purchases exceeded opening gold plus baseline income plus all kill bounties by **487.5–1,276 gold per run**. That excess necessarily depended on earned mine income. In the held-out economy-first seed 404 it was 1,296.25 gold. `minimumMineFundedSpending` records this conservative lower bound, not an invented assignment of particular coins to a purchase.

Destroying mines removes their live income; existing factories continue spawning without unit wages, baseline income remains, and existing treasury can still be spent. A fixture independently verifies exactly 12.5 versus 5 gold/second after removing all three enemy mines, with existing factory production continuing. Paid runs never remove mines artificially.

**An early economy raid is not established.** Most destroyed mines were rear side-road mines after a force had already advanced. The exposed center mine frequently survived until near the finish. For example:

| Final setup / policy / seed | Mine lost at | Ordinary enemy spending afterward |
|---|---:|---:|
| Cheap / 101, rear south mine | 77.8 s | 760 gold, six purchases |
| Cheap / 101, rear north mine | 112.75 s | 140 gold, one purchase |
| Economy first / 101, rear south mine | 99 s | 1,470 gold, twelve purchases |
| Economy first / 101, exposed center mine | 202.4 s | 140 gold, one purchase; game ends 215.65 s |
| Adaptive / 202, exposed center mine | 146.6 s | 0; game ends 147.05 s |

These are observed loss times and later expenditures, not a matched causal experiment proving a different outcome if that mine survived. The actual income formula and ledger prove funding loss; they do not prove that this exposed target currently creates the intended early strategic choice.

## Telemetry and verification

`simulate.mjs` observes, without changing outcomes:

- First actual damaging contact; first core damage; first building loss.
- Initial/minimum/final core HP, seconds with hostile units within ordinary citadel range, duration and outcome.
- Both gold ledgers: opening treasury + gross normal income + kill gold + salvage refunds − ordinary purchases = current gold.
- Individual successful builds, upgrades, volleys, sells and citadel purchases; building loss type, investment, location and time; mine loss consequences and later spending.
- Fifteen-second traces of gold, income, mines, units, buildings, HP and spending; final structures and citadel choices.

An early observer revision counted volley cost as net gold movement, which undercounted cost when the same volley earned kill bounties. The observer was fixed to account separately for those bounties, and the entire first setup was replayed. Outcomes were unchanged. The stored ramparts files now contain corrected accounting; `ramparts-results.jsonl` is a subset of `initial-results.jsonl`, not another cohort. Both sides' ledger errors are zero at the five-decimal reporting precision. Observation-versus-no-observation state equality is tested directly.

The full reports are:

- `initial-results.jsonl` and `initial-summary.json`: the first two setups, all 48 distinct runs.
- `supply-road-results.jsonl` and `supply-road-summary.json`: the final 24 calibration runs.
- `heldout-results.jsonl` and `heldout-summary.json`: all eight held-out runs.
- `experiment-summary.json`: frozen setup, source hashes, cohorts and aggregated findings.

Some per-loss details such as instantaneous treasury were added to the observer after the cohort; the original stored rows retain their complete original loss/transaction traces, with mine-spending summaries derived directly from them. No missing instantaneous observation was fabricated.

Run the checks and reproduce the bounded cohort from the work root:

```
node --test qa/last-ascent/mechanics.test.mjs
node qa/last-ascent/simulate.mjs --variants=ramparts,foothold,supply-road --seeds=101,202,303 --cap=720
node qa/last-ascent/simulate.mjs --variants=supply-road --policies=supported-race,distributed-cheap,economy-first,adaptive-defense --seeds=404,505 --cap=720
```

The mechanics suite covers paid authoring cost/admission; all three setups; 1-HP victory and simultaneous death semantics; invalid input; engine and policy save/restore parity on foothold and the final setup; telemetry neutrality; both ledgers; mine income and continued factory spawning; autonomous flyers rejecting orders; paid citadel options without instant healing; retained escalation/no forced drain; censored test caps; and deterministic replays of two distinct held-out winning routes.

These are isolated mechanics tests and synthetic combat runs, not a production aggregate test pass. Browser interaction, mobile layout, accessibility, performance, briefing/restart/resume UX, campaign progression, earned unlocks, replay navigation and final-to-Skirmish navigation are outside this worker's verification. Controlled state edits appear only in clearly labeled mechanics fixtures, never in paid cohort runs.

## Recommended next decision

Keep this a prototype. Use a bounded interactive test to learn whether the initial disadvantage, real losses, purchase choices, automatic air behavior and mine funding are understandable. Do not claim that Chapter 10 is now hard enough. If the experiment is revisited later, separately label corrected or more deliberate siege/Rootwarden policies and test whether the exposed mine is actually reachable early; do not rewrite this cohort or invent a fourth tuned setup in this pass. Campaign deadlines, progression and ending navigation remain separate integration work.
