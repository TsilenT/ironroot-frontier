# Audio prototype validation — 6 November 2026

Base: `24edddab2cff33b3f91b396bc855193f87421ba3`; branch: `experiment/audio-long-reach`.
Production audio SHA-256: `7e5921c056ab468b5de8c97cee1b5b930ef2e501136eb08cb715822f3c7b782a`.

Chromium 155.0.8059.79, Node 24.22.1, Linux cloud desktop. All renders use actual 48kHz stereo Web Audio PCM, production voice limits and source cleanup. Measurements are signal evidence, not a subjective listening review.

| Render | Seconds including tail | Peak | RMS | Clipped samples | Peak live sources |
| --- | ---: | ---: | ---: | ---: | ---: |
| journey | 145.22 | 0.180691 | 0.033041 | 0 | 20 |
| battle | 287.44 | 0.183636 | 0.036990 | 0 | 20 |
| menu | 145.22 | 0.088910 | 0.020577 | 0 | 10 |
| stress | 145.22 | 0.748837 | 0.202986 | 0 | 48 |
| cues | 57.00 | 0.331279 | 0.020919 | 0 | 11 |
| controls | 12.00 | 0.470450 | 0.080055 | 0 | 28 |
| muted | 12.00 | 0.000000 | 0.000000 | 0 | 0 |
| zero | 12.00 | 0.000000 | 0.000000 | 0 | 18 |
| musicOnly | 12.00 | 0.169486 | 0.035115 | 0 | 18 |
| sfxOnly | 12.00 | 0.432964 | 0.109957 | 0 | 15 |
| bothOff | 12.00 | 0.000000 | 0.000000 | 0 | 0 |

- Every rendered sample was finite; every one of the 19 separate cues produced nonzero PCM.
- The journey changes menu → battle off-grid at 17.15s; the production scheduler commits one transition on the following downbeat. Battle renders two complete 64-bar cycles. The one-second cycle-seam window contains signal, no clipped/nonfinite samples, and a maximum adjacent-sample change of 0.017339.
- Muted, volume-zero and both-buses-off renders are exactly zero throughout. Control renders also verify exact-zero windows after mute, zero and pause fades; music/echo tails are zero by the measured final second.
- Live post-compressor analyser checks verify gesture unlock, menu/battle transition, independent buses, mute, zero volume, pause/resume and cleanup. A fresh document under `document-user-activation-required` stays suspended with zero notes and no timer until a click.
- The actual production game creates no AudioContext before activation, produces PCM after Start/resume, is silent after pause, supports Space on the music checkbox, and restores both disabled buses plus 25% master volume after reload.
- The full stress render requests all 19 cues eight times per second at all volume controls = 1. Cooldowns/source limits accept 5,111 effects and drop 16,435. Peak 0.748837 is −2.512dBFS; maximum live source count 48 is below the 80-source total limit. This is deliberately much denser than the application's normal mix.
- A six-second live battle/audio-lab load test measured a 1.00ms p95 JavaScript SFX batch and 16.80ms p95 animation-frame interval, with 43 observed active sources. This is a short headless desktop observation, not a real-device benchmark or a full-game frame-rate claim.
- FFmpeg `ebur128=peak=true` on exported PCM16 WAVs: journey true peak −14.9dBFS / integrated −29.2 LUFS; maximum-volume stress true peak −2.5dBFS / integrated −12.5 LUFS. The stress loudness describes an artificial continuous overload, not the normal music level. Values are rounded by FFmpeg; WAV hashes and commands are in `validation.json`.
- 638 Node tests passed, 0 failed; one existing optional desktop-build dependency test skipped. All 14 audio unit tests passed. JavaScript syntax checks and the 33-file runtime/offline preflight passed. Two existing desktop browser regressions covering preference persistence/keyboard activation and denied-storage settings/pause passed.
- `signal.json` stores full render/control results. `validation.json` stores test counts, runtime file hashes, and WAV analysis. Generated `ironroot-journey.wav` and `ironroot-stress.wav` remain local, ignored review exports; rerun `node qa/audio/verify.mjs` to regenerate them. The older `tests/audio-browser.html` fixture now uses the same scheduler-preserving renderer at 24kHz; its browser smoke test passed with zero errors, exact muted silence and zero stress clipping (peak 0.764359). See `legacy-24khz.json`.

No real listening capability was available. Sound quality, cue masking, clicks, fatigue and musical effectiveness have not been judged. Physical iOS/Android devices, Safari/Firefox, speaker/headphone translation and hardware latency remain unverified. No merge, deployment, paid assets or changes to another branch occurred.
