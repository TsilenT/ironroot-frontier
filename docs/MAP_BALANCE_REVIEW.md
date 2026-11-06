# Independent 0.9 battlefield balance review

Date: 2026-11-06 UTC. **Diagnostic bots, not human balance certification or deployment approval.** No runtime module, existing test, unit statistic, economy rule, AI decision, or published game was changed by this audit.

## Decision summary

- **Simulation and save safety passed this sample.** 9,216 unique candidate games plus 576 historical-engine paired replays ended within 600 simulated seconds. The candidate range was 81.9–505.6 seconds. There were no invalid saves, illegal sites/lanes/world positions, cap violations, negative/nonfinite gold, or ledger discrepancies. The exact measured gold error was zero; 55,590 repeated restore/continuation checkpoints passed.
- **Classic preservation passed.** All 576 selected Classic candidate games have exactly the same final serialized-state hash as the frozen 0.8 engine, not merely the same winner.
- **Long March needs an AI/lane review before public balance claims.** Center-only barracks beat Hard in 256/256 runs across 32 consecutive and 32 widely spread seeds, both sides and both opening orders. South-only barracks won 0/256. North-only depends strongly on who makes the opening decision. This survives the spread-seed check and is substantially stronger than the Classic lane pattern.
- **Twin Span has a robust Normal rush weakness, but Hard counters it much better.** Burst won 128/128 Normal baseline runs and 256/256 additional delayed-opening runs. It won only 25/128 against Hard. Screened siege/mixed arms also beat Normal frequently, but similar Normal weaknesses already exist in Classic.
- **Do not call Twin Span economy nonviable.** The initial two-barracks mine timing failed, but an improved two-road mixed screen followed by one mine won 64/64 Normal runs and every mine repaid its cost. Its no-mine control also won 64/64 and finished faster. A later secured-front mine usually did not repay before an already-winning game ended.
- **The first large left/right split was seed-block-sensitive.** Retain it as a diagnostic warning, not a general fairness conclusion. A stratified 32-bit seed check reduced the starting-lane split from 59/64 versus 33/64 to 36/64 versus 34/64 on both Classic and Twin Span. Opening-decision sensitivity remained large.

These findings support technical robustness and real geometry differences. They do not establish player enjoyment, mobile/controller usability, a safe universal economy opening, or competitive fairness. No tuning is proposed as part of the frozen geometry refactor. A separate focused Long March AI diagnostic is warranted before public map release.

## Exact inputs and reproducibility

- Candidate `dist/engine.js`: `e47a168c099c2a4e1f45b238d5224cb44a02433a7cff06adbfb87095c4d56bc7`.
- Historical `tests/fixtures/engine-v0.8.js`: `0e94556092df4c5b74f6002bfb8e70fe8477b9e66363e17485b6c083373bd889`.
- Harness: `qa/maps-balance.mjs`. Node v24.22.1. The harness verifies the supplied engine hash before import and after each batch, imports those exact bytes, and never modifies runtime source.
- Full local evidence: `/workspace/shared/ironroot-map-balance/`. Each `*-games.jsonl` contains per-run action times, paid purchases/upgrades/spells, lanes/coordinates, every building's lifetime, actual mine receipts/investment, cap exposure, save checks, outcome, and complete-state hash. `games-index.csv` and `side-order-results.csv` are searchable summaries; JSONL remains authoritative.
- `spread-seeds.json` documents one deterministic SHA-256-jittered seed in each of 32 equal-width 32-bit strata. Seeds are not consecutive and exercise the full unsigned range.
- `repro-specs.json` and `repro-expected.json` preserve concise high-signal reproductions, full successful action traces and expected final hashes. The portable bundle includes both engine snapshots, this review, the harness, all exact batch specs, results, a standard-library Python summarizer, and a SHA-256 manifest.

Example from the repository:

```sh
node qa/maps-balance.mjs --out /tmp/map-audit --tag matrix
node qa/maps-balance.mjs --out /tmp/map-audit --tag repro \
  --specs /workspace/shared/ironroot-map-balance/repro-specs.json
```

A batch can be rerun exactly with its saved `*-specs.json`. Use `--engine PATH` for the portable candidate snapshot. Historical replay additionally requires `--expected-hash` with the historical hash above. `--help` lists all policies and options. The final harness was checked against saved reproduction hashes after adding the economy follow-ups.

### Cohorts

