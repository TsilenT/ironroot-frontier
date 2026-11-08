# Experimental fog core (private QA only)

This native-only prototype is a separate copy. No main-app setup controls, authored mission, profile protocol, import/export UI, service worker, deployment or remote branch is changed. A narrow normal-codec rejection prevents experimental engines from entering the unsanitized main app. It is not a release candidate or balance claim.

## Verified source

Released identity supplied for this work: v0.20.2 main `0cdd1f5f3ff35c538c36b6cfe30848b2cfb632e7`, tree `0daf13f454539e990e7b2f4b36c08f648c8c084c`. Corresponding local source: `/workspace/shared/ironroot-tutorial-spell-guard/work`. The copied README still contains historical candidate wording; that file was deliberately not changed here.

Prior to edits, SHA-256 matched the source-assessment records exactly:

- engine.js: `d7a31da2c31b85dfee252cc3d40f7f2fa79a6c1340e17faa8a1c008ac17187d2`
- rulesets.js: `2499c436b8f106418c5f5addad31c8acc7af211db1dbf3e045e9096c7f7fbac6`
- render.js: `f3e668dc607485fc7ab368bd7df916b8b7389d4f7c75482975d342c75dca291d`
- autonomous-air.js: `beb98c02d34172965611380b58084a92c1906dd879b9810b26f6d974cc003567`

The copy excludes `.openai`; it does not include a raw local profile backup. Existing fixture backup examples remain ordinary source/test fixtures. No repo AGENTS.md or local skill instruction files were found.

## Rules and visibility

`frontier-fog-experimental-open` revision 1 is additive, deeply frozen and explicitly `qaOnly: true`. It supports Classic only, open-ended, the current Rootwarden roster, automatic flyers and paid citadel choices. Bridge income is absent. Existing identities and the default Skirmish ID are unchanged. There is no live-match toggle and no campaign/field-trial/practice admission change.

Living own ground troops and buildings provide inclusive 320-unit circular sight, flyers 420, citadels 360. Actual world coordinates matter, including between-road positions. Known terrain/citadel coordinates remain public. No exploration grid or terrain occlusion exists. Sight does not expand attack range, legal target types or road permissions. All new direct combat targets must be in the side's current decision snapshot. Hidden buildings cannot steer troops; the public opposing citadel remains the advance destination. Automatic flyer acquisition/retention remains 300/420.

Each fixed step refreshes both memory sets and captures one contact-ID snapshot before structure/unit/base decisions. Both sides use that snapshot throughout combat; simultaneous movement and queued damage remain intact. Memory refresh happens again after movement/damage/regeneration, before AI, and after AI. Each AI invocation captures one observation for enemy strategy/Volley/citadel decisions; its own changing resources and buildings remain current across its multiple paid actions. Successful direct build, upgrade, sell, Volley and citadel purchase refresh both memories. Reads, cameras, pause and frame draw frequency do not refresh memory, change RNG or advance events. Spawns first contribute to the next shared snapshot, avoiding sequential observation inside combat.

Citadel purchase eligibility remains an authoritative engine action guard. A fog AI's choice uses only its own HP/resources/damage wait and currently observed nearby threats. It does not treat an unknown enemy base as zero health or invent a hidden full-health value.

## Observation API

`dist/fog.js` exports `FOG_RULESET_ID`, `FOG`, `supportsFog(ruleset)`, `observe(game, side=0)`, `isPointVisible(game, side, x, y)` and `refreshFog(game)`. Internal pure helpers and validation are also exported for testing.

`observe` returns a detached data façade: `{map, ruleset, units, buildings, state, fog}`. The first four references are immutable definitions. It exposes no `Game` object, prototype, seed, next ID, serialize method or action closures. A UI adapter may derive building validation from the sanitized state; actual actions stay privately attached to the authoritative engine.

During a running fog battle:

- `state.units` and `state.buildings` include own living actors and current enemy contacts only. Moving enemies have no memories.
- Enemy intent/production/cooldown fields are omitted or neutral. Enemy `airTargetId` is omitted; own air target IDs are nulled if the target is not in current contacts.
- Hidden enemy base records contain only public identity/position and `hp: null, maxHp: null`. The UI must draw an unknown-status marker, not use those nulls as numerical health.
- Enemy gold, income, cooldown and statistic array slots are null. Enemy current citadel choice is visible only while the base is visible, never private purchase/wait/heal/shot counters.
- `fog.observers` contains `{x,y,radius}` circles; `fog.memories` contains only stale enemy structure records; `fog.knownBases` contains public positions and visibility flags; `fog.rememberedCitadel` is last observed choice/time; `fog.frontX` is foremost own living ground troop, else own producer, else own base. Flyers and hidden enemy movement cannot move this camera target.
- `state.effects` is filtered by creation-time AND current visibility, with an opaque stable `eventId`. That ID is a presentation-session token, not a persisted deterministic simulation counter. Restore/new renderer resets the presentation session. Repeated reads do not change a retained event's ID. A hidden-born event is never replayed upon reveal.
- Fog effects have independent 128-event budgets per side, at most 256 in union. Overflow clears only that observer’s bit, so hidden traffic cannot evict another side’s seen events. Effects seen by neither side are discarded. Fog ranged attacks create sight-gated contact effects directly; no projectile records are retained.
- Projectiles are conservatively omitted from the fog presentation in this bounded prototype. Existing hit damage and visible effects remain real. Safe partial projectile clipping is a later presentation task; omission avoids source/target/trail leaks and is not claimed to match the full-information visual experience.

Once `state.winner` is irrevocably terminal, observation returns full cloned state with `fog.enabled=false, fog.revealed=true`. Public victory/defeat is not delayed by sight. Synthetic QA fixtures that directly mutate authoritative entities should call `refreshFog` explicitly.

