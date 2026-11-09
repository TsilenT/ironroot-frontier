# Through the Reed Beds reconstructed v0.29.0

This is a single-mission reconstruction against verified private merged Road commit `6b6cf964097a815b214933c7e74bb3f23b72d5d5`, tree `50c098a436ddee2e36d629a2e7d36e6887ae6b25`. It does not claim recovery of lost source bytes or reuse prior Reed validation. No Chapter 8–10 mission is admitted, and Broken Lanterns stays cut.

The third and final current Chapter 7 mission is Classic, fully visible, normal adaptive paid AI. It starts with 1,100/100 gold, both citadels at 6,000 HP, one real mine and 7.5 gold/sec per side. Destroy any two of the three original named positions, or the enemy citadel, within 10:00. Your citadel must survive; 1 HP is enough. Any third position may stand. Replacement structures never undo destruction of an original. Ordinary escalation starts at 5:00. The combat engine, prices, ordinary factory spawning, income and AI are unchanged.

The new `destroy-any` objective is strictly validated, uses original IDs from authored placement order and the existing helper, and introduces no saved counters or reinforcement system. Its target controls, scouting and results distinguish original destruction from replacement buildings. Raw Road/False Quiet descriptors and raw Chapter 7 remain unchanged; current navigation and chapter epilogue are presentation overlays. The current catalog has 27 main missions and 81 optional stars, with no star gate.

## Initial coherent checkpoint

Fresh focused mission/UI checks: 13 passed. Fresh paid-preview fixture checks: 2 passed. The isolated profile lane reports 22 focused checks passed, with exact frozen profile19 source. The parent compatibility fixture was generated from the actual canonical Road baseline: 99 mission descriptors, 100 initial states, all existing rules and raw Chapter 7 match, and engine.js is byte-identical. These are separate from economics feasibility and native UI review.

The initial aggregate run exposed stale current-catalog and historical-subset test expectations. These will be updated without rewriting historical fixtures or their digest values. Fresh full-suite, syntax, source-runtime preflight, paid held-out seeds, independent review and native UI review remain open at this WIP checkpoint. This checkpoint is not a release or publication approval.

All source paths not materialized locally must be preserved. The verified current parent has 2,016 blobs; 809 were materialized from exact matching local bytes and 1,207 remain represented only by the canonical inventory. Sparse checkpoints have no deletions.

## Final code and test freeze

The final runtime/code/test/fixture freeze inventories 502 local paths in `qa/reed-beds/source-freeze.json`, fingerprint `456446cebee6c569822f741b57a4a02c06959a773b4009d597eab0488a381af7`. Later documentation and standalone evidence additions do not change these bytes. The 58-file runtime is 1,171,830 bytes, with sorted-file map SHA256 `071c399eaa1e83f56d4503048c4974e65cd5939c71284c468403d84d1d03cc1d`. The combat engine remains exact parent bytes, SHA256 `021907afe0ed02af2e0f78fab05bf854b5c7ea6e4d8e2587f2fe91f839992f0b`.

Fresh final aggregate: `npm test` discovered 2,065 tests, with **2,064 passed, zero failed, one existing optional skip**, in 102,482 ms. JavaScript syntax and strict source-runtime/offline-cache inventory preflight passed. The earlier aggregate failures were stale current-count/version expectations and historical subset filters. Current assertions now admit the added mission/rules identity; frozen historical digest values and fixtures were retained. A prior aggregate also passed before the final two QA-adapter current assertions were updated; that epoch is retained separately. The final two changes admit profile 20 and catalog 27/81 in flight/shared-crossing browser-fixture validators, with no runtime or frozen historical changes. The synthetic mobile fixture now represents the real third target rather than silently assuming two controls. This is a source-derived DOM/geometry test, not native mobile proof.

The new production-flow DOM tests cover all three pair results with the third surviving, core results with zero through three originals destroyed, own-core/draw/deadline precedence, one-star Road continuation to Reed, replay identity and updated current reward, and current Chapter 7 epilogue. Original raw Road and False Quiet rewards remain frozen.

## Fresh ordinary-paid feasibility

Nine frozen policies ran four development and two held-out seeds: **54 independent samples**, with no formation or policy tuning after the held-outs. All three pair policies, screened siege, supported Rootwarden and broad novice won 6/6. Core rush won 5/6, retaining the own-core loss. Air-core and idle lost 6/6. Every run passed independent ordinary-price, five-second cadence, detached-receipt and mine-event income audits; maximum full-precision ledger error was zero. Strong supported wins were not weakened by manufactured attrition.

The authored outer pair wins at 65.70 seconds with Middle Iron Works standing. Core rush wins at 138.65 seconds with only South Ember Hall destroyed and the player's core at 1,986 HP. These are scripted feasibility routes, not human difficulty certification. All measured runs ended before ordinary 5:00 escalation, so this matrix does not claim to exercise escalation. [The paid evidence](../qa/reed-beds/README.md) records exact policies, original freeze, raw receipt hashes and limits.