| Cohort | Candidate runs | Purpose |
| --- | ---: | --- |
| Initial new-map matrix | 1,440 | 8 seeds × both maps × 3 difficulties × both sides/orders; six policy families, with every one-lane target |
| Normal expansion | 1,440 | All new-map Normal cells increased to 32 consecutive seeds |
| Classic controls and Normal expansion | 1,152 | Same policies; selected full-history 0.8 comparisons on 576 of these |
| One-lane targeted expansion | 1,088 | 32-seed Hard lane comparisons and Classic outer-lane controls |
| Strong-policy Hard expansion | 864 | Burst, mixed-AA and siege at 32 seeds on all three maps |
| Two-screen no-mine ablation | 384 | Matched saving/decision pause, three maps, Normal, 32 seeds |
| Opening-delay checks | 576 | Normal burst/siege at four delays; Twin burst expanded to 32 seeds |
| Matched AI-versus-AI stress | 96 | Honest AI both sides, 4 seeds, both maps/difficulties/orders |
| Economy follow-ups and Classic controls | 1,536 | Exploratory weak controls retained alongside established mixed-AA controls |
| Spread-seed targeted check | 640 | Long March Hard all lanes; Classic/Twin Normal starting lane; both sides/orders |
| **Candidate total** | **9,216** | Unique map/difficulty/policy/lane/seed/side/order/delay specs |
| Historical 0.8 replays | **576** | Additional exact Classic paired controls |

Pilot and redundant exploratory AI-stress batches are retained but excluded from these totals. Saved reproduction reruns are also excluded. Do not treat multiple orientations/orders from one deterministic seed as independent human trials.

## Policies and timing limitations

All games start from the real constructor: 420 gold, 5 gold/second, one free rear barracks, ordinary costs, three-mine cap, 70-unit cap, native difficulty rules, overtime at 300 seconds, and core collapse after 420 seconds. No gold, units, health or placements are injected. New-map construction uses only enumerated owned sites. Classic controls use the identical discrete sites, a subset of Classic's historically legal continuous rectangle.

The six principal policies are:

1. **Burst:** up to three paid barracks purchases per decision, spread to the least-populated lane, front sites first.
2. **One-lane:** one paid barracks decision on the selected road, front sites first, then producer upgrades after the lane has no free legal site. Every road is tested. No player spells.
3. **Mixed-AA:** a forward barracks on every road, then archery, aerie, barracks, archery, sanctum, barracks; paid defensive spells against clusters.
4. **Screened siege:** a forward barracks on every road, then foundry, archery, barracks, foundry, barracks, archery; paid defensive spells.
5. **Mine-after-two:** two paid forward barracks, one rear mine, then barracks; a level-2 mine upgrade may occur after 100 seconds and six forward producers. The initial free barracks does not count as a paid screen.
6. **Greed:** three mines before a production screen, followed by mine upgrades and mixed production. Saving is real: unaffordable planned purchases do not fall through into unrelated upgrades.

Manual AI calls use the native AI implementation, native action budgets and native interval-plus-random timer. AI is controlled manually only to permit the right/left player orientations. Easy retains its seven-second AI opening delay. Normal/Hard both actors' first decisions are after the first physics step, at 0.05 seconds. `opening-flip` reverses **only the first event**, preserving all later absolute-side alternation. This is not an alternate whole-game scheduler.

The player decision timer is nominally five seconds; with the deliberately retained floating-point decrement it actually recurs every 5.05 seconds. A zero-delay burst can make three immediate purchases versus Normal's two-action budget. Mixed/siege generally make one purchase per decision. This is a policy/timing advantage, not a human reaction-time simulation. Requested delay values 0.25, 0.5, 1 and 2.5 seconds result in observed first decisions at approximately 0.30, 0.55, 1.00 and 2.55 seconds; exact action logs are authoritative.

## Principal outcome comparisons

All numbers below are **player wins**, out of 128 per cell: 32 consecutive seeds × two player sides × two first-event orders. They are deterministic policy comparisons, not confidence intervals.

### Normal

| Policy | Classic | Long March | Twin Span |
| --- | ---: | ---: | ---: |
| Burst | 64 | 114 | 128 |
| Starting-lane rush | 92 | 89 | 92 |
| Mixed-AA | 128 | 127 | 128 |
| Screened siege | 128 | 128 | 128 |
| Mine after two barracks | 82 | 92 | 0 |
| Three-mine greed | 0 | 0 | 0 |

Long March's north/center/south rush outcomes are 18/89/19 out of 128. Classic's are 76/92/73. Twin Span's north/south are 92/126. The initial barracks starts in the center on Classic/Long March and north on Twin Span; lanes are not interchangeable initial conditions.

### Hard

| Policy | Classic | Long March | Twin Span |
| --- | ---: | ---: | ---: |
| Burst | 11 | 85 | 25 |
| Mixed-AA | 127 | 97 | 7 |
| Screened siege | 127 | 94 | 43 |
| North-only rush | 107 | 56 | 108 |
| Center-only rush | 113 | 128 | Not a road |
| South-only rush | 99 | 0 | 39 |

