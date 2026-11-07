# Flight campaign integration QA

Local-only v0.16 candidate. Evaluated 2026-11-07T01:13:08.059Z with v24.22.1. No runtime source, combat tuning, paid policy, historical catalog, deployment or external service was changed by this review.

## Result

**Default Hold preserves the revision-2 campaign behavior in every tested full-game case.** All 78 mission/policy/seed pairs have identical complete objective/medal outcomes, exact simulation time, paid-command traces, sampled normalized combat traces, and normalized final serialized states. The comparison uses the actual thirteen current revision-3 missions, not the still-legacy default `createCampaignMission(id)` factory.

- 13 missions × reference/mastery policies × authored/57/999 seeds × revisions 2/3 = 156 direct runs.
- 52 additional complete runs repeatedly restore both revision 2 and revision 3 at seed 999. Each matches its corresponding uninterrupted run exactly, including the unnormalized final state and original attempt identity.
- A fresh, genuinely earned profile clears all 19 current missions with paid actions, recording **52/57 stars**. Opening rulesets remain Watch → Fork → Open. All thirteen later starts resolve to `frontier-campaign-flight`, scenario revision 3. Current profile protocol remains 5.
- Reference routes win **39/39** current cases, with **24/39** three-star outcomes. Mastery routes win **39/39**, all with three stars. Lower-star reference results were retained rather than “fixed.”
- 18 optional paid flight-order examples preserve **six mission failures** and **ten adverse comparisons**. Routing is an optional tactical tradeoff, not an automatic improvement.
- **245 total simulations, 1,095 exact live save roundtrips, 729 matrix assertions passed.** The bounded matrix took 44.38 seconds on this environment; this is not a game performance benchmark.
- **23/23 focused identity, historical-engine parity and profile-fencing tests passed**, with no skips. The 1,584-branch tactical evaluator was not rerun.

## What “equal on Hold” means

Only two known differences are normalized: `frontier-campaign-flight` becomes `frontier-campaign-open`, and each aerie's `flightPlan` is removed **after asserting it equals that building's source lane**. Any `airRoute` in a Hold run fails admission to this comparison. No HP, positioning, RNG, timers, gold, action costs, effects, unit counters or other fields are discarded.

The trace hashes cover the state before every one-second policy decision and the final state. They are not every-tick comparisons. Exact simulation time is compared without rounding; the display times below are rounded. Final-state equality also includes all serialized simulation clocks. Outcomes include all objective and medal details, not just victory booleans.

Every new build and upgrade pays the actual ruleset cost. Volleys pay their gross spell cost, with immediate kill bounties reconciled separately. Flight orders are free and consume no RNG. There are no free troops/buildings, HP/gold overrides, changed authored formations or injected victories. Seed is the only initial battle override in the matrix. Both policies are used unchanged from `tests/campaign-policies.mjs`.

Restored runs keep the scripted controller's policy state and replace only the game through `Game.restore` plus JSON `encodeBattle`/`decodeBattle`. This models deterministic gameplay continuation, not persistence of a human's decisions or a new automated player's memory. Live roundtrips occur after the first tick and every ten seconds while the mission remains active. Terminal states are compared raw because playable save admission correctly rejects ended battles.

## Authored-seed current outcomes

Both columns win every mission. Every row also matches its revision-2 counterpart exactly on Hold. Additional seeds 57 and 999 are retained individually in the JSON.

