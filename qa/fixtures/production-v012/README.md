# Ironroot Frontier: immutable production 0.12.0 fixture

This is historical test input, not a new release, working source tree, server integration, or a copy of any player's profile. Never regenerate it from a future candidate. A future build must be tested *against* these bytes, not replace them.

## Identity and provenance

- Historical version: `0.12.0`; service-worker cache: `ironroot-v0.12.0`.
- Public production commit: `acb366c33898fabff885118cead7158fbe837c87`.
- Public tree: `e93d2be7b43e956ce27d92097e6f24568f99134c`.
- Private source commit: `24edddab2cff33b3f91b396bc855193f87421ba3`.
- Frozen private tree: `babc04d69e315c133fa1a365e88b4578660fbaba`.
- `dist/` contains exactly **33 runtime files / 668,075 bytes**, copied as binary bytes from `/workspace/shared/ironroot-release-0.12.0/public`.
- All 33 files were independently matched to `/workspace/shared/ironroot-qa-0.12.0-candidate3/private/dist` and both saved Git-blob inventories. SHA-256 and Git blob SHA-1 are pinned in `historical-manifest.json`.
- `package.json` is the exact independently checked frozen private package: version 0.12.0, 331 bytes, Git blob `952804859136b1b730518289b55a32591c58aec6`. It provides the Node ES-module boundary. Its historical npm scripts are documentary; this fixture is not a checkout with those test scripts.
- `provenance/RELEASE_VERIFIED.json` is the byte-exact existing release record. Its recorded live smoke and test totals are inherited evidence, **not checks rerun here**.
- `provenance/public-objects.json` and `private-objects.json` are byte-exact local inventories. The validator reconstructs both Git tree hashes from their file blobs. Commit-to-tree association relies on the supplied verified release record and frozen snapshot; no remote request or fresh live check was made.
- `provenance/deployment-baseline.json` records all 42 files in the original deployment staging directory before fixture work, including deployment metadata and the existing smoke image. The optional comparison checks that none of those original bytes changed.

Deployment `CNAME`, `.nojekyll`, and deployment `README.md` are deliberately absent from `dist/`. Their hashes remain in provenance, not their deployable files. This README is fixture documentation. No saves, storage exports, browser profiles, or new screenshots are included.

## Validate without dependencies or side effects

Use Node.js 20 or newer. No package installation, network, browser, server, Git checkout, or writes are required:

```sh
node /workspace/shared/ironroot-production-v012-fixture/validate-fixture.mjs
```

On the original machine, independently compare the deployment and frozen private inputs too:

```sh
node /workspace/shared/ironroot-production-v012-fixture/validate-fixture.mjs \
  --compare-deployment /workspace/shared/ironroot-release-0.12.0 \
  --compare-source /workspace/shared/ironroot-qa-0.12.0-candidate3/private
```

The validator pins the manifest digest, verifies the exact file inventory, byte lengths, both hashes, five WOFF2 headers, package and evidence hashes, both Git trees, and the complete worker precache. It then exercises small synthetic, in-memory historical contracts: three-map save round trips; all 16 authored campaign saves; 48-star campaign/backup preservation; protocol-2 fencing; and report/training availability. Those checks characterize **historical 0.12**, not future compatibility or browser takeover.

The worker declares 33 precache URL entries: `./` and `./index.html` alias the same bytes, leaving 32 unique runtime files. `service-worker.js` itself is the 33rd runtime file and is intentionally not in its own precache. All five fonts, three Battle Report resources, and four training resources are cached.

Files are read-only (0444), directories read/execute-only (0555). This prevents accidental edits; hash pins detect changes. It is not an OS-level immutable flag or cryptographic remote attestation. Keep the externally reported manifest digest with the fixture when transferring it.

## Why the existing 0.7/0.8 cases are insufficient

The old fixtures are Classic-only engines with version-1 engine saves, profile protocol 1, 12 missions / 36 stars, external Google Fonts, no Battle Report, and no isolated practice page. They contain 17 and 18 runtime files respectively; 0.8 adds the codex resource.

Production 0.12 already has:

- Classic (3200×900, three lanes), Long March (4000×900, three lanes), and Twin Span (3200×900, two lanes). All map revisions are 1. Classic still serializes engine version 1 without map fields; the other maps use engine version 2 with explicit `mapId` and `mapRevision`. The outer `ironroot-save` envelope is separately version 2.
- Profile marker `ironroot.profile.v1` with protocol **2**, plus the five persistent domains: campaign, trials, settings, history, battle. The profile marker is separate from the backup payload. Old protocol-1 clients are fenced; rollback to 0.7/0.8 is not established as safe.
- 16 missions / 48 stars across five chapters. The four newer IDs are `open-horizon`, `river-charter`, `far-beacon`, `common-ground`, alternating Long March and Twin Span. Five field trials remain available.
- Five local WOFF2 fonts with notices, all in the offline shell.
- Battle Report (`battle-report.js`, `report-view.js`, `report-view.css`): tab-local, current-match observations only. Reports are not replay files and are deliberately absent from saves, recent history, and backups. A resumed report begins after Resume and must not invent earlier observations.
- Guided practice (`training.html`, `training-app.js`, `training.css`, `training.js`): five lessons using the real engine and isolated in-memory state; no campaign, trial, history, or saved-battle rewards/writes. Training navigation has its own service-worker HTML fallback.

## Future gate status

See `UPGRADE_TEST_CONTRACT.md` for the proposed test contract. Nothing here modifies an existing server, route allowlist, Playwright configuration, candidate source, or previous fixture.

**0.12 → future browser takeover is UNRUN and blocked on a distinct future service-worker version and an exact frozen candidate.** At preparation time the local feature branch still uses `ironroot-v0.12.0` as a working placeholder. Do not call a same-version cache substitution an upgrade test, mutate this historical worker, or count an existing 0.7/0.8 → 0.12 pass as evidence for the next release.
