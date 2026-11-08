# Experimental fog recovery, 8 November 2026

This is a newly validated recovery candidate for draft PR22, not reconstruction of the lost 135-file update. The published game remains separate until a release is explicitly verified.

## Source retained exactly

The base is PR22 commit `20c57fa69dac330115ed3cd0d9137d224f0b2f42`, tree `d1b08ce6e23b953259c3ebb92d03641ca9b5f182`. The three recovered runtime files are exact previously uploaded GitHub blobs:

| File | Git blob | SHA-256 |
| --- | --- | --- |
| app.js | `366042f58073878de031c9fbd41b2acba7953ee9` | `8668d1ad368b9832c055a84c4609e1b7e78c8c81d623e5e3b7c2b7e9d67d7e06` |
| fog-view.js | `9ca997b50deb7c53c73ce2ee2119aa987f5434dd` | `12f09d2c0e30b260ebfa8f431d218f1881be528b8a8b0c9c4617cb7cb6cf24db` |
| index.html | `1f02bf92109a1f3e7667ccd831c914dd2c818c00` | `dadb018ce0da9a5d059d2d95a6a9e0661dbe6f89b2b996e34995259664ad913b` |

These contain exact-input visual mask caching, citadel-text clearance and a timestamped frozen-choice entry in Pause. The existing Citadel dialog already displayed the frozen choice; Pause is an additional discoverable location, not a new source of enemy information. No gameplay sight radius, AI information, targeting, economy, profile or save-format change is introduced by this recovery delta. Released music is retained.

The other 53 runtime files come from the verified base. A fresh inventory will bind the candidate and any later PR head. Every unlisted remote base path must remain intact, including historical files absent from the local working copy.

## Experimental scope

Fog is off by default and applies only to explicitly selected Classic, open-ended, bridge-income-off Skirmish. Ordinary campaign, trials, practice and fog-off battles retain their existing rules. Terrain remains known; enemy entities, health, minimap and audio are filtered through the side's exact observation. Last-seen building descriptions are old observations, not current health or production.

The prototype's performance and device coverage are incomplete. That is disclosed rather than described as a proven speedup or fairness result. Actual save/data-loss defects and hidden-information leaks remain correctness blockers. The separate lower-resolution mask research is deferred and is not part of this candidate.

## Recovery and test integrity

A workspace rollback removed the final local overlay, new tests and most raw acceptance evidence. The exact three runtime blobs and a small set of text reports were recovered from already-created immutable GitHub objects. The lost full overlay hash and result tree are historical identifiers, not this candidate's identity. An interrupted tree operation has not been blindly retried.

[Historical reports](../qa/fog-recovery-2026-11-08/historical/README.md) are retained verbatim and clearly separated from fresh checks. Their old counts, unavailable raw timing/pixel results and missing image links are not claimed as reproduced. Fresh test code is labeled new, not restored. No prior failure is relabeled a pass.

## Proportional fresh checks

Completed fresh checks:

- All 56 runtime files / 1,086,395 bytes match the pinned base plus the exact three recovered blobs. The two browser specs differ only in three fresh ruleset literals; all other assertions and legacy restore checks remain intact. This is not browser/offline execution.
- **79/79 focused checks passed:** 72 existing fog save/profile/observation/privacy tests plus seven newly authored cache/label/Pause behavior tests. The separate dated source-hash check passed. Two original positive-text tests initially failed because their citadel was off-camera in a cramped fixture; only their camera/size setup was corrected, all original assertions kept, and on-camera assertions added. The failed run is preserved.
- Syntax and runtime inventory checks passed. No local aggregate, pixel comparison or performance study was run in this recovery epoch. Normal exact-head CI is the next aggregate gate, not an already completed result.
- One short permitted desktop smoke passed: the Fog option began off, a fresh paid Barracks expanded observed sight, field/minimap and unknown enemy health remained coherent, Options returned to Pause, and Save/reload/Resume retained the Fog identity and paid structure. Displayed progress and six options stayed unchanged. The reset browser had no previous checkpoint; the fresh battle ended safely at title at 00:03. No nonempty memory appeared, so that case was not reverified natively.

See [fresh test manifest](../qa/fog-recovery-2026-11-08/final-test-manifest.json), [final TAP](../qa/fog-recovery-2026-11-08/final-portable79.tap), [first failed TAP](../qa/fog-recovery-2026-11-08/existing-focused.tap), [fixture correction](../qa/fog-recovery-2026-11-08/label-fixture-correction.patch), and [desktop smoke](../qa/fog-recovery-2026-11-08/native-smoke/REPORT.md). Six screenshots and normal-UI evidence accompany the smoke; no raw save/profile export is included.

Physical-phone/short-landscape, real offline/update, sustained frame performance, long-list/controller coverage and broad gameplay fairness remain unverified. Earlier denied emulation paths are not retried. No cache/profile clearing, backup import or production change is part of the local sanity pass.
