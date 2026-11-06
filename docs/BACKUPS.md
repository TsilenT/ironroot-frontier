# Portable local backups

The backup module is a DOM-free, network-free companion to the ordinary local saves. A backup contains only the game's campaign progress, field-trial records, saved preferences, recent results and an optional unfinished battle. It never enumerates browser storage, collects credentials, uploads a file or executes file contents. The UI owns file selection, download and replacement confirmation.

## Integration status

The **0.7 candidate** now includes Settings → Save backups, client-side JSON download, a native file chooser, a parsed summary and a separate **Replace local saves** confirmation. The browser adapter uses a strict profile-session facade for imports, uses `textContent` for file-derived summaries/errors and clears its old running/dirty state before a successful import reloads the page. The 0.7 offline shell includes both backup and profile-session modules. Desktop-shell export currently reports that it is unavailable instead of claiming a download succeeded.

This candidate is private. The public build remains 0.6. Real-browser/cloud verification of the integrated 0.7 flows is pending; passing pure-module tests and static UI assertions is not a browser sign-off.

The first independent adapter audit on 2026-11-06 reproduced asynchronous file-selection races, loss of the visible recovery warning/current-session handling after incomplete rollback, and stale-tab progress resurrection after a replacement import. Follow-up isolated handler tests against the actual adapter and profile/backup modules now pass older-file success/error races, dismissal/reopen invalidation, retention of the paused game/warning after incomplete rollback, exact-outcome marker-finalization retry, recovery export isolation, dirty tracking, unavailable-storage warnings and unload protection. The profile-session tests prevent stale writes and superseded rollback. Static re-review confirms that history snapshots refresh for each ordinary import and recovery exports disclose their history limitations. Before release, verify the patched behaviors in the checklist below in real browsers. Adapter audits are read-only; the separately assigned profile-session implementation changes only its own runtime module and tests.

## Public contract

`dist/backup.js` exports:

- `BACKUP_FORMAT`, `BACKUP_VERSION`, `MAX_BACKUP_BYTES` and `BACKUP_STORAGE_KEYS`.
- `createBackup(storage, options = {})`: returns a validated JSON string. Options are `includeBattle` (default `true`), `battle` (an explicit serialized save envelope instead of the stored battle), and `createdAt` (an ISO UTC timestamp, primarily for deterministic tests). A caller can pass its current in-memory campaign, trial, settings or history snapshot through the corresponding `campaign`, `trials`, `settings` or `history` option. This avoids excluding an acknowledged but not yet persisted result. These overrides undergo exactly the same validation as stored data.
- `parseBackup(text)`: returns an independent, validated, canonical document. It accepts JSON text only. It does not read or modify storage. Invalid input throws `BackupError` with a stable `code` and a human-readable `message`.
- `restoreBackup(storage, text)`: revalidates the JSON text, snapshots all five destination keys, writes the replacement and verifies it. Returns a structured result rather than throwing for invalid input or storage failures. Revalidate the original text after a preview; do not trust a mutable preview object as authorization to write.

Prefer the actual browser `Storage` object (`localStorage`) or a strict adapter with `get(key)`, `set(key, value)` and `remove(key)`. Strict adapter reads must return the exact stored string or `null` for a genuinely absent key and must throw on denied/unavailable reads. Adapter writes/removes must return `true` on success and `false` or throw on failure. Standard `getItem`/`setItem`/`removeItem` objects are supported directly.

**Do not use the ordinary `createStorage` adapter for backup operations.** It intentionally swallows failed reads as `null`. That is appropriate for the game's fallback UI but cannot distinguish a missing save from unreadable data. The backup module cannot recover information an adapter hides. The UI should acquire the raw `localStorage` object in a try/catch, so a denied getter is also reported honestly.

## Format and replacement semantics

Version 1 has the shape below. All five `data` properties are mandatory.

```json
{
  "format": "ironroot-backup",
  "version": 1,
  "createdAt": "2026-11-06T00:00:00.000Z",
  "data": {
    "campaign": {"format": "ironroot-campaign", "version": 1, "missions": {}},
    "trials": {},
    "settings": {},
    "history": [],
    "battle": null
  }
}
```

