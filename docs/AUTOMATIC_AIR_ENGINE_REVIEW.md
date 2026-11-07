# Automatic air-combat prototype: independent review

Reviewed 7 November 2026. Read-only review of `/workspace/shared/ironroot-autonomous-air-next` against the assigned live source `/workspace/shared/ironroot-pr2-profile-reload/private` (parent-supplied main `2094b5`, tree `ec5bd883`). No runtime/test edits, browser actions, external actions or publication were performed by this reviewer.

## Conclusion

No remaining actionable engine defect was found in the bounded final review. The final local-perception model is substantially better aligned with the user's correction than the first home-road/forced-return prototype. This is an engine-prototype result, not release, campaign integration, browser, human-difficulty or physical-device certification.

The final model has new immutable identities only: `frontier-air-local-open`, `frontier-air-local-timed`, and `frontier-campaign-air-local`. It acquires within 300 world pixels on the current physical road or a neighbor, retains a living eligible target within 420 actual pixels, approaches at the existing 84-pixel speed and attacks within the existing 110-pixel range. After loss it retargets locally or resumes ordinary movement. Only `airTargetId` is persisted. There is no home-road intent, encounter anchor, forced return, manual route, gateway or warning phase for these new identities.

## Exact final source reviewed

- `dist/engine.js`: `f4c4fa4bd4d23efbd7f122428520672fbfcac0ce723e850c96a1f3369effd6c1`
- `dist/rulesets.js`: `2250756425cff1a7f643f2c222008453472180777d8f643674b2b2fa101ef2ec`
- `dist/autonomous-air.js`: `beb98c02d34172965611380b58084a92c1906dd879b9810b26f6d974cc003567`
- `dist/service-worker.js`: `5c99ad1ae97a0d5385418ef5c5d61662f1bd6f59be4bcb139f82d0c47f42c993`

These four hashes were checked before and after the final independent focused/parity run. The implementation worker confirmed a freeze. Frozen baseline `engine.js`, `rulesets.js` and `flight-orders.js` were byte-compared with the assigned live source, not merely trusted from their test names.

## Findings discovered and resolved

### 1. The initial anchor leash caused artificial repeated retreats

The first reviewed engine was `04b9b892a21a4016b538e5cad9d3d10eb51decd5e62ce589ea57914cf762f123`.

Independent reproduction: Classic map, seed 958, AI off. Synthetic initial setup cleared default buildings and supplied 1,000 gold to each side. Then use actual paid construction: side 0 aerie at `(1250,260)`, costing 250, versus side 1 Warden lodge at `(1950,450)`, costing 210. No unit positions, health or cooldowns were edited. Advance 2,400 fixed 0.05-second updates and track the first gryphon.

That gryphon first acquired at 3.9 seconds, abandoned a living target at 13.8 seconds, returned vertically, then repeated the cycle about every 14 seconds. It moved from approximately x1524 to x473 by 110.85 seconds while remaining at 125 HP. Enemy base health remained 6,000. The cause was target distance from an invisible acquisition anchor, not inability to reach the current opponent. A standard 420-gold/default-barracks variant also exhibited forced return phases, though other combat changed the timings.

The failed implementation/evidence was retained by its owner under `integration-inputs/autonomous-air-anchor-prototype`. The replacement removes the anchor and return state rather than adding another timer.

Final rerun: both sides, both initial setups, 120 simulated seconds each. Zero dropped locks on living eligible targets within 420 pixels; no health increases; maximum movement per fixed tick was 4.2 pixels plus floating-point epsilon. Tracked gryphons stayed on their newly reached road rather than being sent back to their birth road. Target changes followed deaths or ordinary loss, not an anchor boundary.

The isolated Warden still legitimately draws a chasing flyer backward toward its own base. The first lock lasts to approximately 38.6 seconds rather than being periodically abandoned. This is sustained combat/distraction, not proof of an oscillation bug. In the isolated final case the player's base lost 144 HP by 120 seconds, compared with 1,032 in the first prototype. These are one-seed scenario observations, not a balance conclusion.

### 2. Birth-road filtering suppressed close self-defense

Accepted synthetic initial snapshot in the first prototype: returning flyer A, birth road 0, at `(1500,540)`, physical lane 1; enemy flyer B, birth road 2, at `(1500,550)`, physical lane 2; both cooldowns zero. B hit A for 17 while A retreated without firing at an opponent only 10 pixels away. Returning self-defense reused birth-road eligibility.

The final model has no birth-road filter. The same physical positions now produce reciprocal 17 damage and reciprocal target locks, followed by a valid deterministic save/restore. This is synthetic geometry coverage, not a claim that the exact old snapshot was encountered in ordinary play.

### 3. Ground anti-air could select an unreachable vertical gap

On Twin Span, road centers are 220 pixels apart. An archer has 205 attack range and scans to 285. Selecting a flyer on the other road while forbidding off-road ground pursuit can therefore leave no reachable attack position. This was raised as a source-derived case before final implementation, not recorded as an independently completed failing run of the initial source.

