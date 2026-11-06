# Ironroot 0.12: isolated interactive training

`dist/training.js` adds five short, replayable lessons over the existing `Game`. It is an in-memory session controller, not a new combat implementation. Its only import is `engine.js`. The separate page/UI owns rendering, input, camera and final navigation.

## Isolation and unchanged rules

- Every lesson creates a new Classic `Game` with enemy AI off. Training never accepts or restores an active game, accesses browser storage, creates a battle envelope, records campaign/trial/profile progress, grants awards, writes history, or touches backups.
- Existing normal-game starting barracks are replaced by the explicitly disclosed training deployments. These are created with `Game._place`, the same setup convention used by authored missions. Gold is assigned only at lesson initialization. Enemy starting gold is 0.
- Citadels always start at 6,000 HP. All buildings start at level 1 with engine-defined health, range, damage and production. No combat values, production timers, unit speed, shield modifiers, cooldowns or damage rules are modified. No protection or scripted losses are used.
- Player construction and upgrades use the real `Game.build` and `Game.upgrade`, including their normal gold costs, legality checks and returned results. Training restricts those commands to the current marked action/site before calling the engine. There is no cast/sell/free-build interface.
- Simulation uses `Game.update` at the ordinary speed, capped at 0.25 seconds per call, with subcalls of at most 0.05 seconds to observe individual fixed ticks. Long frame gaps are not simulated as a large catch-up jump.
- The engine source remains byte-identical: SHA-256 `e47a168c099c2a4e1f45b238d5224cb44a02433a7cff06adbfb87095c4d56bc7`.

## Lessons and measured legal completions

All marked sites are in the middle lane (`y = 450`). The entire course is about 60 seconds of actual simulation plus freely paused reading and actions. Seed differences can slightly change combat timing.

1. **Raise the first company** (`first-barracks`): 280 gold, empty field. Build Barracks at `1110,450` for 140. Observe a real warrior spawned by that exact paid building. About 1.25 seconds of simulation, limit 75 seconds.
2. **Put shields in front** (`shield-and-arrow`): 350 gold, free friendly Barracks at `1110,450`, enemy Archery range at `1950,450`. Build Archery range behind the barracks at `970,450` for 175. Observe an actual enemy archer hit on a warrior and actual damage by a paid-range-produced archer while a living friendly warrior is ahead. About 8.5 seconds, limit 100 seconds.
3. **Fund the next company** (`mine-and-upgrade`): 330 gold, no starting buildings. Build Gold mine at `410,450` for 190. Observe two seconds of real 7.5 gold/second income. Upgrade that same mine to level 2 for 133, then observe two seconds of real 8.75 gold/second income. Four seconds total, limit 120 seconds.
4. **Break the stone line** (`siege-the-tower`): 540 gold, one enemy full-health Watchtower at `1950,450`. Build Siege foundry at `1250,450` for 270. Observe actual damage by a unit spawned from that foundry to the original tower ID, followed by actual destruction of that tower. About 31.7 seconds, limit 120 seconds.
5. **Answer the wings** (`answer-the-air`): 350 gold, friendly Barracks at `1110,450`, enemy Gryphon aerie at `1950,450`. Build Archery range at `970,450` for 175. Track a specific gryphon spawned by that enemy aerie during the observation, record actual damage by a paid-range-produced archer, and observe that same gryphon's real defeat. About 14.05–14.10 seconds, limit 100 seconds.

Paid-action completion is covered for seeds `0, 1, 7, 42, 12012, 2147483648, 4294967295`. The course is guided placement, not free play or a guarantee that an arbitrary army composition will win.

## Session API

```js
import {TrainingSession, TRAINING_LESSONS} from './training.js';
const session = new TrainingSession({seed: 12012, lessonId: 'first-barracks'});
const game = session.game; // Renderer input only. Do not call mutating methods from UI.
const view = session.snapshot();
```

`TRAINING_LESSONS` is deeply frozen. `snapshot()` returns detached copies of metadata, results and evidence so UI edits cannot change session control state.

Commands return `{ok, reason?}`. Successful build/upgrade commands retain the engine's normal building result.

- `build(type, x, y)`: only the current build type and exact listed site are allowed. Wrong actions, wrong coordinates, duplicate clicks, unavailable funds and actions during a watch are rejected without spending or advancing.
- `upgrade(id)`: only the original live level-1 paid mine in the current upgrade step can advance. Wrong or enemy building IDs cannot satisfy the step. Explicit selection and old-gesture rejection belong to the UI; numeric engine IDs may be reused after a fresh attempt, so the UI must also bind commands to `attemptId`.
- `continue()`: advances a completed action/observation, starts an instructed watch, goes to the next fresh lesson after completion, or opens the final review. It never bypasses an unfinished objective.
- `update(dt)`: advances only an active unpaused observation or explicit gold recovery. Invalid elapsed time is rejected. Instructions, completed steps, completed lessons, final review and closed sessions are inert.
- `setPaused(boolean)`: pauses/resumes the active simulation without changing objectives or phase. Paid actions and Continue are rejected while manually paused.
- `recoverGold()`: available only when the current instructed paid action is unaffordable. Runs real income and real combat, then pauses at the required cost without buying or completing anything.
- `retry()`: starts a clean instance of the current lesson with its disclosed starting grant. Time, observations, target identities, selections maintained by the UI and pending gestures must reset. The session increments `attemptId` and clears that lesson's previous terminal result.
- `skip()`: records an explicit skipped outcome, then starts the next fresh lesson or opens final review. A completed lesson stays completed if advanced through Skip.
- `startLesson(id)`: selects/replays any valid lesson in a clean instance. Clears only that lesson's prior result. Available from final review.
- `exit()`: permanently closes this session. Later updates and commands cannot resume it. A return to training must create a new `TrainingSession`.

