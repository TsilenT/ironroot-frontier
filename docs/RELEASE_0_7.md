# Release candidate 0.7: Controls and continuity

Public deployment remains 0.6 until this candidate passes its browser gate.

## Added

- Experimental standard-controller input: virtual cursor, shared legal placement, camera movement, affordable-building cycling, menu/HUD navigation, pause and safe disconnect.
- Explicit visible controller focus and reveal-before-spend takeover from touch/mouse. Held buttons are rearmed when changing screens.
- Portable local JSON backups with validated preview and explicit replacement confirmation. No file is uploaded.
- Profile replacement markers and guarded storage stop stale tabs from reintroducing old medals, settings or battles after an import.
- Failed or uncertain restoration keeps the session paused, shows an exact warning, supports retained-session export and finalization retry, and prevents writes until recovery.
- Async file-read cancellation prevents old reads/errors from replacing a newer preview.
- Storage-read denial is distinct from a genuinely newer battle; unsaved play and unsaved medals produce warnings.

## Validation

229 Node tests pass with zero skipped/TODO, including 38 controller tests, 38 backup tests, 26 profile-barrier tests and 9 actual-handler regressions. All runtime JavaScript parses.

Independent Chromium UI checks covered expanded preferences, mapping/backup controls, keyboard focus, native Space behavior, guide, pause restoration and 320×568 / 844×390 layouts. A real export produced a valid 8,443-byte backup. A subsequent CUA file chooser hung; no import confirmation was attempted, and later native inspection verified no chooser/preview remained. Import is not claimed as verified by that manual pass.

The earlier private candidate's cloud browser suite reported 155 passed, 2 controller test synchronization failures and 3 skips. Baseline backup cases passed 28/28; a neutral-poll test correction passed 36/36 repeated controller checks. This candidate adds 7 audited regressions across 4 profiles, for a 188-instance matrix with 3 existing skips. Its full cloud run remains a release gate.

## Limits

Controller hardware, physical mobile devices and subjective audio review remain unverified. Controller support is explicitly experimental. The desktop shell still blocks file export. Browser storage is not an atomic multi-key transaction: markers, readback and guarded rollback reduce failures but do not replace the original backup file. Close other game tabs before restoring and keep the file until the reloaded profile is verified.
