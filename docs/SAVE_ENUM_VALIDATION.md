# Save enum integrity repair

Scope: isolated local validation candidate copied from the corrected 0.12 QA candidate. This is not a published build, a browser test result, a desktop runtime result, or release approval.

## Confirmed finding

The shared building/unit validator used `Object.hasOwn(types, e.type)` without checking that `type` was a primitive string. JavaScript converts an array such as `['barracks']`, a nested array such as `[['warrior']]`, or `['mint']` into a registry key. These values therefore passed restore and remained arrays in the saved engine state. The frozen importer accepted them, replaced existing profile domains and reported success instead of rejecting the malformed backup.

This is more than a display issue. The mine limit uses strict `b.type === 'mint'` comparisons. Four array-wrapped mines passed the old three-mine limit. Other strict type-based gameplay rules could also disagree with registry lookups. The new tests reproduce both the old acceptance and the old writes using the independently hash-verified original engine source.

## Minimal production change

Only `dist/engine.js`, in `validateSave`'s shared building/unit loop:

```diff
-if(!Object.hasOwn(types,e.type))
+if(typeof e.type!=='string'||!Object.hasOwn(types,e.type))
```

This rejects malformed identifiers before either registry lookup. No AI, combat, balance, geometry, economy values, serialization, schema versions, storage keys, backup protocol, profile protocol, report behavior or authored mission rules change. `dist/backup.js` is byte-identical to the corrected frozen source.

## Enum and record audit

- Building and unit types: both use the repaired shared primitive-string/own-key check. All seven buildings, five units, both sides, three maps and levels 1–3 remain valid.
- Map IDs: `getMap` and version-2 engine validation already require primitive strings and own registry keys. Version 1 still forbids map identity; version 2 still requires a known nonclassic map and exact numeric revision.
- Base types and IDs: already strict equality with `base`, `base0`, `base1` and numeric side/position invariants.
- Effects and projectiles: already strict `includes` membership with no property-key coercion. Both legacy absent flight flags and valid current booleans remain accepted.
- Difficulty, winner, side, lane, level, version and revision: strict membership/equality or finite numeric/integer checks. Nullable winner and mode identities retain their existing meaning.
- Statistics: fixed `kills`, `built`, `damage` numeric pairs, not registry-selected records. Backup allowlists reject unknown record fields. Fractional damage remains valid; counts remain integers.
- Backup/envelope/campaign formats and versions: strict equality/membership. Preferences use strict quality membership and typed toggles.
- Battle/history mission and challenge IDs: strict comparisons to authored IDs; absent/null IDs retain legacy behavior. Authored map/rule checks are unchanged. Campaign/trial record keys come from JSON object keys and are compared strictly to known IDs; record objects and numbers are independently checked.
- Mission/objective kinds and report contexts are not user-supplied save schemas. Unknown `kind`, `context`, `mode` or `statType` save fields are rejected by backup allowlists. Objective definitions are authored code. Reports are session-only exports and cannot be imported as saves/backups.

The audit is a serialized-save/backup boundary repair, not a redesign of every internal gameplay/report API. It does not claim arbitrary executable in-process objects or proxies are a safe interchange format. Existing backup override inspection rejects accessors/functions/non-JSON objects; new tests cover boxed strings, prototype values, null-prototype objects and custom coercion values without executing coercion callbacks.

## Storage and failure behavior

The patched `restoreBackup` rejects these payloads during `parseBackup`, before creating a storage adapter or issuing any read, write, removal, rollback or profile marker operation. Tests retain every original byte, including malformed existing domains, the marker and unrelated keys. Exporting an already malformed stored battle fails without writing or deleting it.

The actual application file-selection handler is executed in a Node VM: invalid enum files never reach preview or pending confirmation, and the existing marker remains untouched. The actual resume handler hides Resume and leaves the malformed stored bytes intact. These are executable source-handler checks, not browser execution. The separate browser regression is prepared for cloud execution.

## Frozen oracle protection

Four tests previously required the whole engine's old hash. They now share `tests/engine-validation-source.mjs`, which requires exactly one new guard, forbids the original untyped guard, reconstructs only that exact substring and verifies the original SHA-256. Missing or duplicated guards, changed whitespace elsewhere and any unrelated engine byte change fail. Negative tests verify this protection.

No historical baseline JSON, fixture, runtime hash manifest, archived evidence or expected simulation digest was regenerated. All other source-equality checks remain. The reconstructed original engine is additionally run against the patched engine for 18 complete seeded scenarios: all three maps × all three difficulties × two seeds, with paid actions on both sides, variable frame subdivision, mid-match restore, state/RNG comparisons and terminal equality. Existing Classic 0.8 oracle, legacy campaign snapshots, report observational parity and compatibility tests also remain intact.

## Validation

- Focused adversarial suite: 14 passed, 0 failed.
- Independent read-only review: 199 focused tests passed, including separate original/repaired engine imports and original-byte reconstruction.
- Full Node suite: 628 discovered, 627 passed, 0 failed, 1 existing skip for absent optional desktop tooling dependencies.
- Runtime module syntax: passed.
- Test, script and desktop source syntax: passed; no desktop execution.
- Strict runtime inventory: passed, 33 files, 668075 bytes. Only `engine.js` differs among runtime files.
- Browser source and fixture validators: passed without a browser or HTTP server. The added malformed-import case is one logical test across four profiles; expected full discovery is 756, not executed or locally discovered. It also verifies a valid follow-up preview/cancel works after rejection.
- Raw engine saves and outer envelopes v1/v2, nullable identity migration, legacy v0.7/v0.9 backup fixtures, authored campaign/trial saves, all maps and rollback/profile scenarios: passed in the existing and new Node coverage.

### Commands and evidence

- `node --test tests/save-enum-validation.test.mjs`
- `npm test`
- `npm run check`
- `npm run check:release`
- `npm --prefix qa/browser run check`
- `node --check qa/browser/accessibility-backup.spec.mjs`
- `find tests scripts desktop -type f \( -name '*.mjs' -o -name '*.cjs' -o -name '*.js' \) -not -path '*/node_modules/*' -print0 | xargs -0 -n1 node --check`

Logs and the new current-runtime inventory are under `qa/local-validation/save-enum/`. They are new repair evidence, not replacements for historical manifests.

## Hashes

- Original frozen engine: `e47a168c099c2a4e1f45b238d5224cb44a02433a7cff06adbfb87095c4d56bc7`
- Patched engine: `83d315ba2a25ced0167543896c48c1d9ae0096827767e9bbe28485c5ae1810f5`
- Unchanged backup: `f16de6ad26420dc448b3802b480e890b91d1b1b5ebe31f0eee6012ca2b5dc331`
- Prepared browser spec: `41ac43fbf056aca57cec74614fd28ec3c78c0a5ff82c00dfeecc2addf5cb8c21`

## Remaining gates

The previously frozen corrected candidate still contains the defect and must not be described as repaired until this minimal patch and its tests are integrated. Exact-final-source cloud/browser checks, the new four-profile malformed-import case, any desktop runtime/bridge validation, source commit review and publication approval remain separate gates. No browser/server/Electron run, external commit, upload, publication or live preview was performed for this repair.
