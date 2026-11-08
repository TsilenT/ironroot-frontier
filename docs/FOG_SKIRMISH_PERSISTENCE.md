# Local fog Skirmish persistence boundary

This document records the local integration candidate in this working copy. It is not release, merge, deployment, browser-profile, or native-device approval. Production remains the separately maintained v0.20.2 release. No live storage was used.

## Runtime changes

- `dist/battle-codec.js` admits the distinct `frontier-fog-skirmish-open` revision 1 only with Classic revision 1 and `{kind:'skirmish', id:'standard', revision:1}`. This check is in `validateBattleIdentity`, so identity-only history and backup rows cannot bypass it by avoiding engine restore.
- The prior `frontier-fog-experimental-open` identity remains `qaOnly` and is rejected by ordinary encode/decode/history/backup paths. Direct engine restoration remains a laboratory capability, not a normal import path.
- `dist/profile-session.js` advances the existing marker from protocol 11 to 12, adds 12 to its accepted required-protocol versions, and explains the new fence. The default protocol argument remains 1. No transaction, ownership, rollback, storage-key or data-format logic changed.
- `dist/history-codec.js`, `dist/persistence.js` and `dist/backup.js` are unchanged. Their existing shared identity validation, identity-bearing deduplication, before-write validation, readback, stale-session and rollback behavior covers the candidate.
- Save envelope/engine version 3, backup version 2, modern history identity, and existing five profile domains are reused. No fog preference, save migration, knowledge synthesis, campaign/trial rewrite or profile reset was added. The setup checkbox is session-only and is owned by the main-app integration.

The new identity is admitted only in this local coherent candidate. Final app, renderer/audio, offline-runtime and native acceptance remain separate integration gates.

## Separate strictness correction

Testing found a pre-existing scenario validation gap: `identityOf` selected only `kind`, `id` and `revision` before validation, discarding unknown properties. `encodeBattle` also selected fields before calling this boundary. An extra scenario field therefore survived ordinary encoding/decoding by being silently removed.

`identityOf` now passes the original scenario object to the shared validator, and `encodeBattle` validates it before selecting fields or invoking serialization. Existing valid legacy v1/v2 engine formats and their envelopes remain unchanged. Unknown scenario fields and accessors reject without invoking the accessor, changing the caller object, or touching storage.

`qa/fog-integration-persistence/scenario-hardening-before-after.json` records the exact prior-source/current-source reproduction: all three old entry points accepted the extra field; all three candidate entry points reject it. This correction is independent of fog admission.

## Previous-writer pin and preservation

`tests/fixtures/profile-session-v0202.js` is a byte-for-byte copy of the pre-edit protocol-11 source, not a current implementation configured with a smaller version number. Its SHA-256 is:

`3a008d9e0fae2f1d15929ab888482b67cacb501b6a4141c5109104b30660a64e`

The copied source also matched the retained citadel-immediate working-copy source at this hash. The new tests execute the pinned old module against the actual in-memory candidate profile.

The marker-only upgrade is asserted to preserve the prior epoch and every exact campaign, trial, preference, history, battle and unrelated byte. After a candidate fog save and history row are written, both already-open and reopened protocol-11 clients are unable to read/write/remove any game domain, use the import facade, or recover/downgrade the marker. Current-protocol tabs are independently fenced after backup replacement, and stale battle slots remain fenced within the same profile epoch.

These are in-memory Node storage adapters, not actual user profiles. Existing optimistic localStorage protection is not claimed to be a cross-tab atomic transaction.

## Focused test coverage

`tests/fog-skirmish-profile.test.mjs` adds 17 executable cases covering:

1. Supported identity, unchanged v3/v2 formats, exact memories for both sides, frozen last-seen level after hidden upgrade, and deterministic continuation.
2. Identity-only unsupported maps, authored campaign/trial/lesson scenarios, revisions, unknown identities, QA identity and unknown fields.
3. Raw v3, future versions, forged envelopes/scenarios and rejected input preservation.
4. Missing/unknown/malformed knowledge; side/type/id/position/lane/level/time validation; recycled IDs; 65/257-entry memories; effect budgets; illegal projectiles; and zero reads/writes at failure boundaries.
5. Accessor rejection and absence of fog fields under ordinary rules.
6. Supplied scenario validation for fog and legacy encoders without evaluating accessors.
7. Exact preservation of the valid 64-record memory maximum.
8. Pinned old-writer fencing, marker-only upgrade and earned-byte preservation against actual candidate domains.
9. Failed/unverified/unfinished/future marker handling.
10. Normal fog save/export retaining all earned domains and an explicitly true bridge preference; a new fog preference field is rejected.
11. Backup restore retaining both memories and all earned domains while fencing stale history, preference, battle and import attempts.
12. Exact rollback for every one of five domains under throw-before, throw-after and silently dropped-write faults, with protocol-12 fencing retained.
13. Full-identity history deduplication, no duplicate writes and original malformed/QA history bytes retained.
14. Fresh restart identity with empty knowledge, original resources, zero time and unbought citadel choices.
15. Paid citadel save failure/retry without a second charge or loss of the previous checkpoint.
16. Stale same-protocol saves blocked against both fog and ordinary replacements.
17. All existing ordinary map/endgame/bridge save combinations plus legacy envelope round trips.

