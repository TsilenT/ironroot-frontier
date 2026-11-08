# Independent review: local main-app fog candidate

## Decision and authorization boundary

The coordinated source boundary is suitable for continued local candidate testing after the three concrete issues below were fixed. No remaining information-boundary blocker has been found in the reviewed app/core/persistence seams. Final source assembly and exact runtime/cache verification now pass. The parent's corrected full aggregate now passes: 1,617 passed, zero failed, one unchanged optional skip out of 1,618 tests. The initial stale-expectation failure and its one-line repair remain documented below. Current native main-app evidence remains pending. This is not release, merge, public admission or balance approval.

The parent explicitly authorized the distinct candidate identity and its normal codec admission inside `/workspace/shared/ironroot-fog-integration/work` so actual-app save/restore can be tested coherently. That local implementation is within scope; no publication approval is required merely to write or test it. The supplied live v0.20.2 and both frozen prototype phases remain separate and unchanged. The old QA identity remains blocked by normal save/history/backup admission.

Native mobile remains BLOCKED/unrun because of the explicit browser DevTools organization restriction. This reviewer used no browser, alternate emulation or remote writes. Review artifacts are confined to this review directory.

## Concrete findings fixed during review

1. An accidental map-button disabling assignment had also landed inside `syncFullscreenControls`. It overrode the fullscreen availability guard when fog was off and disabled fullscreen when fog was on. The duplicate insertion was removed, leaving the original availability/pending semantics. A focused actual-function test covers unavailable, pending and enabled states.
2. Moving follow-camera interpolation after the presentation refresh initially dropped winner/objective-end guards. These guards were restored so ended ordinary, fog and authored-objective battles do not drift.
3. Main-app Help/Options still restored their pre-modal pause flag after a background interruption. This was inherited behavior, not a new fog diff, but it did not retain the isolated shell's explicit-resume safety. The independent exact-function reproduction showed live candidate → Help → hidden/visible → Close Help resumed without Resume. A narrow durable latch now records interruption only for open Help/Options panels on blur, hidden and pagehide. It preserves normal uninterrupted-close behavior. The reviewer independently exercised 16 fog/ordinary × Help/Options × blur/hidden/pagehide/no-interruption paths through the actual hooks; all pass. See `integration-interruption-repro.json` for the original failure and `integration-interruption-recheck.txt` for the corrected result. The original repro script is a historical reproducer and was not rewritten to hide the failure.

## Core identity and persistence review

- Candidate `frontier-fog-skirmish-open` revision 1 is distinct, experimental, Skirmish-only, nondefault and registered immutably. Its mechanics match the frozen QA fog definition and ordinary open citadel mechanics. All 24 pre-candidate rule definitions remain exactly equal in the new identity tests, including the QA flag.
- `supportsFog` now requires an exact registry object, one of the two explicit identities, revision 1 and the fixed policy. Moving the shared constants to rulesets avoids a circular registry import. Clones, arbitrary flags and inherited objects cannot activate the mechanic.
- The engine constructor enforces Classic revision 1/open/legacy economy/non-authored constraints. Shared `validateBattleIdentity` additionally enforces standard Skirmish revision 1, so identity-only history cannot pair fog with another map or authored scenario without constructing an engine.
- QA admission rejection remains before scenario normalization. The candidate is admitted only by this local tree. There is no alias, QA conversion or old-knowledge migration.
- Profile protocol 11→12 changes only the version constant, supported-version list, message and documentation. No transaction, ownership, rollback or key-format implementation changed. Battle v3, backup v2 and existing profile domains are retained. No persisted fog preference was added.
- Inspected the 17 new profile cases, including bounded memories/effects, rejected-input zero mutation, exact both-side memory and deterministic continuation, marker-only byte preservation, pinned old writers, five-domain rollback and stale tabs. Verified the actual focused log reports 221/221 passing; these are in-memory storage adapters, not live profiles.
- The separately documented strictness fix is valid: `identityOf` now validates the original scenario rather than dropping unknown fields first; `encodeBattle` validates before reading scenario fields or serializing. Accessors/unknown properties reject without evaluation or storage writes, while valid legacy envelopes remain unchanged. Runtime callers pass canonical three-field references, not expanded scenario descriptors.
- Reviewed all six protocol-expectation diffs. They add 12 to current-version/ready-marker expectations, retain older versions/source hashes/preservation checks, and move the future-protocol test to current+1. The two actual-app test fixtures only supply newly required ordinary-mode helpers/context. These changes do not weaken legacy protection.

## Main-app information boundary

`refreshPresentation` supplies one detached side observation for fog; ordinary battles still pass their original Game. The app retains the authoritative Game privately for simulation, own paid commands, encoding and post-battle reports. The presentation facade does not acquire raw action/serialize callbacks.

The reviewed routing covers field/minimap, observed VFX, audio cues/intensity, HUD/unknown enemy HP and ARIA, enemy citadel text, own selection, Front button, restored camera, follow and accessible memory descriptions. Unknown enemy HP clears prior width/text semantics and is explicitly unknown, while current observed HP is allowed. Enemy citadel formatting uses only observed choice or labeled last-seen choice and never private cooldown/heal/shot counters. Own citadel readiness uses authoritative own eligibility, avoiding the null-opponent-HP ended-match trap; the actual handler's paid 190-gold once-only test is retained.

Every fixed-step batch refreshes the presentation before render/audio/HUD. Direct build/Volley/upgrade/sale/citadel actions refresh it too. Fog audio consumes paused/off-camera events so they cannot replay on resume/pan; own direct command cues are suppressed in the observation audio adapter to avoid duplicate sounds. Reset/restore switches the active renderer, reapplies current preferences, clears transient VFX/motion/audio/selection and preserves versus resets knowledge according to restore/restart. Normal modes retain the stock renderer and raw full-information path.

