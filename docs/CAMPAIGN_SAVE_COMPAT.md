# Expanded campaign save and backup compatibility

## Scope

The v0.10 candidate adds chapter five (`frontier`) with four missions:

| Mission | Required battlefield |
| --- | --- |
| `open-horizon` | `long-march` |
| `river-charter` | `twin-span` |
| `far-beacon` | `long-march` |
| `common-ground` | `twin-span` |

The first twelve missions and all five field trials remain Classic. The
campaign now reports 16 missions and 48 possible stars. A profile that cleared
all twelve original missions keeps its 12 clears and 36 stars and unlocks
Open Horizon; it does not gain fabricated expansion victories.

This work changes `dist/backup.js` and `dist/profile-session.js`, plus tests
and this document. Engine state formats, rollback algorithms, campaign score
records, storage keys, network behavior and file upload behavior are unchanged.
The parent app must opt into the new marker protocol before reading saves.

## Unchanged portable data

- Campaign: `ironroot-campaign`, version **1**; key `ironroot.campaign.v1`.
  The same `{completed, stars, bestTime}` record is stored under additional
  known mission IDs. No map/chapter fields are added to progress records.
- Backup: `ironroot-backup`, version **1**. Its five mandatory domains remain
  campaign, trials, settings, history and battle.
- Battle envelope: `ironroot-save`, version **2**. Mission identity stays
  outside engine state. Historical raw engine and version-1 trial envelopes
  retain their existing compatibility path.
- Classic engine saves remain exact engine version **1**, with no inserted map
  fields. Long March and Twin Span use engine version **2**, with the existing
  `mapId` and `mapRevision` fields. Revision stays **1**.
- The profile coordination marker is not included in backup files.

Backups containing expansion mission IDs fail closed in older validators.
Older valid backups still import into this candidate, including complete
original campaigns and physical-map skirmishes. Import remains a complete
replacement, not a merge: deliberately importing an older backup can remove
newer expansion accomplishments. Keep an up-to-date backup before replacement.

### Authored battlefield admission

Battle and history validation uses `mission.mapId ?? 'classic'`, not a blanket
Classic rule. A valid engine save from another map is still invalid for that
mission, even when difficulty, AI and campaign unlocks otherwise match. The
app's ordinary Resume path must use the same rule.

History `mapId` remains optional for legacy Classic records and is never
inserted into those records during canonicalization. Missing means Classic.
Every non-Classic authored result must therefore carry its exact declared
`mapId`; missing, null, unknown or mismatched identities reject the backup.
A history result cannot carry a descriptor, revision or arbitrary metadata.
The app must include the map field when recording a new-map campaign result.

All existing strict checks still apply: known identities and fields,
prerequisites, stars, finite times/statistics, bounded input size, exact engine
map revisions and geometry, unfinished battle/objectives, matching mission
rules and mutually exclusive trial/campaign identities. Invalid import data
is rejected before any destination storage read or write. Failed export
never repairs, rewrites or deletes the source bytes.

## Required app integration

Create the session before constructing ordinary storage or reading any domain:

```js
const profileSession = createProfileSession(() => localStorage, {
  requiredProtocolVersion: 2,
});
const storage = createStorage(() => profileSession.storage);
```

The public facades and methods do not change: `storage`, `importStorage`,
`status()`, `beginImport()` and `finishImport()`. Continue using the strict
`importStorage` facade for restoration. `createStorage` is intentionally
lossy on read errors and is unsuitable for backup/import snapshots.

The option accepts only integer 1 or 2. Omission retains protocol 1, including
no marker write for an absent marker. A protocol-1 caller rejects a version-2
marker rather than binding it. The existing `newEpoch` test hook remains.
Do not use the default option in the expansion app.

### Same key, stricter marker version

The marker key remains `ironroot.profile.v1`; the key is not a format-version
promise. Its exact four-field version-2 shape is:

```json
{"format":"ironroot-profile","version":2,"epoch":"existing-profile-epoch","phase":"ready"}
```

The three phases and epoch ownership rules remain `ready`, `restoring` and
`failed`. Versions 1 and 2 have the same fields. Keeping the existing key
matters: the frozen v0.9 strict parser rejects version 2 at this location,
blocking ordinary writes from already-open and newly-opened old tabs. Without
that barrier, old campaign normalization could discard the four new IDs and
write its reduced twelve-mission view back over expanded progress.

### Ready-only initialization upgrade

A protocol-2 constructor accepts both marker versions but upgrades only a
verified ready version-1 marker, or a genuinely absent marker:

1. Read and validate the current marker before reading any game domain.
2. Preserve a ready version-1 epoch. For an absent marker, generate and validate
   an epoch with the existing factory.
3. Recheck the exact previous raw marker immediately before writing version 2.
4. Read back the exact proposed bytes before binding the session.

Only the marker is written. Existing game-domain bytes, including malformed
bytes, are untouched. No `clear()`, domain deletion, normalization, fallback
migration or rollback is performed. An already-ready version-2 marker is
bound without rewriting it or invoking the epoch factory.