The fixture manipulations are synthetic contract tests, not paid gameplay or visual-readability evidence.

## Existing expectation updates

No old fixture or legacy protocol assertion was weakened. The current-version expectation changed from `11` to `12` in six existing files:

- `field-trial-profile.test.mjs`
- `keyboard-persistence.test.mjs`
- `profile-session.test.mjs`
- `citadel-profile.test.mjs`
- `citadel-immediate.test.mjs`
- `bridge-profile.test.mjs`

The first two ready-marker enumerations add 12 while retaining every prior case, so the existing “already current means no write” assertion remains exercised. In `citadel-immediate.test.mjs`, the expected current marker is expressed as `CURRENT_PROFILE_PROTOCOL_VERSION`, and its formerly future literal `12` becomes `CURRENT_PROFILE_PROTOCOL_VERSION + 1` (13 here). The current-protocol test titles are updated; old-client versions, source hashes and all data-preservation assertions remain unchanged. The main-app owner separately updates necessary execution-harness dependencies in the two shared UI-containing files.

Exact pre-edit copies of the owned runtime and expectation files are retained under `qa/fog-integration-persistence/before/` for review. The fixture directory is excluded from production runtime assembly.

## Verification and limits

- Final combined focused suite: **221/221 passed**, 15 files, Node test concurrency 4, including the two actual-app profile/citadel fixture files after app-owner dependency updates.
- Focused domain suite: **160/160 passed**, 13 files, Node test concurrency 4. Includes all 17 new cases plus prior fog-isolation, versioned engine/backup, legacy/campaign/map, profile, preferences, bridge and citadel tests.
- New fog-profile suite separately: **17/17 passed**. The actual-app profile/citadel subset also passed **61/61** separately.
- Syntax checks passed for both changed runtime modules and the new test file.
- Logs: `qa/fog-integration-persistence/persistence-focused-tests.log`, `persistence-domain-tests.log`, `persistence-ui-tests.log` and `fog-profile-tests.log`.

The full final aggregate and runtime release verification belong to the assembly owner. Passing actual-app fixture checks are still Node adapters, not native browser evidence. No remote write, PR, deployment, browser, actual stored-profile mutation, native mobile/controller validation or production admission was performed by this work.

## Final aggregate follow-up: test-only protocol expectation

The first assembly aggregate reported 1616 passing, one failing and one optional skipped test. Its sole failure was the current-candidate assertion at `qa/browser/validate-production-v015-upgrade.mjs:11`, which still expected protocol 11. That one expectation now requires 12. No downstream assertion, pinned historical fixture or runtime implementation changed.

The affected `tests/production-v015-upgrade.test.mjs` passed **2/2**, and direct execution of the helper passed all downstream checks: 46 pinned v0.15 runtime files (907,887 bytes), four earned profiles, unchanged profile-domain bytes, old-client read/write/recovery fencing, exact historical battle restoration, earned roster mapping and fresh revision-5 citadel rules. This is Node evidence; browser takeover remains unrun.

An audit of every `CURRENT_PROFILE_PROTOCOL_VERSION` reference in nonfixture JavaScript found no other current-helper expectation of 11. Intentional prior-client assertions and archived pre-edit source remain intact. Runtime/source fixture hashes are unchanged from the original persistence handoff. The first aggregate log at `../assembly-evidence/npm-test-final.txt` was verified by SHA-256 and left unchanged.

Repair evidence: `qa/fog-integration-persistence/production-v015-upgrade-repair.json`, matching `.patch`, `production-v015-upgrade-repair-tests.log`, `production-v015-upgrade-repair-direct.log`, current-protocol audit before/after text and `failed-aggregate-preservation.sha256`. The final full aggregate rerun remains the assembly owner's gate.