Import is a complete replacement, not a merge. It writes these existing game keys only:

| Domain | Key |
| --- | --- |
| Campaign | `ironroot.campaign.v1` |
| Trial best times | `ironroot.trials.v1` |
| Preferences | `ironroot.settings.v1` |
| Recent results | `ironroot.history.v1` |
| Saved battle | `ironroot.battle.v1` |

An empty but complete backup is valid. Importing it clears campaign completions, trial records and history, removes saved preference overrides, and removes the existing saved battle. The first campaign mission is available as usual. Empty settings are stored as `{}`, so normal app/platform defaults apply after reload. Missing local domains export as the empty values above. Missing properties in the backup itself are invalid, rather than being interpreted as a request to erase data.

`includeBattle: false` deliberately excludes the stored battle without reading it and emits `battle: null`. Importing that backup **removes the destination's saved battle**. The confirmation must say this. An explicit `battle` override cannot be combined with `includeBattle: false`. Other game-domain overrides may be supplied independently.

Malformed existing local data is not repaired, deleted or silently omitted during export. Export fails and identifies the affected domain. Excluding a battle or explicitly supplying a replacement snapshot lets the caller make an intentional choice without modifying the original bytes. A failed parse or failed validation never writes anything. A successful explicit import may replace even previously corrupt local bytes.

## Validation and compatibility

- Input is capped at 1 MiB of UTF-8 JSON before parsing. Structured values also have bounded depth, node count, array sizes, property counts and string lengths. Cycles, accessors, non-plain objects, non-finite numbers and unsafe prototype keys are rejected.
- Unknown fields are rejected throughout the backup, including engine data. Text is limited to known IDs/enums and ISO timestamps. No free-form HTML, JavaScript, URLs or arbitrary extra metadata are carried into a restored game.
- Backup, campaign, battle-envelope and engine versions are checked independently. Unknown/future versions fail without modifying local saves.
- Campaign records require known missions, valid stars/times and all prerequisite completions. The canonical campaign normalizer is used, but import rejects records it would discard rather than silently converting corrupt progress into an empty campaign.
- Trial records require known trials, a completed flag and a positive best time within the trial's deadline tolerance. History has at most 30 valid records, known mission identities, valid timestamps and finite bounded statistics. A result cannot be both won and drawn.
- A battle is restored through `Game.restore`, then checked as unfinished. Trial and campaign IDs are mutually exclusive, and a campaign battle must be unlocked by the progress in the same backup. Difficulty and AI behavior must match an authored mission's mode. Terminal objective outcomes are rejected even when the simulation's `winner` remains `null`.
- Existing unwrapped engine saves and version-1 trial envelopes are accepted and exported as the current version-2 envelope. Mission IDs remain outside engine state. An envelope cannot pretend to be both a campaign and a trial. These checks ensure structural consistency; a locally editable JSON file is not a cryptographic proof that scores were earned.

## Storage failures and exact reporting

Local storage has **no multi-key transaction primitive**. This module uses synchronous writes, readback verification and best-effort rollback, not a guarantee against crashes, hostile adapters, changing storage permissions or another tab writing concurrently. The UI should import from a paused/title state, stop autosaves while importing and reload/reinitialize all game domains only after a verified success. Keep the original file until the reload succeeds.

Before a first write, the module reads all five previous raw values. A read failure aborts without writing. No invalid save is normalized while taking that snapshot. If a write or readback fails, rollback attempts to restore every attempted key in reverse order, including a key whose write threw or returned false: an adapter might have written before reporting failure. Rollback then checks all five keys against the original bytes.

Results include `ok`, `code`, `message`, `changedKeys`, `failedKey`, and `rollback` (`attempted`, `complete`, `unrestoredKeys`, `unverifiedKeys`). `changedKeys` contains only verified differences from the initial snapshot; unreadable keys are listed separately. `rollback.complete` is true only when every original value has been verified byte-for-byte. On success, `changedKeys` identifies actual changes and `rollback.attempted` is false. Identical imports perform no unnecessary writes.

- A normal quota failure with successful rollback reports that import failed and the previous saves were restored.
- If rollback is incomplete, the warning names the keys still changed or impossible to verify. Do not display “nothing changed,” reload the page or discard a running battle after this result. Keep the backup file and allow the user to resolve storage access/space before retrying.
- No success is reported merely because the adapter claimed a write succeeded. Stored bytes must match the intended replacement on final readback.

