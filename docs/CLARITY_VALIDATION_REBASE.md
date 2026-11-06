# Candidate3 validation rebase into the future clarity feature

This is an isolated local copy of the future clarity feature, not candidate3 and
not a release-ready or published build. The live feature was not edited. The copy
omits `.git`, `.openai`, dependencies, generated build/report output and temporary
`dist/__qa*` fixtures. Historical committed QA evidence is retained intentionally.

## Exact scope

The only runtime overlay is `dist/engine.js`: require a primitive string before
the shared building/unit enum lookup. The resulting engine is exactly candidate3
SHA-256 `83d315ba2a25ced0167543896c48c1d9ae0096827767e9bbe28485c5ae1810f5`.
Removing only the single required guard reconstructs the original pinned engine
`e47a168c099c2a4e1f45b238d5224cb44a02433a7cff06adbfb87095c4d56bc7`.
Rules, AI, balance and schema versions are unchanged.

The overlay carries candidate3's 14 adversarial enum tests and helper, eight
native minimap-coordinate contract tests/helper, and the maps, malformed-history
recovery and invalid-backup browser-spec repairs. Original taps, native targeting
and camera tolerance remain unchanged. The history flow verifies retained data,
real download/import, explicit confirmation, reload and no duplicate result.

Four historical tests use the strict reconstruction helper. The clarity-specific
training integration retains its deliberate render/VFX exclusion rather than
reverting to candidate3's renderer pin. The two additional old-engine assertions
in readability-fixture and protected-objectives tests also use the helper. The
readability assertion additionally compares reconstructed bytes with its original
manifest. All reviewed visual hashes and historical manifests remain unchanged.

No app, index, styles, renderer, VFX, service-worker or objective UI file belongs
to the overlay. Any concurrent compact-Build pointer-events repair stays entirely
with the live feature author and must not be overwritten by this copy.

## Evidence boundaries

`QA_CANDIDATE3_VALIDATION.json`, `SAVE_ENUM_VALIDATION.json`, candidate3 documents
and their logs are copied byte-for-byte as historical proof of candidate3 commit
`24edddab2cff33b3f91b396bc855193f87421ba3`. Candidate3's counts and runtime hashes
must not be presented as verification of this combined feature. The historical
candidate3 manifest still describes its original training-integration test; this
feature intentionally has the separately reviewed minimal merge described above.

Current rebase evidence is in `QA_CLARITY_REBASE_VALIDATION.json` and
`qa/clarity-validation-rebase/`. Source-audit records pin the unchanged feature
runtime, visual manifests, original history and copied candidate3 artifacts.

## Local results

- Full Node suite: 694 discovered, 693 passed, zero failed, one inherited optional
  desktop-tooling skip, zero cancelled/TODO.
- Focused enum, minimap, readability, protected-objective and training checks:
  42/42 passed, zero skips.
- Runtime syntax passed. All 194 JavaScript/MJS/CJS source files parsed.
- Browser source/fixture preflight passed without browser/server execution.
- Strict runtime inventory passed: 34 files, 697,981 bytes.
- Independent read-only source review and 42 focused tests passed with no concrete
  defect found. Historical proof versus current-rebase scope is explicitly separated.

Browser discovery/execution, the final live-feature combination and physical
hardware/subjective audio/Steam readiness are unrun here. No source upload,
commit, publication, dependency install or permission change occurred.

## Safe application after native QA

Use the external machine-readable overlay manifest, not a directory overlay.
For each listed file, verify the target old SHA-256 (or required absence) and the
copy's new SHA-256 before applying. Never copy an unlisted runtime file. Stop on
conflicts rather than replacing concurrent work. The manifest's complete list
contains only the engine guard and required tests, QA evidence and documentation.

After native QA ends and the authorized parent applies the verified file list,
rerun the full tests, syntax, browser fixture and runtime preflights on that exact
combined feature. New native UI testing remains separate from this source-only
validation rebase.
