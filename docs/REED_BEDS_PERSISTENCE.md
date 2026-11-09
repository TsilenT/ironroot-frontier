# Through the Reed Beds persistence boundary (reconstructed)

## Exact recovered facts

The immutable baseline is merged Road commit `6b6cf964097a815b214933c7e74bb3f23b72d5d5`, tree `50c098a436ddee2e36d629a2e7d36e6887ae6b25`. Its second parent, candidate `96319ad`, has the same tree. Reed workspace work lost before this reconstruction is not proof of the current artifact.

The recovered profile19 source was independently hashed before copying to `tests/fixtures/profile-session-v0280.js`: SHA256 `6ac7fb1530c568ca462e558c3c6ae806f1cfd62f01285a83c69e1d13609201fe`. Those fixture bytes are exact. All existing historical fixture bytes and historical persistence documents remain unchanged. The historical Road source proof still compares frozen18 against this frozen19 source; it is not retargeted to a fabricated client.

## Reconstructed changes

The v0.29.0 runtime requests profile20. Production profile-session source differs from exact profile19 only in the exported current version, admitted version list, corresponding error copy and explanatory comment. Barrier logic, default protocol1 behavior, epochs, phases and marker `ironroot.profile.v1` remain unchanged. Ready upgrades write only the marker and never read or normalize earned data.

The same five domains remain: `ironroot.campaign.v1`, `ironroot.trials.v1`, `ironroot.settings.v1`, `ironroot.history.v1` and `ironroot.battle.v1`. Campaign format stays 1, modern backup format 2 and explicit battle/engine formats 3. Historical formats remain admitted. No new checkpoint field, fog state, reserve mechanic or combat change is introduced by this profile update.

Reed has exact identities `through-the-reed-beds@1`, `frontier-campaign-reed-beds@1` and `classic@1`. Its prerequisite is `the-road-we-know`; a one-star completion is sufficient. The catalog has 27 main missions, 81 optional stars and three Chapter 7 missions. Reed is clear-view: destroy any two of three original outposts, or the enemy citadel, within ten minutes while the player's citadel survives. Existing engine building identities retain partial destruction credit without a new saved counter. History, checkpoint, restart and backup use the explicit authored identities. Shared codec admission rejects wrong map/rule/scenario/revision combinations and identityless legacy Reed rows.

Open and reopened actual profile19 clients, and all admitted older protocols, reject profile20 before reading or writing an earned domain. Future21 is never downgraded, including recovery. Dropped, thrown and unverifiable upgrades remain closed until a verified reload; a throw after a verified successful write is admitted. Only the verified importer may access the five domains while restoring, and ownership loss stops its reads, writes, removals and rollback. Successful replacement fences both existing current tabs and the importing tab until reload. Verified rollback preserves exact prior bytes where storage permits.

This remains an optimistic cross-tab barrier, not an atomic localStorage transaction. Keep other game tabs closed during import.

## Freshly executed verification

After mission integration readiness was confirmed, `node --test tests/reed-beds-profile.test.mjs` passed 22 tests, 0 failed or skipped. The new suite covers marker-only upgrades, actual frozen19 open/reopened writers, all older admitted versions, five-domain reads/sets/removals/import ownership, future21, failed and uncertain upgrades, queued saves, successful replacement, per-domain throw-before/throw-after/drop rollback, historical backup/history/battle admission, exact earned data, one-star Road unlock, partial Reed checkpoint round-trip, explicit result/restart identity, all seven identity mutation families and current-tab reload fencing.

Fresh combined run: `node --test tests/*profile*.test.mjs` passed 251 tests, 0 failed, 0 skipped (1865.814683 ms). Historical incomplete-progress helpers exclude Reed when its prerequisite is absent; the pre-Reed fixture contains no Reed record. Historical source-proof assertions retain their exact old hashes. Syntax checks for the changed profile module and new suite also passed.

## Remaining gates

These results cover the profile suite, including source-derived adapter harnesses. They are not an overall repository aggregate, native browser or physical-input/UI pass, balance assessment, naturally played victory, deployment or publication claim. Aggregate, native UI and independent reconstruction review are separately owned. No remote upload or publication was performed by this persistence lane.