## Cross-tab profile session contract

`dist/profile-session.js` adds one coordination marker, `ironroot.profile.v1`, outside the five backed-up game domains. It is not included in portable files. Its exact version-1 shape is `{format: "ironroot-profile", version: 1, epoch: "unique-import-id", phase: "restoring" | "ready" | "failed"}`. An absent marker means a legacy ready profile. Invalid/future markers fail closed. There is no automatic expiry: elapsed time cannot prove that another tab has stopped writing.

Create the session before loading ordinary saved data:

```js
const profileSession = createProfileSession(() => localStorage);
const storage = createStorage(() => profileSession.storage);
```

The getter is evaluated inside guarded operations. Initial denied storage is reported without throwing from session creation, so the app can explicitly allow unsaved play. The session never calls such play saved or permits an import without verified storage. If storage was unreadable at startup, it does not silently adopt a later profile; reload is required once storage becomes readable.

### Facades and state

- `storage` is a strict `getItem`/`setItem`/`removeItem` facade. Reads require a ready marker. Every write/removal additionally requires the exact ready epoch this tab loaded. It protects preferences, history and progress writes as well as battles. A stale tab may read a newly ready profile, but cannot write it before reloading.
- `importStorage` is a separate strict facade for `restoreBackup`. Every read, write and removal checks this tab's verified, active `restoring` epoch. It permits only the five game domains. Ownership loss blocks rollback too, preventing an old importer from undoing a newer import.
- Neither facade exposes marker mutation or `clear()`. They throw `ProfileSessionError` with `code` and `message`; `createStorage` can convert ordinary failures into unsaved status as before.
- `status()` returns `{phase, canWrite, canReload, reloadRequired, recoveryRequired, ownsImport, initiallyUnavailable, code, message}`. `phase` is `ready`, `restoring`, `failed`, `unavailable` or `invalid`. Only `ready` allows reload; only a matching, previously verified ready session allows ordinary writes. A newly ready epoch requires stale tabs to reload. `restoring` blocks access to partial data, `failed` requires explicit recovery, and `invalid`/`unavailable` never authorize writes or reload. `ownsImport` is informational; the import facade rechecks at each operation.

### Begin, finish and recover

`beginImport({recover: false})` returns `{ok, code, message, status, epoch?}`. It reads the marker, verifies the loaded profile has not changed, writes a fresh `restoring` epoch and verifies those exact bytes before allowing any import data access. A failed begin must not be followed by a raw-storage import. If the write took effect but its verification read failed, retrying begin can verify and resume that same owned marker. A fully started import cannot be started again until finalized.

Pass `profileSession.importStorage`, not raw storage, to `restoreBackup` after a successful begin. Then call `finishImport({outcome})` using the observed result:

| Outcome | Evidence required | Published phase |
| --- | --- | --- |
| `restored` | `restoreBackup` returned verified success | `ready`; owner and stale tabs must reload |
| `rolled-back` | No game writes occurred, or all original bytes were verified restored | `ready` only if the pre-import profile was ready; the owner can continue its retained game |
| `failed` | Original/restored game data cannot be fully verified | `failed`; all ordinary writes/reloads remain blocked |

If an explicit recovery began from `failed`, abandoned `restoring`, or an invalid marker, a rolled-back attempt returns to that already uncertain profile. It therefore publishes `failed`, **not** `ready`. Only a verified replacement makes that recovered profile ready.

`finishImport` returns `{ok, code, message, status, phase, outcome}`. `phase` is `ready`, `failed`, or `blocked` when finalization could not be verified. **`ok: true` means the marker transition was verified, not that recovery succeeded.** Inspect `phase` and fresh `status().canReload` before reloading. Publishing a valid failed barrier returns `ok: true, phase: "failed"` and must keep the recovery UI open.

If finalization fails, retain its exact message, the original outcome and the in-memory game. Do not reload, resume or make ordinary writes. Retry `finishImport` with the same outcome after storage access/space is fixed. Finalization is idempotent if the intended marker was written before a read failure. Conflicting outcomes and a new import while finalization is pending are rejected. If another tab supersedes the marker, this tab must not finalize or roll back over it.

