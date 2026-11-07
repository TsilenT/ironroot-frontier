# Production flight tactical evaluation

This harness exercises `dist/engine.js` and the new immutable `frontier-flight-open@1` identity. It is not a shipping game mode or a copy of the legacy lab engine.

## Reproduce

```
node qa/flight-production-engine/evaluation.mjs --output qa/flight-production-engine/report.json
node qa/flight-production-engine/summarize.mjs
node --test tests/flight-production-engine-evaluator.test.mjs
```

Use `--cohort baseline`, `--cohort long` or `--cohort extension` to run one portion. `--seeds 1` is a smoke run, not the complete matrix. The default includes:

- **720 prototype-port branches:** exact original four spread seeds, three authored situations, five defender response policies, both sides and every original plan. `command-two-roads` maps to production Twin Span; `command-three-roads` maps to production Classic. The fixed 110-second setups, goals, paid defender policy and alternating-plan cadence are unchanged. Only the production identity, current bound rules and exact shared gate geometry replace lab-specific dependencies.
- **480 Long March branches:** the same three-road matrix under width 4000 and gate home-distance 1800, at 110 seconds.
- **384 extension branches:** all three maps, all three situations, both sides, first two spread seeds, Hold versus each one-road raid, and four separately labeled variants at 180 seconds: an authored Rootwarden forward-screen replacement; ordinary paid attacker reinforcements; or that Rootwarden screen and paid attacker reinforcement policy against native Normal/Hard AI.

Every branch retains ordinary costs, gold, production, cooldowns, legal marked sites and unit caps. Baseline starting forces are unequal authored grants, followed by exactly 420 gold per side. Rootwarden variants explicitly change the player's starting investment from 955 to 1025 gold; they are not equal-budget replacements. The paid attacker tries a Warden lodge at 10 seconds, archery at 35, foundry at 60, a forward-screen upgrade at 90 and an aerie upgrade at 120. Purchases happen only if ordinary production APIs allow them; failed attempts are recorded, with no refunds, treasury top-ups or retries hidden from the evidence.

Native-AI extensions execute the production `Game._ai` and its ordinary persisted `aiTimer`, action budget and RNG. In the mirrored defender-side-0 case, the test harness binds `_ai`'s default side and applies that same binding to restored comparisons. This is a deterministic test-context adapter, not a new saved-game feature or alternate AI policy. Native AI does not read the unlaunched player plan.

## Timing, accounting and limits

The report includes first four observed wave traces, route phases, warning/transit/landing timing, first response timing, paid action logs, native decision timing, gross spend and net treasury changes, target/protected-structure HP, both-side results and every adverse Hold counterfactual. Gross purchase/Volley costs are captured at successful production API calls, so kill bounties do not reduce reported spending.

At first observed route phases and 60 seconds the evaluator checks exact serialize/restore/next-step continuation, rebinding only the same mirrored evaluator context. The initial and final state are also restore-validated, and each second checks gold, legal positions, per-side limits and effect/projectile caps. The observer can miss a unit born and killed in one step; phase-specific HP/death observations do not establish full attack causality. A native AI action can precede any flyer or warning, so negative response delays do not prove clairvoyance.

The 110/180-second horizons can stop unfinished fights. These unequal authored deployments and simple reinforcement scripts are tactical comparisons, not representative win rates, human balance estimates, campaign difficulty certification or physical-device playtests. Do not tune away losses or quote aggregate win rates as balance evidence.

## Provenance

Source idea and scenario/evaluator port: draft PR2 at exact head `4581245af7e23e7c3b5eb905d4a29c663006e0ea`. Verified upstream blob references are retained in `upstream-provenance.json`. The complete generated report records hashes of the actual production engine, immutable rules, shared flight helper and both harness modules. The summary/validation include the full report's SHA-256. Historical laboratory outputs are not presented as production results.

## Compact evidence for source review

`outcome-ledger.json` retains every one of the 445 adverse comparisons in about 288 KB: parameters, absolute Hold/raid HP, gross spending and first warning/landing/counter timing. `representative-adverse-cases.md` shows selected cases with their exact controls and full report SHA. The local 15 MB `report.json` is ignored for source uploads; use the reproduction command to regenerate it. None of the tests reads that large report. The recorded full-file SHA identifies this retained run; elapsed runtime changes the hash on reproduction even when deterministic case content is identical.
