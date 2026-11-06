# Portable local backups

The backup module is a DOM-free, network-free companion to the ordinary local saves. A backup contains only the game's campaign progress, field-trial records, saved preferences, recent results and an optional unfinished battle. It never enumerates browser storage, collects credentials, uploads a file or executes file contents. The UI owns file selection, download and replacement confirmation.

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

## Verification

Run `node --test tests/backup.test.mjs`, followed by `npm test` and `npm run check`. Tests cover round trips in every game mode, empty saves, legacy migration, campaign normalization, domain corruption, version mismatches, bounded/malicious data, raw-read failures, quota failures at every write position, successful and failed rollback, misleading adapters, exact raw-byte preservation and no writes on validation failure.
