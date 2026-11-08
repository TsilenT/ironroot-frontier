# False Quiet: paid fog prototype

## Recommendation

Use the single original **Middle Road Fort** at x=2230, middle road, level 2, with two disclosed-but-unrevealed starting production variants. This supports a short Chapter 7 opening with genuinely different observed counter-purchases and a legal blind infantry breakthrough. It is not a forced reconnaissance puzzle or a uniformly harder successor to River. Do not weaken the successful direct route merely to manufacture tension.

Two materially different experienced routes work at a bounded one-action-per-five-seconds pace: direct infantry (12/12) and observing then adapting (9/12). Screened siege is strong against ground (6/6), fragile against air (1/6). The slower broad low-cost route wins 6/12, including at 708 HP; it is plausible, not a novice guarantee. Real-player comprehension and placement testing remain necessary.

## Exact authoring

`qa/false-quiet/scenario.mjs` exports `describeFalseQuiet`, `createFalseQuiet`, and `evaluateFalseQuiet`. Both variants use Classic, normal adaptive AI, 1000/120 opening gold, 6000/6000 citadel HP, 7.5/7.5 initial income, and a 600-second deadline. The existing five-minute escalation is disclosed. All post-start actions use ordinary paid build, upgrade, spell and sale APIs. Initial assets are authored with ordinary build/upgrade calls before opening treasuries replace the temporary authoring bank. No grants, clamps, hidden reserves, free actions or engine edits.

Player ordered structures (type, x, lane): barracks1110/1, archery970/1, watchtower830/0, watchtower830/2, mint410/1. Player initial investment: 945.

Enemy ordered structures:

1. Both: watchtower2230/1, level2, the original Middle Road Fort.
2. Ground: barracks1950/1. Air: aerie1950/1.
3. Ground: barracks2230/0. Air: aerie2230/0.
4. Ground: foundry2230/2. Air: barracks2230/2.
5. Both: archery2370/1.
6. Both: barracks2510/2.
7. Both: mint2790/1.

Enemy initial investment is 1429 ground / 1519 air. Both variants have identical structure count, creation order, coordinates and original-target ID. Only producer types differ. Destroy the one original fort OR the enemy citadel, with own-citadel loss taking precedence. Replacements do not restore a destroyed original. No second mandatory post or optional side-target shortcut is added: this avoids duplicating Lanterns and preserves the clean one-fort decision. The existing citadel alternative remains legal.

## Corrected evidence

Final summary: `qa/false-quiet/summary.json`, 132 counted runs. Regression seeds: 7301, 719, 51017. Held-out seeds: 7309, 7313, 90001. Held-out seeds vary normal AI/combat choices, not authored geometry. Policies only read `observe(game,0)` plus immutable map/rule constants; evaluator truth is never supplied back to them.

The three `-5s` policies and `broad-novice` issue at most one successful paid action per five seconds, including spells. Fast policies can make multiple purchases at one-second decision points; they demonstrate feasibility, not human execution rates.

| Policy | Wins / 12 | Ground / air wins | Duration, all outcomes | Player spending | Player unit casualties | HP on wins |
| --- | --- | --- | --- | --- | --- | --- |
| Direct infantry, 5s | 12 | 6 / 6 | 51.65–87.8s | 1400–1575 | 14–50 | 5202–6000 |
| Scout/adapt, 5s | 9 | 5 / 4 | 70.25–164.55s | 1380–2285 | 23–108 | 183–5874 |
| Screened siege, 5s | 7 | 6 / 1 | 67.25–170s | 1485–2355 | 27–104 | 618–6000 |
| Broad novice, 5s | 6 | 4 / 2 | 125.35–209.7s | 2415–3200 | 80–135 | 708–6000 |
| Fast scout/adapt | 12 | 6 / 6 | 57.15–96.4s | 1390–1660 | 26–62 | 480–6000 |
| Fast screened siege | 12 | 6 / 6 | 59.75–88.7s | 1450–1700 | 31–49 | 5013–6000 |
| Fast broad budget | 12 | 6 / 6 | 73.85–154.65s | 1780–3015 | 40–134 | 6000 |
| Fast direct infantry | 12 | 6 / 6 | 39.55–69.35s | 1225–1475 | 14–40 | 5517–6000 |
| Air-heavy | 2 | 0 / 2 | 110.45–244.4s | 2205–4066 | 32–170 | 6000 |
| Corrected safe economy | 0 | 0 / 0 | 110.7–132.95s | 2175–2435 | 28–37 | none |
| Idle | 0 | 0 / 0 | 92.35–98.7s | 0 | 12–17 | none |

