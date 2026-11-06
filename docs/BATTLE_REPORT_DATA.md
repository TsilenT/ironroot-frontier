# Battle Report data contract

Local 0.11 candidate. The report is a read-only current-match observation, not an engine change, a replay, a saved profile record, or a reconstruction of unobserved events.

## Integration

```js
import {createBattleJournal, exportBattleReport} from './battle-report.js';

// After authored setup, or immediately after Game.restore:
const journal = createBattleJournal(game, {
  resumed: false,
  mode: 'campaign', // 'skirmish', 'campaign', or 'challenge'
  id: mission.id,
  name: mission.name,
});

// After the app's existing advancement. Never drive the game from the journal.
journal.sample(game);

// Once the existing engine/objective evaluator has declared a terminal result:
const report = journal.finish(game, {
  objectiveOutcome,
  targets: getCampaignTargets(game, mission.id),
});
const json = exportBattleReport(report);
```

Skirmishes omit the finish options. `getChallengeTargets` has no `kind`/`side`; the caller must supply `{...target, kind: 'destroy', side: 1}`. Campaign targets use the existing evaluator's original authored IDs. The journal never searches for a replacement building at a target's old location.

Create a new journal for each new/restored `Game`; passing another instance throws before or after completion. `sample` returns whether it captured a point. Repeated paused times do not capture points. `finish` requires an engine winner or explicit terminal objective outcome and is idempotent for the same game. It forces a final snapshot even before the next regular sample. Sampling after completion returns false. Invalid supplied data throws without changing the game; the app should isolate report errors from play, saving and rewards.

Both methods can omit the game argument after creation. All returned report objects and nested data are frozen. No game, target, objective or map objects are shared into the report. Raw report text is text, not safe HTML; the presentation boundary must escape it.

## Version 1 JSON schema

Top-level format is `ironroot-battle-report`, version `1`. JSON has only the fields copied by the observer:

- `context`: `mode`, nullable `id`, `name`.
- `map`: `id`, `revision`, `name`, `width`, `height`, copied `lanes`, `laneCount`.
- `outcome`: `result` (`victory`, `defeat`, `draw`), `source` (`objective` or `engine`), separate `engineWinner` (`null`, `0`, `1`, `draw`), nullable `objectiveCompleted`/`objectiveFailed`, and evaluator/result `label`.
- `scope`: `resumed`, `startedAt`, `endedAt`, `observedDuration`, `missingBefore` (seconds before first observation), `fullTimeline`, `counters: 'full-match-engine'`.
- `sampling`: `nominalInterval`, `currentInterval`, `maximumPoints`, `observationCount`, `retainedPoints`, `thinned`, `thinningPasses`, `interpolated: false`.
- `initial`, `final`, and `timeline[]`: snapshots with `time` and `sides[0,1]`. Each side has `side`, `label`, `gold`, `income`, `mineIncome`, `armyCount`, `unitComposition`, `buildingCount`, `buildingComposition`, `baseHp`, `baseMaxHp`. Compositions contain every known type including zero counts as `{type,name,count}`.
- `observedPeaks[0,1]`: `side`, and `{value,time}` for `gold`, `income`, `armyCount`, `buildingCount`. Equal values retain the first observed occurrence.
- `cumulativeStats[0,1]`: existing full-match engine `side`, `kills`, `built`, `damage`.
- `objectives.items[]`: evaluator `id`, `type`, `label`, `met`, `failed`, `progress`, `value`, `target`, `text`.
- `objectives.targets[]`: resolved `kind`, `side`, `type`, `name`, `lane`, `x`, `alive`.
- `limitations[]`: explicit readable scope and measurement caveats.

`fullTimeline` means observation began at simulation time zero without Resume. It does **not** mean continuous coverage. Objective completion/failure determines the authored result while engine winner remains separately visible, including protected-structure failure despite an enemy-citadel kill. Optional stars and medals remain the existing result dialog's responsibility.

