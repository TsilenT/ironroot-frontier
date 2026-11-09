# The Archer’s Quay: new numeric design

This v0.30.0/profile 21 candidate begins Chapter 8 The Siege Coast after Through the Reed Beds. Canonical behavioral parent is Reed commit 853cde8c74d77f68be92329db17d8a6dc6e00aae, tree c776e89acec9bc759a161ae8869aa6e59325d501, byte-equivalent to final Reed candidate 544514e. Durable Archer WIP001 is commit 6ea68ef8aa8bf4993fb81dec7835161d30b9c62a, tree 888447295393c18378afabf2d8fb0e8251257a64 (PR 36). Later packets are incremental to that WIP, while Reed remains the compatibility anchor. No PR 35 changes are included.

This is the historical central-archery / outer-foundry concept with new numeric design and fresh evidence, not recovered old specifications or tests.

## Rules and deployment

Exact identity: the-archers-quay@1 / frontier-campaign-archers-quay@1 / classic@1. Seed 8101, normal ordinary paid adaptive AI. Destroy the enemy citadel by 600 seconds; own citadel must survive and own-loss/draw takes precedence. No mandatory workshops, routes, minimum core HP or destruction counters. Optional medals: victory by 300 seconds; at least 4,500 own HP.

Both cores start 6,000 HP, treasuries 1,100/100 gold, one real level 1 mine each and 7.5 gold/sec. Final epoch 6 starts with barracks at 830 on each road, archery at 690 on each road, and mine at 410 on the middle road. Enemy starts foundries at 2230 on the outer roads, barracks at 2090 on all three roads, level 2 archery at 2230 on the middle road, level 1 archery at 2370 on the middle road, mine at 2790 on the middle road. Authored initial investment 1,135/1,622 gold is separate from treasury. All later actions use ordinary prices/income/bounties; no resources or HP are injected after setup.

Fully visible, earned full eight-building roster, ordinary automatic adjacent-road flyer contact selection and citadel choices. Normal 300-second escalation is disclosed; no forced drain, reserves, free waves, timer reset or new engine/combat behavior. Archery buildings have zero attack: they produce marching archers. Central archers may hit nearby adjacent-road flyers, subject to range, movement, spawn jitter and target selection. Destroying a range stops future production but does not remove live archers.

## Fresh evidence epochs

- Epoch 1 initial one-road policies: all nine lose authored seed 78.10–232.50 seconds. Retained, not hidden.
- Epoch 2 all-road opening correction: three ground policies win authored seed; novice and air still lose.
- Epochs 3/4 further ordinary policy development, unchanged scenario. Frozen epoch 4 four-seed development: five supported policies 4/4, novice 1/4, safeeconomy 0/4, unsupportedair/idle 0/4. No epoch 4 heldouts.
- Epoch 5 visible starting middle archery level 2 (+123 investment), novice remains 1/4 and supportedair 4/4. No heldouts; rejected.
- Epoch 6 reverts middle to level 1 and adds visible ordinary level 1 outer archery support (+350 investment versus original). Novice and air development each 4/4. Scenario, evaluator, policies, economy, simulator and auditor then freeze before two new heldout seeds. No tuning follows the heldouts.

The complete final matrix is nine policies × (four development + two heldout seeds) = 54 runs. Northground, southground, middlebreach, supportedRootwarden, mixed supportedair and broadnovice each 6/6. Safeeconomy 4/6, unsupportedair 0/6 and idle 0/6. No stalls/censored runs. The two heldout broadnovice wins leave 2,934.88/2,908 own HP. Safeeconomy has one heldout loss 342.10 seconds and one win 404.20 seconds, so a long safer-looking opening is not guaranteed. Idle loses 85.40–86.45 seconds. These are fixed-script feasibility results, not human difficulty. The independent applied-damage replay establishes two materially different ground approaches: a combined outer-road assault and a middle breach. The named north/south policies are not exclusive directional routes. Middlebreach deals 1,443–3,154 actual central-lane core damage across all six seeds, while the outer policies deal zero centrally; flank support remains part of both approaches.

All successful paid player actions, including spells and citadel choices, share at most one successful action per 5 seconds. Full-precision mine-event income, kill bounties, ordinary prices, spending/refunds and final gold reconcile in all 54 runs with maximum ledger error 0. Frozen raw receipts: development SHA256 da51c1f92b911a43defdd406b5a1cab9f4812aaaac5505d010bc8ef17c87933a; heldout SHA256 ae4b62c2a0d77ee330df0986bb1172024febf18b930647a84d8b44f5e013805f. Portable summaries and full source fingerprints are in qa/archers-quay.

## Air claim rejected