Hard is not uniformly harder for every fixed policy: Long March center rush beats Hard more reliably than Normal. Twin Span is much harder for the successful Normal mixed-arm policies. Do not infer a single map-independent difficulty rating from an average across bots.

### Spread-seed check and unresolved lane weakness

A separate 32-seed, full-range stratified check gives Long March Hard north/center/south **60/128, 128/128, 0/128**. Center remains 64/64 on each side and 64/64 for each first actor. South remains 0/64 for each. North is 60/64 player-first and 0/64 AI-first. Combined with the consecutive block, center is 256/256 and south 0/256; do not pool these to conceal the north timing split.

Concrete reproduction: Long March, Hard, seed 51001, one-lane lane 1, either player orientation and either first-event order. Buy barracks on y=450 at own-home distances 1250, 1110, 970, 830, 690, 550, 410, 270 when affordable/available, then upgrade lane producers. There are no spells or artificial resources. The same policy on lane 2 loses in this sample. The exact successful action sequence is in `repro-expected.json`, and all decision inputs are reproducible from `repro-specs.json`.

The evidence points to a lane-specific AI/initial-layout interaction, not proof of a universal no-counter human strategy. It is nevertheless too strong to call Long March balanced without investigating AI threat ranking, opening lane coverage, counter timing, and lane-specific economy under controlled alternatives. Changing the frozen AI/statistics during this audit would invalidate the comparison, so none were changed.

## Opening order and physical-side evidence

For Normal burst on Classic, the consecutive block is 64/64 player-first and 0/64 AI-first. Its 50% pooled win rate hides an entirely different opening response. Long March is 64/64 versus 50/64; Twin Span 64/64 versus 64/64.

Classic Normal center rush and Twin Normal north rush both show left 59/64 versus right 33/64 in the consecutive block. When the player goes first, the split is left 27/32 versus right 1/32; when AI goes first, both sides win 32/32. Long March Normal center rush shows left 55/64 versus right 34/64. These are warnings, not fair-side certificates.

The **spread-seed** Classic/Twin starting-lane comparison instead gives left 36/64 versus right 34/64. Player-first wins only 6/64; AI-first still wins 64/64. Thus a large portion of the original side split depends on the consecutive seed block and its early LCG draws. Preserve the original results for a focused fairness review, but do not advertise a stable 40-point physical-side bias based on them. Other original-block side splits, including mine-after-two, were not given their own spread-seed extension and remain unconfirmed outside that block.

Opening-delay checks reinforce the distinction. Classic Normal burst loses all 64 sampled delayed games. Long March wins 11/16, 15/16, 6/16 and 4/16 at the four requested delays, not a monotonic timing curve. Twin Span burst wins **64/64 at each delay**, 256/256 total across 32 seeds per delay. Screened siege is 64/64 across delays on Classic and Long March, and 58/64 on Twin Span. The successful mixed/siege baseline is therefore not solely a zero-time-click artifact, although its policy remains scripted.

## Economy: actual receipts, not hypothetical repayment

Mine income is integrated from each live mine's actual level before every physics step. Purchase, every upgrade, destruction time, lifetime, gross receipts, full investment, refund and each upgrade's incremental receipts are recorded. Income after the game ends is never projected. Initial free barracks are excluded from paid investment. Gross mine receipts repaying the whole building do not prove that a late upgrade repaid its marginal cost or that the mine improved the win.

### The initial two-screen and greed policies

Normal, 128 games per map/policy:

| Route / map | Player wins | Mines | Fully repaid | Actual mine income | Purchase + upgrades |
| --- | ---: | ---: | ---: | ---: | ---: |
| Two-screen / Classic | 82 | 128 | 92 | 34,594.500 | 32,832 |
| Two-screen / Long March | 92 | 128 | 127 | 49,013.625 | 33,497 |
| Two-screen / Twin Span | 0 | 128 | 37 | 20,718.375 | 24,320 |
| Three-mine / Classic | 0 | 384 | 0 | 36,704.000 | 72,960 |
| Three-mine / Long March | 0 | 384 | 0 | 70,232.000 | 89,984 |
| Three-mine / Twin Span | 0 | 384 | 0 | 34,352.000 | 72,960 |

No Normal mine upgrade in these rows repaid its own incremental cost before the end, even when the whole mine's cumulative receipts exceeded total investment. This is why aggregate gross income alone is insufficient.

The matched no-mine-after-two branch waits until it could have paid 190 gold, consumes that same decision without purchasing, and resumes troops with its retained gold. It wins Classic **126/128**, Long March **128/128**, Twin Span **60/128**. The paid mine's favorable gross repayment on Long March does not establish strategic benefit. Conversely, the Twin Span loss does not prove every mine route is bad.

### Better three-producer and later-front controls

