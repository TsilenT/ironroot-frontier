# Campaign primary-route validation

Reviewed 2026-11-06 in the isolated 0.10 candidate. This is deterministic simulation evidence, not browser testing or a human difficulty study.

## Result

**Both previously unproven primary routes work naturally with the frozen engine.** River Charter can reach its actual 210-second income checkpoint while both marked original watchtowers survive. Far Beacons can destroy both marked original mines and remain in a live battle through its 190-second hold. No enemy citadel was destroyed in the recommended primary-route examples.

These findings supplement, rather than reclassify, the early-citadel wins in `CAMPAIGN_EXPANSION_BALANCE_REVIEW.md`. The disclosed alternate victory remains a different route. No mission or engine tuning was performed.

- River Charter, `river-one-air`: **6/6 primary completions at 210s**, 17.5 gold/sec, 3,800 player citadel HP. Enemy citadel retained 5,496.6–6,000 HP.
- River Charter, `river-one-air-wall`: **6/6 primary completions at 210s**, same income and player HP, while keeping both marked towers undamaged. The additional northern tower delayed investment substantially.
- Far Beacons, `beacon-delay-120`: **6/6 primary completions at 190s**, both mines destroyed by 187.85–189s, 5,400 player HP. Enemy citadel retained 4,990.56–6,000 HP.
- Far Beacons, `beacon-delay-150`: **6/6 primary completions at 194.8–196.85s**. The hold was already met when the second mine fell, before the normal 280-second deadline. Enemy citadel retained 5,146.28–5,671.88 HP.

The six scenarios per policy comprise four spread seeds, the mission's authored seed, and the disclosed exploratory seed. They are not six independent human strategies. The one-air River routes share most decisions; the Beacon variants share an opening and differ mainly in when offensive investment is allowed.

## Frozen inputs and method

- Engine SHA-256: `e47a168c099c2a4e1f45b238d5224cb44a02433a7cff06adbfb87095c4d56bc7`.
- Campaign SHA-256 for the final reruns: `49ec88047efdf66f88a677a3f3a4de5b0067f97fef4df8a71cef05044da66781`.
- Harness SHA-256: `ae225ec0a556cfc4ebbd21674d187ec6aaf0a54910a060ef1b1297e82f3a6890`.
- Harness: `qa/campaign-primary-routes.mjs`.
- Four spread seeds: `733`, `91237`, `7281901`, `3940101199`.
- Authored seeds: River Charter `5203`; Far Beacons `5309`.
- Exploratory seed: `17`, retained including its alternate wins and failures.

A bounded set of eight policy configurations was tried: four for each mission. There are **48 distinct policy/seed scenarios**, plus **three uninterrupted controls** paired with the authored-seed recommended routes. Instrumentation reruns reproduce those scenarios and do not create additional independent evidence.

The normal campaign factory supplies the authored starting buildings, upgrades, gold, HP, difficulty, enemy formation, and AI setting. A trial seed is selected once before the first tick and never changed during a run. Both missions use their authored fixed enemy deployments. No enemies, AI decisions, gold, HP, production rates, damage, or victory state are altered. The engine hash is asserted before testing, and both source hashes are checked again after testing.

Player commands are only public `Game.build`, `Game.upgrade`, and `Game.cast`. There is at most **one successful paid command every two seconds**. The policies maintain a short ordered list of desired structures and levels. A lost desired building is rebuilt at its normal price, not restored for free. A nearby pack of at least four enemies may receive a paid 75-gold rally strike if its ordinary cooldown is ready. No structures are salvaged, and no protected originals are replaced.

Every step advances ordinary simulation time by 0.05 seconds, evaluates the campaign, and stops immediately at the first completion or failure. The harness asserts that an engine winner never exists at the start of another tick. It neither forces a post-win wait nor suppresses an early core victory. A 150-second offensive delay means purchasing defenses and income first, letting the live battle continue, then purchasing offensive support. Units keep moving and fighting throughout.

Every ten seconds, the game is serialized, restored using the public validator, and checked for exact serialized equality. Final saves are validated too. The authored River one-air, Beacon 120, and Beacon 150 runs matched their uninterrupted controls exactly for outcomes, actions, targets, snapshots, and ledgers; only the restore counters differed (21, 19, and 19 respectively).

