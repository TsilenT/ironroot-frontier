# Physical-map portable backups

## Scope and status

The 0.9 map extension changes only the portable validator in `dist/backup.js`
and adds `tests/map-backup.test.mjs`. It does not change storage adapters,
profile-session ownership, rollback, campaign progress, authored mission
factories, storage keys, file upload behavior or network access.

Prepared and tested in an isolated candidate while the 0.8 runtime was frozen.
At the isolated checkpoint, all 16 new map-backup tests and 82 existing
backup/persistence/profile-session tests passed (98 total). Syntax validation
of the backup module also passed. After the freeze was released, the same
98 tests passed against the integrated engine and backup files. The integrated
`npm test` checkpoint passed **354/354**, and `npm run check` passed.
This is not a browser, public release or device
sign-off. Any later engine/app edits require another final aggregate run and
the browser recovery checklist in `BACKUPS.md`.

## Public API remains unchanged

Continue to use `createBackup(storage, options)`, `parseBackup(text)` and
`restoreBackup(storage, text)` exactly as documented in `BACKUPS.md`.

- Backup wrapper remains `ironroot-backup`, version **1**.
- Canonical battle wrapper remains `ironroot-save`, version **2**.
- All five existing data domains remain mandatory. No map storage key is added.
- Raw engine saves and old version-1 battle envelopes are still accepted and
  normalized to the existing version-2 battle envelope.
- Map identity belongs inside the versioned engine save, never alongside the
  battle envelope or in engine `state`.

### Engine field allowlists

Version 1 keeps the exact Classic schema and field order:

```
version, difficulty, seed, ai, nextId, aiTimer, accumulator, tick, state
```

Version 1 rejects either `mapId` or `mapRevision`; it never guesses a new map
from coordinates. This preserves historical valid non-grid Classic buildings.

Version 2 adds only these two required fields:

```
version, mapId, mapRevision, difficulty, seed, ai, nextId, aiTimer,
accumulator, tick, state
```

`Game.restore` is the authority for map/revision and geometry validation.
Current version-2 identities are `long-march` / revision `1` and `twin-span` /
revision `1`. Version 2 with `classic`, a missing/unknown map, a missing/wrong
revision or any unsupported version is rejected. No descriptor, map dimensions,
route, executable callback or free-form metadata is accepted.

Entities retain their existing schemas. The restored map determines valid base
coordinates, site membership and uniqueness, building count, lane indices,
frontline, unit limits, effects and projectile endpoints. Long March accepts
valid right-side coordinates past the old 3200 world boundary; it does not
accept coordinates past its own 4000 boundary. Twin Span has no third lane.

### Authored missions stay Classic

Any battle with a campaign or field-trial ID must restore to
`game.map.id === 'classic'`. This check occurs before mission evaluation,
independently of difficulty, AI and campaign-unlock checks. A valid skirmish on
a new map cannot masquerade as an authored mission. All 12 existing campaign
factories and all 5 trial factories keep their old engine-v1 saves and identities.

The ordinary app Resume path must enforce the same Classic requirement. This
backup extension does not itself change app routing or presentation.

### Optional map identity in recent results

A recent result may include `mapId` with an exact known ID from the engine
registry: `classic`, `long-march` or `twin-span`. The app should emit the field
only for a non-Classic skirmish. The validator also accepts an explicitly
provided `classic` value for compatibility.

- If `mapId` is absent, the canonical result keeps it absent. The app may display
  that historical result as Classic without rewriting its stored shape.
- If `mapId` is present, it is validated and retained as the final canonical
  field. `null`, an empty string, casing/whitespace variants and unknown IDs fail.
- An authored campaign/trial result cannot declare a non-Classic map.
- History does not accept `mapRevision`, a map descriptor or arbitrary metadata.
- Existing nullable mode-ID and draw-flag normalization remains unchanged.

## Fail-closed behavior and recovery

Malformed/unsupported incoming data is rejected before any destination storage
read or write. `parseBackup` still throws `BackupError`; `restoreBackup` still
returns its existing structured failure. Unknown map data never silently
falls back to Classic or removes a stored battle.

