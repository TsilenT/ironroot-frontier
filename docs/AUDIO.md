# Ironroot Frontier audio

## Original score and sound design

`dist/audio.js` contains a self-contained Web Audio score and sound-effects engine. It makes no network requests, downloads no audio, and requires no build step or dependencies. All instruments and effects are synthesized at runtime.

**The Long Reach** is an original 16-bar, 108 BPM D-minor fantasy battle theme, about 35.6 seconds per cycle. Warm triangle-wave melody, a quiet filtered overtone, plucked arpeggios, stereo chord pads, bass, and synthesized hand-drum-style percussion create a compact, coherent sound palette. The arrangement grows with battle intensity rather than simply getting louder. Menu music is lighter; pause and result scenes fade the score out.

This is procedural game music, not a recording of acoustic instruments. The composition, note patterns, sound design, and synthesis code were created for Ironroot Frontier. No sample packs, recordings, third-party compositions, commercial audio assets, or external audio libraries are used. No third-party audio attribution or asset-license obligations were introduced. Project licensing governs the source code; no separate audio license is imposed by this module.

## Public interface

```js
import { GameAudio } from './audio.js';

const audio = new GameAudio({
  muted: false,
  volume: 0.65,
  musicEnabled: true,
  sfxEnabled: true,
  musicVolume: 0.7,
  sfxVolume: 0.85,
});

// Call from the actual Start/toggle click or key activation, not on page load.
const available = await audio.unlock();
audio.setScene('battle');
audio.play('start');
```

- `unlock()` lazily constructs/resumes an AudioContext and resolves to a boolean. A failed/unsupported audio context never blocks gameplay. Call from a user activation. Existing settings may be applied before it.
- `setMuted(boolean)` controls everything. Muting stops the music scheduler and current voices, with a short fade.
- `setMusicEnabled(boolean)` and `setSfxEnabled(boolean)` act independently. Disabling music stops music scheduling while preserving sound effects.
- `setVolume(0..1)`, `setMusicVolume(0..1)`, `setSfxVolume(0..1)` clamp invalid/out-of-range values safely and ramp gain changes.
- `setScene('menu' | 'battle' | 'paused' | 'victory' | 'defeat')` is idempotent. Calling it every frame does not restart music. Result scenes silence the score; the game should separately play the corresponding result cue once.
- `setIntensity(0..1)` smoothly changes arrangement layers. A value based on active combat, enemy pressure, or overtime is suitable. Do not change musical tempo with game speed.
- `play(name, { pan: -1..1, volume: 0..1 })` returns whether a recognized SFX was accepted. Stereo panning gracefully falls back to mono routing in browsers without StereoPannerNode.
- `getState()` returns diagnostic state and counts without exposing the graph to game logic.
- `destroy()` stops scheduling, releases nodes, and closes the context. Repeated cleanup is safe.

The class defaults to muted until the application deliberately opts in. It does not persist preferences itself; the application owns settings storage and visible controls. Pause/background handling also belongs to the application: select the paused scene when the page is hidden and only resume through the game's normal resume flow.

## Distinct cues

- UI: `click`, `error`, `pause`, `resume`.
- Economy/production: `build`, `upgrade`, `sell`, `spawn`.
- Combat: `sword`, `arrow`, `siege`, `magic`, `gryphon`, `strike`, `collapse`, `warning`.
- Battle flow: `start`, `victory`, `defeat`.

Legacy aliases are supported: `select`, `hit`, `warrior`, `archer`, `tower`, `wizard`, `blast`, `volley`, `death`, `win`, `lose`, and `construction`.

Construction combines a short timber-like thump and bright chimes. Upgrades and salvage have different rising/falling chime motifs. Swords use short metallic transients; arrows use a filtered air sweep; siege uses a low impact and rubble tail; magic uses rising harmonic tones; gryphons use a filtered flutter/call. The rally strike is broader and heavier than ordinary siege. Victory and defeat use distinct original cadences.

Combat cues should be triggered for new events, not every animation frame. The module rate-limits repeated sounds and caps live voices. Use spatial pan plus reduced volume for distant events. This is especially important when the camera is away from the main fight.

## Runtime safeguards

- Music is scheduled a short distance ahead using the audio clock, not frame timing.
- Same-scene updates never create another timer.
- Background scheduling stalls skip missed notes instead of playing a catch-up burst.
- Short gain ramps reduce control clicks. Envelopes and finite source stop times prevent stuck tones.
- Music and SFX share a dynamics compressor and conservative master gain.
- Noise is generated once per AudioContext with a deterministic local generator. It does not touch gameplay RNG.
- Completed source nodes disconnect. Master mute, music mute, results, and destruction stop the appropriate work.
- Standard AudioContext and legacy webkitAudioContext entry points are supported. A browser without Web Audio continues silently.

## Verification

Run `node --test tests/audio.test.mjs` and `node --check dist/audio.js`.

The automated graph tests cover lazy initialization, unsupported-audio fallback, repeated unlock, same-scene idempotency, independent music/SFX toggles, master mute, volume bounds, every sound and alias, effect burst limiting, paused/results scenes, stalled scheduling, two complete score cycles, and cleanup.

Browser checks additionally need real user activation, PCM rendering, independent music/SFX controls, pause/resume, saved preferences, and a console review. Automated graph tests alone do not establish audible quality, real-device latency, hardware playback, or Safari/iOS behavior. Do not describe the score as listened to unless an actual listening pass was performed.

The offline shell must cache `./audio.js` and the application must import it. Because the module has no external assets, caching that file is sufficient for offline audio.

### Browser verification, 6 November 2026

Verified in real Chromium 156 on Linux through the managed HTTP preview using `tests/audio-browser.html` as a temporary developer fixture, removed from the public build afterward:

- No AudioContext exists before a gesture. Start unlocked it successfully.
- Disabling music stopped scheduling and cleared music voices; SFX still created voices. Disabling SFX left music playing and rejected effect requests.
- Master mute cleared voices/stopped scheduling. Unmute restarted one scheduler. Volume zero and maximum applied correctly.
- Pause stopped scheduling/voices; resume restarted the battle score. Destroy left zero voices and no scheduler.
- OfflineAudioContext rendered the entire 16-bar score and all 19 distinct SFX. Every effect produced nonzero PCM.
- Score peak: 0.210751; RMS: 0.044837. Individual-effects sequence peak: 0.374500.
- Maximum-volume music plus deliberately dense combat effects: peak 0.872872; **zero clipped samples**.
- Muted render: peak 0 and RMS 0, exactly silent.
- No page/audio warnings or errors. Browser-extension metadata errors were unrelated to the game.

These are synthesis, control-flow, and signal measurements, not a subjective listening pass. Safari, Firefox, iOS hardware, latency, and actual speaker/headphone listening remain unverified here.

For a repeatable browser check, serve the project root and open `tests/audio-browser.html`. The fixture imports the production module and provides explicit buttons for gesture unlock, independent toggles, volume, pause/resume, offline rendering, and cleanup. Do not ship this fixture in `dist/`.
