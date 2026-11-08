# Independent review: fog memory/performance increment

## Current status

The narrow core optimization and desktop synthetic memory increment are approved for a carefully fenced local main-app integration draft. No unresolved information-boundary blocker was found in this reviewed increment. This is not permission to create a production identity, admit fog to ordinary profiles, publish, or call the mode release-ready. Native mobile remains BLOCKED/unrun. The final aggregate log is now verified: 1,580 discovered, 1,579 passed, zero failed and one unchanged optional desktop-dependency skip; syntax checks passed. This final review is a post-freeze addendum because the phase-two snapshot was captured just before the final review text was written.

## Optimization integrity

Compared current runtime against frozen phase one. Only two core behaviors were refactored:

1. `eventAudience` freshly scans living bases/buildings/units, preserves the same side/radius eligibility and exact squared-distance comparison, and stops once both audience bits are found. It creates no circle snapshots for that path. No visibility cache, per-tick assumptions, shared mutable observer pool or new RNG is introduced.
2. `_damage` computes a pre-mutation audience only when the applied amount can kill the current target. Nonlethal sampling had no consumer. Lethal calculation remains after queued damage is dequeued and before HP changes, preserving the first/second death ordering when observers disappear.

The old-rule branch remains unchanged in effect: the fog test is false and no new audience work occurs. The optimization does not change attack eligibility, the pre-combat contact snapshot, effects budgets, memories, AI cadence or observation detachment.

Independent targeted checks in `optimization-independent-check.txt` passed:

- 1,524 direct audience queries across deterministic varied coordinates, moved/dead observers and exact sight boundaries.
- Both orders of queued half-hit/lethal/overkill damage, comparing complete state, both observations and the expected audience masks.
- Zero/nonlethal/lethal damage plus short continuation across all 23 ordinary identities, exactly matching frozen phase one.

I also reviewed the six new frozen-phase parity tests and their passing log. They retain exact state/RNG and both-side observation equality, same-tick commands, sparse/crowded marching/combat, paid AI, event saturation and restore. The worker reports 56 focused fog tests and syntax checks passing; this is a focused result, not a new full aggregate result.

## Performance evidence and accepted claim

Inspected the workload builder, timing scripts, all seven longer confirmation samples and raw count reports. The longer confirmation restores each batch outside the timed region, rotates phase-one/current/released order, discards one warmup, then records seven rounds. A crowded sample contains ten fresh 40-step batches. Each batch spans two simulated seconds, with 140 starting troops / 48 buildings / 256 effects and combat casualties ending at 93 troops. AI is excluded; no forced GC is used.

Crowded-combat median fixed-step CPU:

- Frozen phase one: 1.2465 ms, sample range 1.1704–1.3754 ms.
- Optimized current: 0.7966 ms, range 0.7666–0.8872 ms.
- Released no-fog: 0.3352 ms, range 0.3081–0.3562 ms.

The roughly 36% lower crowded-combat median is supported by this controlled synthetic Node fixture, with non-overlapping sample ranges. The optimized mode still uses roughly 2.38 times the released no-fog step CPU in this fixture. Sparse and crowded-marching samples have wide overlapping variance and do not support a reliable speedup claim. Unchanged observation/sightSnapshot timings likewise must not be marketed as an optimization effect.

Instrumented crowded-batch counts identify the mechanism: 854 damage applications, 47 lethal; audience calls fall from 1,082 to 275, and source-level temporary circle constructions in that path fall from 185,509 to zero. Those are operation/object-construction counts, not measured V8 heap bytes. Other sight/observation allocations remain.

This result does not establish browser render speed, mobile FPS, sustained maximum-army behavior, fast-speed headroom, whole-match performance or balance. The earlier independent phase-one benchmark used a different shorter fixture and should not be spliced into this before/after comparison.

Evidence reviewed: `../ironroot-fog-prototype/qa-core/performance/step-confirmation.json`, `comparison.json`, `audience-allocation-counts.json`, `phase1-parity.txt`, `fog-all-focused-final.txt`, `core-optimization.diff`, and the corresponding workload/timing scripts.


## Desktop memory evidence and presentation diff

Read the final `reports/memory-pass/NATIVE_MEMORY_QA.md`, inspected the real screenshots for current contact, sight loss, unobserved interval, empty re-observation, current replacement, stale replacement and known-citadel camera, and reviewed the scene generator and all eight new test assertions. The fixture visibly identifies itself as synthetic, not a played match, and returns only the same sanitized observation facade used by the paid QA shell. It does not expose the raw fixture to the presentation controller or run within an ordinary match.

