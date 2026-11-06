# Battlefield engine geometry and compatibility gates

Date: 2026-11-06 UTC. This report covers the engine increment only. It is not a
new-map balance certificate, browser/device result, or deployment approval.

## Implemented scope

The simulation supports Classic (3200×900, three roads, 24 sites per side),
Long March (4000×900, three roads, 24 sites), and Twin Span (3200×900, roads at
340/560, 16 sites). New maps enforce exact owned sites; Classic retains its
historical continuous build rectangle. Map geometry, base positions, lanes,
spell/projectile bounds, unit movement, frontline and AI coordinates all use
an immutable per-game descriptor. There are no unit, damage, range, production,
economy, path-following, target-order or terrain-bonus changes.

The original 0.8 engine is retained only as a test fixture:
`tests/fixtures/engine-v0.8.js`, SHA-256
`0e94556092df4c5b74f6002bfb8e70fe8477b9e66363e17485b6c083373bd889`.
The geometry candidate engine SHA-256 is
`e47a168c099c2a4e1f45b238d5224cb44a02433a7cff06adbfb87095c4d56bc7`.

## Public API

`MAPS` is a deeply frozen registry keyed by `classic`, `long-march`, and
`twin-span`. Each descriptor contains `id`, `revision`, `name`, `width`,
`height`, `lanes`, `startingLane`, `buildLimit`, and `siteColumns`.
All current revisions are 1. Site columns are ascending home distances
`[270,410,550,690,830,970,1110,1250]`.

- `getMap(mapId='classic')` accepts a registry ID string and rejects unknown IDs.
- `new Game({mapId='classic', ...})` has an immutable `game.map` reference.
- `homeX(map,side,x)` and `worldX(map,side,distance)` reflect right-side
  coordinates with `map.width-x`; left-side values are unchanged.
- `laneFor(map,y)` returns the nearest lane index. Midpoint ties select the
  lower lane index, matching the original engine.
- `buildBounds(map,side)` returns `{minX,maxX,minY,maxY}`. Vertical bounds
  are 180–720; horizontal bounds are 200–1320 in home coordinates.
- `buildSites(map,side)` returns a fresh array of `{x,y,lane}` values in
  lane-major, ascending-home-distance order. Caller mutation cannot alter maps.
- `WORLD` and `LANES` remain Classic compatibility exports. Game creation
  neither modifies nor aliases their values into mutable map descriptors.

The engine remains self-contained with no relative imports, so existing
`data:`-URL benchmark/audit imports continue to work.

## Save contract

Classic serializes the exact original version-1 key order and shape:
`version,difficulty,seed,ai,nextId,aiTimer,accumulator,tick,state`.
It contains no map field. Legitimate historical non-grid saves are accepted.
Version 1 explicitly rejects `mapId` and `mapRevision`.

Nonclassic games serialize version 2 with keys:
`version,mapId,mapRevision,difficulty,seed,ai,nextId,aiTimer,accumulator,tick,state`.
Version 2 requires an exact supported nonclassic ID and revision. Classic v2,
unknown revisions, missing identity, and extra top-level fields are rejected.
There is no map inference or fallback. Descriptors are not serialized.

Validation uses the chosen descriptor for bases, frontline, all world positions,
unit bounds, lane indices, building ownership/site membership, per-side caps,
duplicate sites, effects and every projectile endpoint. Existing finite-number,
prototype, maximum-size, health, money, flight, winner and ID checks remain.
Restore validates before cloning and never mutates the supplied snapshot.
Campaign/trial identity admission and outer wrappers remain the app/backup
layer's responsibility; these authored games must stay Classic.

## Reproducible tests

Run the dedicated engine gates with:

```sh
node --test tests/map-parity.test.mjs tests/maps.test.mjs tests/maps-ai.test.mjs tests/maps-smoke.test.mjs
```

Coverage includes:

- Byte-for-byte serialized Classic equality against the frozen engine at
  opening, paid build/upgrade/sell/spell actions, combat, partial-accumulator
  resumes, overtime, full 24-site frontiers, collapse and terminal checkpoints.
  Adjacent-representable floating-point thresholds also retain the original
  Classic arithmetic for historical non-grid coordinates. Complete comparisons
  cover three difficulties, multiple fixed seeds,
  automatic AI and both manual AI orientations without changing random draws.
- All 12 authored campaign factories and five trials retain IDs, initial and
  live serialized state, restoration and deadline outcomes. The existing
  campaign policy/mastery and field-trial strategy suites also pass.
- All seven building types on every new-map site and side: 560 combinations,
  including upgrades, spawning, salvage and restore. Occupied taps never pick
  another site; Twin Span rejects all phantom third-lane placements.
- Both world edges, physical core convergence, real Long March cross-lane
  end zones, air/ground units, effects/projectiles beyond x=3200, legal rally
  bounds, 70-unit caps with no extra random draws, and full-site upgrades.
- Both AI orientations at values below/equal/above every home-distance
  threshold (550, 1550, 1450, 1250, 1650), counter priorities, legal placement
  preference, fallback lanes, normal's opening screens and randomized mines.
- Malformed identity/revision/site/lane/entity/projectile cases, duplicate sites,
  immutable restore inputs, exact continuation and interleaved maps.
- Twenty-four complete new-map games (two maps × three difficulties × two
  player orientations × two seeds), repeated restore checkpoints, legal
  positions/caps and gold ledgers accurate to 1e-6. These ended in
  101.9–267.1 seconds; none needed overtime/collapse. Separate idle and empty
  board runs verify terminal states and simultaneous collapse on both maps.

The dedicated final engine gates passed 68 tests, zero failed. The integrated
aggregate on the final engine ran 355 tests: 354 passed, with one unrelated
field-guide wording assertion failing (`tests/codex.test.mjs:195`: the existing
case-sensitive `Level-1` expectation versus new `Classic level-1` copy). All
engine, map, backup and renderer tests passed. The release owner must resolve
that assertion and rerun the combined aggregate. `npm run check` passed on the
0.9 integrated modules. The 0.8 baseline fixture is deliberately excluded from runtime
assets and service-worker caching.

## CPU benchmark

`node --expose-gc tests/benchmark.mjs` completed on Node 24.22.1 / AMD EPYC 9V74.
The saturated Classic workload held 140 units and 48 structures for 2,400
steps: mean 0.415 ms/step, p95 1.3234 ms, p99 2.878 ms, peak 5.4374 ms.
Fifty complete matches and 116 restore checkpoints passed. These are
CPU-only numbers, not browser frame rates, and one run is not a regression
confidence interval.

## Remaining release gates

Independent new-map balance audits, renderer/UI/backup integration tests,
frozen-candidate browser checks, offline update checks, physical mobile-device
checks, and human play remain separate. The 24 smoke runs are too small and
use too few policies to support claims of balance, safe economy or fairness.


## Combined integration checkpoint

After the UI codex wording and the new VM test setup were corrected, the combined local 0.9 source passed 361 tests, zero failures/skips/TODO, and JavaScript syntax checks. The engine remains `e47a168c099c2a4e1f45b238d5224cb44a02433a7cff06adbfb87095c4d56bc7`; those later fixes changed no engine behavior. Independent map balance and browser reviews are separate and were still running at this checkpoint.
