# Fog acceptance update · 2026-11-08

This is a **local draft-review update**, not merge, deployment or release acceptance. It adds exact-input mask reuse, reviewed citadel-label/Pause discoverability changes, a test-only canvas-registry lifetime cleanup and three corrected fresh-ruleset expectations. Version, profile, save, gameplay and ruleset implementations are unchanged by this update. Main/live v0.20.3 is outside its scope.

## Current result

- **1,663 passed, zero failed, one optional skip** in the single final combined-source aggregate at unchanged concurrency 4. All **132 focused checks**, syntax and the **56-file / 1,086,395-byte** runtime inventory passed. The skip is installed-desktop minimatch compatibility because optional desktop build dependencies are absent.
- A genuine enemy-building memory was earned on frozen PR22, keyboard-accessed and preserved through Save → title → reload → Resume. The later combined-source smoke retained the exact entry, showed the unknown-citadel text clear of the right controls, and saved a Fog checkpoint at **01:13**. Displayed progress/options matched both the session baseline and prior paid epoch.
- The earlier **cache-only** component renderer passed **120/120 zero-tolerance RGBA comparisons**, totaling **313,518,304 identical bytes**. One later component call-timing pass provides limited mechanism evidence, not full-game or sustained performance acceptance.
- The sustained pair remains **inconclusive**. Native phone/short-landscape, offline/update, long-list overflow and controller/browser-history Back gates remain open.

All supporting artifacts below are included under [the repository-relative evidence index](../qa/fog-acceptance-update-2026-11-08/README.md). Historical reports and failures are preserved verbatim. Their earlier “pending” or “not run” wording is dated to those reports; this document records the later completed bounded smoke, without rewriting prior evidence.

## Source epochs must remain separate

| Epoch | Exact identity | Evidence applicable to it |
| --- | --- | --- |
| Frozen PR22 | Assigned head `20c57fa69dac330115ed3cd0d9137d224f0b2f42`; fog-view SHA-256 `be9a2aac5128b2160ac8bae99409ad42fb9f0c11c7d360d972c07ac6511315cc` | Genuine one-entry memory/access/save/restore; original overlap screenshot; original performance diagnostic |
| Cache-only experiment | fog-view SHA-256 `9b4ce9b7186c6498c576012ac295602dbe35455352d37be7b42b864df3362815` | Reviewed cache mechanism; 120-case component parity; sole component timing; failed sustained pair; test-retention experiment |
| Combined local draft update | fog-view SHA-256 `12f09d2c0e30b260ebfa8f431d218f1881be528b8a8b0c9c4617cb7cb6cf24db` | Reviewed cache plus label/Pause changes; 132 focused checks; 1,663-pass aggregate; bounded real-checkpoint smoke |

Only `dist/fog-view.js`, `dist/app.js` and `dist/index.html` differ at runtime from frozen PR22. The other 53 runtime assets retain exact hashes. The [27-file core assembly manifest](../qa/fog-acceptance-update-2026-11-08/combined-source/assembly-manifest.json), [source/test patch](../qa/fog-acceptance-update-2026-11-08/combined-source/combined-source.patch) and [runtime inventory](../qa/fog-acceptance-update-2026-11-08/combined-source/runtime-inventory.json) pin the combined source. The separate documentation/evidence addendum does not alter those 27 files.

The [method identity proof](../qa/fog-acceptance-update-2026-11-08/combined-source/cache-method-identity.json) and [independent source review](../qa/fog-acceptance-update-2026-11-08/independent-reviews/combined-source-draft-readiness.md) establish that cache helpers, constructor/reset/draw path, drawMask, drawMemories and drawMinimap remain text-identical to cache-only 9b4ce9. Ordinary render.js/world-to-screen is unchanged. This does **not** transfer whole-component pixels, complete app performance or general visual acceptance to the combined label source.

The lean source oracle contains only the exact frozen 14-module import closure and its full 56-file hash inventory. The adapted cache inventory test pins the reviewed app/index hashes explicitly; its other thirteen behavior tests retain their original assertions. No duplicated baseline/candidate runtime asset trees are part of this evidence addendum.

## Actual nonempty memory and label smoke

The [original paid-memory report](../qa/fog-acceptance-update-2026-11-08/original-native-memory/NATIVE_MEMORY_ACCEPTANCE.md) covers one Easy / Classic / open-endgame / Fog attempt on frozen PR22, at native desktop 1180 × 757. An enemy Archery range became a stale AR1 marker through ordinary play. Enter, Tab focus, Space collapse/reopen, outer Pause wheel scrolling, explicit Options → Back, Resume/Pause and save/reload/Resume were exercised. The complete remembered text survived unchanged:

