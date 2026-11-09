# Through the Reed Beds reconstructed v0.29.0

This is a single-mission reconstruction against verified private merged Road commit `6b6cf964097a815b214933c7e74bb3f23b72d5d5`, tree `50c098a436ddee2e36d629a2e7d36e6887ae6b25`. It does not claim recovery of lost source bytes or reuse prior Reed validation. No Chapter 8–10 mission is admitted, and Broken Lanterns stays cut.

The third and final current Chapter 7 mission is Classic, fully visible, normal adaptive paid AI. It starts with 1,100/100 gold, both citadels at 6,000 HP, one real mine and 7.5 gold/sec per side. Destroy any two of the three original named positions, or the enemy citadel, within 10:00. Your citadel must survive; 1 HP is enough. Any third position may stand. Replacement structures never undo destruction of an original. Ordinary escalation starts at 5:00. The combat engine, prices, ordinary factory spawning, income and AI are unchanged.

The new `destroy-any` objective is strictly validated, uses original IDs from authored placement order and the existing helper, and introduces no saved counters or reinforcement system. Its target controls, scouting and results distinguish original destruction from replacement buildings. Raw Road/False Quiet descriptors and raw Chapter 7 remain unchanged; current navigation and chapter epilogue are presentation overlays. The current catalog has 27 main missions and 81 optional stars, with no star gate.

## Initial coherent checkpoint

Fresh focused mission/UI checks: 13 passed. Fresh paid-preview fixture checks: 2 passed. The isolated profile lane reports 22 focused checks passed, with exact frozen profile19 source. The parent compatibility fixture was generated from the actual canonical Road baseline: 99 mission descriptors, 100 initial states, all existing rules and raw Chapter 7 match, and engine.js is byte-identical. These are separate from economics feasibility and native UI review.

The initial aggregate run exposed stale current-catalog and historical-subset test expectations. These will be updated without rewriting historical fixtures or their digest values. Fresh full-suite, syntax, source-runtime preflight, paid held-out seeds, independent review and native UI review remain open at this WIP checkpoint. This checkpoint is not a release or publication approval.

All source paths not materialized locally must be preserved. The verified current parent has 2,016 blobs; 809 were materialized from exact matching local bytes and 1,207 remain represented only by the canonical inventory. Sparse checkpoints have no deletions.
