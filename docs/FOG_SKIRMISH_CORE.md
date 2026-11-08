# Local Skirmish fog candidate: core identity

This is an unshipped local integration draft in the separate `ironroot-fog-integration/work` tree. The QA prototype and both frozen snapshots remain untouched. Adding this identity does not authorize publication, normal public admission, a release or a campaign fog mode.

## Contract

- Candidate: `FOG_SKIRMISH_RULESET_ID = 'frontier-fog-skirmish-open'`, revision 1.
- Existing QA identity: `FOG_RULESET_ID = 'frontier-fog-experimental-open'`, still exactly the same immutable definition with `qaOnly: true`.
- Both constants are exported from `dist/rulesets.js`, `dist/fog.js` and `dist/engine.js`. Fog constants are canonically defined in rulesets and re-exported by fog, avoiding a cyclic registry dependency.
- Candidate flags: `experimental: true`, `skirmishOnly: true`, no `qaOnly` flag. It is not the default Skirmish identity.
- The candidate keeps Classic revision 1, open-ended play, bridge income off, the current eight-building roster, automatic flyers and immediate paid citadel choices. All combat/economy/movement/endgame/limit definitions match the existing open citadel rules. Sight remains 320/420/360 and knowledge/event budgets remain 64/128.
- `supportsFog` accepts only the exact immutable registry object for one of those two IDs, revision 1 and the exact `known-terrain-fog-v1` policy. Arbitrary flag objects, cloned rules, inherited objects, unknown IDs and unsupported revisions do not activate fog.
- The constructor explicitly checks Classic revision 1, open-ended/legacy economy and absence of authored/campaign flags for fog. Restore checks the same fixed contract and exact existing fog schema. Unknown map/rules revisions, injected scenario/bridge/timed fields and non-fog saves without knowledge reject without mutation.
- A bare engine has no scenario envelope. The shared battle/history identity boundary must additionally enforce standard Skirmish revision 1; that work belongs to the persistence integration, not a guessed scenario in the engine.

## Preserved behavior

No existing ruleset object definition changed, including QA. The current default remains `frontier-citadel-open`; no preference or default-on flag was added. The candidate does not alias, convert or migrate a QA/old snapshot. A genuine new candidate Game serializes its own ID; a QA Game still serializes the QA ID and remains blocked by normal codec admission.

Observation, memory, effect budgets, the optimized fresh audience scan, damage/targeting/AI and paid commands are unchanged. The only engine changes in this portion are the new constant export and explicit constructor contract. No app, renderer, profile, codec, history, backup or staging code was edited by this worker.

## Targeted verification

`node --test tests/fog-skirmish-identity.test.mjs tests/fog-core.test.mjs tests/fog-phase1-parity.test.mjs tests/fog-profile-isolation.test.mjs tests/citadel-options.test.mjs`

Result: **49 tests passed**, zero failures/skips.

The new five cases cover:

1. Exact preservation of all 24 pre-candidate definitions (23 published plus QA), fixed candidate mechanics, immutable flags and unchanged default.
2. Registry-object allowlist recognition and forged/clone/inherited object rejection.
3. Constructor/restore map/revision/composition rejection, no implicit knowledge migration and no rejected-input mutation.
4. Genuine QA and candidate Games given identical paid commands, AI, seeds and restoration points: exact serialized state/RNG and both side observations after excluding only the intentional ruleset identity metadata. The test never converts either saved identity.
5. Candidate last-seen memory restoration and fresh restart retaining candidate identity with empty knowledge and fresh citadel choices.

The citadel identity enumeration was extended additively with explicit candidate constraints; no old assertion or behavioral case was removed. Existing QA profile rejection, optimized phase1 parity and old-rules parity tests also passed. Targeted log: `../qa-core/core-identity-targeted.txt`.

The main-app observation audit and normal local save/profile admission are concurrent work owned by their respective workers. No aggregate, browser, release-artifact or public-readiness claim follows from these core-only checks.