`beginImport({recover: true})` may replace a failed, abandoned-restoring or invalid marker. The UI must require the player to close other Ironroot tabs and explicitly confirm recovery before using this option. It cannot safely infer that an active restoration has stopped. A stale tab looking at a new ready profile must reload rather than use recovery to bypass the stale-session check.

The app must check status at startup, on marker storage events (including a storage clear), before starting/resuming/leaving a game, and before unload. Stale/recovery states pause gameplay and block unload writes. Keep the recovery warning visible across dialog dismissal and expose Reload only while the current marker is ready. A successful replacement must also clear the old in-memory `started`/`progressDirty` state before reload. The guarded facades are the final write protection even if a UI hook is missed.

The marker is an optimistic coordination barrier, **not a localStorage transaction or lock**. Another tab can change state between a check and the next storage call. Every facade operation checks ownership, but the UI still asks other tabs to close during import. Explicit takeover is for recovery, not simultaneous competing imports. Crash recovery, browser data deletion and unsupported old tabs remain limits; the module does not claim filesystem-style atomicity.

## Verification

Run `node --test tests/backup.test.mjs tests/profile-session.test.mjs`, followed by `npm test` and `npm run check`. Tests cover round trips in every game mode, empty saves, legacy migration, campaign normalization, domain corruption, version mismatches, bounded/malicious data, raw-read failures, quota failures at every write position, successful and failed rollback, misleading adapters, exact raw-byte preservation and no writes on validation failure. Profile tests additionally cover stale dirty campaign/trial resurrection, all five stale write domains, marker failures and retries, abandoned/invalid recovery, and ownership loss midway through a restore without undoing the newer import.

The profile-session test file also executes the actual app handlers in a small isolated DOM stub for nine integration regressions. These checks deliberately do not claim real file-picker, download, rendering, accessibility or browser-event verification.

### Integrated adapter release checks

- Export a newly advanced paused battle, reimport it, reload and verify its exact time and skirmish/trial/campaign identity. Export without a battle and verify that preview explicitly announces removal of the destination battle.
- Select a slow-reading file A, then a fast file B. B must remain the only displayed and importable selection even after A resolves or rejects. A late error must not clear B's valid pending text or leave a confirmation whose button silently does nothing.
- Dismiss Settings while a file is reading, reopen Settings and complete the old read. It must not reopen confirmation. Also test picker cancellation, confirmation cancellation, Escape/controller Back and selecting the same file again.
- Reject malformed JSON, foreign versions, oversized files, unsafe fields and failed `file.text()` reads without any writes. Confirm raw-storage getter/read errors are visible and cannot turn unreadable stored data into an apparently empty export.
- Inject quota failure after each replacement write. A complete rollback must retain the exact previous bytes and allow normal resumption. An incomplete/unverifiable rollback must retain the exact warning after Cancel, preserve the in-memory battle, remain paused and block stale autosave/progress/settings/unload writes until deliberate recovery.
- When recovery is required, closing Settings, returning to title, starting another match or a controller shortcut must not silently discard the retained battle. Closing the browser should warn without writing. A later verified import must clear recovery state and reload without old-data writes.
- If storage becomes unreadable, closing Settings must not mistake denied reads for evidence of a newer battle and discard the current session. Recovering storage should allow a safe retry.
- Recovery export must identify which snapshot it protects. If the stored battle key changed during a failed rollback, do not silently substitute that partial stored battle for the retained active battle. A recovery snapshot of the current game must include consistent in-memory campaign progress.
- With two tabs, import an empty or older backup in tab A while tab B holds better trial results and dirty campaign progress. Closing B or later earning a result in B must not resurrect records intentionally replaced by A. Invalidate stale writers for deliberate imports, not just the battle key; ordinary best-score merging is insufficient. Verify stale preferences/history writes too.
- In real browsers, verify the download actually exists and is parseable, the file picker/confirmation remains keyboard-accessible, focus returns safely on cancel, the battle stays paused under dialogs, and no network upload occurs. Verify the private cloud candidate first, then any authorized public build separately.