Income is reconciled from every live mine's real rate on each tick. Kill bounties are recorded separately, including immediate rally kills. Each mine investment is credited only its own marginal income while that mine remains alive. A later upgrade does not get credit for a starting mine's free baseline income.

## Bounded policy matrix

Primary means every authored primary objective was `met: true` at the normal endpoint. An alternate core win with an unmet hold/income condition is never counted as a primary success.

| Policy | Spread-seed primary / alternate / failure | Authored seed | Seed-17 pilot |
| --- | --- | --- | --- |
| River walls | 0 / 0 / 4 | Failed at 180.1s | Failed at 180.15s |
| River rear archers | 0 / 0 / 4 | Failed at 210s | Failed at 210s |
| River one air | 4 / 0 / 0 | Primary, 210s | Primary, 210s |
| River one air + wall | 4 / 0 / 0 | Primary, 210s | Primary, 210s |
| Beacon delay 60 | 4 / 0 / 0 | Primary, 190s | Alternate core, 189.7s |
| Beacon delay 90 | 4 / 0 / 0 | Primary, 190s | Alternate core, 189.7s |
| Beacon delay 120 | 4 / 0 / 0 | Primary, 190s | Primary, 190s |
| Beacon delay 150 | 4 / 0 / 0 | Primary, 194.8s | Primary, 196.85s |

The Beacon 60 and 90 policies produced identical successful commands on the four spread seeds and pilot because the opening and available gold already delayed the first offensive purchase to 90s. They are not independent strategies. The authored seed made its first affordable offensive purchase earlier in the 60 policy, so those two authored runs differed.

The faster Beacon variants are not dependable demonstrations of the hold: seed 17 naturally killed the enemy citadel **0.3s before** the hold. That is a legal alternate win, not a test failure in the game, but it fails this review's primary-route criterion. The 120 and 150 variants avoid that issue across the bounded sample.

## River Charter: actual defensive economy route

`river-one-air` uses a single level-1 northern aerie at x=550 to answer siege, a new level-3 southern tower at x=1250 to contain flyers, then three mines with four total upgrades. It never purchases a second aerie or upgrades the first. The original northern barracks and southern archery continue operating normally. This is deliberately limited offensive production, not artificially immobilized units.

### Authored seed 5203: all paid commands

North and South refer to the two Twin Span lanes. The original mine is North x=410.

| Time | Action | Cost | Gold immediately after |
| --- | --- | ---: | ---: |
| 0s | Build northern aerie, x=550 | 250 | 850 |
| 2s | Build southern watchtower, x=1250 | 220 | 645 |
| 4s | Upgrade that tower to level 2 | 154 | 506 |
| 6s | Upgrade that tower to level 3 | 231 | 290 |
| 8s | Build northern mine, x=270 | 190 | 115 |
| 16s | Build southern mine, x=270 | 190 | 11 |
| 26s | Upgrade original northern mine to level 2 | 133 | 11 |
| 34s | Rally the nearby northern hostile pack | 75 | 52 |
| 40s | Upgrade northern x=270 mine to level 2 | 133 | 7.5 |
| 48s | Upgrade southern x=270 mine to level 2 | 133 | 6.5 |
| 60s | Upgrade original northern mine to level 3 | 199 | 18.5 |

The income reaches **17.5/sec at 60s**, but the mission does not complete until **210s**. Both original towers remain alive. On this authored seed, the northern original takes its first damage at 44.8s and finishes at **1,465.2 of 1,800 HP**; the southern original remains at 1,800 HP. Across the six scenarios, northern minimum HP is 1,274.4–1,465.2, southern minimum HP is always 1,800, and player citadel HP never falls below 3,800.

The enemy citadel remains completely undamaged on the authored seed. Nine of sixteen player sites are occupied. The route earns two stars, not the optional 20/sec medal. It has ample banked money later, but that does not mean the opening is unconstrained: several early investments leave under 20 gold.

### Real receipts and payback, authored seed 5203