The actual desktop pixels support the mechanism:

- Current Watchtower and enemy troop are visible with the current building health bar and current-contact text.
- Sight loss removes the troop/model/health and leaves a dashed Watchtower marker with the readable, opaque-backed `Watchtower · L1` and `Last seen 0:12` badge.
- The later hidden upgrade/damage/sale stage preserves the same frozen marker and description. It discloses neither the upgrade nor sale. The source test compares entire field and minimap call digests without normalizing away differences.
- Re-observing the empty location clears field and minimap memory. The replacement is a current Barracks with its own health, then becomes a stale Barracks L1 / `Last seen 1:00`, not the former Watchtower identity.
- Known enemy citadel labels remain inside the right edge in the inspected desktop pixels. The health is unknown, with no empty HP bar.

The final `fog-view.js` diff is limited to deriving memory labels from sanitized frozen data, including those details in the accessibility description, adding a contained badge and off-camera field culling, and measuring/clamping known-citadel label width. No live-state read, mutation, simulation step, new action route, or health inference was introduced. These labels are frozen simulation observation times, not changing ages. Both field and minimap continue to use the observation only.

Independently recomputed SHA256 for all 20 current source dependencies and all 20 staged files. Every file matches its recorded hash. The manifest itself matches `5ea96c6235a20b2d1c2776098a18f53492bbb7e62dfa9f0bcd105653a317293b`. Current engine, fog and view hashes are recorded separately in `increment-reviewed-source-sha256.json`. The worker reports the presentation suites at 27/27; this reviewer inspected their new assertions rather than rerunning a duplicate suite while the final aggregate runs.

This is valid desktop mechanism/readability evidence, not an ordinary paid-match transition, full-match, combat-feel, audio, performance or mobile claim. Dense badge overlap, very narrow layout, physical touch/gamepad and long accessibility descriptions remain unverified. Native mobile is still blocked by the explicit DevTools policy denial, with no alternate route attempted or authorized. The preview was stopped according to the native report.

## Integration decision and next milestones

Proceed with a local main-app draft only while retaining the QA identity's normal codec/profile fence and current public defaults. The memory/performance evidence is now sufficient for that next engineering step. Local implementation need not wait for unavailable mobile tooling; releasing it does.

1. Keep the scope default off, Classic, open-ended, no bridge income. Reject/explain unsupported combinations explicitly, including identity-only history paths, rather than silently remapping them. Existing modes, saves and campaigns remain unchanged.
2. Audit every live main-app consumer before exposing even a local fog checkbox: field/minimap, effects/audio, music, HUD/HP, selection, citadel dialogs, Front/follow/camera, accessibility and live reports. Keep authoritative own paid-action guards separate from partial observation helpers; null opponent HP must not be passed to an ended-match test.
3. Design normal resume/history/import/export and old-client writer protection before any separately authorized production identity/profile admission. Bound and validate memories on both sides; preserve exact restore continuation and rejection-without-mutation. Keep current QA codec rejection intact in the meantime.
4. Before release, prove exact packaged offline/cold-start/update behavior, permitted native phone/touch layouts, dense memory readability, a full paid fog match and sustained crowded normal/fast browser performance. Evaluate human scouting/counter behavior separately; equal information does not prove equal difficulty or balance.
5. Preserve phase-one evidence and record the final aggregate and phase-two frozen manifest without upgrading any synthetic/blocked check into a passed native gameplay claim.


## Final aggregate and frozen artifact verification

Inspected the actual tail of `qa-core/npm-test-phase2-final.txt`, the syntax log and `FINAL_PHASE2_CHECKS.json`: 1,580 discovered / 1,579 passed / zero failed / one optional desktop tooling dependency skip; all game JavaScript modules parse. This is a new final aggregate, distinct from the phase-one aggregate with two subsequently repaired stale expectations. No dependency installation or release preflight is implied.

Phase two is preserved at `/workspace/shared/ironroot-fog-prototype-phase2-frozen`, with 1,066 hashed files and manifest SHA256 `fd580b5101c3b3dc575945ffc4185538707819de2a8f06ed14ebf0e5a67bd897`. I independently recomputed that manifest hash and compared all 13 specifically reviewed current runtime/fixture/test source files with the frozen work copy; they match. The freeze's embedded `independent-review` directory predates this final review update. Do not overwrite the immutable snapshot to make its review appear newer: use this report and `increment-reviewed-source-sha256.json` as the post-freeze review addendum.