> Last seen Archery range, level 1, at 1:11. Current health and production unknown. Road 1, position 2370 along the known map.

[Keyboard-focused entry](../qa/fog-acceptance-update-2026-11-08/original-native-memory/native/05-keyboard-memory-detail.jpg) · [restored entry](../qa/fog-acceptance-update-2026-11-08/original-native-memory/native/08-restored-memory-detail.jpg)

The [combined-source smoke](../qa/fog-acceptance-update-2026-11-08/combined-native-smoke/COMBINED_SOURCE_SMOKE.md) resumed that real saved checkpoint, immediately paused, expanded **Last-seen details (1)** and observed the same sentence. About one second of ordinary resumed play provided the new field screenshot. The unknown-citadel text was visibly clear of the gear/toolbelt; the stale AR1 badge remained readable. The camera was restored without pan/zoom or viewport change. Actors advanced, so this is not an identical-frame pixel comparison.

| Before: frozen PR22 at 01:12 | After: combined source at 01:13 |
| --- | --- |
| ![Original unknown-citadel text intersects the right gear; stale AR1 remains readable.](../qa/fog-acceptance-update-2026-11-08/original-native-memory/native/09-real-stale-field.jpg) | ![Combined unknown-citadel text is clear of the right controls; stale AR1 remains readable.](../qa/fog-acceptance-update-2026-11-08/combined-native-smoke/native/02-known-label-clear.jpg) |

[Preserved combined entry](../qa/fog-acceptance-update-2026-11-08/combined-native-smoke/native/01-preserved-detail.jpg) · [final saved title](../qa/fog-acceptance-update-2026-11-08/combined-native-smoke/native/03-final-title.jpg) · [post-smoke source/preservation check](../qa/fog-acceptance-update-2026-11-08/combined-native-smoke/post-smoke-verification.json)

All 56 source/stage asset hashes remained exact. Displayed progress and six audio/display options were preserved; this is observed-domain equality, not a claim of identical profile bytes. The authorized battle checkpoint legitimately advanced from 01:12 to 01:13.

The checkpoint contained no remembered enemy-citadel upgrade. The new timestamped frozen-choice entry therefore remains source-test evidence, not native validation. The existing Citadel dialog already exposed the frozen choice; the new Pause entry improves discoverability/timestamp presentation, rather than creating the sole fallback. The one-entry list was only 70 pixels high: it does not certify internal long-list overflow or universal label containment.

## Mask pixels and source delivery

The [cache-only parity report](../qa/fog-acceptance-update-2026-11-08/component-parity/COMPONENT_PARITY_REPORT.md) and [complete raw result](../qa/fog-acceptance-update-2026-11-08/component-parity/evidence/component-native-result.json) preserve all 120 case results. Baseline field/minimap rebuilds were **118/118**, candidate **78/66**; compositing continued on cache hits. Cases cover observer order/geometry, edges/overlap, logical and rounded backing sizes, synthetic raster DPR, field camera transforms, same-tick changes and lifecycle/reset boundaries.

The first strict delivery attempt stopped before pixels: preview injected live-server code into `icon.svg`. Its [failure and diagnostic](../qa/fog-acceptance-update-2026-11-08/delivery-history/DELIVERY_DIAGNOSTIC_REPORT.md) remain preserved. The reviewed component-only gate then required exact SHA-256 for **53 rendering assets per variant**, including all JS/fonts/CSS. Only unused `icon.svg`, `index.html` and `training.html` were fetched as inert metadata. Each of their six responses had to be exact or show its own positive live-server transformation marker; unavailable, HTTP-error and unattributed mismatch responses block pixels. No response was stripped, repinned or executed to force a pass.

All **106 strict served rendering assets** matched, and all six inert metadata responses were independently classified preview-transformed. This supports exact game-rendering assets under this preview, not exact page bytes, production delivery or offline behavior. Native viewport 1180 × 757 / device DPR 1 was unchanged. Local synthetic Canvas DPR settings are not phone/device emulation; dispatched context events are not real GPU-loss testing; synthetic terminal cases are not played victory.

## Limited component timing, not sustained acceptance

