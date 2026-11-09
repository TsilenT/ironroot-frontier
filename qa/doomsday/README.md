# Chapter 10 doomsday follow-up

Developer-only prototype, 9 November 2026, based on main `6b6cf96` (v0.28). The entire change lives in `qa/doomsday/`. No release runtime, engine rules, campaign catalog, profile protocol, awards, or deployment changes. The earlier `qa/last-ascent/` prototype and evidence remain untouched.

The scenario supports several paid winning approaches and frequent losses. **It does not yet establish Steve's nail-biting human finale.** Many automated wins still take no further core damage, dedicated siege openings remain poor, and the same recipe can swing sharply between RNG seeds. Keep this branch isolated; do not merge it as a Chapter 10 release.

## Concrete prototype

`createDoomsday({variant:'doomsday-hard',seed:101})` uses the previous supply-road formation and the existing Hard AI. `control-normal` reproduces the previous supply-road initial save exactly. Hard changes ordinary decision cadence and purchase/counter choices, without damage, health, or income bonuses. It can perform up to three paid build actions every 3–6 seconds, alongside ordinary citadel choices and volleys; Normal has up to two build actions every 5–8 seconds.

| Opening | Player | Enemy |
| --- | ---: | ---: |
| Citadel HP / 6000 | 3800 | 6000 |
| Flexible gold | 1050 | 120 |
| Gold / second | 7.5 | 12.5 |
| Established building investment | 1225 | 2225 |
| Buildings + treasury | 2275 | 2345 |

The disadvantage is damaged health, lower income, and an entrenched forward army. The total starting money gap is small; this is not a two-to-one total resource disadvantage. Existing factories spawn normally without wages. The center mine is forward behind a barracks; losing mines removes real income for future purchases, while existing production, baseline income and banked gold remain.

All eight ordinary building types, autonomous flyers and paid citadel choices remain available. Destroy the enemy citadel with any HP remaining to win. A 1-HP victory succeeds; simultaneous core death draws. There is no health floor, required unit, secret grant, reserve injection, rubberbanding, forced base drain or mission deadline.

The ordinary 5:00 escalation is disclosed: production ×1.65, troop damage to structures ×1.75, and citadel shots 32 → 18. None of this cohort reached it organically: the longest run ended at 297.95 seconds. Earlier isolated Last Ascent fixtures verify its mechanics; this follow-up is not new combat-play evidence for the escalation.

## Strategy evidence

Nine fixed policies cover distributed cheap pressure; all-road coverage followed by central siege; early screened siege; economy first; Rootwardens with ranged support; a supported center race; autonomous air; existing player-side AI; and idle control. Every planned building slot is initially free and legal. Unlike the older recipes, intended siege/support purchases are not silently skipped because an authored building already occupies the slot.

The standard **paced** policies start at 3 seconds, decide every 2 seconds, and execute at most one successful paid command per decision, including volleys and citadel purchases. They save for the next planned purchase, replace destroyed plan sites and then upgrade. They do not see seeds, forecasts or outcomes. This is a reproducible input constraint, not a measured human reaction model.

| Policy | Normal control, 3 calibration seeds | Hard, same 3 seeds | Hard, 6 held-out seeds |
| --- | ---: | ---: | ---: |
| Distributed cheap | 0/3 | 2/3 | 5/6 |
| Cover roads, then siege | 3/3 | 0/3 | 0/6 |
| Early screened siege | 0/3 | 0/3 | 0/6 |
| Economy first | 0/3 | 0/3 | 3/6 |
| Rootwardens + ranged | 3/3 | 0/3 | 5/6 |
| Supported center race | 2/3 | 1/3 | 4/6 |
| Player-side existing AI | 2/3 | 2/3 | 5/6 |
| Air heavy | 0/3 | 0/3 | 0/6 |
| Idle | 0/3 | 0/3 | 0/6 |

All non-wins above were genuine losses. There were no draws or censored stalls. These are policy success counts, not human win-rate estimates. Hard is not universally harder than Normal: its different response can lose to production that beats Normal's response. Do not infer an overall difficulty increase from its label alone.

Calibration seeds: 101/202/303. All nine policies were frozen before held-out seeds 404/505/606/707/808/909. Geometry is unchanged, so these test RNG generalization, not new layouts. The cover-then-siege policy was added after the first eight-policy calibration pass; the complete final calibration was replayed against the final source. No formation, health, treasury, or AI numerical tuning followed the earlier supply-road setup.

Concrete contrasts:

- Hard seed 808: distributed cheap lost at 179.8 seconds with enemy HP 2227; the supported race won at 114.75 seconds with player HP 3800. Economy first also won this seed. Changing the opening can change the result without changing the battlefield or injecting help. This is a synthetic contrast, not evidence that a human learned it.
- Hard seed 707: economy first won at 210.25 seconds with player HP 1972 after losing 13 buildings. Rootwardens won at 155.65 seconds with 3398 HP; cheap coverage won at 172.05 seconds with 2990 HP. These are real losses and damaged victories, though none is a near-death finish.
- Hard seed 101: all nine paced recipes lost. The cover-then-siege recipe won when permitted an immediate batch opening. This establishes a winning paid route on that seed, and also exposes a substantial opening execution burden. It does not prove that the paced battle is impossible.
- Normal seed 202: cover-then-siege won with 557 HP. Its Hard counterpart lost. The closest win in the normal control is retained rather than presented as evidence for the Hard candidate.

