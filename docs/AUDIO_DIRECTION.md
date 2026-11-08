# The Long Reach — Hearth to Standard

**Historical experiment design, 6 November 2026.** The original commit is now reviewed for the isolated v0.20.3 source integration. Its fresh integration state and technical verification are in [AUDIO_INTEGRATION_0_20_3.md](AUDIO_INTEGRATION_0_20_3.md). The no-merge/no-release statements and proposed acceptance gates below describe the original experiment, not a new deployment or a completed listening pass.

Isolated experiment on `experiment/audio-long-reach`, based on private main `24edddab2cff33b3f91b396bc855193f87421ba3` (v0.12 candidate 3), fetched 6 November 2026. This is a source prototype, with no merge, deployment, release-version/cache bump, paid services, or changes to other branches. Only `dist/audio.js` changes at runtime; application controls, preference/backup schemas and gameplay remain compatible.

## Compositional direction

The intended character is an army assembled from timber, iron and people: a small motif becoming a collective response, with room between phrases. This is a design intention, not a listening judgment. No actual listening capability was available; timbral quality, fatigue, emotional effect and speaker translation remain unjudged.

At 108 BPM in 4/4, a bar lasts 2.222 seconds. The former 16-bar / 35.56-second loop becomes 64 bars / 142.22 seconds. These are four written sections, rather than four copies of the existing loop. Tempo stays independent of simulation speed; combat intensity changes orchestration rather than speeding the composition up.

| Bars / elapsed | Section | Written development |
| --- | --- | --- |
| 1–16 / 0:00–0:35.56 | Hearth | The existing D–F–E–D / A motif, with early fragments and rests. Menu sounds one octave lower, omits alternating melody slots and every fourth phrase ending, and has no drums. |
| 17–32 / 0:35.56–1:11.11 | The Road | A new 16-bar answer: Dm–F–Gm–Bb–Dm–C–A–Dm, opening upward and settling back onto D. More arpeggio motion. |
| 33–48 / 1:11.11–1:46.67 | The Crossing | A new broad descending answer through F–C–Dm–Bb–Gm–Dm–Asus–A. Longer breaths, reduced arpeggio/drum density, even during intense combat. |
| 49–64 / 1:46.67–2:22.22 | The Standard | The original theme returns in full, with a lower filtered triangle response on alternate bars. The A harmony leads back into D at the cycle seam. |

All notes, filtered oscillator instruments, envelopes and seeded noise are code authored. Existing original game effects remain available. No recordings, third-party compositions, sample packs, impulse responses, external audio libraries, media downloads or music services are involved. The two new middle sections and the reprise keep the original score recognizable.

## Transitions, cues and mix

- Menu ↔ battle preserves the next note and harmonic position. The desired scene queues until the next scheduled downbeat (at most one bar, about 2.22 seconds), then a short root pickup and 400–500ms layer ramps introduce/remove the battle arrangement. Reversing a request before its downbeat cancels it. Scene calls each frame remain idempotent.
- Pause, hidden-page handling and results still stop music immediately with short fades. Resume advances to the next bar of the current long-form arrangement, without returning to bar one. Victory/defeat SFX remain explicit application events; no duplicate results or unrequested gameplay alerts are added.
- Calm → engaged at intensity 0.40; engaged → calm below 0.28. Critical begins at 0.75 and exits below 0.60. Low energy uses a sparse low drum; snare/noise and faster arpeggios enter with engaged/critical states. Mix changes smaller than 0.04 do not rewrite automation every animation frame.
- Warning, start, rally, victory and defeat cues dip only the music bus to 52% (about −5.7dB), with a 25ms attack and 350ms recovery after the cue hold. Normal combat effects and UI clicks do not pump the music. Master and effect volume remain under user control.
- The conservative shared compressor/master attenuation, seeded reusable noise, 56-music/80-total source limits, SFX admission limit and per-cue cooldowns remain. Completed nodes disconnect. A missed scheduling window skips backlog rather than stacking missed notes.
- Master mute, master volume zero, independent music/effect switches, separate programmatic bus volumes, lazy gesture unlock and unsupported-audio fallback remain. No game information becomes audio-only, and no additional visual motion or panning dependency is introduced. Existing keyboard-accessible controls and saved preferences remain in the application.

## Reproduce and review

From the repository root:

```sh
npm test
npm run check
npm run check:release
npm ci --prefix qa/browser --ignore-scripts --no-audit --no-fund --cache /tmp/ironroot-npm-cache
node qa/audio/verify.mjs
```

The verification script uses the QA package's pinned Playwright and `/usr/bin/chromium`; override with `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` if necessary. It serves only loopback, writes signal evidence to `qa/audio/evidence/signal.json`, and saves two local WAVs there. WAVs are deliberately ignored by Git and excluded from `dist/`; the composition has no binary asset requirement. To listen manually, serve the repository root with a local static server and open `/qa/audio/index.html`. That lab has explicit playback, intensity, volume, independent bus, cue and render buttons; it is not in the offline/public runtime.

The offline verifier renders real stereo PCM at 48kHz using the production graph, note scheduler, envelopes, effects, compressor, voice limits and natural source cleanup. The only clock adaptation replaces `setInterval` with 128ms `OfflineAudioContext.suspend` slices; it does not bypass voice accounting or schedule an unlimited future score. Live analyser checks and the actual game UI provide separate evidence for activation and controls. The stress case requests every effect eight times per second; cooldowns and source admission remain active, so it also tests overload rejection.

## Measured evidence

Final measurements are recorded in `qa/audio/evidence/signal.json` and [the validation note next to it](../qa/audio/evidence/README.md). Signal tests measure sample peaks, finite output, RMS, control silence and bounded voices; they do not establish perceived quality. Headless desktop timings are useful regression observations, not mobile or hardware performance certification.

## Integration plan

1. Review the isolated branch diff and audition the lab or generated journey WAV. Compare the former 35.56-second loop against both full battle cycles; check that the Crossing supplies relief and that the reprise feels earned. Adjust melodic/timbral choices only after a real listening pass.
2. Exercise menu → battle at arbitrary beats, battle → menu, cancel-before-downbeat, pause/resume, hidden tabs and victory/defeat on desktop and a physical phone. Check transient clicks, cue masking, maximum-volume fatigue, mono/small speakers and headphones; test Safari/iOS and Firefox activation/resume behavior.
3. If accepted, cherry-pick the experiment commit onto current private main, resolve any intervening audio changes, and rerun Node, signal and preference regressions. No app/schema migration is needed. Retain the lab outside `dist/`.
4. For an independently authorized release, bump the offline cache/version using the project's release workflow and run its update/offline gates. This prototype deliberately does not bump versions or publish anything.
5. Rollback is a revert of the experiment's audio source change; no save, preference, campaign or binary-asset migration is involved.

Human listening and real-device/browser review are the remaining acceptance gates. No integration or publication approval is assumed.
