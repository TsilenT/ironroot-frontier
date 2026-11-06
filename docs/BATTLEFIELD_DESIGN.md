# Physical battlefields: bounded 0.9 implementation contract

Date: 2026-11-06 UTC. **Design and isolated geometry probes only. No production
implementation, combat-balance pass, browser pass or release approval is claimed.**
The runtime was frozen for another worker's browser QA. This work changed no
`dist/`, existing tests, package metadata, remote repository or deployed game.

## Recommendation

Ship three skirmish choices: the existing map, **Long March**, and **Twin Span**.
Keep every existing campaign mission and field trial on the existing map.
Vary real world length, lane count and available construction sites first.
Do not introduce bent-road movement, obstacles, line of sight, terrain damage,
terrain speed modifiers or air shortcuts in 0.9.

This is a real spatial change, not a theme change: Long March adds 800 world
pixels between the front construction rows; Twin Span removes one battlefront
and eight sites per side. Both still use the shipped straight-road movement
and target rules. Theme remains a separate visual property.

| Approach | Concrete benefit | Additional risk | Decision |
| --- | --- | --- | --- |
| Straight roads with variable width/lane count/site count | Reinforcement travel, fronts to defend, land scarcity and concentration change | Many embedded constants must be replaced consistently; AI coordinates and save bounds must follow the map | Recommended 0.9 |
| Bent roads and converging routes | Stronger geographic identity; cross-road support and unequal routes | Deterministic path progress, corner handling, chasing, cross-lane eligibility, new unit save fields and terrain/route agreement | Separate subsequent increment |

Do not call the smaller option a trivial reskin. Conversely, parameterization
touches enough systems that it must pass legacy parity and migration gates
before becoming a public selector. If time is constrained, release Classic +
Long March first; keep Twin Span hidden until its separate concentration audit.

## Exact 0.9 geometry

World units are pixels. Height is always 900, vertical camera center 450, base
health 6,000, base centers `(110,450)` and `(width-110,450)`. Playable unit bounds
are `x=[75,width-75]`, `y=[180,720]`. No vertical pan is introduced.

| Stable map ID / revision | Width | Lane center y values | Initial barracks lane | Sites / building cap per side |
| --- | ---: | --- | ---: | ---: |
| `classic` / 1 | 3200 | 260, 450, 640 | 1 | 24 |
| `long-march` / 1 | 4000 | 260, 450, 640 | 1 | 24 |
| `twin-span` / 1 | 3200 | 340, 560 | 0 | 16 |

- Left sites on each lane are exactly `x=270,410,550,690,830,970,1110,1250`.
  Right sites mirror them with `x=width-leftX`. Do not reuse the old right-site
  array literally on Long March: its right sites are 2750 through 3730.
- Initial barracks: left x=410, right x=width-410, both on the listed starting
  lane. Twin Span starts both sides in its north lane, not at y=450 between lanes.
- Preserve Classic's existing continuous build-validation rectangle, including
  non-grid buildings in valid historical saves/tests. New maps accept only their
  enumerated sites. A snapped tap still tries its chosen site; it must not jump
  to a different empty site when the chosen site is occupied.
- Bounding territory checks remain left x=[200,1320], right
  x=[width-1320,width-200], y=[180,720]; site membership is an additional check
  on new maps. Keep 108-pixel separation, three-mine cap and all prices unchanged.
- World length is not inferred from state, theme, canvas size or campaign chapter.
- Keep the 70-unit cap per side and all spawn timers, speeds, counters, range,
  starting gold, income, overtime and collapse rules initially unchanged.

The outer bounds and two-lane rows stay inside the current vertical footprint.
The shorter two-lane list is intentional. Do not retain an invisible third lane
or let AI place/restore buildings into it.

### Measured spatial differences, not balance claims

Distances below are between opposing front site centers. Solo travel assumes
no combat, spawn offset or target stopping distance. Contact estimates assume
two same-lane warriors spawned simultaneously 48 pixels ahead of those sites,
zero lateral jitter and a 34-pixel attack range; they exclude the production
delay. These are geometry calculations, not outcomes of a playable new map.

| Measure | Classic / Twin Span | Long March |
| --- | ---: | ---: |
| Front site x values | 1250 / 1950 | 1250 / 2750 |
| Neutral crossing | 700 | 1500 |
| Warrior solo crossing, speed 64 | 10.94 s | 23.44 s |
| Siege solo crossing, speed 35 | 20.00 s | 42.86 s |
| Gryphon solo crossing, speed 84 | 8.33 s | 17.86 s |
| Opposing warrior contact after simultaneous spawn | 4.45 s | 10.70 s |