Export attempts preserve all original stored bytes, including unknown-map and
future-revision payloads. An explicit `includeBattle: false` still skips the
stored battle read and emits `battle: null`, which intentionally removes the
destination battle on a successful import. No hidden migration writes occur.

All original size, prototype, plain-object, dense-array and strict field checks
remain active. In-memory overrides do not invoke accessors or `toJSON`. Parsed
backups, engine restoration and export overrides do not mutate their inputs.

The import barrier and rollback contracts are unchanged. A successful data
replacement is not permission to reload until its ready marker is verified.
A failed ready-marker write retains the exact outcome for retry and keeps both
old and importing tabs read-only. Quota failures continue to restore and verify
original raw bytes where possible. Existing incomplete-rollback and concurrent
ownership-loss behavior remains covered by the original regression suites.

Older 0.8 backup clients reject new-map engine-v2 payloads as unknown fields.
They do not misload the new battlefield as Classic. Old Classic exports and
canonical results remain byte-for-byte identical in seven frozen golden cases:
empty, fresh Classic, partial accumulator, off-grid Classic, trial, campaign,
and historical results with partial settings.

## Verification

Run from the candidate/project root:

```sh
node --test tests/map-backup.test.mjs tests/backup.test.mjs tests/persistence.test.mjs tests/profile-session.test.mjs
node --check dist/backup.js
```

Before release, also run `npm test`, `npm run check`, map-engine gates and the
real-browser backup/recovery checklist. The focused tests do not replace them.

The 16 new tests cover:

1. Frozen 0.8 export and canonical-byte digests, including unchanged absence of
   map fields in historical Classic data.
2. Create, parse, import, restore and re-export of all three maps, unchanged
   wrapper versions, no-op identical imports and unrelated-key preservation.
3. Raw and version-1/version-2 battle envelopes with separately versioned engines.
4. Live-projectile combat saves, partial accumulators and deterministic replay
   after import on every map.
5. Missing/unknown/mis-versioned map identity and revision; rejected v2 Classic.
6. Map/base/frontline/site/lane mismatches, duplicate sites and per-map capacity.
7. Long March far-right entities, effects and projectile coordinates, all six
   projectile endpoint bounds, unit bounds and Twin Span's invalid third lane.
8. Strict nested allowlists, excluding descriptors and unrelated metadata.
9. Classic-only admission for all 17 authored missions/trials.
10. Optional history map identity, unchanged historical shape and invalid
    authored-map combinations.
11. Original-byte preservation on unknown-map export failures and explicit
    battle exclusion.
12. Immutable overrides/inputs, independent restored copies and rejected getters.
13. Both new maps with quota failures at each of the five write positions.
14. Both new maps with finalization quota failure, exact-outcome retry, stale-tab
    guards and verified reload eligibility.
15. Ordinary save envelopes, optimistic stale-battle protection and unchanged
    storage/network surface.

The original 82 tests additionally retain complete/incomplete rollback, denied
reads, write-then-throw adapters, persistent quota, recovery/export isolation,
marker takeover, stale dirty progress and the existing isolated app-handler
regressions. No persistence/profile-session code was changed for this work.

### Golden provenance

The seven golden pairs in the new test were captured from the frozen 0.8
modules before the map-aware backup edit. Each pair is SHA-256 of the exact
pretty-printed export text and of `JSON.stringify(parseBackup(text))`.

- Original engine: `0e94556092df4c5b74f6002bfb8e70fe8477b9e66363e17485b6c083373bd889`
- Original backup: `cc82a7a073184eff43e6465ea652fae7ab9cd3afee93e49653c4d9fd1b896fbc`
- Engine at initial isolated 98-test checkpoint:
  `160080816f78e6b957ddcb0f00e1ab07be7cea849409a6f954a3eb4f5adde040`

Do not regenerate the old-byte goldens merely because a new implementation
produces different bytes. Investigate and explain any intentional compatibility
change first.