The original policy freeze omitted campaign.js. A separate final-evaluator binding preserved that original record, verified final campaign.js byte-identical to checkpoint001, freshly reran the same 54 samples and matched every full result and receipt. This is deterministic reproduction against final evaluator bytes, not 54 new held-outs.

## Isolated native fixtures and remaining review

The preview changes only app/index wrappers for namespaced sessionStorage, fixture navigation/disclosure and disabled service-worker installation. Fresh zero-time and 25-second paid openings, an active 64.30-second target checkpoint and an active 136.65-second core checkpoint are generated through ordinary production simulation. Both near checkpoints naturally finish without further purchases. They are paid-engine checkpoints with synthetic one-star prerequisites, not browser-earned-from-zero wins.

A separate `legacy-road` fixture was generated and encoded by the actual hash-verified v0.28 baseline, with explicit profile19, one 190-gold Extra Arrow purchase and 100 ordinary ticks. Its exact generator hashes and battle hash are recorded in `qa/reed-beds/legacy-road-profile.json`. It supports bounded synthetic old-profile Resume/Save/reload/current-navigation review; it is not proof of production save migration.

Completed independent source/static and bounded native results are recorded below. Physical phone/touch, listening/audio, PWA/offline update, long-session performance, non-Chromium matrix and production-profile migration are not certified. No remote push, merge or publication was performed by this reconstruction worker.

## Durable delivery ancestry

The early coherent WIP is durable as private draft PR #33 on `feat/chapter-seven-reed-rebuilt`, commit `f949c77f339f527c6db75522269ed780517787ac`, tree `4221e2d051c4bcc5ec0136370d02743dde651b83`. Its sole parent is merged Road `6b6cf964`. The full 2,034-path/mode/blob inventory was independently fetched and reconciled against actual Road plus the immutable checkpoint001 overlay, with no deletion. All 58 current runtime files match the WIP001 archive exactly. Final evidence delivery is an incremental update against that WIP tree on the same branch. Behavioral compatibility remains anchored separately to actual Road, not to a reconstruction of its state.

## Completed independent source and static preflight

[Independent source review](REED_BEDS_SOURCE_REVIEW.md) found no blocking source issues at the exact final freeze. Its own complete aggregate passed 2,064 tests, zero failed, one optional skip; 141 focused cases passed. It independently compared all 99 old descriptors, 100 prior mission trajectories and restore/restart paths, 49 historical fixture files and unchanged shared engine/mechanics. It audited all 54 paid raw runs and 839 successful receipts and reran six representative routes. The report states its exact scope and hashes.

Complete browser-fixture/static preflight passed in a separate mirror containing the actual final source plus 159 independently Git-blob-verified omitted canonical dependencies. The real `npm --prefix qa/browser run check`, all five additional browser check scripts, all 101 browser-root module syntax checks and final targeted fixture tests passed. Required historical dependencies are complete. The original mirror aggregate/snapshot gaps and their precise remedies are retained honestly in the portable [preflight report](../qa/reed-beds/browser-preflight.json), rather than calling the earlier failed run green. This is not Playwright execution, browser discovery, native input or an offline/update lifecycle pass.

Inherited catalog behavior is retained: when archived optional lesson records make that chapter visible, Next after the last main mission can browse First Watch. This is optional archived chapter-0 browsing, not automatic progression, a new unlock or Chapter 8 admission. The same behavior exists in canonical Road. The final reviewed runtime preserves it; no broader navigation/polish change is included.

## Completed bounded native desktop review

[The native report](REED_REBUILT_UI_REVIEW.md) passed the exercised original 58-file runtime at an 1180×757 desktop viewport: briefing/scout, a real paid Extra Arrow choice, ordinary time advance, Save/reload/Resume, Restart Cancel/Back/confirm, partial original-target HUD, natural two-target victory with Middle Iron Works standing, natural incomplete-target core victory, current Chapter 7 epilogue, Replay/Campaign/Skirmish navigation and synthetic exact-v0.28 Road checkpoint compatibility. Its unfinished-Road fixture also exercised the actual native Reed prerequisite lock. Eight raw native JPEGs remain outside source with hashes in the report. Owned QA tab and managed preview were cleaned up.

The report distinguishes synthetic prerequisites, paid-engine checkpoints and native actions. It does not certify the unavailable real production save, a from-zero human victory, native replacement/deadline/1-HP terminals, physical phone/PWA/offline, broad browser matrix or long-session behavior. A proposed navigation guard was withdrawn; exact verification restored all 502 reviewed code/test hashes and the original runtime/preview maps. Native completed-flow evidence stayed on the reviewed original bytes. The retained inherited optional-lesson behavior is disclosed above.

The final incremental delivery contains no runtime changes from durable WIP001. Source/evaluator/economics remain unchanged; the final packet adds current test/QA assertions and fresh evidence rather than claiming old measurements as new. Remote CI, merging, deployment and publication remain the release owner's separate work.
