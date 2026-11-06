# Integrated legacy compatibility QA

Date: 2026-11-06. Scope: one private local checkout, dependency-free Node tests. No installation, browser session, network publication, or user profile was used.

## Oracle policy

The historical production fixture is `qa/fixtures/production-v012`. Its 33 runtime files remain exactly 668,075 bytes. Its manifest retains SHA-256 `1bfa09e053e363e0589a8a96180be04cc4821b0b644b5b5923de66b83b6f6ff7`. The validator passed the manifest, every byte hash, package, evidence inventory and both reconstructed Git trees. No historical manifest, fixture, baseline JSON or golden simulation snapshot was changed.

The new ruleset-based engine is intentionally not source-identical to v0.12. Obsolete claims that *current* engine/profile/campaign/report bytes are frozen have been replaced with accurately named historical-source checks and independent executable comparisons. `engine-validation-source.mjs` still reconstructs the original vulnerable engine by removing exactly one primitive-string enum guard from the pinned historical engine, and rejects missing/duplicate/unrelated edits. The original pre-guard SHA-256 is unchanged. The vulnerable entity-array/mine-quota and historical-backup reproductions still run, alongside strict current-engine rejection tests.

Current production imports use file URLs so `./rulesets.js` resolves normally. Deliberate historical synthetic modules still use data URLs with explicit dependency substitution. The original Classic v0.8 engine/campaign oracles remain pinned. The accepted clarity renderer is separately pinned; renderer command equivalence is tested by the presentation owner rather than pretending the current roster-aware renderer has unchanged bytes.

## New independent proof

`tests/legacy-runtime-parity.test.mjs` passed all seven tests:

- Exact legacy maps, buildings, units, spell, world and lane constants against real production; independently compared map helpers across both sides and boundary/off-grid coordinates.
- Three maps × three difficulties × three seeds (0, 57 and 4294967295): 27 complete matches with real paid builds/upgrades/sells/casts, deterministic AI/RNG state, varying frame deltas, partial-accumulator cross-restores and byte-identical final v1/v2 serialization. Every sampled match actually terminates.
- All maps and difficulties at 299.9/299.95/300 and 419.9/419.95/420/420.05 seconds, including overtime, forced decay, restoration and simultaneous draw trajectories.
- All 16 historical missions have exact formations, map identities, objectives, medals, deadlines and prerequisites. Only the 38 individually approved chapter/mission text fields are normalized; each changed literal must equal the separate approved-copy fixture.
- Every historical mission runs idle, paid reference and paid mastery policies to an actual objective outcome, with regular restores and exact comparisons of state, target IDs, target buildings, objective metrics, income and outcome. These are 48 complete paired campaign trajectories, not fabricated snapshot agreement.
- Legacy normalization, unlocks, result recording, merging and overview remain exact; 16 missions and 48 stars are unchanged. Intro IDs and their optional stars are separate.

Existing saved-enum parity adds 18 complete matches on the three maps/difficulties with two other seeds. Existing Classic v0.8 parity and training/trial behavior comparisons remain active.

`tests/legacy-profile-parity.test.mjs` adds genuine production modules as old clients, not a current implementation configured with an older version:

- Exact legacy backup JSON, parse results, restored domain bytes and game serialization pass for all three maps and all 16 old missions.
- A historical importer rejects new-format backups before touching destination storage.
- Ordinary historical protocol2 reads/writes are blocked after the new protocol3 marker, with domain bytes preserved during upgrade.
- Explicit historical recovery has a material limitation, below.

## Actual defect and historical recovery limitation

The first post-migration run found a real malformed-envelope classification regression: an invalid format returned `unsupported-version` rather than the historical `invalid-backup`. The engine/codec owner split invalid-format/legacy-identity validation from unsupported-version handling, kept the original rejection assertions, and reported all 96 affected tests passing. No malformed-data rejection expectation was weakened.

A separate genuine-v0.12 negative control found that cached historical code accepts `beginImport({recover:true})` against a future protocol3 marker. It writes a protocol2 restoring marker, then accepts a valid old backup that can replace newer campaign progress and delete the new battle. The modern client correctly blocks itself after this marker change, but cannot retroactively change cached code. Current tests using today's session module as a simulated old client did not reveal this.

Evidence: `qa/integrated-legacy/historical-recovery-downgrade.json`, generated entirely in memory. This requires an explicit old-page recovery/import, not ordinary autosave. The exact upgrade browser/release plan must account for old open pages and manual recovery; universal protection from historical-client imports must not be claimed. The accepted classification is a historical destructive-recovery limitation, not an automatic stale-write failure. The historical UI explicitly warns that all domains will be replaced, tells the player to close other Ironroot tabs, requires the recovery checkbox, and then requires “Replace local saves.” The regression now reproduces that exact historical behavior, verifies ordinary old writes/unconfirmed imports are blocked, and verifies the modern tab stops all writes after the marker changes. Current-client future-version refusal assertions remain unchanged. The release caveat remains prominent: do not claim a new client can retroactively prevent an old page’s explicitly requested destructive restoration.

## Execution record

- Before harness migration: 733 tests, 675 pass, 57 fail, one existing optional skip. Failures were preserved in `qa/integrated-legacy/before-harness-migration.tap`.
- After migration, before final adapter fixes: 802 tests, 793 pass, eight fail, one skip. Six were stale Resume VM contexts, one was an approved training-prose matcher and one was the actual invalid-envelope classification above. Exact output: `qa/integrated-legacy/after-harness-migration.tap`.
- Historical fixture validator: pass (`historical-fixture.txt`). Original deployment/private checkout re-comparisons were not requested; their immutable saved evidence hashes were verified.
- Runtime syntax and complete asset/precache preflight: pass. There are 41 source runtime files. This is not publication approval.
- CPU benchmark: 50 finished matches, 116 restore checkpoints, 120 simulated seconds of saturated work with 140 troops/48 buildings and bounded effects. This is not browser frame-rate or mobile performance evidence.
- AI harness smoke: one seed, 60 historical/current AI comparison games in 15 paired comparison groups, with identical aggregate row results. Guard diagnostic completed with the genuine old engine. These are deterministic smoke probes, not difficulty certification.
- Training browser copy contracts were updated to separately authored approved literal feedback, with full success clauses and negative partial-attribution tests preserved. The browser script was not executed.

Final aggregate: **807 tests, 806 passed, 0 failed, 1 existing optional skip**, completed after the documented upgrade-limitation classification and final adapter fixes. Output: `qa/integrated-legacy/final-aggregate.tap`. The complete 41-file runtime hash inventory remained unchanged through this final run (`runtime-preflight-final.json`). Runtime, test and browser-harness module syntax checks all passed; the browser harness itself was not executed. Historical fixture validation passed again after the final run. No browser, touch-device, service-worker takeover, real-storage update or deployment gate has been claimed as passed.
