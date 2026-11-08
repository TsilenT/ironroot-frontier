# Longer-score source integration, v0.20.3

Prepared 8 November 2026 against private main `fdbd86c31ec2225009faa572f66ed4ccc4970315`, after the PR #20 documentation correction. At preparation, the last verified live build was v0.20.2 from source `0cdd1f5f3ff35c538c36b6cfe30848b2cfb632e7`, public commit `f2ad682fa35aec7c5f1cbbea9b2d10b94d931399`. This report records source preparation and technical acceptance; it does not assert a later merge or deployment. Future release observations should be added with their exact commits rather than inferred from the source version.

## Source and scope

The original experiment is `604de18910d7ddceda648d8156283b42c321e8ba` on `experiment/audio-long-reach`, based on `24edddab2cff33b3f91b396bc855193f87421ba3`. Its `dist/audio.js` is integrated byte-for-byte, SHA-256 `7e5921c056ab468b5de8c97cee1b5b930ef2e501136eb08cb715822f3c7b782a`, Git blob `8c83fd198b8b9c2286e062c118d07c260059e79d`. Both the experiment's parent and current integration base use the same original audio blob `bddef65feba76d77fbdd20d78fc77c5405692059`; no intervening audio changes are discarded.

Runtime changes are limited to `audio.js`, the visible v0.20.3 title-screen version and `ironroot-v0.20.3` service-worker cache identity. Root and desktop package/lock versions also become 0.20.3. The 54-file runtime inventory is [recorded here](../qa/audio/integration-0.20.3/runtime-inventory.json). No engine rules, gameplay RNG, profile protocol, save data, audio preference schema, app controls or external audio assets change. Optional fog and held compact-toolbar PR #14 are excluded.

The original experiment's written score, tests, lab and historical signal records are preserved. Its documentation is labelled historical where necessary. PR #20's shipped-feature and branch-disposition information is retained; README and FEATURE_DELIVERY distinguish this source integration from the dated, last verified live baseline.

## What changes

- The Long Reach becomes **The Long Reach — Hearth to Standard**: 64 bars / 142.22 seconds instead of 16 bars / 35.56 seconds, still D minor at 108 BPM in 4/4.
- Hearth develops the existing motif; The Road and The Crossing add two new written 16-bar answers; The Standard reprises the original theme with a lower response. This is not four copies of the old loop.
- Menu voicing drops an octave and becomes sparser, with no drums. Battle orchestration develops through calm, engaged and critical states with hysteresis; tiny intensity changes no longer rewrite gains each frame.
- Menu/battle transitions keep musical position; pause/resume advances to the next bar instead of restarting the piece. Result scenes fade music out.
- Warning, strike, start, victory and defeat cues lower only the music bus to 52% before recovering. All 19 existing SFX synthesis sequences and aliases remain unchanged.

The score is code-authored from written notes, oscillators, filters, envelopes and locally seeded noise. No recordings, sample packs, impulse responses, music service or external audio dependency is introduced. Source inspection supports that provenance statement, not an independent worldwide originality search.

## Fresh technical acceptance

On 8 November, a new native Chromium 156 tab loaded an isolated managed-preview lab. The page verified the exact production audio hash before enabling its normal UI buttons. The original scheduler-preserving renderer generated 48 kHz PCM without bypassing source accounting or admission limits. A separate diagnostic case tapped the music bus before and after ducking while retaining the original stereo output.

**All 12 PCM cases and 15 live-control checks passed, with zero captured page errors.** Full results are in [native-2026-11-08.json](../qa/audio/evidence/native-2026-11-08.json). These results precede metadata-only version changes; audio bytes remain identical, so PCM was not redundantly rerun.

| Case | Rendered seconds | Peak | RMS | Peak sources |
| --- | ---: | ---: | ---: | ---: |
| Two full battle cycles plus tail | 287.44 | 0.18363562 | 0.03698975 | 20 |
| Menu | 145.22 | 0.08890966 | 0.02057673 | 10 |
| Off-grid menu-to-battle journey | 145.22 | 0.18069115 | 0.03304099 | 20 |
| All-SFX maximum-volume overload | 145.22 | 0.74883687 | 0.20298588 | 48 |
| All 19 individual cues | 57.00 | 0.33127910 | 0.02091885 | 11 |
| Five priority-cue duck checks | 32.00 | 0.42480817 | 0.04314247 | 23 |

Every case had zero clipped and nonfinite samples. The one-second battle loop-seam window had peak 0.16522409, RMS 0.04140648 and maximum adjacent-sample delta 0.01733857. Muted, volume-zero and both-buses-off renders and all three control silence windows were exactly zero. All 19 cues produced nonzero PCM. Stress admitted 5,111 effects and rejected 16,435 requests under existing limits; its 48-source peak remains below the 80-source cap.

All five priority cues measured held music ratios from 0.5199999807 to 0.5199999815, recovering to 1; master and SFX gain were unchanged. Live checks covered lazy context creation, successful gesture unlock, menu/battle PCM, preserved transport, cancel-before-downbeat, warning duck/recovery, independent buses, master mute/zero, pause/resume, result silence and clean destruction. The fresh pass did not separately retest blocked-autoplay rejection or saved preference persistence.

Final prepared-source Node/syntax/runtime counts and commands are recorded in [validation.json](../qa/audio/integration-0.20.3/validation.json). The repository-portable integration tests cover exact released SFX sequences, the cancel-and-hold path, deterministic score/seam structure, fresh-evidence hash provenance and version/cache consistency. Checking saved evidence is not a new browser execution.

## Limits and known caveat

**No actual listening pass was performed.** Nonzero PCM, gain measurements and source inspection do not establish whether the score sounds good, its fatigue, perceived masking/clicks, speaker/headphone translation or hardware latency. Physical iOS/Android, Safari and Firefox remain unverified. This fresh browser pass exercised the exact module in its isolated lab, not a combined full-game fog/music release.

There is a low-severity transition timing caveat: a scheduled downbeat enters the 180 ms lookahead and changes `musicScene`; a meaningful intensity update before that downbeat can begin layer gain ramps early. Note attacks remain on-grid. A scene request immediately after a downbeat was scheduled may wait one bar plus lookahead, not a strict 2.22-second maximum. Do not claim sample-exact transition mixes. This integration preserves the reviewed source instead of silently changing it.

## Reproduce safely

Run `node --test tests/audio.test.mjs tests/audio-integration.test.mjs`, `npm test`, `npm run check` and `npm run check:release`. Serve the repository root and open `qa/audio/native-review.html` for the normal-button technical suite. The page never imports profiles, writes localStorage/IndexedDB or registers a service worker. Keep all QA files outside public `dist/`.

In managed environments, use only the documented managed preview and native browser route. Do not substitute the experiment's older raw-browser verification script for a denied browser path. The original `qa/audio/verify.mjs` and historical evidence remain available for their original local-development workflow, not as evidence this integration was rerun with them.

## Release handoff

This source version reserves the distinct v0.20.3/cache identity. Repository PR/CI/review and deployment belong to the normal reviewed release workflow. At preparation no remote write or publication was performed by this work. A later release should record exact head/merge/public commits, update/offline checks and live smoke. Rollback can restore the previous audio source without a data migration; any published rollback must use the normal fresh cache/version procedure.
