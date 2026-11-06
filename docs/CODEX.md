# Roster and economy codex

The 0.8 field guide adds a read-only, DOM-free presentation module in `dist/codex.js`. It changes no simulation rules, balance values, saves, or renderer behavior. All art remains original 2D canvas/vector work. The codex's `portraitId` is the existing unit type accepted by `Renderer.drawUnit`, not a separate portrait asset or 3D model.

## Integration API

All exported data is recursively frozen. Engine objects are copied, never frozen or mutated. Text is plain text, not HTML.

- `UNIT_CODEX`: five ordered objects, each with `id`, `portraitId`, `name`, `role`, `silhouette`, `advantages`, `cautions`, `mechanics` (string array), `baseStats`, and `production`.
  - `baseStats`: `hp`, `damage`, `attackTime`, `range`, `speed`, `flying`, `canAttackAir`, `canAttackGround`.
  - `production`: `id`, `name`, `cost`, `hp`, `spawnTime`, `upgradeCosts`.
- `STRUCTURE_CODEX`: the watchtower and gold mine, with `id`, `name`, `role`, `cost`, `hp`, `advantages`, `cautions`, `mechanics`, and `upgradeCosts`.
  - Watchtower adds `range`, `damage`, and `attackTime`.
  - Mine adds `income` and `levels`. Each level object has `level`, `income`, `marginalIncome`, `cost`, and `bestCasePaybackSeconds`.
- `ECONOMY_GUIDE`: `scope`, `counterCaveat`, `startingGold`, `baseIncome`, `citadelHp`, `startingBuildings`, `killBounty`, `mineCap`, `buildingCap`, `unitCap`, `maxLevel`, `rallyStrike`, `notes` and `upgrades` string arrays, and an `overtime` object.
  - `startingBuildings` lists each free starting building as `{ id, name, level }`.
  - `overtime` exposes `startSeconds`, `productionMultiplier`, `unitStructureDamageMultiplier`, and `description`.
- `formatNumber(value, decimals = 2)`: deterministic numbers without trailing zeroes, with `—` for nonfinite/non-number input. Optional precision is bounded to 0–6 decimals.
- `formatSeconds(value)`: formatted number followed by ` s`.

Display `scope` and `counterCaveat` with the reference material. Label `damage` as **Hit**, `attackTime` as **Cooldown**, and `spawnTime` as **Repeat spawn** so the first production head start is not mistaken for a full repeat interval. Ranges and movement use world units, not CSS pixels. Cooldowns are nominal simulation values, not a DPS promise. Rounded labels never affect the underlying numeric fields.

Each `upgradeCosts` array is ordered level 1 → 2, then level 2 → 3. Those are separate payments, not cumulative prices. Mine `levels[0].cost` is the initial building price; later `cost` values are the price of that individual upgrade. `marginalIncome` is only the extra income bought by that payment, so later payback values must not divide an upgrade price by the mine's total income.

## Sources and numerical truth

Roster statistics, producer statistics, structure statistics, mine base income and rally strike values derive from `UNITS`, `BUILDINGS`, and `SPELL`. All upgrade prices call the engine's exported `upgradeCost`. Skirmish opening gold, income, free buildings and citadel maximum health are copied from a fresh deterministic `Game({ ai: false })`; no live match is read or modified.

Combat modifiers, caps and upgrade/overtime formulas are currently embedded inside `Game` rather than exported. The module has one private `RULES` object for these presentation facts. Its tests execute the real simulation to detect drift. If those engine rules change, update the copy and its assertions together; do not infer new mechanics by rewriting only descriptions.

Current notable values, verified against combat:

- Warriors take 55% of ordinary archer damage (9.35 at level 1), but 72% of watchtower damage (20.88). Citadel shots do not use either reduction.
- Warriors hit archers for 1.35× damage (28.35). Archers hit flyers for 1.5× damage (25.5).
- Gryphons hit structures for 0.6× damage (10.2). Siege hits structures for 3× damage (90).
- Siege and wizards splash only other enemy ground troops strictly less than 64 world units from impact. Their splash is respectively 45% (13.5) and 65% (15.6) of troop damage. No splash hits allies, flyers, or additional structures.
- Structure and overtime bonuses do not increase splash. Unit-level damage increases do apply.
- A siege engine's displayed 220 range reaches a building center at 255 because building targets subtract a 35-unit edge. Towers measure their 240 range center-to-center. This explains why isolated siege can outrange a tower without claiming 220 is greater than 240.
- Wizards have shorter range than archers. Ground splash can punish grouped archers but is not a universal or guaranteed counter.

The engine currently returns **199 gold**, not 200, for the mine's level 2 → 3 upgrade because its JavaScript floating-point expression rounds that way. The codex deliberately calls `upgradeCost` instead of replacing it with independently rounded numbers. Best-case marginal mine paybacks are 76 s, 106.4 s and 159.2 s. These are uninterrupted-income calculations excluding defense, destruction, lost tempo and salvage, not recommendations to always build or upgrade mines.

## Baseline versus modified matches

Base cards describe level-1 troops and buildings before overtime. Production-building upgrades improve future troop health/damage, not already spawned troops, and do not improve range, movement speed or attack cooldown. Campaigns and field trials can author different starting resources, health, formations and levels; their briefings take precedence over the skirmish opening reference.

Overtime begins at 5:00, multiplying current production rate by 1.65 and troop structure damage by 1.75. Citadel retaliation weakens. Escalating citadel damage after 7:00 prevents endless matches. These changes are called out separately rather than silently folded into base statistics.

## Verification

Run `node --test tests/codex.test.mjs` for the isolated module and `npm test && npm run check` for repository checks.

The focused tests cover every roster/producer record, actual HP and spawning, attack damage/cooldown/range/speed, all air-target permissions, numeric counter descriptions, strict splash radius and exclusions, structure/overtime separation, siege tower reach, current upgrade prices, marginal mine income/payback, skirmish symmetry, economy/entity caps, production upgrades, tower upgrades, recursive immutability, and formatter behavior. These checks do not substitute for browser review of the integrated guide, responsive layout, accessibility or portrait rendering.