Remaining authoritative live reads are scoped to own resources/selection/actions, terminal results, ordinary-only audio/citadel branches, or authored coaching/objectives that the candidate identity cannot enter. Full battle journals stay private until a terminal finish, and fog result/report context explicitly identifies post-battle full information.

## Independent targeted evidence

Using the worker's real-function DOM/canvas harness with independently chosen adversarial inputs, six paused/live × three-camera cases mutate hidden troop composition, producer progress/HP/level, opponent resources, health, stats/citadel counters, raw frontline and 500 hidden effects. Captured DOM/ARIA, field and minimap draw digests, Front, audio and music intensity remain identical. No assertion strips changed fields from those captured results. See `integration-app-independent.mjs` and `.txt`.

A forged incompatible Begin was also instrumented to prove it returns before profile-safety and ownership callbacks, with complete game bytes unchanged. The source rejection precedes checkpoint/profile work, not merely a disabled checkbox. The UI never silently changes map/endgame/bridge selection. Fog is session-only/default off; bound battle identity does not follow later checkbox changes.

These are synthetic Node executable app-function tests, not native DOM layout, physical input, played matches or browser performance evidence. The harness itself is reused for actual function execution; the reviewer did not claim to build an independent browser emulator. No broad duplicate suite was run.

## Remaining acceptance gates

- Current native desktop actual-app setup, paid commands, hidden/visible HP, modal interruption, ordinary/fog switching, Save & return/Resume/restart and profile/backup flows using an isolated test profile.
- Before release: permitted native phone/touch/compact-layout evidence, dense memory badge readability, ordinary live memory transitions, a complete paid fog match and sustained normal/fast browser/device performance. The ~36% earlier Node step improvement is not browser FPS evidence; full DOM work now runs more frequently for fog and must be included in device profiling.
- Offline cold-start/update/resume on the exact candidate build and stale old-client behavior. Static precache completeness is necessary but not a native offline update test.
- Keep Classic/open/no bridge restrictions. More maps, timed/bridge combinations and future campaign fog require separate identities, disclosure policy and tests. Equal information is not proof of balanced player/AI strength.


## Final local source closure and aggregate accounting

Independently recomputed the app manifest SHA256 `c2dc3f4baac0dd180cf8265091d31610335dfda3518cba8a4b0422a94bd5437c`, all 22 listed source-file hashes, all four evidence-file hashes and all 56 runtime hashes. Every hash matches. The runtime manifest SHA256 is `0c90a1b86ad601e0bef35a11d549066fa0997fad269fb6627351300de345ab51`; final `app.js` is `07e2b793bac55d8c3a8e564c493904d525871ffcf53f1457d8486143d56280a7`. Browser/root/desktop package metadata is 0.21.0 and the cache is `ironroot-v0.21.0`. The exact runtime set equals the declared cache set plus the service worker, includes the two fog modules and excludes QA/fixtures/reports. The service-worker diff only bumps version and adds those modules. `audio.js` remains byte-identical to frozen phase two; no separate music work was folded into this candidate. Details are in `integration-final-source-verification.json`.

Reviewed the final two app assertions for one shared observation through a real paused frame and identity-derived Resume/history/backup-preview labels. They execute the actual functions, retain no-write preview assertions and do not claim native browser evidence. The worker's focused app log reports 505 passed, zero failed, one optional skip out of 506; all 16 new app cases pass. Independently re-ran only the 23 bounded reviewer checks against final app bytes: six hidden-state differentials, one forged Begin and 16 interruption paths pass. No duplicate full suite was run.

The parent's initial final-candidate aggregate actually recorded 1,618 tests: 1,616 passed, one failed and one optional desktop-dependency skip. The sole failure was the stale literal `CURRENT_PROFILE_PROTOCOL_VERSION === 11` in `qa/browser/validate-production-v015-upgrade.mjs`. Inspected the exact repair against frozen phase two: it changes only that literal to 12. All historical v0.15 fixture validation, distinct-cache guard, exact earned-domain byte preservation, old-client reads/writes/recovery fencing and decoded-save checks are unchanged. This is legitimate current-version expectation maintenance, not a relaxed old-client claim. The original failed aggregate log is retained. The repaired file passes its affected test and direct validator. At that review checkpoint, only the initial aggregate plus targeted repair existed. The parent subsequently completed a corrected full aggregate without runtime changes; its result is recorded next rather than erasing the initial failure.

Syntax and source runtime preflight each exit zero in the parent's assembly evidence. This closes source assembly, not native offline update/Resume, phone layout, complete paid gameplay or release approval. The technical recommendation is to proceed with isolated native main-app candidate acceptance under the parent's approved testing scope, while retaining every explicit release gate above.


## Corrected complete aggregate verified

Inspected `/workspace/shared/ironroot-fog-integration/assembly-evidence/npm-test-corrected.txt` and its exit-code file: **1,618 tests, 1,617 passed, zero failed, one unchanged optional desktop-dependency skip**, exit 0, duration 58,127.12686 ms (58.1 seconds). The complete corrected log SHA256 is `a374c0b1f63bca118bd54cc6fb5cde29ef774be4c853abc622a194e3e083c4c0`. This is now a genuinely passing full aggregate, not an inference from focused rechecks. The original failed aggregate and exact one-line current-protocol expectation repair remain preserved and described above.

No runtime changed after the previously verified hashes, according to the parent's frozen-source confirmation. This update reads the supplied result and edits only this review report; it does not rerun tests or change source. Native actual-app desktop acceptance is starting, not yet a passed result. The blocked phone path was not retried; native mobile, live full-match/memory readability, sustained device performance and native offline acceptance remain open release gates.