All wins cleared the original fort; no sampled citadel win, deadline loss or stall occurred. Core-route availability is implemented, not demonstrated by these policies. First visible enemy: 2.3–4.55 seconds; first actual damage/contact: 4.2–6.8 seconds. Full runs retain actual paid transactions, income/kill-gold/refund ledgers, both-side unit casualties, first building loss, original target loss, HP, core damage and traces. Rounded ledger residuals are zero; the runner rejects residuals above 1e-6.

The initial economy control incorrectly attempted fourth/fifth mines and kept returning at the mine cap. Those failed-policy rows in `regression.jsonl` and `held-out.jsonl` are **superseded and excluded**. Corrected control removes those impossible purchases and continues into towers and troops; it still loses all 12, now with genuine spending and casualties. `superseded/` retains the earlier formation/policies and old broad-novice results (which previously allowed a spell plus build in one decision). Only `novice-final.jsonl` supplies the final paced broad results.

## Information and difficulty interpretation

Scout/adapt buys middle warriors and ranged side probes, reads visible enemy contacts, and responds to air with additional archery before screened siege. It can revise a ground inference after later visible air. Fast trials choose anti-air at 4.1s for the aerial garrison and screened-ground at 20.25s otherwise. This is observation-sensitive purchasing, unlike Lanterns' tied north-first scripted selection.

However, starting production reveals first enemies without an extra scout-specific purchase. These trials do **not** establish that paying for information is necessary or even optimal. Blind infantry is consistently quicker and more robust than the scripted cautious route. The honest lesson is that uncertain composition can inform investment, while committing in force is a viable alternative. If expensive reconnaissance itself is essential to the chapter's promise, the formation needs further work before that claim is made.

Relative to published Lanterns, this is not uniformly harder: the single-fort direct route is shorter than its 72.65–79.35s fast broad clears, while paced adapted play can take serious damage. Relative to River's 117.25/130.05s authored-seed dual-objective routes, this is a shorter focused encounter rather than another execution capstone. Cross-mission policy speeds differ, so these are pacing comparisons, not controlled difficulty rankings.

## Production parity and reproduction

`createFalseQuiet({production:true})` uses `createCampaignMission('false-quiet',{variant:'a'|'b'})`, resets only the ordinary random seed before simulation, and evaluates the real campaign objective. `parity.mjs` compares production and QA for both variants with scout/adapt, siege, direct and broad paced policies on seed7301. It asserts identical outcome, route, time, HP, gold, spending, casualties, contact/sight timing, every paid transaction, policy decisions and ledger results. `parity.json` contains the eight bounded comparisons, including defeats. This is identity parity, not a second independent balance sample.

Run:

- `node qa/false-quiet/verify.mjs`
- `node qa/false-quiet/parity.mjs`
- `node qa/false-quiet/simulate.mjs --variants=ground-heavy,air-flank --policies=scout-adapt-5s,screened-siege-5s,direct-rush-5s,broad-novice,safe-economy,idle --seeds=7301,719,51017,7309,7313,90001`

The lean source release retains summaries, not raw transaction logs. Verification uses local retained logs when available; otherwise it recomputes the complete current 132-run production matrix in memory. Pass --recompute to force that route without writing artifacts.

Fixture verification checks fixed IDs, hidden original fort at start, authored treasuries/income, adaptive AI, original destruction and own-loss precedence, policy source restrictions and paid ledgers. Runtime syntax checks pass. This isolated work does not claim aggregate tests, UI, saves/restarts, progression, physical devices, performance, real-player enjoyment, or publication. The parent owns production integration and its separate verification gates.