Timing probes use Hard and the same three calibration seeds. **Burst** starts immediately and buys all affordable consecutive planned buildings in one decision, then at most one upgrade; **delayed** starts at 10 seconds and permits one successful command every 3 seconds. Cover-then-siege went from 3/3 burst wins to 0/3 paced and delayed. Cheap coverage went 2/3 burst, 2/3 paced, 0/3 delayed. Rootwardens won 1/3 delayed despite winning none of the paced calibration runs. Adaptive responses and purchase-triggered shared RNG make timing effects non-monotonic.

The player-side AI benchmark always calls ordinary `_ai(0)` every four seconds after a three-second delay. Its usual multi-action AI budget is retained; it is not subject to the recipe's one-command limit. The enemy acts every 3–6 seconds on Hard. This is neither a fair symmetric AI match nor evidence that a person can match its decisions.

## Accounting and limits

There are **162 labeled runs / 150 distinct dynamics**, including 12 duplicate adaptive/idle cadence labels. The unique configurations produced 48 wins and 102 losses. Repeated labels are disclosed in `evidence.json`; they are not extra independent successes. Of 52 labeled wins, 41 took no additional citadel damage. This is a material limit on the requested finale feel.

The reused neutral observer records actual paid build/upgrade/cast/sell/citadel transactions, live losses, mine funding and both gold ledgers. Every run balanced to zero error at five-decimal reporting precision. Observation versus unobserved engine equality and engine-plus-policy checkpoint parity through a real ending pass. All combat cohort actions use ordinary prices; controlled state edits appear only in labeled mechanics fixtures or initial scenario authoring.

The first enemy mine loss anywhere in this cohort was at 66.8 seconds. There is still **no demonstrated early economy-raiding strategy**. Destroyed mines and subsequent spending are observable, but these outcomes do not isolate a causal benefit from an early raid. Dedicated siege and air policies failing do not prove their units are useless or that no such strategy can win.

`evidence.json` retains source hashes, the group summaries, compact per-run outcomes and the browser result. Full transactions, screenshots and terminal output are reproducible and remain local under `/tmp/doomsday-*` and `/tmp/ironroot-doomsday-browser/`; they are not required repository dependencies. Calibration was rerun for reproducibility and is counted once.

## Ordinary UI checks

The preview generator copies the current UI to an external directory. It uses an isolated `sessionStorage` namespace, disables service-worker registration, prevents campaign mode, and substitutes the scenario on fresh start and restart. The compact briefing makes the opening budget, Hard opponent, escalation and prototype boundary visible without a nested scroll region. Optional deployment/counterplay details remain available.

Automated Chromium checks passed at 1180×757 desktop, 390×650 phone and 844×390 landscape:

- Briefing disclosures and launch with the actual Hard initial formation.
- A real 190-gold Regeneration purchase through ordinary controls while paused.
- Same-tab reload/resume preserving the paid option and Hard difficulty.
- Restart returning to the original 3800-HP, seven-building Hard setup without retaining the purchased option.
- Zero writes to browser `localStorage`, zero service workers, and no uncaught browser errors.

Screenshots were inspected, including the phone briefing. These are bounded UI smoke checks, not full combat playthroughs, human playtests, accessibility certification, actual device performance, production-save compatibility or PWA tests. Generic dialogs still describe the isolated encounter as a skirmish. There is no supported campaign save identity, progression, earned finale unlock, ending or final-to-Skirmish navigation in this lab.

## Validation and reproduction

Passed: 15 doomsday mechanics/guard tests; the existing root suite (2008 passed, one pre-existing skip, zero failures); `npm run check`; `npm run check:release`; and the three browser viewport flows. Runtime bytes and historical prototype files match the main baseline. Chapter 10 was not merged or deployed.

```sh
node --test qa/doomsday/mechanics.test.mjs
node qa/doomsday/simulate.mjs --out=/tmp/calibration.jsonl --summary=/tmp/calibration.json
node qa/doomsday/simulate.mjs --variants=doomsday-hard --paces=burst,delayed --out=/tmp/cadence.jsonl
node qa/doomsday/simulate.mjs --variants=doomsday-hard --seeds=404,505,606,707,808,909 --out=/tmp/heldout.jsonl
node qa/doomsday/prepare-preview.mjs /tmp/ironroot-doomsday-preview
python3 -m http.server 4193 --bind 127.0.0.1 --directory /tmp/ironroot-doomsday-preview/dist
# In another terminal, with qa/browser's Playwright dependency available:
node qa/doomsday/browser.mjs /tmp/ironroot-doomsday-browser
# Or set IRONROOT_PLAYWRIGHT_MODULE to the file URL of a separate Playwright installation.
node qa/doomsday/compile-evidence.mjs /tmp/calibration.jsonl /tmp/cadence.jsonl /tmp/heldout.jsonl /tmp/ironroot-doomsday-browser/results.json /tmp/evidence.json
```

The preview supports `?seed=808` for the contrasting openings or `?seed=101` for the demanding calibration case. Its temporary saves belong to that browser tab and variant; the URL selects a fresh launch, not the seed of an existing Resume. Keep it on its own local origin. The generator rejects the repository itself, source descendants and symlink aliases as output before copying.

Next useful gate: contrasting actual-player attempts on fixed seeds, concentrating on whether opening losses explain the next purchase, whether center siege can be made credible without instant batching, and whether damage recovery is understandable. The evidence does not justify reducing successful strategies or manufacturing close finishes. Final campaign admission, deadlines, save identity, story payoff and ending navigation remain separate work. No access or approval blocker remains on this prototype; balance and player validation are the blockers to promoting it into the finale.