The mixed supportedair policy wins 6/6, but 500 gold buys two aerie buildings, which spawn 9–11 gryphons for only 85–161.8 applied unit damage and 0–1 unit kills per run. They deal zero building/core damage; the ground army destroys the core. Actual central-origin adjacent-road archer damage is recorded, with 30–40 resolved hits per run, not just synthetic geometry or attempted projectiles. These mixed-army wins do not establish a useful distinct air assault strategy. Air stays available at ordinary prices; this candidate makes no effective-air-route promise. Northern ground context comparisons are not controlled ablations.

## Compatibility, catalog and scope

Raw Reed/older descriptors, whole rules, authored initial states and engine bytes remain exact against canonical Reed. Only current Reed navigation reward unlocks Archer; old raw reward stays Completes Chapter 7. Current main catalog 28 missions / 84 optional stars, Chapter 7 three missions, Chapter 8 currently one. Current coast route wording is partial, not whole Chapter 8/campaign completion. The user’s later minimum of five missions in each of Chapters 8–10 is future work, with no later admission here.

Profile 21 changes only admission/version description from frozen actual profile 20. Marker upgrades retain exact earned-domain bytes. Fresh tests execute stale/reopened actual profile 20 and lower clients across all five earned domains, rollback/import ownership, marker failures and strict battle/history/backup identity. These synthetic tests do not certify a real production-save migration.

## Validation and remaining gates

Final aggregate: 2,107 tests, 2,106 passed, 0 failed, and 1 optional skip. Fresh Archer focused checks pass including boundary/identity/restart/restore/progression, actual formation anti-air damage, ordinary paid ledgers, paid checkpoint continuation and canonical-old-source fixture provenance. A follow-up fixture-hash regression check verifies raw-byte provenance. The final packet binds exact code, tests and evidence. Runtime 58 preflight passes; map SHA256 ab769819b9f8695cd460265a58035962a9ee039e3a3e194164dd5d125c72fb1b. Native review and exact remote CI remain separate. No physical-phone/PWA, full browser matrix, human difficulty or real-save certification is claimed.

The prepared preview is sessionStorage-only with per-fixture namespace, synthetic prerequisite labels and no service worker. Only preview app/index wrappers differ from source; other 56 runtime assets remain byte-identical. Fresh locked/unlocked, paid 25-second opening, natural near-core checkpoints and a canonical Reed profile 20 active save are provided. No production tab/profile is accessed.

## Independent source review

The final independent review of checkpoint 004 passes source compatibility, packet integrity and paid evidence within its stated scope. It independently verifies all 879 materialized files and modes, the 1,207 preserved unmaterialized paths, 100 prior descriptors, 34 prior rulesets and 101 prior initial states against canonical Reed. All 54 source-independent engine replays regenerate the successful paid receipts, trajectories and applied damage exactly; the fresh independent aggregate is 2,106 passing checks, zero failures and one optional skip. Review report SHA256: 1064cbefa947f309ffa080c8f6845d2bd9e053839db59e50836c7974f28eade6.

The final code/test manifest was sealed before the last full aggregate. All 879 covered hashes and modes still matched afterward. The single added raw-byte metadata regression explains the change from 2,105 to 2,106 passing checks; no tests were excluded. The later integration changes documentation only and does not retune runtime, policies, scenario, evaluator, economic evidence or tests. Native interaction scope, real-save migration, exact remote CI and release approval remain separate.

## Bounded native desktop review

The isolated desktop review passes only its exercised scope, with no blocking application issue. It checked locked/unlocked Archer selection, exact briefing/rules/Scout, a fresh browser-paid Extra Arrow choice and save/reload/Resume, repeated Restart/Cancel/Back, natural continuations of the two ordinary-paid near-core checkpoints, fresh Replay setup, current partial-coast result/continuation copy, and a browser-paid barracks placement. The canonical-source Reed profile-20 fixture also retained a newly paid Regeneration choice through save/reload/Resume under the current runtime.

The main checkpoint continued naturally to a three-star result with 4,554.48 own HP; the mixed-army checkpoint continued to a two-star result with 3,798.64 own HP. Earlier prerequisite records and prior checkpoint actions are synthetic or engine-earned setup, not browser-earned history. These short terminal continuations do not establish a from-zero human win or difficulty rating. Native review does not certify production-save migration, old-writer fencing, physical devices, PWA/offline/service-worker updates, defeat/timeout, all boundaries or the full browser matrix.

The full scope and eight screenshot hashes are recorded in [the bounded desktop UI review](ARCHERS_QUAY_UI_REVIEW.md), SHA256 12515ce041ea70471f8ce6be298582f8099079d677d03ae7df5ebd93af5c2d96. Source and preview raw-byte runtime maps remained unchanged. The owned QA tab was closed and managed preview stopped; the existing production tab was untouched, with no cleanup caveat. Exact final-head CI, release approval and the remaining expanded chapters are separate.