The [sole timing report](../qa/fog-acceptance-update-2026-11-08/component-timing/COMPONENT_TIMING_REPORT.md), [complete raw result](../qa/fog-acceptance-update-2026-11-08/component-timing/evidence/native-result.json), [236 paired rows](../qa/fog-acceptance-update-2026-11-08/component-timing/evidence/paired-calls.csv) and [independent recomputation](../qa/fog-acceptance-update-2026-11-08/independent-reviews/component-timing-result-review.md) record 472 synchronous drawMask call intervals, with all 120 original pixel cases still passing.

| Candidate outcome | Pairs | Mean baseline / candidate, ms |
| --- | ---: | ---: |
| Field hit | 40 | 0.645 / 0.035 |
| Field miss | 78 | 0.809 / 0.827 |
| Minimap hit | 52 | 0.113 / 0.048 |
| Minimap miss | 66 | 0.138 / 0.108 |

These selected cached field calls were shorter in this one component pass. Field-miss p95 was **1.4 / 1.7 ms**, so not every case was faster. Candidate zero readings occurred in 26/40 field hits and 45/52 minimap hits at about 0.1 ms observed granularity; zero does not mean free. Both 1.9 ms minimap outliers remain in the evidence, unexplained.

Baseline always preceded candidate. There was no randomized order, warm-up, repeated study or separate blur monitor. Readback-heavy synthetic cases are not gameplay hit frequencies; deferred Canvas/GPU work may occur outside the measured calls. These are not completed raster/GPU, FPS, full-game, device, fairness or statistically established speedup measurements. Combined label layout can add sort/measure/collision work, so cache-only timing does not establish combined app performance.

The [sustained fixed-camera attempt](../qa/fog-acceptance-update-2026-11-08/failed-sustained/FIXED_PAIR_BLOCKED_REPORT.md) queued two 70-second configurations once. Baseline warm-up was observed; after 142 untouched seconds, the result read and one bounded recovery timed out. There is no complete raw measurement, summary, end geometry or verified candidate completion. Cause remains unknown. No retry or optional follow pair was run. The favorable micro-observation does not replace that inconclusive gate.

## Test history and reviewed cleanup

Both earlier aggregate failures remain failed: the first was unclassified; the second records a SIGKILL of unchanged combat-feedback.test.mjs, with no proven cause. The [read-only failure review](../qa/fog-acceptance-update-2026-11-08/test-failure-history/aggregate-failure-review.md) found concrete mock-registry retention, but no historical OOM/cgroup evidence. Do not infer a memory cause from SIGKILL alone.

Exactly one unchanged single-file run and one cleanup counterpart were measured sequentially. Both passed **8/8**, exited 0, with no signal and empty stderr. Linux wait4 maximum RSS was **522,380 → 211,492 KiB** for this pair. The [comparison and raw resource records](../qa/fog-acceptance-update-2026-11-08/test-retention/COMPARISON.md) support lower retained test memory, not original failure causality or player-facing performance. The reviewed cleanup releases the mock registry only after each full independent case's original iterations/assertions.

A separately authorized post-cleanup cache-only aggregate passed **1,648 with one optional skip**. The later combined aggregate passed **1,663 with one optional skip**. Both earlier failures, the original listener-retention regression and the exact cleanup patch are retained; no assertion was weakened to turn them green. [Final combined validation](../qa/fog-acceptance-update-2026-11-08/combined-source/validation-summary.json) · [complete combined TAP](../qa/fog-acceptance-update-2026-11-08/combined-source/aggregate.tap).

## Gates still open

- Native physical-phone/short-landscape and other device/browser/controller acceptance. Denied native DevTools emulation was not retried or worked around.
- Real service-worker registration, cold/offline relaunch and update from current live. The managed HTTP-localhost app intentionally skips registration; no authorized native offline/network control was available. [Offline report](../qa/fog-acceptance-update-2026-11-08/offline/REPORT.md).
- The reviewed **three literals in two browser specs** now expect the correct fresh `frontier-citadel-open` identity. All downstream assertions and legacy restores remain intact. Six source/codec checks passed; the specs were not thereby executed natively. [Expectation review](../qa/fog-acceptance-update-2026-11-08/offline/ruleset-expectation-followup/REVIEW.md).
- Sustained fixed/follow performance, combined app performance, real GPU restoration, long-list internal overflow, controller/browser-history Back, a naturally remembered enemy-citadel choice and broad label/overlap scenes.

No merge, publication, profile clearing, backup import or additional paid attempt is implied. Browser/preview work is complete. The next scope is draft review only.