| Mission | Authored seed | Reference stars / time | Mastery stars / time |
| --- | ---: | ---: | ---: |
| wings-of-ash | 2101 | 3 / 71.75s | 3 / 71.75s |
| stonegate | 2203 | 2 / 73.15s | 3 / 80.45s |
| long-vigil | 2309 | 2 / 150.00s | 3 / 150.00s |
| cold-forge | 3101 | 3 / 98.50s | 3 / 98.50s |
| black-ledger | 3203 | 2 / 120.20s | 3 / 175.40s |
| furnace-heart | 3307 | 3 / 163.25s | 3 / 163.25s |
| crown-foothold | 4101 | 3 / 180.00s | 3 / 180.00s |
| last-light | 4201 | 2 / 180.00s | 3 / 180.00s |
| ironroot | 4303 | 3 / 119.40s | 3 / 119.40s |
| open-horizon | 5101 | 3 / 87.10s | 3 / 87.10s |
| river-charter | 5203 | 2 / 114.85s | 3 / 116.95s |
| far-beacon | 5309 | 3 / 111.15s | 3 / 111.15s |
| common-ground | 5407 | 3 / 105.95s | 3 / 105.95s |

The reference path retains its intended two-star outcomes in Stonegate, Long Vigil, Black Ledger, Last Light and River Charter. Mastery buys the extra upgrades/income rather than changing objectives or medal thresholds.

## Paid progression and Rootwardens

The runner starts from `createCampaignProgress()`, launches through the real `createProgressionCampaignMission` path, and records only actual wins. It never hand-writes completion flags to unlock later missions. The second and third opening battles each purchase a Warden lodge; their observed maximum live Rootwardens are six and seven. Earning flight does not introduce a fourth roster stage or rewrite opening replays.

A supplemental Last Light policy replaces each requested paid barracks with a paid Warden lodge. Its Hold control wins at 180 seconds with two stars at both sampled seeds, buys three Warden lodges, and reaches 13/10 live Rootwardens. Its rerouted cases also buy three lodges and field 7/6 Rootwardens, but fail protection. This establishes that paid tanks and orders can coexist under actual campaign rules. It does not show that the substitution is optimal or necessary.

## Optional flight-order examples, including negative results

These are synthetic scripted decisions in unmodified authored campaign battles, not human playtests or a flight win-rate estimate. Every example is played at its authored seed and seed 999 with live save roundtrips. The controls keep Hold. The alternatives order existing and newly purchased owned aeries after each normal policy decision. “Lower” means the lower adjacent lane index, except lane zero must cross to lane one; “higher” mirrors that rule. Duplicate directions were omitted where the actual policy's aeries have only one distinct adjacent destination.

- **Cold Forge:** redirecting both outer-road aeries into the center completes six crossings but loses the citadel at 96.55 / 94.85 seconds. Hold wins with three stars at 98.50 / 100.65 seconds and retains 4,800 HP. The same paid spend does not compensate for abandoning the source roads.
- **River Charter:** redirecting the northern aeries completes four crossings before a bridge watchpost falls at 58.80 seconds in both seeds. Hold wins with two stars at 114.85 / 115.15 seconds. This is an actual protection failure, despite unchanged citadel HP.
- **Far Beacon:** routing the center aeries to either neighbor still wins and completes six crossings per run. The four routed runs finish at 105.40–106.90 seconds, 4.25–6.10 seconds faster than their own Hold controls, but earn **two stars instead of three**. The income medal is missed. A targeted authored-seed check shows the exposed center mine is lost, leaving 11.25 rather than the required 15 gold/sec; the faster finish does not erase that economic cost.
- **Last Light with paid Rootwardens:** redirecting the northern aerie completes one crossing but loses a protected signal tower at 127.90 / 129.15 seconds. Hold retains both towers until the 180-second win.

All six failures and all ten adverse comparisons remain in the compact JSON. No policy or runtime was tuned to remove them. These selected campaign crossings took **no observed damage during warning/transit**, so this supplement does not establish anti-air interception strength. The independent production tactical evaluator covers paid counters, range, exposed crossings, source-road sacrifice and adverse branches; see [Flight-order kernel](FLIGHT_ORDER_KERNEL.md) and `qa/flight-production-engine/`. Enemy producers remain on Hold; autonomous enemy flight planning is not claimed.

## Historical identity and saves

