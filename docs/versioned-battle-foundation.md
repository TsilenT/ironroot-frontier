# Versioned battle foundation

One shipped `Game` implementation owns all simulation. `dist/rulesets.js` holds immutable, whole-rule descriptors; the same registry is re-exported by `engine.js`. These definitions do not change during a game and old imports never follow the current selection.

## Engine API

- `new Game()` remains the historical Classic timed game, engine schema v1.
- `new Game({mapId:'long-march'})` remains a historical timed game, engine schema v2.
- `new Game({rulesetId, rulesetRevision:1, mapId, mapRevision:1})` creates engine schema v3. All v3 snapshots explicitly pin both identities, including Classic and the legacy roster.
- `game.ruleset`, `game.units`, `game.buildings`, and `game.map` are nonreplaceable and deeply frozen. `game.upgradeCost(building)` uses the bound roster.
- Exported `BUILDINGS`, `UNITS`, `SPELL`, and `upgradeCost` remain legacy-only compatibility aliases. They are not active-game selectors.
- `getRuleset(id,revision)` and `getMap(id,revision)` reject unsupported identities. `Game.restore` is pure and preserves v1/v2 serializer field order/shape. New rule/scenario fields are forbidden in old snapshots.

Registered rules, all revision 1:

- `frontier-legacy`: historical five units/seven buildings and forced timed core decay.
- `frontier-rootwarden-timed`: same historical policies plus Rootwarden/Warden lodge and timed core decay.
- `frontier-rootwarden-open`: same Rootwarden roster and five-minute escalation, without forced core decay.

Rootwarden: 800 HP, 8 damage every 1.5 seconds, speed 60, range 34, radius 17, ground-only, no arrow resistance. Warden lodge: 210 gold, 650 HP, 12-second production interval. Lodge appends after the seven historical buildings. Rootwarden attacks produce melee effects, never projectiles. No armor, taunt, target-priority, AI-purchase, economy or flyer-crossing change is introduced.

All rules retain escalation at 300 seconds: production ×1.65, troop structure damage ×1.75 and core shots 32→18. Timed policies retain the exact historical decay calculation after 420 seconds.

`MAPS` remains the released three-map picker. New immutable `INTRO_MAPS` are resolved by `getMap`: `intro-one-road@1` uses `[450]`, 8 sites; `intro-two-road@1` uses `[340,560]`, 16 sites. Both are 3200×900, starting lane 0, and reuse the historical eight columns. Shared admission permits these only with their authored scenarios.

## Shared codec and persistence

`dist/battle-codec.js` exports:

- `scenarioForBattle(challengeId=null,campaignId=null)`: canonical scenario reference. Trial/campaign identities are mutually exclusive.
- `identityOf(game,scenario)`: frozen `{ruleset:{id,revision},map:{id,revision},scenario:{kind,id,revision}}`; usable for ongoing or terminal observations.
- `resolveScenario(ref)` / `validateBattleIdentity(identity)`: strict registered pairing, including all original scenarios and two separate optional intro IDs.
- `decodeBattle(value,{campaignProgress})`: accepts parsed JSON or JSON text; returns `{game,scenario,identity,challengeId,campaignId}`. Rejects unsupported identities, raw v3 snapshots, lab formats, ended battles/objectives, wrong mission AI/difficulty/map/rules, locked campaigns, unsafe JSON, unknown fields and invalid geometry. Never writes storage.
- `encodeBattle(game,scenario,{campaignProgress})`: v2 envelope for legacy engine snapshots; v3 envelope for explicit engine identities. Validates by the same decoder before returning a candidate.

V3 envelope: `{format:'ironroot-save',version:3,scenario:{kind,id,revision},game:EngineSnapshotV3}`. Rule/map authority appears only inside the engine snapshot. Lessons remain unsaved practice. The 1 MiB UTF-8 battle bound is checked before parsing text and before a save write.

`writeBattle(storage,key,game,challengeId,campaignId,{campaignProgress})` retains its historical first five arguments. It now validates the entire candidate before touching ownership/storage. `getBattleWriteFailure(storage)` returns `null` or `{code,message}`. Invalid candidates report `invalid-battle`, leave previous bytes and ownership intact, and never become a storage error. Storage/session writes require successful readback. Existing profile and battle ownership checks remain the write boundary.

Modern history rows contain `{won,draw,difficulty,time,kills,built,date,identity}` without duplicated map/campaign/trial fields. Legacy rows keep their old shape. New history is validated before retaining/writing; deduplication includes the complete identity. History/outbox stay at 30 entries. Backup v1/v2 and protocol 3 details are in `versioned-backup-profile.md`.

## Supported session limits

Both Rootwarden rulesets support seven simulated days:

- Tick ≤12,096,000.
- Time ≤604,800.01 seconds (0.01-second floating-point tolerance).
- Next entity ID, gold and cumulative kills/buildings/damage ≤1,000,000,000,000.
- Integer fields remain safe integers. Existing income/cooldown, 70 units per side, 24 maximum buildings per side, 256 effects/projectiles and geometry limits remain.

Legacy validation is unchanged: time ≤10,000, tick ≤10,000,000, counters/IDs ≤1,000,000,000. Explicit v3 legacy-rule intro missions use these historical bounds.

Before each new-rule update, a local prospective fixed-step calculation checks the entire bounded call. A rejected call does not change state, accumulator, RNG, tick or counters, and never declares a winner. A near-boundary call can pause slightly early. Public build/upgrade/sell/cast commands also refuse at the boundary. `game.limitReason` describes an already-reached bound; callers must additionally inspect `game.update(dt)` for `{ok:false,code:'save-safety-limit',reason}` when the proposed call would cross it. No reset/bypass operation exists. Such snapshots remain viewable, saveable and exportable.

Growing counters pause above `1e12 - 1e7`. One admitted update has at most 10 fixed steps. Maximum live HP is below 250,000 per step across the admitted rosters/maps (140 units, at most 48 buildings, two cores), so the 10-million reserve exceeds all damage/counter growth in a call. New future content must re-establish this bound; do not reuse the allowance without review.

## Evidence

- `tests/versioned-engine-codec.test.mjs`: immutable isolation, exact Rootwarden kernel, old serializer shape, strict identities, three-hour simulation/restore, horizon/counter all-or-nothing guards, admitted headroom bound, accessor refusal, validation-before-write and identity history deduplication.
- `tests/versioned-backup-profile.test.mjs`: mixed/long history, intro progress/battle roundtrips, backup-v1 exclusion of new identities and protocol-3 fencing/failure retention.
- Historical persistence save fixtures now use their real authored factories; arbitrary generic games cannot be mislabeled as missions.
- Frozen source/trajectory comparisons and final browser/artifact verification are separate integration gates. No live release or frozen laboratory was edited by this foundation work.
