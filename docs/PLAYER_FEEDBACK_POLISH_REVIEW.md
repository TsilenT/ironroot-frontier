# Player feedback and presentation review

Reviewed 2026-11-11 against main `6544938e8b749ec42621fb0391085751edb09546` (v0.40.1). This is a focused code/browser review, not human playtest or Steam certification. Volley and spells are deferred to the full spell rework.

## What polish should achieve

The player should understand the current goal, see whether an action worked, identify danger, and recover from a mistake without fighting the interface. Effects should communicate state while preserving the ability to read a crowded battlefield. Audio should reinforce that information and allow the player to choose a comfortable balance. These are design goals inferred from the professional guidance below, rather than a universal formula for a good game.

| Area | Current evidence | Recommended next gate |
| --- | --- | --- |
| Action feedback | Build selection/pressed states, rejected placement feedback, one-shot placement, contact/recoil poses and construction/combat cues already exist in `app.js`, `combat-feedback.js`, `render.js`, `vfx.js` and `audio.js`. | Observe new players placing, canceling, upgrading and salvaging. Ask them what happened and why a rejected action failed. Treat confusion as evidence before adding more particles. |
| Combat readability | Distinct unit silhouettes, bounded readability enlargement, health bars and grounded contact poses; the oblique Last Engine art is now aligned with the battlefield. | Review ordinary and crowded three-road fights at actual scale, normal/reduced motion and low detail. Check that players identify siege, flyers, friendly troops and the threatened road quickly. Automated renderer hashes establish consistency, not human readability. |
| Objectives | Current goal/progress, named protection targets and objective warnings are already integrated. | Try a mid-battle return after a break: can a player immediately describe the win condition and current danger? Inspect warnings muted and under simultaneous attacks. |
| Audio | Original adaptive score, bounded effects, stereo panning and separate music/effects mute switches. Engine supports independent channel gains; Options exposed only master volume. | This PR exposes music and effects levels, retaining existing defaults. Later evaluate a mono option and whether important objective cues need a separate mix from frequent combat effects. |
| Motion | Reduced motion disables shake/debris and avoids oscillating combat poses; quality can be lowered. | Review transitions and busy fights with motion sensitivity in mind. Preserve essential contact/state information when animation is reduced. |
| Desktop input | Remappable physical-key shortcuts, native keyboard menus, middle/left drag and right-click cancellation; Shift supports repeat building. | Test an entire session with keyboard/mouse and with controller, including nested dialogs, error recovery and device changes. Remapping alone does not establish complete keyboard-only battlefield access. |
| Touch input | Shared build drawer, one-shot placement, gesture cancellation, minimap navigation and visible-viewport safety exist. | Physical phone testing remains necessary: thumb occlusion, accidental panning, safe areas and narrow/short screens cannot be certified by Chromium touch emulation. |
| Steam Deck | A controller path and desktop shell exist. | A hardware/package gate remains: 1280×800 presentation, correct active-device prompts, all-content controller navigation, suspend/resume and sustained crowded-battle performance. A resized desktop browser is insufficient. |

## Focused implementation

Options now provides independent Music volume and Effects volume sliders beside Master volume. They apply immediately, expose percentages to assistive technology, and work with native pointer/keyboard input. Music remains 70%, effects 85%, and master 50% by default, matching the existing engine mix. Channel mute switches retain the chosen levels.

The two optional numeric settings are included in validated backup export/import. Profile protocol 32 fences older tabs that reconstruct settings without those fields. Startup upgrades only the profile marker; earned campaign/trial/history/battle/settings bytes are not migrated. A literal protocol31 fixture from the reviewed main preserves historical fence coverage, and new tests exercise old-writer rejection. The candidate cache/package identity is v0.40.2; a draft PR does not publish it.

Browser coverage observes actual Web Audio gains. A negligible test-only constant source keeps the otherwise idle effects bus active because Chromium can leave `AudioParam.value` stale after all effects voices end. This instrumentation never enters `dist/`; production synthesis, score, cue timing and gain-ramp behavior are unchanged.

Validation: 3,510 Node tests passed, zero failed, one optional tooling test skipped. The focused Chromium run passed 73 cases (75 device-scoped skips), including all 16 new audio cases across desktop, portrait, narrow portrait and landscape. Existing keyboard and desktop-input regressions passed. JavaScript parsing, atomic runtime validation, the complete browser static/fixture check and diff whitespace checks passed. Stale current-version guards in browser validators were brought forward to protocol32/catalog42; historical battle fixtures and their assertions remain intact. Generated logs, traces, JSON results and screenshots are retained outside the repository at `/tmp/ironroot-audio-review/`.

## Priorities after this PR

1. Run observed first-session and mid-battle-return playtests. Record concrete errors, time spent searching for controls, missed threats and the player's explanation of each outcome. Do not infer fun or difficulty from deterministic bots.
2. Review crowded combat at native Steam Deck size and normal desktop sizes. Judge target recognition, threat location, text and effect overlap at real world scale before changing artwork or adding screen shake.
3. Validate a complete controller-only path on hardware, including Options, sliders, backups, menus and interruptions. Use Steam's actual compatibility requirements to scope the release gate.
4. Evaluate mono output and a distinct important-alert mix using headphone, speaker and muted playtests. Additional audio settings should solve observed masking or access problems.

## Sources and how they apply

- [Microsoft XAG 103: Additional channels for visual and audio cues](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/103): combine channels for important information; color alone should not carry meaning. Applied here as a muted-play and threat-recognition review requirement.
- [Microsoft XAG 105: Audio accessibility](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/105): independent levels help players hear important cues and reduce distracting output; stereo/mono control is also discussed. Direct rationale for the focused change and the later mono/alert-mix review.
- [Microsoft XAG 107: Input](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/107): alternate input methods, single digital actions, remapping and updated labels matter. Applied as end-to-end navigation tests rather than assuming keyboard shortcuts alone suffice.
- [Microsoft XAG 109: Objective clarity](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/109): objectives and progress should remain easy to review. Applied as the mid-battle-return test.
- [Microsoft XAG 117: Visual distractions and motion settings](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/117): allow motion reduction and avoid distracting movement while reading. Applied to reduced-motion and menu/transition review.
- [Valve: Steam Deck and Steam Machine compatibility](https://partner.steamgames.com/doc/steamhardware/compat): default controller access to all content, appropriate glyphs, suitable text entry and performance are reviewed. Deck guidance specifies native-resolution support and text legibility, including a 9-pixel character-height minimum at 1280×800 and a recommendation to aim for 12. CSS font size alone does not establish rendered character height. These requirements need actual hardware/package evidence; they are not all general Steam release prerequisites.