The session's `game` reference is exposed for the existing renderer; it is not a security boundary against developer-console mutation. The UI must route all player commands through this API and discard selection/gesture state when `attemptId` changes. Old isolated game instances cannot feed observations into a later attempt.

### Snapshot fields

- `lessonIndex`, `lesson`: current metadata, setup disclosures, steps, gold and time limit.
- `stepIndex`, `step`: `id`, `kind` (`build`, `upgrade`, `watch`), title, prompt and honest success text.
- `status`: `instruction`, `active`, `step-complete`, `lesson-complete`, `failed`, `finished`, or `exited`.
- `paused`, `recovering`, `shouldRun`: rendering/input cues. `shouldRun` is true only for active unpaused simulation.
- `availableBuildings`, `targetHints`: allowed deck entries and recommended/current target coordinates, with labels and optional building/unit IDs.
- `canContinue`, `continueLabel`, `canRecoverGold`, `requiredGold`: control state.
- `feedback`, `objective`, `remainingSeconds`, `attemptId`: current UI guidance and reset identity.
- `evidence`, `lastResult`, `results`: actual observations and latest terminal outcome per attempted lesson.
- `summary`: `completed`, `skipped`, `failed`, `untried`, `total`. Finishing the session never converts skipped/untried material into completed lessons.

## Exact observation and causal limits

Training attaches non-enumerable read-only wrappers to `_spawn`, `_fire` and `_damage` on its own `Game` instance, never to `Game.prototype`. The original function receives its original receiver and arguments and is invoked once. Return values and thrown exceptions propagate. The observers do not consume random numbers or modify simulation objects.

- `_spawn` records genuinely added units and their actual producing building IDs. A preexisting or unrelated friendly warrior cannot satisfy Barracks production, and units from another producer cannot satisfy the paid range/foundry evidence.
- `_fire` carries the actual attacker/target identity into `_damage`.
- The engine queues damage FIFO within each fixed tick. Observation associates the queued calls with the later applied calls and records only positive actual HP loss. A projectile emitted after another queued attack has already killed its target receives zero credit.
- The shield and support observations use actual credited damage, not visual projectiles or global damage/kill totals.
- Tower/gryphon completion requires both actual credited damage from the required producer's unit and an actual later lethal-damage event for the same original target. The wording intentionally does not promise that the required unit landed the final blow. Target disappearance, replacement entities, unrelated kills and inflated aggregate stats do not count.
- Observation buffers are bounded at 1,024 events and drained each update. Every retry owns new buffers; continued updates on an old retained game cannot affect the new lesson.

Tests compare the entire serialized engine state against an unobserved `Game.restore` counterpart after every real fixed tick in all five lessons across three seeds. This covers economy, RNG state, units, health, cooldowns, effects, projectiles, IDs, counters and outcome. Observer wrappers are not serialized.

## Failure, recovery and restoration limits

There is no tutorial save/resume format. Refresh, navigation away or closing the page abandons in-memory results. Retry and lesson replay are the supported restoration paths; they create new attempts, not snapshots of an earlier tick.

- Any engine winner (including an unexpected early friendly win), defeat or draw ends an unfinished lesson as failed, rather than granting lesson completion. A same-tick engine result takes precedence over lesson evidence.
- An attempt fails when simulation time reaches its stated limit. Paused reading time does not consume it. Failure always offers retry/skip; nothing is written to real progression.
- All normal allowed actions are funded by the disclosed initial grants. Incorrect placements and repeated commands do not spend, so ordinary use cannot accidentally exhaust the lesson budget.
- The explicit gold-recovery path does not create gold or stop opponents. Tests zero the treasury defensively: barracks, mine/upgrade, siege and air lessons can recover through real income and finish. In the composition setup, a long wait can let the initial warriors destroy the practice enemy before the support action is bought. The original combat objective cannot be fabricated afterward: retry restores the disclosed setup and completes normally, or the attempt can be skipped/timed out. This is an honest recovery limit, not hidden enemy protection.
- External mutation of the exposed renderer game is not a supported player action. Tests inject adversarial states to verify that unrelated spawns, missing targets, casualty totals and zero-credit queued attacks do not produce false completion.

## Validation

Run `node --test tests/training.test.mjs` for module validation. The focused suite covers setup legality/costs, all-seed paid completion, original-engine parity, exact observation, premature and incorrect actions, real upgrade income, pause/resume, time caps, retry/skip/replay/exit, stale old-game buffers, gold recovery, engine outcomes, bounded failure, honest review and persistence separation.

Browser rendering, focus, touch/drag/cancel, viewport layout, bfcache and navigation are separate UI/browser work. These module tests do not claim physical device/controller or browser visual verification.