**Long March:** more warning and reinforcement delay; forward production is
more valuable than rear production. Slow siege must be escorted for longer;
faster air gains its existing speed advantage, not a special shortcut. The
extra opening contact delay is only 6.25 seconds. A base mine still takes 76
seconds to repay its 190-gold cost, excluding risk and opportunity cost. Do not
advertise a safe economic opening until actual mine-survival/repayment audits.
Longer travel also risks reaching the unit cap before armies engage, or making
overtime/collapse decide too many matches.

**Twin Span:** two lanes and 16 sites make one mine a larger share of available
land. Three mines consume 18.75% of sites, versus 12.5% on Classic. Fewer fronts
mean more units per front, stronger potential splash, and different production
versus tower tradeoffs. The 220-pixel row gap is below watchtower range 240 and
above archer range 205. A tower can support its neighbor near the same x, but
with less longitudinal reach than on Classic's 190-pixel row gap. A rally centered
between roads can hit both; one centered directly on a road cannot reach the
other road's center. There is no new collision/congestion rule.

Player-facing summaries should say “Three roads, longer reinforcement routes”
and “Two roads, 16 building sites per side.” Both should state that unit and
income rules are unchanged. Do not promise “balanced,” “easy economy,” or
“chokepoints slow enemies” on the basis of this document.

## Minimal implementation surface

### Map descriptor and engine

For three small maps, export a frozen registry from `engine.js` itself. This
avoids adding a relative module import to the engine: existing benchmark and
AI-audit tools load its source through `data:` URLs, where a new `./maps.js`
import would fail. A separate module is reasonable later with explicit harness
changes by its owner. Never change module-global `WORLD`/`LANES` when a game is
created; two games with different maps must coexist in one process.

Suggested descriptor fields: `id`, `revision`, `name`, `width`, `height`,
`lanes`, `startingLane`, `buildLimit`, and fixed shared site-column metadata.
Use `Game({mapId='classic', ...})` and a non-serialized immutable `game.map`
reference. Keep the current exported `WORLD` and `LANES` as Classic compatibility
constants for authored scenarios and existing callers. Unknown map IDs throw.

Use small pure helpers: `homeX(map,side,worldX)`,
`worldX(map,side,homeDistance)`, `buildSites(map,side)`,
`laneFor(map,y)` and `buildBounds(map,side)`. Both coordinate transforms are
`side===0 ? x : map.width-x`. Do not use a width-scaled percentage for combat
range, movement speed, threat distance or building spacing.

Integration anchors in the inspected source:

| File / function | Required change |
| --- | --- |
| `engine.js:22`, `Game` constructor at 25–29 | Per-game lane selection, base x, initial frontline `width/2`, explicit starting lane, mirrored starting barracks |
| `canBuild`, `_place` at 40–52 | Map bounds and site membership for new maps, dynamic cap/reason text, map lane assignment; retain Classic behavior |
| `cast`, `_spawn` at 55–57 | Spell world bounds, map lane centers; no new unit fields or random draws |
| `_step` at 72, 77, 87 | Enemy-base x for the existing cross-lane end zone; map lane y; x movement clamp and fallback/frontline bounds |
| `_ai` at 92–140 | Home-relative coordinates, actual lane count, map cap, legal candidate sites; see next section |
| `serialize`, `restore`, `validateSave` at 31–37, 145–187 | Versioned map identity, map-specific coordinates/lane/site/cap validation; preserve v1 Classic serialization |

Do not change `_step`'s simultaneous movement/damage ordering, distance math,
random calls, effect limits or target selection as part of this increment.
Replacing a coordinate literal is enough; a pathing rewrite is not required.
Avoid global search-and-replace: 1,600 is sometimes a world midpoint, 1,950 a
site/AI threshold, and 140 is also a cost or entity limit.

### AI: retain behavior, fix coordinate frames

The current `fx` at engine line 94 combines “reflect a world position” and
“turn a hard-coded right-side site into a build coordinate.” Those uses cannot
share the same literal `3200-x` transform on a 4000-wide map.

Represent threats by distance from the AI's own world edge, `h=homeX(...)`.
Translate existing thresholds exactly, retaining strict inequalities:

