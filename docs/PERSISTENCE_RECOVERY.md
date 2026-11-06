# History and preference recovery repairs

Local candidate changes only. Native browser regressions are required before release.

## User-visible behavior

- A failed history read is never treated as an empty history. Malformed existing JSON/containers are distinguished from inaccessible storage and are left unchanged.
- Completed results remain in memory when history cannot be read, written, or verified. The result screen and Preferences expose a warning and a Retry saving history button. Opening the last result, returning to the page, or leaving the page attempts recovery without generating another result.
- Preferences apply immediately to this page. A failed or unverified write displays a persistent warning, a retry button, and an immediate toast. Only verified writes are described as saved.
- Pending writes trigger the browser's native leaving-page warning, except an explicitly requested profile replacement/reload. Browsers may suppress unload dialogs without a user gesture.
- Export backup includes pending results and preferences only when the saved history can be read safely. Otherwise it fails with a request to use Export in-memory session. That export explicitly includes only this tab's known records and pending results and may omit newer records from other tabs.

## Safety boundaries

No new storage keys, history fields, backup versions, profile protocols, or battle schemas were introduced. Every write still goes through the existing guarded profile facade.

A result captures its original battle ownership before removal. A stale completion cannot save a result or remove a newer battle. If ownership is unavailable, retry must verify the old battle before authorizing the result. A valid completion remains retryable after a subsequent same-profile battle, but its cleanup cannot remove that subsequent battle. A replaced/restoring/failed profile prevents all retained writes and does not replace this tab's retained history snapshot.

History retry reads the current history, merges pending results, re-reads the exact raw value before writing, and verifies the resulting records afterward. A failed or uncertain write remains pending. Existing immutable result fields, including the completion timestamp, provide deduplication without changing the backup schema. Preferences use their original exact raw snapshot and refuse to overwrite different newer settings.

## Limits

- Pending data is page-local memory. A browser crash/process termination cannot be made durable when storage refuses writes. Keep the page open or download the retained session.
- History retains the existing most-recent-30 policy, including pending results. It is not an unlimited match archive.
- LocalStorage has no atomic cross-tab compare-and-swap. The double reads, profile checks, and readback detect observable races and prevent writes over a known changed snapshot. An unseen change in the final read/write interval is still possible. These tests do not claim transactional multi-tab persistence.
- The existing schema has no unique result ID. Deduplication compares all result fields with normalized optional defaults, including the original timestamp. It intentionally treats identical records as the same retained result.
- An unreadable initial preferences snapshot cannot be safely overwritten later. The user can retain/export their current preferences and reload the verified profile.

## Verification

`tests/persistence-recovery.test.mjs` runs storage fault and race cases plus actual application finish, retry, reopening, and unload handlers against small DOM adapters. `tests/profile-session.test.mjs` runs the actual backup/export/import handlers with retained data. These are executable source tests, not browser rendering, touch, or native unload-dialog certification.

Native browser rerun should cover all configured desktop/mobile Chromium profiles with key-specific failures injected only after profile initialization: history read failure at completion, history write failure and retry, unknown initial history, malformed history, retained results across title/new battle and result reopening, failed preference write with visible warning and retry, a newer tab's settings, and replaced-profile retry blocking. Verify both stored bytes and visible warnings, and assert no duplicate result or deletion of a newer battle.