Migration runs only at construction. Status checks, ordinary storage access
and import attempts never silently retry it or adopt another owner's marker.
Opening the new app during an old import does not take it over; that page must
reload after the import completes before upgrading and loading the profile.

### Failure and uncertainty

- A write that throws after taking effect is accepted only if exact readback
  verifies the desired marker.
- A write that fails before taking effect, is dropped, changes to unexpected
  bytes or has unreadable readback never grants ordinary save permission.
- A failed ready-profile upgrade reports `reloadRequired` and blocks ordinary
  reads, writes/removals and imports. `recover: true` cannot bypass this
  ready-profile check. Restore storage access/space and reload.
- While an attempted upgrade's readback remains unavailable, status reports
  `recoveryRequired: true`, `canReload: false` and
  `initiallyUnavailable: false`. Existing app recovery gating must keep the
  page paused. When readable access returns, the same session stays unbound
  and requires reload even if its earlier write did take effect.
- Storage unavailable before any upgrade attempt retains the existing explicit
  unsaved-play behavior. Returning access never silently adopts a profile;
  reload is required before saving.
- Restoring, failed, malformed or future markers are never auto-upgraded.
  Existing recovery confirmation remains necessary. An explicitly authorized
  recovery initiated by a protocol-2 session publishes version-2 markers.
- Rollback from an already partial profile stays failed, not ready. A verified
  rollback from an originally ready profile rebinds only the owner. Successful
  replacement requires reload. Same-outcome finalization retry and ownership
  checks before every domain operation are unchanged.

The parent app retains its existing status gate. The new tests execute its
real startup and recovery handlers in Node VM stubs, verifying that a failed
or uncertain upgrade pauses play and that the import UI cannot bypass it.
These are handler tests, not a substitute for browser validation.

## Boundaries, not an absolute lock

LocalStorage is not an atomic compare-and-swap or multi-key transaction.
Exact pre-write checks/readback detect common races; another tab can still
interleave an operation between a check and a write. A tab already past its
old final check cannot be retroactively stopped. Much older clients that do
not implement any profile marker, storage-clearing tools and manual edits are
also outside this coordination protocol.

The frozen v0.9 app explicitly permits the user to recover an incompatible
marker after confirming recovery and closing other tabs. That deliberate
old-app action can replace a version-2 profile with an old backup. This
candidate cannot change code already loaded in old tabs. Its own stale
session refuses to overwrite the resulting version-1 marker or adopt it
without reload. **Do not recover in an old app merely because the expanded
profile is reported incompatible. Close old tabs and load the current app.**
Close all other game tabs before intentional restoration, keep the source
backup until reload is verified, and do not remove the marker to evade a
recovery warning.

## Verification evidence

Focused command:

```sh
node --test tests/profile-session.test.mjs tests/backup.test.mjs \
  tests/map-backup.test.mjs tests/campaign-backup-compat.test.mjs \
  tests/campaign-profile-compat.test.mjs
```

At the compatibility checkpoint this passed **122 tests, 0 failures, 0 skips**.
The subsequent integrated `npm test` checkpoint reported **405 tests: 404
passed, 0 failures, 1 optional desktop-tooling skip**. `npm run check` passed
for every runtime JavaScript module. Other workers were still integrating, so
these counts identify a checkpoint rather than a final release sign-off.
Coverage includes:

- Frozen old-client writes/removals to all five domains before and after
  expansion use/import, default protocol-1 rejection and explicit old recovery.
- Exact marker migration, no domain mutation, dropped/throwing writes,
  throw-after-write, denied reads/readback, concurrent marker replacement,
  open old imports, invalid versions/fields, and invalid epoch factories.
- Protocol-2 restoration, every domain's write-failure rollback, interrupted
  finalization, same-outcome retries and ownership loss that blocks rollback
  over a newer completed import.
- All four expansion mission backups and matching result history, ordinary
  progress persistence, 700-step deterministic restored continuations, every
  wrong-map pairing, missing map history, locked/terminal missions, malformed
  records, unknown identities/revisions and preservation of rejected bytes.
- All twelve legacy missions and five trials remaining Classic, plus the
  seven pre-existing frozen legacy backup/canonical-output golden pairs.
- Real app startup/backup/recovery handlers, including visible upgrade failure
  gates and the rendered 16-mission/48-star backup totals.

`tests/fixtures/profile-session-v0.9.js` is a verbatim copy of the frozen
original profile module, SHA-256
`1696d6e852cc7793fc6cf210a35a8385d10f4e9fef520fb8b97192b2279981a9`.
It was not edited or approximated. A pinned fixture makes the cross-version
suite runnable without an external workspace path.

The two backup fixtures were captured through the frozen v0.9 exporter, not
generated by the expansion candidate. `backup-v0.7-format.json` exercises the
unchanged Classic-only v0.7 schema; it is a representative format fixture,
**not an archived historical user's v0.7 backup**. The v0.9 fixture adds a
Twin Span skirmish and Long March history. Their SHA-256 values are pinned in
the tests; both restore and re-export byte-for-byte, retaining all twelve
original campaign completions. No browser/server execution or publication is
part of this work. Re-run the aggregate suite and real browser recovery flows
after final app/campaign integration.