| Existing right-side comparison | Home-distance equivalent |
| --- | --- |
| production coverage `fx(b.x) < 2650` | `h > 550` |
| score pressure `fx(u.x) > 1650` | `h < 1550` |
| active pressure `fx(u.x) > 1750` | `h < 1450` |
| emergency tower `fx(u.x) > 1950` | `h < 1250` |
| rally eligibility `fx(u.x) > 1550` | `h < 1650` |

Placement preference in home distances is exactly:

- Mine: `[270,410,550]`.
- Easy production: `[690,830,550,970,410,1110,270,1250]`.
- Tower: `[1250,1110,970,830,690]`.
- Other production: `[1250,1110,970,830,690,550,410,270]`.

Use map lane enumeration in scoring and fallback; replace random mine lane
`floor(random()*3)` with actual lane count. Full-frontier upgrade logic uses
`map.buildLimit`, so Twin Span upgrades at 16 rather than waiting for 24.
Retain difficulty action budgets, timers, counter priorities and honest costs.
Classic must retain its exact purchase order and random sequence. Do not
silently compensate Long March with income or production bonuses.

Twin Span's possible two-road rally placement is an AI opportunity, not a
reason to redesign spell targeting in this same change. Audit it first. If
the existing unit-centered targeting is too weak, a later scoped targeting
change needs its own Classic parity decision and balance comparison.

### Rendering, input and navigation

- `render.js` constructor / `setTheme` / `makeTerrain` (124–214, 248–378):
  accept the descriptor, allocate terrain at its dimensions, draw actual road
  count, place river/bridges around `width/2`, and use map-side frontier bounds.
  A Long March landscape should visibly show its wider neutral expanse; Twin
  Span must actually draw only two roads and bridges. They need not add assets.
- Replace single `baseTerrain` reuse with a cache keyed by map ID, revision and
  theme, or keep only the current terrain. Setting the same theme on a different
  map must still invalidate geometry. Bound the cache; 4000×900 RGBA is about
  14.4 MB before theme copies, browser overhead and GPU textures.
- `clampCamera`, `snap` (216–246), slot drawing (399–418), and
  `drawMinimap` (1487–1522): use the descriptor. Minimap coordinates and visible
  camera rectangle divide by map width, not 3200. Keep world y transform at 450.
- `app.js` `start` (523–625): fresh skirmish uses selected map; restored game
  uses saved map. Campaign/trial creation explicitly stays Classic. Set the
  renderer map before clamping the initial/resume camera.
- `activateBattlePoint` (948–991): share the same map-site snap/validation path
  for pointer and controller. Keep cancel/drag/multi-touch safeguards. Existing
  broad territory margin can be descriptor-derived; no invisible new slots.
- Minimap pointer handler (1015–1020) must multiply by current width. Home stays
  x=450; Front stays the actual `state.frontline`. No zoom or second pan axis.
- `updateHUD` (around 1141), `index.html` skirmish config, field-guide wording:
  name the active map and correct lane/site counts. Keep existing campaign
  fiction and “three roads” mission text on Classic.
- Add a compact native map selector and static plan preview in skirmish setup,
  separate from difficulty. Changing selection does not replace the saved battle
  until Start. Selection can stay session-local in 0.9, avoiding settings-schema
  expansion. Resume label identifies its saved map, not the current selector.
- If result history gains optional `mapId`, update `finish()` and
  `backup.js:157–173` together. Missing historical map identity means Classic;
  reject unknown IDs. Do not add arbitrary descriptor data to history.
- Update offline shell version atomically after validation. If a new module is
  introduced despite the simpler recommendation, add it to service-worker FILES.

### Saves, backups and campaign identity

Classic continues to serialize engine version 1 with the exact existing shape.
Its runtime `game.map` reference is not inserted into `state`. New-map games
serialize engine version 2 with required `mapId` and `mapRevision`, plus the
unchanged engine fields. New maps need no route progress or new unit fields.
Reject v2 without an exact known map/revision. Do not silently fall back to
Classic or infer a map from the largest x coordinate.
Reject `mapId`/`mapRevision` on v1 rather than quietly treating a mislabeled
new-map payload as Classic; legitimate shipped v1 saves never contain them.

