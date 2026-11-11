# Ironroot juice pass

This pass reviews small presentation improvements against the current game, at
`6544938` (0.40.1). It does not change combat, economy, progression, or difficulty.

## Direction

Use a small hierarchy of feedback: quiet routine actions, clear purchases and
captures, a stronger result moment. Save the most expressive effects for the
player's achievements. The battlefield already has a lot of presentation; adding
more particles everywhere would make identifying units and targets harder.

The [GDC talk by Jonasson and Purho](https://gdcvault.com/play/1016487/Juice-It-or-Lose)
demonstrates how small audiovisual changes alter satisfaction without changing
rules. That is inspiration, not evidence that more effects always improve an RTS.
Valve's [Camera Comfort guidance](https://partner.steamgames.com/doc/accessibility_features)
recommends letting players reduce or disable camera effects. The
[W3C interaction-animation guidance](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html)
and [reduced-motion technique](https://www.w3.org/WAI/WCAG22/Techniques/css/C39)
support suppressing decorative motion while retaining the information.

## What already exists

- `dist/vfx.js`: construction dust, upgrade diamonds, sale accents, spawn leaves,
  impact sparks, rubble and bounded camera shake. High quality caps particles at
  200 and rubble at 30; low quality uses 80 and 12. Reduced motion makes particles
  stationary and cancels shake. Compact battlefields suppress secondary dust and
  leaves at draw time.
- `dist/audio.js`: original procedural sound, stereo positioning, sound cooldowns,
  a 24-voice SFX budget, music ducking and separate music/effects controls. The
  score already changes intensity and preserves musical position across scenes.
- `dist/render.js`: upgrade rings and arrows, selection and range rings, bridge
  capture progress/ownership labels and team markers.
- `dist/app.js`: successful purchases already produce a sound and factual toast.
  Results already have a victory fanfare, mission stars, medals and unlock text.

## Priorities

| Priority | Opportunity and actual source | Proposed treatment | Constraints |
| --- | --- | --- | --- |
| 1 — implemented | Mission rewards appear together in `app.js:finish()` | Brief flag settle, earned stars stamp left to right, one soft unlock highlight | All text and actions are available immediately. No extra sound, input lock or counting animation. No celebration on failure. |
| 2 | Buying is confirmed at the field and in a toast, but the gold number changes without a transaction accent (`app.js:activateBattlePoint()`, upgrade and salvage handlers) | A single small `−140` / `+70` resource annotation tied to the confirmed result; quiet static text with reduced motion | Trigger only after the command succeeds. Do not animate passive income, infer spending from gold deltas, or overwrite important warnings. Respect compact resource space. |
| 3 | Bridge capture changes a rectangle and label, with no distinct capture moment (`render.js:drawBridgeZones()`) | One local standard unfurl or short border settle and a quiet ownership cue when a bridge actually changes owner | Prime on resume; no false capture on load. No repeated cue for contesting or percentage changes. No gold/bounty imagery in campaign control missions. Use observed state under fog. |
| 4 | Selection uses a fixed ground ring (`render.js` selected-building block) | A short, local 120–180ms ring settle on a newly selected own building, with the existing stable ring afterward | Keep range and targeting legible. No looping pulse, camera move, flash or delayed selection. Stationary ring in reduced motion. Coordinate with the visual-menu/game-feel owners. |
| 5 | Repeated combat sounds use the same synthesis recipe (`audio.js:play()`) | Audition two or three restrained impact timbres with small presentation-only pitch/brightness differences | Coordinate with game-feel owner. Preserve cooldowns, voice limits, mute and warning priority. Never consume engine RNG. Audition a dense fight before shipping. |
| 6 | Upgrade already has strong particles, rising arrow and a chime (`vfx.js:emit()`, `render.js:drawEffect()`) | Consider a short actual-tier `II`/`III` stamp if playtests show people miss the upgrade | Lower value than explaining the upgrade's numerical effect. Coordinate with strategy-feedback owner. Avoid another toast or a second overlapping burst. |

Defer ambient fireflies, constant building bounce, gold fountains, full-screen
flashes, per-hit shake and extra victory confetti. These compete with an already
detailed battlefield or the game's restrained frontier style. Combat timing and
troop locomotion belong to the separate game-feel pass. Volley/spells are out of
scope.

## Implemented slice

`dist/reward-feedback.css` contains all animation styling. The result handler
wraps the existing star glyphs in decorative spans and exposes a single accessible
label such as “2 of 3 mission stars.” It enables the effect only for a win and
only when the game's reduced-motion preference is off. The CSS also honors the
operating system preference, including a live change. Enabling Reduced motion in
Options cancels the result accent; inspecting the battlefield retires it.

The flag settles by four CSS pixels over 360ms. Three earned stars finish within
700ms. Unlock highlighting finishes within 750ms. Only transform, opacity and a
local background color animate; element geometry and action focus stay stable.
The stylesheet is linked and included in the offline shell. Release metadata and
the cache version should be advanced with the eventual combined public release.

## Review and validation

The actual game was opened in Chromium with existing disclosed near-result
fixtures (synthetic UI checkpoints, not human-play or balance evidence). Checks
cover desktop 1180×757, phone 390×650, narrow phone 320×568, landscape 844×390,
OS reduced motion, the in-game reduced-motion setting, and mission failure.
Screenshots were visually inspected. In every profile the result controls remain
visible, enabled and inside the viewport, and Continue receives focus. Reduced
motion and failure produce no reward animation. A live OS preference change
cancels it. The fixture's original star total, unlock text and result counters
remain intact. Generated screenshots and JSON/log outputs stay outside the repo.

For acceptance, compare the reward moment with Reduced motion on/off, then
continue immediately. Follow-up work should earn its place by making one action
clearer or more satisfying without hiding a target, cue, number or control.