## Memory and persistence boundary

Fog state is stored only inside this experimental engine identity as:

`{version:1,sides:[{structures:[],citadel:null},{structures:[],citadel:null}]}`.

A structure record has exactly `{id,type,side,x,y,lane,level,observedAt}`. No HP, production, cooldown or income is saved in knowledge. Records retain their observed values through hidden upgrades, sales and destruction. Re-observing an empty position clears a record; a replacement receives its own ID. There are at most 64 records per side, with oldest observation/lowest ID evicted first, then records serialized in ascending ID order. Citadel memory is null or exactly `{choice,observedAt}`.

Restore rejects missing/unknown shapes, unsupported identity/map, excessive records, duplicate/out-of-order IDs, future timestamps, invalid sides/types/levels/coordinates, and records whose ID has been recycled onto a different live actor. Hidden stale records need not match the hidden live level or existence. Fog effects require a nonzero `fogSeen` integer bitmask in `[1,3]`, with at most 128 effects assigned to each side; observation removes that internal field. Restore rejects nonempty fog projectile arrays and zero-audience or over-budget effects. Unknown fog fields under old identities are rejected. The released engine rejects the new ruleset ID.

The writer protocol and profile storage code remain untouched. The normal `battle-codec.js` identity boundary explicitly rejects `qaOnly` rules with `qa-only-ruleset`; encode/decode/identity admission cannot send an experimental fog engine to the unsanitized main app. Tests verify ordinary battle writes and crafted version-2 backup imports fail without storage mutation, while ordinary current Skirmish still round-trips. The QA shell must not put experimental games into the normal profile slot, settings, history or exports. Engine JSON round-trips are tested internally, not an end-user profile integration promise.

## Intended outcome signals and limits

Visible-center Volley can damage enemies outside current sight. It rejects hidden centers before spending gold or cooldown. Hidden target impacts/deaths are not projected; ordinary own kill rewards, damage/kill counters, resource outcomes and own damage remain truthful. Those aggregate signals intentionally permit coarse inference after a real interaction. Save data remains full local authoritative state and is not anti-cheat protection. The hidden-state differential guarantee concerns observation/decisions before different unseen state physically interacts or creates an intentional outcome signal.

AI and player share information, not identical strategy or measured strength. No balance, human fairness, mobile readability, audio correctness or maximum-army performance result follows from these Node tests. The separate shell/browser review owns visual/audio validation.

## Checks

Run `node --test tests/fog-core.test.mjs tests/fog-profile-isolation.test.mjs` from this working directory. Its exact parity cases import six unchanged release modules pinned under `tests/fixtures/fog-baseline/`; `SOURCE.json` records release commit/tree and every file’s SHA-256. The tests are self-contained and do not depend on sibling workspaces. These 23 focused cases (20 core and 3 profile-isolation) passed on 8 November 2026, including exact old-save/RNG parity across four existing identities and two seeds, deterministic fog restore continuation, memory lifecycle/bounds, hidden-state view/AI differentials, event suppression including hidden-event saturation, Volley, air retention, citadel choices and profile/backup rejection. `node scripts/check.mjs` also passed. Results: `../qa-core/fog-core-results.txt`, `../qa-core/module-parse-results.txt`.

The first frozen combined aggregate run executed 1,566 tests: 1,563 passed, two stale source/registry expectations failed, and one optional desktop-tooling check skipped because its dependencies are absent. The additive citadel registry expectation was updated with strict experimental identity assertions; its full 15-test file passed. The historical AI source-text oracle was updated only through four explicit, exactly-once literal transformations for reviewed fog additions. The old citadel gate, exact predecessor AI equality, fallback arithmetic assertion, all frozen identities and all 135 behavioral cohorts remain asserted. The two affected files then passed all 17 tests, including those 135 cohorts. At that checkpoint the full aggregate had not yet been rerun after these test-only repairs. A later final phase2 run is recorded below. The production release manifest is intentionally not updated or published by this prototype.

## Release fence

Main-app and offline release integration are unprepared. `rulesets.js` now statically imports the experimental module, but the production version/cache/asset manifest intentionally remain unchanged. Do not deploy this tree as the main app or weaken the release preflight. The lab shell must run from a fresh preview origin without registering the production service worker. A future authorized integration will need a new complete cached bundle/version and a deliberate profile/UI contract after gameplay validation.

Aggregate logs: `../qa-core/npm-test-full.txt` (initial mixed result), `../qa-core/targeted-expectation-repairs.txt` (17/17 after exact test maintenance), `../qa-core/npm-check-full.txt` (syntax pass), and `../qa-core/source-scope-diff.json` (original-file scope verification).

## Bounded profiling follow-up

The exact phase1 source and evidence were preserved before a small event-audience allocation optimization. See [FOG_PROTOTYPE_PERFORMANCE.md](FOG_PROTOTYPE_PERFORMANCE.md) for raw-workload definitions, variance, exact frozen-phase parity and the remaining overhead. This does not change the prototype's release or mobile-verification boundaries.

## Final phase2 aggregate and handoff

After the optimized core and desktop memory-scene source were frozen, the final aggregate `npm test` passed: **1,580 tests, 1,579 pass, zero failures, one skip**. The skip is the unchanged optional desktop-build minimatch tooling check because those dependencies are absent. `npm run check` also passed. Logs are `../qa-core/npm-test-phase2-final.txt` and `../qa-core/npm-check-phase2-final.txt`; summary is `../qa-core/FINAL_PHASE2_CHECKS.json`. This supersedes the earlier mixed-suite checkpoint without erasing its evidence.

These are test/syntax results, not production-offline or release-artifact certification. Phase2 source/evidence is frozen separately before a local integration draft is prepared. No publication or main-app integration change is included in this snapshot.