| Input | Required result |
| --- | --- |
| Raw engine v1, or existing outer v1/v2 battle containing engine v1 | Restore Classic without position, seed, tick, nextId or objective changes |
| Engine v2 for an exact supported new map/revision | Validate using that descriptor, then restore exactly |
| Unknown map/revision or mismatched dimensions/entities | Reject; retain stored bytes and existing load-warning behavior |
| Existing campaign or trial ID paired with a non-Classic game | Reject in normal Resume and backup import; never reinterpret authored targets |

Keep current storage keys, outer `ironroot-save` version 2, and campaign progress
version 1. The outer wrapper already carries a separately versioned engine
payload. The portable backup wrapper can likewise retain its version while its
engine allowlist explicitly handles v1 and v2. Old clients need not understand
new maps; they must fail clearly rather than loading them incorrectly.

`backup.js:175–192` currently rejects every extra engine field. Its version-aware
allowlist must change in the same patch as `Game.serialize`, not after launch.
`battle()` at 193–218 checks mission difficulty/AI but currently has no map rule;
add Classic identity there and to `app.updateResume` (732–777). A shared small
mission/map identity check is preferable to divergent admission logic.

`validateSave` must use map width for bases, frontline, all entity positions,
unit x limits, effects and projectile endpoints. Validate lane indices against
actual lane count, each new-map building against a legal owned site, per-side
building cap, and duplicate occupied sites. Retain all finite-number, size,
prototype, health, money, air/type and winner checks. Never serialize arbitrary
paths, function names or incoming descriptor objects.

Existing authored identities are fragile in a specific way: campaign target
IDs derive from `new Game({ai:false}).nextId`, then authored placement order
(`campaign.js:171`, `185–206`). Preserve default Classic initialization and its
two starting buildings/IDs exactly. Do not move existing formations, change
their lane indices, renumber missions or reset stars. All 12 mission factories
and five trial factories remain unchanged in outcome and serialization.
Campaign reuse of new maps is a later authored-content/balance project.

Map revision 1 is immutable once saves are public. A later geometry change
needs a retained old descriptor or an explicit tested migration, not an edit
that changes a resumed army's battlefield underneath it.

## Verification and release sequence

### Gate A: descriptor refactor, selector still hidden

1. Snapshot the current engine. Instantiate Classic before/after refactor with
   identical seeds and actions; compare serialized state byte-for-byte at
   opening, combat, overtime, full-frontier and terminal checkpoints. Include
   both side orientations and all difficulties. Existing tests are necessary
   but not a substitute for these whole-state parity comparisons.
2. Run existing `npm test`, `npm run check`, campaign policy/medal checks,
   AI rush boundary tests and CPU benchmark on the final candidate. Run all
   12 authored factories, five trials, save/restore and objective deadlines.
3. Independently verify simultaneous instances of different maps do not change
   one another's lane lists, spawn positions, AI choices or validation bounds.

### Gate B: each new map headless, no public claim yet

- Geometry: exact base/front positions, lane counts, site counts, mirrored
  ownership, 108 separation, opening placements, every building on every site,
  invalid third lane in Twin Span, out-of-map rally, and full-site upgrades.
- Movement: ground/air at both edges and the base convergence zone; no stuck
  units, x clamp at Long March's 3925, real approach to its core at 3890, and
  unchanged attack categories. Include structures and projectile endpoints
  beyond the old x=3200 boundary.
- AI: both side orientations, boundary values either side of every threshold,
  all counters, no illegal third-lane picks, full 16-site behavior, mine cap,
  normal's opening screen, and honest spend/income/refund/kill-gold ledger.
- Save compatibility: legacy raw/enveloped saves; v1 backup import; new-map
  backup export/import; mid-combat and partial-accumulator continuation equality;
  malformed map/version/site/lane data; campaign-map mismatch; immutable input
  snapshots; denied/quota/stale-tab writes; unknown-map bytes retained.
- At least eight fixed seeds per map/difficulty/policy/side/opening-order cell
  for rush-burst, single-lane rush, screened siege, anti-air combined arms,
  mine-after-two-screens and economy-save policies. Audit single-lane rush on
  every lane, not only the existing middle lane. Expand normal difficulty and
  suspicious cells to at least 32 paired seeds before a release decision.
- Record wins/draws, battle duration, first contact, peak/cap-saturated units,
  overtime/collapse reliance, structure lifetime, actual mine repayment,
  purchases by type/lane and spell use. Check mirrored outcome splits rather
  than hiding side effects in a mean. Investigate a greater-than-10-percentage-
  point side split as a warning, not a statistical fairness certificate.
