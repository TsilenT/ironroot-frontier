# Bounded fog-core profiling and optimization

## Result and boundary

The optimized fog core preserves phase1 behavior in the tested state/RNG/AI/observation comparisons. Its one intentional implementation change removes unnecessary allocation from event-audience checks. In the longer synthetic crowded-combat confirmation, the median fixed-step CPU time fell from **1.246 ms to 0.797 ms (36% lower)**. It still cost **2.38 times** the released no-fog engine's 0.335 ms in that fixture.

This is a Node CPU result, not browser frame rate, mobile performance, a sustained worst-case guarantee, balance or human play evidence. Quiet sparse and crowded marching workloads showed no reliable improvement; their ranges overlapped substantially. No claim is made that fog overhead is solved.

No cloud jobs, dependencies, external writes or publication were used. The main-app/offline release fence, QA-only profile rejection, fog rules, event budgets, targeting, AI, damage and observer radii remain unchanged.

## Frozen phase1 evidence

Before any edits, copied the exact current source plus reports, qa-core and independent review to `/workspace/shared/ironroot-fog-prototype-phase1-frozen`. Its 1,004-file `FROZEN_MANIFEST.json` has SHA-256 `5210aacd8b2ec3e53ea711ed5d5495d79bec6fe3eab10d3036eae71da37863d3`. Local `.openai` hosting configuration and the redundant preview staging copy are excluded. Every recorded file was reverified after profiling with no drift.

Portable tests pin only the seven module dependencies needed by the phase1 engine under `tests/fixtures/fog-phase1/`, with per-file hashes and the frozen-manifest reference in `SOURCE.json`. The released no-fog oracle remains the six-module v0.20.2 fixture. No normal test imports an absolute or sibling-workspace path.

The original independent approximately 3.1× sanity result and its raw samples remain in the frozen evidence. The new reproducible fixture below is not the identical old 20-step setup, so its ratios must not be substituted retroactively into that report.

## Profiling method

Environment: Linux x64, Node v24.22.1, AMD EPYC 9V74; 9 logical CPUs reported. The shared host was not isolated. No forced GC was used.

Three synthetic fixtures:

- **Sparse:** 12 troops, six buildings, separated armies; eight initial effects.
- **Crowded march:** native caps of 140 troops and 48 buildings, separated armies; 256 initial effects. All 140 troops remain after the measured two-second batch.
- **Crowded combat:** the same caps with mixed units placed in a dense encounter; 256 initial effects. Casualties reduce 140 troops to 93 over each 40-step/two-simulated-second batch. This is not sustained maximum-army combat.

Snapshots are constructed deterministically and restored outside the timed region. AI and paid economy are excluded from timing, but paid AI/action behavior is covered separately by parity tests. Versions rotate order each round to reduce ordering bias.

First pass: one warmup plus seven measured rounds per task. Each fixed-step sample has 40 steps; each observation sample has 200 calls, alternating side; each event/sight component sample has 2,000 calls. Short step samples showed wide spread, prompting **one** longer confirmation without another runtime edit.

Longer confirmation: one warmup plus seven measured rounds, each summing 40 restored batches for sparse and ten restored batches for crowded workloads. Every batch still has 40 fixed steps. Restore remains outside timing. Raw samples and initial/final counts are retained, not replaced by the median.

## Evident hotspot and narrow change

Built-in CPU sampling of phase1 placed `eventAudience`, `sightSnapshot`, associated allocation callbacks and `_damage` among the prominent costs. Component timing and source-level operation counts isolated the problem:

For 40 crowded-combat steps, both engines apply 854 damage events, of which only 47 are lethal, and create 228 effects requiring a fresh audience. Phase1 computes an audience for every damage application even though only a death consumes it. Together those 1,082 audience checks construct 185,509 temporary observer-circle objects.

The change is limited to:

1. `_damage` computes the audience only for a lethal application, still **before HP mutation** and at the unchanged queued-damage resolution point.
2. `eventAudience` scans current living bases/buildings/troops directly, retaining the exact inclusive squared-distance expression and 360/320/420 radii. It stops once both side bits are known. It does not create observer-circle arrays or objects.