The focused tests rerun the pinned frozen predecessor engine and rules. They cover all six old identities across maps/difficulties, paid actions, AI/RNG, cross-restoration, ignored historical raw route fields, and escalation/decay boundaries. Campaign identity tests check all thirteen current launches through save/history/backup/restart, old revision-1/2 restarts, protected authored IDs, deadlines and mismatched identity rejection. Profile tests exercise actual frozen protocol-4 clients refusing a protocol-5 profile, plus backup rollback/finalization failures.

Published catalogs retain their exact pinned SHA-256 values:

- Revision 1: `3b08ea9aa1e101b3a187e2fd9c184a6cfd871f2f2fc4f4c384e5f7693baba69e`
- Revision 2: `42f459c491b5653c42efe8eeb946d75bb11e6a04c7d74e161ea1a5cf755248d4`

Hold parity is evidence for the measured policies. It does not promise equal tactical difficulty after players issue flight orders, and it does not reinterpret old stars or best times as new-revision records.

## Exact tested sources

The report contains SHA-256 hashes for every runtime JS/HTML/CSS file, all imported simulation dependencies, and both policy modules. `validation.json` pins the result, logs, focused tests and frozen fixtures. Core hashes:

| File | SHA-256 |
| --- | --- |
| `dist/engine.js` | `548f1b67763e710aad5d1e1a7e70a1e39c4d93eddd3b47daf68a2b385b823168` |
| `dist/rulesets.js` | `9fa81aace334850fbe92f354e04fb3560dfb69419a9539bbb6d89534a9f6727d` |
| `dist/flight-orders.js` | `b69738dcd49ff416191a1c0d0f9f3170f1191b27c16235075ea6b7237815d196` |
| `dist/campaign.js` | `56f4a2d7bf50a316a60274dde63ffb1501ab89c36937612fbb25e2f3c13456eb` |
| `dist/battle-codec.js` | `2e675fe9b062cd1729c534919b3d8d454d904734a4cb3097989b0361c193a2ac` |
| `dist/profile-session.js` | `f5e50130fe10d33d0f3c8d911e465413dcb969243d12b62e27d62eb954180f19` |
| `tests/flight-campaign-balance.mjs` | `14b4795c9f6a5b6c2bb186c9f8c122a7edca2f6a83de09042b761028843db363` |

The final matrix observed no source changes. A preliminary run's wider whole-runtime freshness check caught concurrent presentation-only edits in `flight-orders-view.js` and `flight-visuals.js`; engine/campaign/rules remained unchanged. That audit is retained in `preliminary-run.json`. The final runner now rejects changes to any imported simulation source or policy while recording unrelated presentation deltas separately. Its revised matrix was rerun successfully after the countdown presentation fix and after removing duplicate route variants.

## Reproduce

From the repository root:

```sh
node --check tests/flight-campaign-balance.mjs
node tests/flight-campaign-balance.mjs
node --test --test-concurrency=2 tests/flight-campaign-identity.test.mjs tests/flight-profile-protocol.test.mjs tests/flight-order-legacy-parity.test.mjs
```

The optional runner writes `qa/flight-campaign-balance/results.json` and returns a nonzero status for invariant failures. Deliberate example losses are data, not failed assertions. The file is named `.mjs`, not `.test.mjs`, so `npm test` does not automatically run this matrix. `run.log`, `identity-tests.log` and `validation.json` record this reviewed execution; refresh their hashes when deliberately replacing the recorded evidence.

## Limits

This is a bounded deterministic campaign review: three seeds for each unchanged reference/mastery route, two seeds for a few optional flight decisions, a one-second decision cadence, and no limit on successful paid actions in a decision. Faster-than-human policy execution can spend several actions at once. The mission deadline bounds every run. No search for optimal orders, exhaustive seed sweep, human difficulty study, native UI/browser/device check, wall-clock performance certification, deployment or release gate is implied. Strategic stalls and failed choices are allowed; the campaign's existing deadlines/protection conditions still apply. No forced-decay tuning was introduced to guarantee a win.
