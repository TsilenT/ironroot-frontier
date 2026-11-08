# Service-worker shell refresh repair

## Finding

On 2026-11-08, the production v0.26.1 HTTP runtime matched the reviewed release, while an existing cloud-browser session still rendered v0.26.0 after normal reload. Its paid Roadside Watch 00:07 checkpoint remained visible. No production save, cache, or other storage was cleared. Browser-internal diagnostic navigation was unavailable and was not bypassed. The exact internal state of that production registration was not inspected.

The installer used `cache.addAll(FILES)` with unversioned asset URLs. A new CacheStorage name does not invalidate the browser's ordinary HTTP cache. GitHub Pages responses for the worker and index were observed with `Cache-Control: max-age=600`. Thus a new worker could successfully activate with old assets stored under its new release name. Subsequent cache-first navigation would keep serving those old bytes.

## Repair

Precache every shell URL as `new Request(path, { cache: 'reload' })`. All responses must still succeed before `skipWaiting`. Activation, cache-first offline behavior, profile storage and gameplay are unchanged. Ship only with a new release/cache identity; the patch was handed to the v0.27.0 candidate and must not be deployed under v0.26.1.

## Native Chromium evidence

A managed loopback preview ran the actual verified v0.26.0 shell followed by the v0.26.1 shell, with a one-hour warm HTTP cache. The QA-only worker names were isolated. The default-code scenario restored only the old `addAll(FILES)` call; the fixed scenario used the candidate installation code. No request interception or Disable cache setting was used.

- Old code activated but cached four stale files: index.html, app.js, campaign.js and campaign-presentation.js.
- Fixed code activated with all 57 unique cached shell assets matching current SHA-256 hashes. The worker script itself is not part of the precache manifest.
- An isolated localStorage probe was unchanged in both scenarios. This is not a paid-save or production-profile migration test.
- The fixed scenario generated new server requests with `Cache-Control: no-cache`.
- The dashboard reported pass=true. Measured post-request completion was 155 ms for the default case and 1,623 ms for the fixed case. Timing is incidental, not a performance claim.
- An initial QA-server attempt hit a path-normalization bug before the candidate worker could be fetched. That local harness path was corrected and the comparison then passed; no game or browser-security setting was changed.

The screenshot is retained in the task evidence as `warm-cache-result.jpg`. The portable manual harness is `qa/service-worker-cache/`. Its server is loopback-only and is not a production endpoint. The first unmanaged loopback preview was unreachable from the native browser; the supported managed preview was used successfully and stopped afterward.

## Automated checks

Against the verified v0.26.1 source plus this repair: 1,956 Node tests passed, zero failed, one existing optional test skipped. All runtime JavaScript parsed and the 58-file release inventory validated. Four new worker-model tests cover warm-cache refresh, reproduction of the previous code's failure, failed-install atomicity, and unchanged activation/offline serving. These model tests are separate from the real native-browser evidence.

## Remaining limits

This establishes a concrete cache defect and its repair under real warm-cache Chromium conditions. It does not prove the exact internal cause of the original cloud-session symptom, a live post-deployment update, physical-phone/PWA behavior, every browser, or a complete real-profile upgrade. Recheck the original live session and checkpoint after the containing release is deployed. No automatic mid-battle reload was added.