The same fixture now makes 275 audience checks and constructs zero observer-circle objects in that audience path. These are instrumented call/source-level construction counts, **not measured V8 heap bytes**. Ordinary decision/observation snapshots still allocate normally. No visibility cache, pooled view objects, snapshot reuse across mutations, event-budget change or flyer-target-map optimization was added.

## Timing results

Longer confirmation, median and min–max milliseconds per fixed step across seven measured rounds:

| Workload | Frozen phase1 | Optimized fog | Released no fog |
|---|---:|---:|---:|
| Sparse | 0.0326 (0.0222–0.0377) | 0.0344 (0.0223–0.0462) | 0.0174 (0.0118–0.0185) |
| Crowded march | 1.0277 (0.9746–1.4065) | 1.1022 (0.8510–1.2182) | 0.9982 (0.9225–1.2504) |
| Crowded combat | 1.2465 (1.1704–1.3754) | 0.7966 (0.7666–0.8872) | 0.3352 (0.3081–0.3562) |

The combat ranges do not overlap in this run; optimized median cost is 63.9% of phase1. The quiet rows do not establish an improvement or regression, and this optimization is not expected to help a batch with no damage/effect births. Shared-host/JIT/GC variability remains material, especially for sparse timings.

In the earlier component pass, crowded-combat event ingestion fell from 0.01792 to 0.00885 ms per event (51% lower median, sample spreads 10.9%/7.8%). Fresh event-audience checks fell from 0.01425 to 0.00524 ms per call. Observation generation was not optimized: its 0.3088/0.3030 ms medians were within wide sample spread. No rendering work was timed. Fog and no-fog observations project different amounts of data, so their timings are not an equal-output speed comparison.

## Verification

- `node --test tests/fog-*.test.mjs`: **56/56 pass** on final core. This includes the existing fog/view/shell tests, the memory-scene tests present at the time, and six new frozen-phase1 parity cases.
- `npm run check`: passed.
- Exact parity covers three workloads × three seeds with state and both observations checked every update, restoration mid-run, and normal/hard paid AI/action scripts across two seeds.
- Direct same-tick coverage includes spawn, movement, construction, sale, Volley, nonlethal damage, last-observer death, event saturation and restore.
- Queued simultaneous lethal and overkill hits preserve pre-death audience bits and resolution order for both sides. Tests explicitly assert first/second death masks.
- Isolated ordinary/flyer/citadel observers test just inside, exactly on and just outside both cardinal and 3–4–5 diagonal boundaries, for each side. The exact squared-distance predicate is retained.
- Pinned source hashes and the full frozen phase1 manifest were reverified.

The bounded profiling pass itself did not run a broad full suite. A later final phase2 aggregate, after the core and UI freeze, passed 1,579 of 1,580 tests with zero failures and one unchanged optional desktop-dependency skip; syntax also passed. Earlier full-suite/test-maintenance evidence remains recorded in the core report. No known failing test was suppressed or broadened to obtain these results.

## Reproduction and artifacts

From the working tree:

- `node tests/helpers/profile-fog-core.mjs measure <output.json>`
- `node tests/helpers/confirm-fog-step-profile.mjs <output.json>`
- `node --cpu-prof --cpu-prof-dir=<directory> tests/helpers/profile-fog-core.mjs cpu phase1` (or `current`)
- `node --test tests/fog-phase1-parity.test.mjs`

Reports under `../qa-core/performance/`:

- `before.json`, `after.json`, `comparison.json`: component samples.
- `step-confirmation.json`: longer fixed-step samples and counts.
- `phase1.cpuprofile`, `current.cpuprofile`, CPU summaries/run records: built-in sampling evidence. Sampling includes fixture restoration/setup and is diagnostic, not a clean timing comparison.
- `audience-allocation-counts.json`: identical damage/event counts and eliminated circle construction.
- `phase1-parity.txt`, `fog-all-focused-final.txt`, `syntax-final.txt`: test/check results.
- `core-optimization.diff`, `final-core-hashes.json`: the exact runtime change and immutable-source verification.

Desktop remembered-building presentation is a separate synthetic scene check owned by the UI report. Native mobile/short-landscape remains blocked by the previously recorded organization policy; this work did not retry or bypass that restriction.