The final rule skips such targets unless the archer is already physically in attack range, and clamps ground anti-air movement to its on-road goal. Independent synthetic test: archer at `(1500,560)`, flyer at `(1500,340)` locked on a nearby ground screen. The archer now advances instead of stalling. Existing tests also retain reachable gap interception and the exact 205-pixel shot.

Independent ordinary paid reproduction on the final source: Twin Span, default 420 gold and default barracks, AI off, seed 958. Side 0 pays for aerie `(1250,340)`; side 1 pays for Warden lodge `(1950,340)` plus archery `(1950,560)`, totaling 385. Repeat with sides reversed. Over 60 seconds, the tracked archer had zero stationary, non-firing ticks caused by a nearby flyer beyond its road's vertical reach. No synthetic unit edits were used.

### 4. A later arithmetic regrouping broke exact old-rule parity

Intermediate engine `cf74699df39275a0c482977e88f0db2797ca5c43e8da4d9ee11297f1a994eeb1` passed the new behavior tests but independently failed frozen parity at `frontier-legacy/classic/hard`, frame 870 / tick 871. Regrouping `dx / length * speed * dt` as `dx / length * (speed * dt)` changed floating-point rounding even with automatic air disabled.

The implementation worker separated the new anti-air clamp into its own conditional branch and restored the ordinary arithmetic exactly. No tests were weakened. The final hash above passes the previously failing cohort, all 135 prior-identity cohorts, and the separate save-enum frozen simulations.

## Independent final verification

Commands run against the final hashes:

```sh
node --test tests/autonomous-air-engine.test.mjs tests/autonomous-air-legacy-parity.test.mjs tests/save-enum-validation.test.mjs
node scripts/check.mjs
node scripts/verify-runtime.mjs
```

Results: 33 passed, zero failed/skipped in that focused run; all modules parse; offline/runtime manifest preflight succeeds with 50 runtime files. The 33 include 17 new automatic-air tests, two legacy-parity tests and 14 save-enum/regression tests. The 135 prior-rule cohorts cover all nine existing identities, five maps and three difficulties, comparing serialized state, actions, RNG and cross-restores.

Additional independently authored inline Node checks, rerun after the arithmetic repair:

- Eight synthetic cases: between-tick paid volley clears two locks immediately; queued troop kill clears multiple locks; simultaneous mutual flyer deaths; a legal paid tower kills a focused flyer; terminal save with a living target freezes; reversing the unit array preserves one-step unit movement/combat results; reciprocal 10-pixel boundary fight; unreachable 220-pixel anti-air gap.
- Fifteen ordinary-start paid 60-second continuations: three new identities times all five maps, using default gold/barracks, a paid aerie and opposing paid archery. Periodic serialized-state equality and restore admission all passed.
- Six additional 90-second old-schema cohorts: schema 1 Classic and schema 2 Long March/Twin Span, AI both on and off, paid construction and repeated cross-restores against the frozen live engine. Exact equality passed.
- Fourteen malformed snapshots rejected without input mutation: invalid target ID types/ranges, self/friendly/dead/missing-distance eligibility, inconsistent flyer lane, obsolete focus/route metadata, a target field on a ground unit and a foreign ruleset. The frozen old client rejects a new experimental snapshot without mutation.
- The four 120-second Warden regressions and both 60-second ordinary paid Twin Span cases described above.

The implementation worker separately reported its final full suite at the same engine hash: 1,299 passed, zero failed, one optional skip, 1,300 total. This reviewer did not independently rerun that entire suite and keeps that report distinct from the 33 independently executed checks.

## Scope and remaining decisions

- Reaching another physical road can expose the next road in a later encounter. The final model intentionally allows sequential local encounters across the map; it does not preserve a birth-road restriction. This follows from current-position perception and should be described honestly when integrated.
- Long pursuit of a living nearby opponent can draw flyers away from the original advance. That is the explicit tradeoff of stable autonomous targeting. The bounded paid cases establish that the former forced-return loop is gone; they do not establish that every strategic detour is beneficial or balanced.
- Isolated mirrored producer cases and exact mirrored synthetic state support symmetric mechanics. Ordinary same-seed starts are not guaranteed exact mirrored outcomes because the existing fixed side/spawn order gives different units different random draws. The default-barracks Warden runs were not exact outcome mirrors; they were tested for the same behavioral invariants. One-step array-order invariance is not universal fairness certification.
- Ground anti-air remains on its road when pursuing flyers and uses physical range. Existing base convergence and ordinary legacy ground combat behavior were deliberately preserved, not redesigned as strict centerline rails.
- UI, campaign descriptors, teaching, old-save presentation, browser transitions, rendering, cache rollout and removal of manual controls remain integration work. Existing app defaults still select the old rules. Nothing in this report claims the player-facing game already uses automatic air combat.
- Terminal and death snapshots were tested, including deliberate synthetic terminal setup. No full authored campaign completion, natural timed-endgame playthrough, browser QA, physical device test or human balance assessment was performed here.

No broad polish request or additional engine redesign is recommended from this review. Proceed with the scoped integration and its own exact-source verification rather than declaring the prototype released.