| Marginal investment | Cost | Income earned by 210s | Net | Paid back at |
| --- | ---: | ---: | ---: | --- |
| 8s northern mine | 190 | 505 | +315 | 84s |
| 16s southern mine | 190 | 485 | +295 | 92s |
| 26s original mine, level 1→2 | 133 | 230 | +97 | 132.4s |
| 40s northern mine, level 1→2 | 133 | 212.5 | +79.5 | 146.4s |
| 48s southern mine, level 1→2 | 133 | 202.5 | +69.5 | 154.4s |
| 60s original mine, level 2→3 | 199 | 187.5 | −11.5 | Not by endpoint |

Gold reconciles exactly: **1,100 starting + 1,050 base income + 2,347.5 mine income + 232 kill bounty − 1,908 spending = 2,821.5 ending gold**. The 2,347.5 mine income includes the starting mine's normal baseline; the marginal table does not credit that baseline toward an upgrade.

Across all six one-air scenarios, both new mines and all three level-2 upgrades repay; the level-3 upgrade does not. Thus the genuine 210-second route supplies materially more economic payback than the earlier core-win review, while still retaining a final investment that buys the objective threshold rather than a cash profit before victory.

### More fortification is feasible but expensive

`river-one-air-wall` adds and maintains a level-3 northern tower at x=1250 before starting the mine plan. This preserves both marked originals at full HP, but losing/rebuilding the forward tower pushes the last required mine upgrade to **172–200s**. All six scenarios still meet 17.5/sec at 210s. Spending rises to 2,887–3,118, ending gold falls to 206.5–696, and only **6 of 36** mine investments repay by completion. It is a distinct defensive/economic tradeoff, not a superior return on investment.

### Failed approaches retained

`river-walls` uses one level-2 northern rear archery plus level-3 forward towers on both lanes. `river-rear-archers` substitutes two level-1 rear northern ranges. Both prioritize maintaining the frontline before mines.

Neither reaches the income target in any of its six scenarios. Four `river-walls` scenarios lose the marked northern original at 180.1–181.7s; its remaining two expire at 210s. All six rear-archer scenarios preserve the originals but expire at 210s with only the starting **7.5/sec** income. Repairing the paid plan by rebuilding and upgrading the forward tower consumes the treasury before the mine phase. These failures show that static defense against siege can be an economic trap under this policy. They do not establish that every ground-based or tower-based strategy is impossible.

## Far Beacons: timed offensive after a live defense

The common opening builds level-3 towers at x=1250 on both outer lanes and a single level-1 middle aerie at x=270. The rear aerie counters the central ground-only siege and wizards; the towers and authored outer troops defend against flyers. Two extra mines and two mine upgrades reach 15/sec. Only then, and no earlier than the selected 60/90/120/150-second time, does the policy buy extra outer archery, upgrade the original barracks, and add siege.

### Authored seed 5309, 120-second variant: complete paid timeline

- 0/2/4s: build northern x=1250 tower and upgrade to level 3, spending 220 + 154 + 231.
- 6/8/10s: repeat for the southern x=1250 tower, spending another 605.
- 16s: build middle x=270 aerie, 250. Only 10 gold remains.
- 38s: build northern x=270 mine, 190; 1 gold remains.
- 46s: paid rally against a nearby southern enemy pack, 75.
- 60s: build southern x=270 mine, 190; exactly 0 gold remains.
- 70s: upgrade the original middle mine to level 2, 133.
- 78s: upgrade northern x=270 mine to level 2, 133. Income reaches 15/sec.
- 120/122/124s: build northern x=1110 archery and upgrade it to level 3, costing 175 + 122 + 184.
- 126/128/134s: build southern x=1110 archery and upgrade it to level 3, costing another 481.
- 142s: upgrade original northern barracks to level 3, 147.
- 150s: upgrade original southern barracks to level 3, 147.
- 166/178s: build northern x=690 foundry and upgrade it to level 2, 270 + 189.

The opening units keep fighting while gold accumulates between 78s and 120s. This is a functioning battle, not an engine pause or a forced wait after victory.

The southern marked mine falls at **185.85s**, and the northern one at **187.85s**. The actual mission completes at **190s**, with the hold met, both original mines gone, **5,400 player citadel HP**, and **6,000 enemy citadel HP**. All three stars are earned. Across the six scenarios, the last mine falls at 187.85–189s, and the enemy citadel remains well above zero. The player citadel is never damaged.

