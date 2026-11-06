# Proposed 0.12 → next-release gate

This is a test contract only. It does not integrate routes, modify a server/configuration, or authorize publication. Every browser run uses a fresh synthetic profile on an isolated loopback origin. Never reuse the live user profile or expose arbitrary filesystem roots.

## Preconditions: fail closed

1. Validate this immutable fixture and its externally pinned manifest digest. Preserve the separate 0.7 and 0.8 migration cases rather than rewriting them.
2. Freeze the candidate commit/artifact, full runtime inventory, SHA-256 hashes, package version, worker version, and required profile protocol. The future worker must have a new version/cache name and different script bytes. The current local `ironroot-v0.12.0` placeholder is **not eligible**. If either identity or version is missing, report **UNRUN / BLOCKED**, never PASS.
3. A later approved integration may add only an explicit `0.12.0` fixture allowlist entry and isolated session routing. Reuse the existing real registration/update helper. Do not interpolate untrusted version strings into paths, rewrite historical bytes, unregister the old worker to simulate an upgrade, or seed the new cache manually.

## Historical starting states

Create separate fresh sessions for Classic, Long March, Twin Span, and at least one newer authored campaign mission. Install the real 0.12 worker and assert its active controller and cache. Hash every precached response through that worker; independently verify the uncached worker script against its pinned hash before advancing.

- Generate the saved battle through the actual 0.12 UI. Record paused state, timer, gold, structures/levels, map identity, and objective identity. Classic's engine save must be v1 with no map fields; Long March/Twin Span must be v2, revision 1. Do not assume every 0.12 save is engine v2.
- Synthetic campaign progress must include prerequisites and newer mission IDs. Cover all 16 completed missions / 48 stars, and a separate partially complete frontier chapter with an unfinished authored battle. Preserve best times, stars, unlocks, and the five-chapter overview; testing Emberwatch alone misses the protocol-2 regression.
- Include a completed field trial, valid map-bearing history, nondefault sound/music/SFX/volume, reduced motion, and low-quality settings. Use the old runtime's validator/backup functions to admit synthetic data. Capture the exact five domain strings **and the separate profile marker**.
- Verify the starting ready marker is protocol 2. Do not expect the migration from absent/protocol-1 markers used by the old fixture tests.

## Real takeover and offline integrity

Keep the old document open while advancing only its isolated server session to the exact candidate. Call the actual registration update helper and await new controller activation with bounded update/claim timing diagnostics. Assert the new cache replaces the old Ironroot cache and unrelated caches remain. Before the first deliberate user save, compare profile strings and marker exactly; if a future protocol migration is intentional, require an explicit, separately reviewed migration assertion instead of silently allowing changes.

Go offline and reload under the new controller. Hash **every** candidate precache entry through the worker, not just cache names or visible version text. Verify all five existing local fonts load, notices remain accessible, and all report/training assets are served. Do not require the new shell to be larger: valid replacements may reduce file count.

Resume each historical save, preserve map/revision and authored objectives, and compare the paused initial state before advancing time. After a controlled interval, save, reload, and resume again. Play a new map battle offline too. Campaign, trial, settings, and history strings must remain unchanged unless an action in the test legitimately changes that domain. Document such actions and compare their exact expected changes.

## Modern-feature and stale-tab checks

- Visit `training.html` directly and reload it offline; confirm it stays training rather than returning index HTML. Complete a real 140-gold barracks placement and observed warrior spawn. Exercise retry/skip/return and compare all five persistent strings plus profile marker before and after. Practice progress is intentionally not durable.
- Finish a match after Resume and inspect/download the new tab-local Battle Report. Verify map, objectives, partial timeline disclosure, and that earlier events were not invented. Reload clears that report. Report observations must not appear in save/history/backup payloads. Do not require an old in-memory report to survive document reload.
- Read/export the preserved profile and validate all modern mission IDs and map-bearing data. Restore only into another disposable profile, verify the exact expected state, and recheck practice isolation.
- Retain the old 0.12 document across controller change and verify it cannot overwrite a newer save/import after another tab claims or replaces it. Test intentional protocol bumps separately. Use existing save/history/preference ownership and import-barrier contracts; older 0.7/0.8 clients remain fenced from a protocol-2 profile. A forward upgrade pass is not proof of safe downgrade.

## Required evidence and accounting

Record source and candidate identities, both worker versions, pinned hashes, controller timings, actual offline response hashes, synthetic profile comparisons, resume assertions, and console/page errors. Capture screenshots on relevant failures, without real profile data. State PASS, FAIL, and UNRUN separately per browser and scenario. A static fixture-validation pass alone is never a service-worker takeover pass. Do not claim real-device/controller or packaged-desktop coverage from a loopback Chromium test.
