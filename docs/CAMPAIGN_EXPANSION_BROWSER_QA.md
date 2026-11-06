# Ironroot 0.10 campaign browser gates

## Status and execution boundary

The isolated candidate is `/workspace/shared/ironroot-v010`, source/package version **0.10.0**. This change owns only `qa/browser/` and this report. No original 0.9 checkout or frozen 0.7/0.8/0.9 source snapshot was edited.

**Browser execution is pending.** No browser or HTTP server was launched in this workspace. Passing fixture validation or test discovery is not a browser pass, a gameplay/balance pass, or publication approval.

Completed locally:

- `npm --prefix qa/browser run check`: passed all JavaScript syntax checks and all existing/new fixture validators.
- Discovery using the already installed **Playwright 1.57.0**, discovery only: **552 test instances, 138 logical cases, 10 spec files**, across phone, narrow-phone, landscape, and desktop.
- The package and lockfile still pin **@playwright/test 1.65.0** for the separate authorized actual-browser runner. No dependency, browser, security, or system setting was changed. A temporary import shim for the existing 1.57.0 package was removed after discovery.
- There are **3 intentional runtime skips**, all inherited from the single 390px coordinate-specific selection-panel regression on the other three profiles. No new test skips were added. A clean complete execution would therefore be **549 passed / 3 skipped / 0 failed**, not 552 passed.

Evidence is retained at:

- `qa/browser/evidence/0.10-fixture-validation.txt`
- `qa/browser/evidence/0.10-discovery-playwright-1.57.txt`

The inherited discovery shim does not provide useful original line numbers for every transformed source. Case names, project names, file names and counts are the discovery evidence; the pinned runner should regenerate its own report and source locations.

## Added coverage

`expanded-campaign.spec.mjs`: **34 logical cases / 136 instances**.

- Before Ironroot is complete, chapter five's Open Horizon remains locked. Existing twelve mission records remain campaign schema v1, preserve their exact 36-star progress, unlock mission 13, survive launch/reload, and remain portable in backups. Totals display 16 missions / 48 possible stars.
- Real result-screen award flow branches after Open Horizon into River Charter and Far Beacons. Common Ground stays locked until both branches are completed. Existing mission records are preserved through every award and the final epilogue appears only after convergence completes.
- Each of the four new missions has UI launch, save, reload and resume coverage for its declared map, engine map version/revision, authored formation and preserved progress.
- Each mission has synthetic persisted objective-success and exact-deadline-failure fixtures evaluated by the actual browser runtime. Stars, history map identity, single-award behavior, Retry focus and same-map restart are asserted.
- Every original protected structure in Open Horizon, River Charter and Common Ground must disable salvage. A different ordinary building must remain actually salvageable. Losing an original protected target fails before its deadline. Far Beacons has no protected structure; its independent minimum-health failure is tested instead.
- Each new mission's scouting disclosure starts collapsed and supports native Enter/Space, focus, responsive layout, real SVG world proportions/roads, accessible description, army counts, deployment levels, and protected/destroy glyphs. Screenshots are attached per mission and profile during actual execution. Another case switches Classic to Twin Span by keyboard and verifies the report updates without losing focus or disclosure semantics.
- Native file chooser/download backup roundtrip, replacement reload and resume preserve each new mission/map. Valid Classic engine saves with matching difficulty/AI but the wrong campaign map are rejected both as local saves and as backup files without overwriting existing profile bytes.

`profile-upgrade.spec.mjs`: **14 logical cases / 56 instances**.

- Absent and ready-v1 markers migrate once to verified ready-v2 markers while old progress is preserved. A ready-v1 epoch is retained.
- Pre-write denial, silent dropped write, denied post-write readback, and a competing marker are distinct cases. The app must block writes, retain domain bytes and require a real reload. An absent marker with a denied upgrade also stays blocked.
- A storage adapter that throws after actually persisting succeeds only when exact readback verifies the desired marker. This is not reported as a failed write.
- Restoring/failed v1, malformed and future-version markers are never automatically replaced or treated as recovered.
- A real frozen QA-baseline 0.9 app is left open with a paused battle. The current app upgrades the shared origin to protocol 2 and imports valid expanded progress plus a Common Ground battle. The actual old app must show recovery, refuse continued editing/reload, and preserve all newer bytes through native `beforeunload` and tab close.
- A native backup file exported by that actual old app is imported by the current app after migration, proving protocol fencing does not break portable old backups.

