# v0.12 candidate 3: strict validation and corrected browser contracts

Private QA candidate only. Do not publish before the exact uploaded commit passes
its cloud gate. This continues candidate 2,
`4dd9b02877a901184cfa0f351f62ae28635d0aab`; it does not include the separate visual,
protected-objective, AI or desktop-export experiments.

## What candidate 2 established

The full cloud run returned 730 passed, 19 failed and three intentional skips.
Training passed 80/80, reports/controllers 96/96, new storage recovery 24/24 and
migrations 8/8. Remaining failures were three native minimap coordinate-oracle
mismatches and 16 obsolete malformed-history replacement expectations.

## Production correction

The only runtime change from candidate 2 is a 26-byte guard in the engine's shared
building/unit save validator: entity type must be a primitive string before enum
lookup. The original accepted array wrappers; four array-valued mint types also
evaded the primitive-string mine count. Invalid imports now fail before storage is
read or written. Valid rules, AI, physics, schemas and existing backup formats are
unchanged.

Four historical engine-source checks now reconstruct the original bytes by
removing exactly this required guard. Missing/duplicate guards or any unrelated
engine edit still fail. Historical manifests were not rewritten. Independent
review reproduced the defect against the separate original engine and passed 199
focused checks. Eighteen complete all-map seeded scenarios retain exact behavior.

## Test contracts

- Minimap: keep original 73%/one-pixel-edge taps and native trusted targets.
  Verify pointer input within 0.01 CSS pixels, compatibility click within one CSS
  pixel, then project the delivered native click with the unchanged less-than-three
  world-unit camera tolerance. Cloud evidence showed requested x244.68 becoming
  click x245, while the camera was mathematically exact for x245. No retry,
  rounding, re-centering or runtime camera change was added.
- Malformed history: preserve unknown raw bytes through repeated retries, verify
  visible retained results, refuse ordinary incomplete export, download a valid
  explicitly scoped in-memory backup, then recover through a user-confirmed import
  of that file. Verify exact-once results after reload and working normal export.
  These replace the 16 old instances; they do not just swap a replacement assertion
  for a preservation assertion.
- Invalid entity types: a new four-profile case selects malformed building/unit
  backups, verifies refusal before confirmation with no storage operations or
  changed bytes, then proves a valid preview/cancel still works.

## Frozen local evidence

- 635 Node tests passed, zero failed, one optional installed-desktop-tooling skip
  (636 discovered, no TODO).
- Runtime syntax, all browser source/fixture checks and strict runtime preflight
  passed. Runtime remains 33 files, now 668,075 bytes.
- `QA_CANDIDATE3_VALIDATION.json` pins the exact changes and runtime hashes.
- Expected browser discovery: 756 instances, including the same three intentional
  inherited skips. Confirm discovery on the authorized runner.

Suggested focused checks before the full exact-commit gate:

```sh
cd qa/browser
npm test -- maps.spec.mjs --grep 'minimap ends'
npm test -- regression.spec.mjs --grep 'malformed history'
npm test -- accessibility-backup.spec.mjs --grep 'array-valued entity enums'
npm test
```

No browser execution or publication occurred in this local repair workspace.
Physical devices, non-Chromium browsers, controller hardware, packaged desktop
runtime and subjective audio listening remain open. Existing AI concentration-rush
weaknesses are unchanged; a passing software gate is not a claim of release-ready
balance or Steam readiness.
