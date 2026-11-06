# Progressive roads and crossing flyers: isolated playtest prototype

Exploration based on `24eddda` (v0.12 candidate 3), on branch
`explore/progressive-lanes-and-air-crossings`, in `/workspace/ironroot-lane-lab`.
No merge, push, deployment, production runtime edit, or campaign-onboarding edit.

## Findings and recommendation

Try the **authored one → two → three-road campaign pilots** with human players.
Do not infer easier combat from fewer roads. The one-road skirmish concentrates
the existing AI's spending, counter units, splash and targeting into one front.
It defeated every tested Normal/Hard player policy. Even on Easy, only the
warrior rush won this sample. Authored fixed deployments give a more useful
opening-learning probe than simply relabeling that AI match as an easy mission.

Keep **crossing flyers experimental**. The bounded rule is playable, announced,
saveable and counterable, but the tested variants changed no paired skirmish
win/loss outcomes. They can also weaken authored air pressure: converging all
outer flyers into one defended road removes the need to answer separate raids.
The current data does not justify enabling this rule in the existing campaign.

Roads expand **between missions**, never while a battle is running. This avoids
silently creating threats, remapping live buildings or objective IDs, changing
site caps mid-save, or teaching several mechanics at the same instant.

## What was inspected before implementation

- `dist/engine.js`: frozen per-game map identity; actual lane-count AI/site rules;
  seeded 0.05-second simulation; logical lane filtering before distance tests;
  physical-distance tower/rally targeting; 70 units per side; mine/build limits;
  fixed-step damage queue, overtime and collapse; v1/v2 save validation.
- `dist/campaign.js`: original first mission already puts all forces on the
  middle road, despite showing three available roads. Mission two immediately
  uses all three. Mission three protects original outer mines and checks income
  at its exact deadline. IDs/coordinates/lanes identify original target buildings.
- `dist/app.js`, `render.js`, `backup.js`, training integration and map tests:
  the production map picker enumerates all `MAPS`; renderer registration, backup
  allowlists, one-lane labels, frozen runtime hashes and historical fixtures make
  a casual new map entry unsafe for concurrent onboarding work.
- Existing map/AI balance records: lane count already changes concentration,
  rush viability, mines' opportunity cost and tower cross-road support. A rear
  mine's nominal 76-second repayment does not establish a useful opening.

## Isolation and implementation

Everything executable lives under `qa/lane-lab/`, with one new dedicated test
file under `tests/`. All 33 `dist/` files, existing tests, campaign mission IDs,
stars, progress, saves, backups, package metadata and offline shell are unchanged.

The lab engine is an explicitly pinned **QA fork** of the short engine at the
base commit, sharing production roster/prices/helpers. This deliberate duplication
keeps prototype rules out of frozen runtime code. It is not the architecture for
a shipped feature. Nine paired all-roster/AI runs check exact state, RNG and
save parity on all three release maps and difficulties. Rebase and rerun parity
before using this fork against another engine revision; the coverage is sampled.

The independent lab renderer uses simple shapes, labels and native controls.
There is no production renderer change, storage access, service worker, campaign
reward, backend call, or automatic lab-save export/import. The UI is intended for
review and human playtests, not as finished game art or accessibility work.

## Fixed maps and authored pilots

All maps retain the 3,200 × 900 world, original base health, costs, speed, ranges,
income, spawn rates, mine cap, unit cap and endgame rules. Sites use the same eight
columns per road. Descriptors and route tables are frozen.

| Lab map | Road centers | Sites per side | Crossing rule |
| --- | --- | ---: | --- |
| `single-road` | 450 | 8 | None |
| `two-roads` | 340, 560 | 16 | None |
| `three-roads` | 260, 450, 640 | 24 | None |
| `two-roads-crosswind` | 340, 560 | 16 | Each road to the other |
| `three-roads-crosswind` | 260, 450, 640 | 24 | Each outer road to middle; middle stays |

Three mines consume 37.5% of a single road's sites, versus 18.75% on two roads
and 12.5% on three. Production and defense have to compete for that land.

| Pilot | Source setup | Explicit adaptation |
| --- | --- | --- |
| First Road | Emberwatch | Original middle-road forces/target become the only road; retain gold, health, deadline and fixed enemy |
| Divided Front | Three Roads | Original outer roadblocks become north/south; original middle player barracks and enemy archers move north; retain economy and deadline |
| Full Front | Winter Stores | Original three-road formations, protected mine identities, gold, health, income check and deadline |
| Crosswind Air | Wings of Ash | Later optional transfer probe; original outer aeries remain targets, routes converge their gryphons toward the middle |

These are separate lab IDs. No campaign factory accepts them. No original
mission is rewritten. Two-road force redistribution is an authored change,
not a controlled test of lane count alone. The pilots omit stars/unlocks and
retain only their relevant destroy/protect/income/citadel/deadline outcomes.