## Fixture evidence and limits

`expanded-campaign-fixtures.mjs` derives maps, prerequisites, target identities, rules and deadlines from the public mission factory/objective API. It never accesses a private runtime game global. The successful fixtures are synthetic persisted positions, **not human-played victories or proof of balance**. Income fixtures use ordinary public paid build/upgrade calls. Browser interaction uses real controls, native keyboard/pointer/touch, persisted saves and native file chooser/download flows.

Verified fixtures:

- 13 start/success/deadline/health variants: four start states, four objective successes, four deadline failures, one Far Beacons health failure.
- Three protected-target-loss variants.
- Four valid new-map campaign backup roundtrips.
- Four otherwise valid Classic engine wrong-map campaign rejections.
- 12 existing missions / 36 stars preserved under 16 missions / 48 maximum stars.
- Current exact deadlines: Open Horizon **240s**, River Charter **210s**, Far Beacons **280s**, Common Ground **300s**. Tests derive these from authored content rather than waiting several real minutes or faking a timer.

`fixtures/0.9.0-qa-baseline-dist/` contains **24 exact SHA-256-verified runtime files** copied from the frozen 0.9 QA baseline and checked against `BASELINE_0_9.json`. Its checked manifest is `fixtures/0.9.0-qa-baseline-sha256.json`. This is **not a production/released 0.9 build** and it deliberately retains the pre-fix held-touch behavior. `validate-legacy-profile-fixtures.mjs` verifies every runtime hash, the unchanged first twelve mission definitions/rules (apart from derived next-chapter reward and explicit map/AI defaults), and the actual old protocol-1 module's refusal to write against a v2 marker.

The fixed QA-only `/__qa_legacy/0.9.0/` server route serves that immutable runtime on the same origin as the current app so real cross-tab localStorage behavior is exercised. It is not a production route. Existing randomized per-test service-worker upgrade sessions are retained unchanged.

Fault injection wraps native Storage methods before app startup and records actual marker write attempts and readback denial. It changes only the explicitly tested fault, then restores those methods before the reload. It never reseeds old bytes on reload, invokes private application functions, or declares a write failed when readback proves success. Ordinary fixture seeding is once per intended navigation, not a persistent reload overwrite.

## Retained and updated gates

- Exact production **0.7.0** fixture: 17 runtime files plus pinned commit/package/git-blob metadata.
- Exact frozen **0.8.0** fixture: 18 runtime files.
- Both real service-worker/offline transitions now target **0.10.0**, hash every current precache entry offline, preserve Classic progress, exercise new-map play/save/resume and load all five bundled font files. Their original provenance distinction is unchanged.
- Existing totals assertions were updated from 12 to 16 only where they describe the current campaign total. Classic trial/legacy mission restrictions and rejection assertions remain intact. The old generic “campaign always Classic” test title now accurately says “initial legacy mission.”
- The corrected held-gesture test block was copied from the dedicated modal-input fix, not independently rewritten. It calibrates real playable/result-action overlap, first at the native viewport, with an explicitly annotated 844×390 same-input fallback only when necessary. It performs two genuine objective deadline crossings: delayed compatibility-click observation, then release immediately followed by a fresh native Retry press. It has **zero skips**. The runtime input-scope fix is owned/integrated by the parent; this harness does not alter app code.

## Separate authorized runner handoff

From the transferred final candidate in the authorized browser environment:

1. Use the pinned browser package/lockfile at `qa/browser` and verify Playwright reports **1.65.0**.
2. Run `npm run check`, then `npm run list`. Expected discovery: **552 instances / 138 logical cases / 10 files**.
3. Run the full `npm test` with the four existing configured profiles. Do not weaken failing UI/storage assertions to meet the expected counts.
4. Retain the HTML report, JSON or console summary, traces/screenshots on failure, per-mission scouting images, and held-gesture annotations identifying physical input, native/fallback viewport and actual hit target.
5. Report failures, blocked/unrun stages and the 3 intentional skips separately. Re-run affected checks after any subsequent runtime/content/harness changes. No publication is implied.