No timestamps from the wall clock, seed, IDs of runtime entities, engine save payloads, arbitrary object fields, credentials, functions, DOM, persistent state or external links are exported. Context and objective text fields have length limits. Numeric observations must be finite and nonnegative. Every array index must be an own entry; sparse arrays and inherited index values are rejected rather than being skipped or exported as null. The export helper accepts only authentic completed reports from this module instance, not arbitrary deserialized/user-supplied objects. Export returns a JSON string only; the app owns any local Blob/download action. There is no report import or durable-report API.

## Measurement rules

- Initial state is read after setup. Starting gold, starting health and authored building allocations are not inferred from vanilla defaults.
- Regular snapshots use elapsed simulation time, nominally every two seconds. Pauses and wall-clock speed do not manufacture observations. Large time jumps produce one real observation, never a filled-in series.
- At 257 retained points, first/every-second/final points are kept and the sampling interval doubles. Points retain original timestamps. This repeats for long sessions; the array never exceeds 256 points. An interval tolerance of `1e-7` accommodates engine floating-point times.
- A changed terminal state at the same simulation time replaces the last timeline point rather than producing duplicate timestamps. `initial` still preserves the initial observation. `observationCount` counts actual captured states, including such same-time changes; it can exceed distinct timeline timestamps.
- Observed peaks cover all snapshots captured by the journal, including those later removed by thinning. Unsampled events may exceed these observed peaks. There is no claim of true maximum army size, stockpile or income.
- Current income is five base gold/sec plus the alive mines' level-adjusted rate. It is calculated from current buildings because `state.income` can lag a purchase, upgrade, sale or destruction until the next tick. This is a current rate, not a receipt history, integrated income or estimate of spending.
- Unit/building compositions count only entities with positive HP. They are not lifetime spawns, construction losses or casualty counts.
- Kills, buildings placed and damage use existing engine counters. Buildings placed include starting allocations; upgrades do not add a placement. Damage includes credited damage against units and structures, but not automatic overtime citadel decay. No ownership of damage events is inferred from HP changes.
- Resuming starts the timeline at restored simulation time and explicitly declares earlier observations unavailable. Existing whole-match engine counters can still include the earlier portion. No report data is added to saves, history, backups or profile schemas.
- Objectives are copied from the supplied authoritative evaluation and resolved targets. The observer does not evaluate win conditions, grant stars/rewards, or invent causal coaching.

## Verification

`node --test tests/battle-report.test.mjs` passes 20 focused tests after the sparse-array validation hardening, covering:

- All three geometries and all 16 authored campaigns' initial allocations.
- Current living/leveled mine income, including stale cache and dead/sold mines.
- Pause, 1×/2× sampling, large gaps, zero-length/final observations, bounded thinning and observed versus unsampled peaks.
- Monotonic time, wrong-game calls before/after finish, terminal requirement, idempotence, finite input validation and rejected foreign export objects.
- Sparse engine/objective/target/counter arrays and inherited indices are rejected; a rejected finish leaves the journal usable for a later valid report.
- Deeply frozen input/output, detached object graphs, unchanged game bytes/prototype, old version-1/version-2 save restoration and no save/backup mutation.
- Engine draws and objective outcomes, original target identity despite replacement buildings, all campaign/trial deadline metrics, fixed-step objective termination at 1×/2×.
- Complete paired matches on Classic, Long March and Twin Span using the same seeded engine and paid actions with versus without observation. Serialized game state, random state, next ID, ticks and terminal winners match.

The engine SHA-256 is unchanged: `e47a168c099c2a4e1f45b238d5224cb44a02433a7cff06adbfb87095c4d56bc7`.

An aggregate `npm test` run after the data implementation completed with 477 tests: 476 passed, one existing skip, zero failures. `npm run check` also passed. This is a point-in-time result while UI integration was still underway; the final integrated candidate must be rechecked.

These are data-layer checks, not a claim of browser/mobile rendering validation, physical-device performance, competitive balance or publication. Aggregate checks and UI validation belong to the integrated candidate.