- All runs terminate within 600 simulated seconds; no negative/NaN gold,
  invalid entities, illegal purchases or ledger error above 1e-6. Run repeated
  restore checkpoints throughout long matches. A dominant no-counter opening
  or economy that never recoups should block that map or trigger targeted tuning,
  not be averaged away across the other map.

### Gate C: native browser and device review on frozen candidate

Use the supported browser workflow in an authorized environment. Cover desktop
1180×757, 390×650 portrait, 320×568 portrait and 844×390 landscape; physical iOS
Safari and Android Chrome remain separate gates. No browser was run here.

For each map: preview/start, legal/occupied placement, drag without purchase,
minimap ends, home/front, spells, upgrade/salvage, pause, rotate/resize, Save &
return, reload/Resume, controller confirm through shared placement, victory/
defeat/retry and switching back to Classic campaign. Long March must show its
real right citadel on minimap taps, not stop at the old 3200 boundary. Twin Span
must not display/target a phantom middle or third row. Switching among maps
with the same theme must not reuse stale terrain. Include offline update from
the previous version and backups spanning the update.

Profile terrain memory, frame time, touch legibility and at least one long
maximum-unit match. The world-width change increases cached art memory even
without increasing the simulation cap. Human play must confirm that waiting
on Long March and crowded fighting on Twin Span are enjoyable. Headless tests
cannot establish that.

### Gate D: exposure and later scope

Expose only maps that passed their own gates; default to Classic. Publish with
accurate limitations and a versioned offline shell. Keep combat/economy tuning
separate from the geometry refactor so regressions have a clear cause. Add a
new campaign branch or road-following map only after these maps are stable.

This is a medium-size cross-module refactor, not a new navigation engine. The
work is best separated into descriptor/parity, new-map saves/AI, rendering/UI,
then independent balance/browser verification. No duration estimate should be
treated as permission to skip those checkpoints.

## Deferred bent-road alternative and probe evidence

Two possible later layouts were also explored in isolation:

- **Needle Pass:** retains 24 sites, bends outer roads from y=260/640 to front
  pads y=340/560, then to a neutral throat y=370/450/530 over x=1390–1810.
  Its 110-pixel minimum site spacing is legal. Ranged cross-road support and
  rally concentration would be meaningful, but the current lane-locked target
  rules make physically adjacent armies ignore one another. Do not ship the
  drawing without corresponding combat rules. There is no unit collision, so
  calling it a capacity-constrained choke would be misleading.
- **Forked Delta:** 7/8/9 sites on north/middle/south roads, frontier x=1110/
  1250/1390 mirrored, neutral crossings of about 983.74/700/427.39 pixels.
  Outer roads curve slightly to y=230/670 at the crossing. This creates different
  lane travel/land risk but introduces frontage-specific AI placement and path
  following. It is not needed to deliver the simpler 0.9 maps.

Exact experimental polylines and pure geometry helpers are in
`/workspace/shared/ironroot-map-design/geometry.mjs`. A future curved-road
implementation needs a canonical path-distance field per unit, deterministic
vertex traversal, road-following pursuit instead of direct vector shortcuts,
clear cross-lane attack rules, matching draw/snap/minimap geometry and strict
save/backup fields. Air should either follow the same road, explicitly explained,
or have an explicitly disclosed independently tested shortcut. Do not invent
ground-only slowdown fields that flying units silently ignore.

Isolated artifacts (not imported by the game):

- `straight-maps.mjs` / `straight-maps.test.mjs`: recommended 0.9 descriptor and
  geometry/AI-coordinate probes; **11 tests passed**, 0 failed.
- `geometry.mjs` / `geometry.test.mjs`: deferred bent-road coordinates and
  arc-length probes; **11 tests passed**, 0 failed.
- `straight-maps-results.txt`, `geometry-results.txt`: measured outputs.
- `inspected-source-sha256.txt`: source snapshot identification. Inspected engine
  SHA-256 was `0e94556092df4c5b74f6002bfb8e70fe8477b9e66363e17485b6c083373bd889`.

The probes validate counts, geometry, symmetry, transform boundaries and simple
arc-length arithmetic only. They do **not** modify or test a playable new-map
engine, real save migration, AI win rates, rendering or browser controls. The
production test suite was not rerun for this design-only change.