A first exploratory mixed screen and its no-mine counterpart were both poor. They are retained as `economy-followup` / `economy-classic-controls`, not discarded or presented as proof against mines. The later-front condition almost never triggered in that weak baseline.

The stronger follow-up deliberately reuses the established mixed-AA opening and continuation. On Twin Span, it buys:

1. Forward south barracks at (1250,560), t=0.05 in the seed-51001 left-side example.
2. Forward north barracks at (1250,340), t=5.10.
3. South archery at (1110,560), t=10.15.
4. One unupgraded rear mine at (270,340) once affordable, t=40.45 in that example; then resumes mixed-AA and paid cluster spells.

The mirrored side uses reflected x coordinates. Both roads have a paid forward barracks, and one has ranged support. The free initial barracks is additional. The no-mine branch preserves the savings threshold and consumes the purchase decision as a no-op. In **416 mined games across the follow-up cohorts**, complete pre-mine action histories and decision times match their controls exactly. If a route never buys a mine, its corresponding no-mine run has the identical final state hash.

Twin Span Normal results, **16 seeds × both sides/orders = 64 per row**:

| Route | Wins | Mines bought | Fully repaid | Mean mine income | Mean battle duration |
| --- | ---: | ---: | ---: | ---: | ---: |
| Three-forward mixed screen + mine | 64/64 | 64 | 64/64 | 254.834 | 144.277 s |
| Matched no-mine control | 64/64 | 0 | N/A | N/A | 135.510 s |
| Later secured-front mine | 64/64 | 64 | 3/64 | 108.238 | 138.822 s |
| Matched later no-mine control | 64/64 | 0 | N/A | N/A | 137.652 s |

All 128 actual mines in the two paid routes survived to victory. Early mixed-screen mines were bought at 40.45–55.60 seconds, lived 77.05–165 seconds, and earned **192.625–412.500** against an actual cost of 190. Total receipts were 16,309.375 on 12,160 investment. This is a demonstrated repayable Normal route, not a hypothetical payback calculation. Its control wins just as often and ends 8.77 seconds sooner on average, so a win-rate benefit is not demonstrated.

The later route requires time ≥75 seconds, at least three live forward producers, own units beyond midpoint−100 on both roads, and no enemy unit within 1550 home-distance. It buys at 80.85–136.40 seconds. Its mines live 18.65–99.05 seconds and earn 46.625–247.625. Total receipts are 6,927.250 on 12,160 investment: most mines remain alive but the game ends before repayment. Safe survival is not the same as recovering the purchase cost.

On Twin Span **Hard**, each of these four routes wins 2/64 and buys **zero mines**. The opening does not reach a stable/affordable mine decision before losses or termination. Those games test the screen, not Hard mine viability. Do not infer that a mine loses money in a game where none was purchased. Classic controls confirm that map/difficulty context matters: the adapted all-road mixed screen wins 32/32 on both Normal and Hard, with actual mine counts and receipts in the logs; its opening uses three road screens plus archery rather than pretending Classic has only two roads.

## Safety, long-game behavior and remaining limits

The initial 1,440 new-map games end in 81.9–273.15 seconds, with no overtime/collapse, 24 unit-cap games and no building-cap games. There is one valid simultaneous-core draw at 100.5 seconds: Twin Span, Hard, north rush, seed 51005, player right, alternating order. Both cores reach zero; this is not a deadlock.

The 96 matched AI-versus-AI stress games end in 136.05–505.60 seconds. Thirty-two use overtime and eight use collapse. That cohort, unlike the ordinary six-policy matrix, deliberately exercises long mutually reinforcing games; collapse reliance must not be averaged away or described as proof of enjoyable pacing. No game exceeds 600 seconds. Across the complete candidate audit, cap exposure and repeated restores are recorded individually. Frontier fills, 70-unit saturation, and Long March coordinates beyond the old 3200 boundary produce no invalid saves or ledger errors in this sample.

Each game is serialized, restored and compared at opening, every 30 simulated seconds, and termination. At each checkpoint the live un-restored instance and a restored clone also take the same next physics step and must produce identical serialized states before the audit resumes from the checkpoint. World/lane/cap and gold invariants are checked continuously; saves validate full entities, effects and projectile endpoints. This is stronger than only validating a final save, but not an exhaustive proof over all reachable states.

Twin Span never generates a phantom third road. Long March's ordinary front-barracks contact is 12.05 seconds versus Twin Span's 5.80, exactly 6.25 seconds later in the matched burst opening. Unit/economy rules remain identical. No browser, device, audio, animation, rendering, controller, or human-feel test was performed here. Physical-device and human play remain separate release gates. The independent counter-response investigation should remain isolated until a separately reviewed balance change is explicitly chosen.