### Gold and payback

For the authored 120-second route:

| Marginal investment | Cost | Income earned by 190s | Net | Paid back at |
| --- | ---: | ---: | ---: | --- |
| 38s northern mine | 190 | 380 | +190 | 114s |
| 60s southern mine | 190 | 325 | +135 | 136s |
| 70s original mine, level 1→2 | 133 | 150 | +17 | 176.4s |
| 78s northern mine, level 1→2 | 133 | 140 | +7 | 184.4s |

The treasury reconciles: **1,350 starting + 950 base income + 1,470 mine income + 346 kill bounty − 3,896 spending = 220 ending gold**. All four mine investments repay in all six 120-second scenarios, and likewise in all six 150-second scenarios. Mines built at 38–40s and 60–62s have enough real time to repay before the primary endpoint.

The 150-second variant buys the extra ranges at 150s and 156s, upgrades them, then the original barracks. It finishes when the second mine falls at 194.8–196.85s, with 15/sec and all 5,400 HP. It spends 4,166 total, including a second foundry built shortly before completion. That last siege purchase is recorded as spending; the result does not establish that it was necessary. The later route remains three-star because it is before the 245-second medal threshold.

## Reproduction and verification

The harness prints complete JSON: configurations, paid actions and gold after each action, objective truth values, target damage/loss times, 20-second snapshots, mine investments, marginal payback, gold ledgers, restore counts, and source hashes. It writes no result files itself.

```sh
# Full spread-seed matrix, including deliberately retained unsuccessful routes.
node qa/campaign-primary-routes.mjs > /tmp/primary-matrix.json

# Authored defaults and disclosed exploratory seed.
node qa/campaign-primary-routes.mjs --seeds=authored > /tmp/primary-authored.json
node qa/campaign-primary-routes.mjs --seeds=17 > /tmp/primary-pilot.json

# Strict positive-route gate: every primary must be true and enemy citadel alive.
node qa/campaign-primary-routes.mjs --routes=river-one-air,beacon-delay-120,beacon-delay-150 --requirePrimary > /tmp/primary-positive.json
node qa/campaign-primary-routes.mjs --routes=river-one-air,beacon-delay-120,beacon-delay-150 --seeds=authored --requirePrimary > /tmp/primary-authored-positive.json

# Uninterrupted controls use the same ordinary actions and natural endpoints.
node qa/campaign-primary-routes.mjs --routes=river-one-air,beacon-delay-120,beacon-delay-150 --seeds=authored --restoreEvery=0 --requirePrimary > /tmp/primary-controls.json

node --check qa/campaign-primary-routes.mjs
npm test
npm run check
```

Final checks passed: the full spread, authored, and pilot matrices; the 12 spread-seed and 3 authored strict positive-route checks; all three exact uninterrupted-control comparisons; harness syntax; **440 automated tests passed, 1 skipped, 0 failed**; and all runtime JavaScript syntax checks. The final matrix reruns include the parent-owned campaign hint revision; the frozen engine is unchanged.

The known failing routes are diagnostic outputs, not assertion failures in the full matrix. Use `--requirePrimary` only for a selected expected-primary route set. The strict gate rejects the seed-17 faster Beacon core wins rather than accepting them as hold evidence.

## Interpretation and limits

- The advertised primary objectives are achievable without free resources, altered content, exact-frame commands, or post-victory ticking.
- River Charter offers a meaningful early counter/economy tradeoff. Successful minimal defense leaves time for several investments to repay; excessive maintenance can prevent the economy entirely.
- Far Beacons supports a defense-first, later-offense primary route. This does not mean the player must wait: an aggressive player can still legitimately finish early by killing the citadel.
- The tested 120-second Beacon route often destroys its second mine only 1–2.15s before the hold. If a player is slower, the primary can still complete after 190s and before 280s, as the 150-second variant demonstrates. The 190s threshold is elapsed mission time, not an additional 190s after destroying the mines.
- This small scripted sample establishes feasible routes, not universal success, optimal play, mobile usability, or human difficulty. No broad balancing recommendation follows from six seeds. No source policy, existing test, runtime module, mission content, server, browser, GitHub ref, commit, or publication was changed by this review.