## Crossing contract and counters

1. Only gryphons spawned on an authored route receive route data. Ground units,
   middle-road gryphons on the three-road map, and all ordinary maps keep their
   existing behavior and object shape.
2. Each eligible gryphon approaches the fixed gateway at **1,400 home-distance**.
   Right-side coordinates mirror left-side coordinates. Entry can overshoot by
   at most one normal 4.2-unit step; there is no teleport back to a marker.
3. It stops and visibly warns for **40 fixed steps / 2 seconds**. Intent arrows
   show the destination before arrival. The warning ring shows remaining time.
4. It crosses vertically at **84 units/sec**, retaining physical x. Nominal
   transit is 2.30 seconds for 190 units or 2.65 seconds for 220 units after step
   rounding; real spawn jitter/position can vary the starting y slightly.
5. It cannot attack while warning or in transit. It remains flying and damageable.
   Logical lane changes on landing; the completed marker prevents any second
   crossing, including after retreat or save/restore. Normal advance then resumes.

All route phases and crossing moves resolve together before unit combat targeting,
so opposing units see the same crossing snapshot. Towers retain the original
structure-first targeting order and observe positions before that route prepass.
No routing RNG is drawn;
no pathfinding, weak-lane search, adaptive destination, obstacle bypass, hidden
speed bonus, repeated lane hopping, new unit type or new price is introduced.

During transit, archers (or other existing anti-air units) in either connected
road can acquire that flyer **within ordinary Euclidean range**. On landing,
ordinary lane filtering resumes. Towers already use physical range across roads;
rally strikes also hit air. Warriors, siege and wizards still cannot hit flyers.
Dedicated micro-tests verify both archer lanes, tower and rally damage, retained
air immunity to ground-only attacks, and the flyer's inability to fire mid-route.
Micro-tests position units directly to isolate targeting; those fixtures are not
the paid-action balance sample.

## Save compatibility

Lab snapshots use `version:3`, `ruleset:'lane-lab-1'`, the exact lab map ID and
revision. Route data is only `{from,to,phase,remaining}` with fixed phases
`approach`, `warning`, `transit`, `done`. Validation checks strict fields, authored
adjacency, current lane, timers, gateway/transit bounds and existing entity limits.
Malformed/future lab snapshots fail without mutating their input.

The lab accepts ordinary release snapshots and preserves their v1/v2 shape.
Production restoration rejects v3 lab snapshots. Production backup import rejects
every lab map before any storage read/write. The browser lab itself has no save
slot or persistence integration, so it cannot replace an in-progress campaign.

## Measured skirmishes

`balance-results.json` records **1,056 complete games**, six paid-action policies,
four spread seeds (`51001`, `3052302604`, `4010181097`, `2367780941`), both physical
sides and both opening decision orders. Normal/Hard cover all five maps; Easy is
an additional single-road diagnostic. Each row below has 16 games. Bots decide
every five simulated seconds; the rival uses normal seeded AI cadence and its
ordinary paid spells. Player bots do not cast or salvage. Screened-air first
establishes ground screens, then alternates archers and aeries.

| Policy wins / 16 | One road Easy | One road Normal | Two roads Normal | Three roads Normal | Two roads Hard | Three roads Hard |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Warrior rush | 16 | 0 | 16 | 0 | 0 | 0 |
| Mixed arms | 0 | 0 | 12 | 16 | 0 | 8 |
| Three mines first | 0 | 0 | 0 | 0 | 0 | 0 |
| Air first | 0 | 0 | 0 | 0 | 0 | 0 |
| Screened air | 0 | 0 | 12 | 16 | 0 | 8 |
| One road only | 0 | 0 | 8 | 8 | 0 | 0 |

All single-road Hard rows also win 0/16. The crossing variants have the same
win counts as their corresponding plain maps: **0 outcome changes in 384 matched
pairs**. Mean duration changes across all policies are +2.069 seconds on two
roads and +0.023 seconds on three. Most non-air games do not exercise a route.
Of 192 games per crossing map, 44 two-road and 56 three-road games observe at
least one landing; total landings are 150 and 172 respectively. Do not interpret
unchanged outcomes across this small sample as proof of equivalent balance.

All games end in **76.15–182 seconds** without overtime, collapse or the 70-unit
cap. Long-game/cap behavior is therefore covered by focused tests, not inferred
from these ordinary matches. Each match checks gold/world/site/lane/entity limits.
There are **3,394 checkpoints** comparing restored and uninterrupted next fixed
steps, plus final save validation. Detailed per-side/order outcomes and openings
are retained in the report.

### Reproducible failure cases

All examples below use player on the left and player-first opening order:

| Map / policy / seed | Result |
| --- | --- |
| One road, Normal mixed, 51001 | Defeat at 103.60s; enemy citadel remains at 6,000 HP |
| Two roads, Normal mixed, 4010181097 | Defeat at 124.20s despite this policy winning 12/16 overall; enemy 5,700 HP |
| Three roads, Normal focused, 51001 | Defeat at 103.10s; enemy 6,000 HP |
| Three-road Crosswind, Normal air, 51001 | Defeat at 107.10s; 3 warnings and 2 landings; no proof that mobility rescues a poor opening |

## Authored campaign probes

`pilot-results.json` retains **80 games** across four seeds and reference,
alternative and idle routes. First Road reference clears 4/4 (mean 37.075s),
Divided Front reference clears 4/4 (53.85s), and Full Front reference clears 4/4
at its 150s income deadline. Idle clears none of these. This establishes bounded
playable setups, not human comprehension, challenge or an optimal learning curve.

Failure/limitation cases matter here:

- Full Front mixed and economy policies also clear 4/4, but **all eight win by
  destroying the citadel early**, bypassing the income lesson. That alternative
  victory comes from the existing mission contract. A future onboarding design
  must decide whether demonstrating income is actually required before changing
  its reward/deadline/save semantics.
- Crosswind Air idle lasts to the 210s deadline and still fails, versus mean
  132.588s citadel defeat without transfers. Convergence can reduce pressure.
- Outer-road archer cover clears 4/4 both with and without transfers and is faster
  than the destination-cover policy in both cohorts. The transfer prototype does
  not demonstrate a need for the proposed new response. Do not retune the enemy
  to manufacture that conclusion in this branch.

## Review and reproduction

From this worktree, serve the **repository root**, not only `dist/`:

```sh
python3 -m http.server 8765 --bind 127.0.0.1
# Open http://127.0.0.1:8765/qa/lane-lab/
```

Choose a pilot under Scene, then Start selected scene. For the transfer rule,
use Route demo, Speed 4× and Crossing gates. Its symmetric free aeries, archers
and towers are explicitly labeled as an authored diagnostic formation; it is
separate from the 420-gold standard-battle balance matrix. Keyboard/site controls
allow paid building, upgrades, salvage and rally. Pausing permits paid actions.

```sh
npm test
npm run check
npm run check:release
node --test tests/lane-lab.test.mjs
node qa/lane-lab/balance.mjs 4 --output qa/lane-lab/balance-results.json
node qa/lane-lab/pilot-balance.mjs 4 qa/lane-lab/pilot-results.json
# Optional, with Playwright installed and the root server running:
LANE_LAB_PLAYWRIGHT=/path/to/playwright/index.mjs node qa/lane-lab/browser-smoke.mjs
```

Browser smoke evidence in `qa/lane-lab/browser-evidence/` covers headless system
Chromium at 1280×1000 and 390×844. It verifies paid placement, road choices,
visible transit/landing counts, authored pilots, immediate protected-mine failure,
ended-pilot pause guard, no external requests, no page overflow, and unchanged
preexisting battle/campaign localStorage sentinels. Screenshots show the local
lab renderer. This is not production-renderer, physical-device, controller,
audio, performance, full accessibility or subjective human-playtest certification.

Before any production integration: choose the intended campaign teaching goals,
run human pilots, review a route rule that creates a useful decision, integrate
through an explicitly reviewed engine/map/save/UI contract, preserve old map
revisions and campaign targets, then run exact-commit release/browser gates.

### Required production integration contract

- Add new intro mission IDs while retaining old mission meanings. Campaign records
  are keyed only by mission ID; their `bestTime` is validated against the current
  deadline. Reauthoring an existing ID can reinterpret or discard real progress,
  even if engine battle saves carry a versioned map. Any alternative needs an
  explicit, reviewed progress migration, not an in-place mission/map replacement.
- Preserve old map IDs/revisions, target identities, existing mission deadlines,
  prerequisites and star interpretations. Decide separately how new intro progress
  joins the old graph and how already-completed profiles unlock or skip it.
- Extend the profile protocol before allowing a new production save format:
  fence older cached tabs from writes, preserve failed-write recovery, and test
  old/new-tab races, backups and resume. The lab's isolated v3 marker is not a
  production schema reservation or migration design.
- Version and validate route state with exact rules/map identity; update all
  production save-envelope, backup, renderer, scouting, guide, AI, controller and
  offline-cache contracts together. Keep old snapshots on their old rules.
- Recheck campaign objectives/rewards and frozen onboarding behavior on the exact
  proposed integration commit. Human onboarding and balance validation remain
  separate decisions; this branch authorizes neither a merge nor publication.

The pinned QA fork, generic AI and preliminary samples are remaining limitations;
there is no implementation blocker to reviewing this branch.
