# Experimental fog Skirmish shell

This is an isolated feasibility prototype, not a released mode. Open `index.html` through a permitted local static preview of the repository root. It imports the real simulation, Renderer and GameAudio; it does not import the production app or profile code. It never reads or writes storage. Closing or refreshing discards the battle.

## Play

- Fog is unchecked initially and binds only when New battle is chosen. Restart retains the current rules, seed and difficulty. Classic, open-ended, no bridge income only.
- Build chooses a real building, then a field tap uses the released snap and paid engine operation. Dragging pans. Cancel spends nothing. Select your own building for paid upgrades or the real health-adjusted sale refund.
- Volley uses the ordinary 75-gold cost and cooldown. Its center must be currently visible; the engine independently enforces that rule. Visible-center splash does not reveal hidden targets.
- Home, Front, drag, keyboard and minimap move the camera. They do not scout. Front uses only own ground troops or forward producers in fog battles.
- All panels pause. Closing/cancelling a panel keeps the battle paused and requires Resume. Choosing a building intentionally resumes if the battle was running when its panel opened. New battle intentionally starts a fresh match.
- Sound is off until explicitly enabled. Settings are session-only.

## Information boundary

`observe()` creates detached side observations. `observationFacade()` supplies only observation-derived validation to `FogRenderer`. No renderer callback reaches the engine. Field, minimap, HUD, accessible text, Front and music intensity use that observation.

Unseen enemy troops disappear. Seen structures leave dashed last-seen boxes with frozen type, level and observation timestamp. Enemy citadel health remains unknown while hidden; a known choice is explicitly labelled last seen. Memories have no current health/production and are not selectable or targetable.

Effects must be visible both when created and now. Stable event IDs prevent repeat audio/VFX after detached projection or camera movement. Particle source and current positions are sight-filtered. Ranged hits use visible contact effects; decorative projectile trajectories are intentionally omitted in fog. Camera shake is disabled in fog. These conservative changes mean the prototype does not yet establish the normal combat feel of a fully integrated mode.

Only a terminal engine result causes a labelled full-information reveal. There is no live reveal, state editor, export/import, profile selector or debug keyboard shortcut.

## Validation and limits

Run `node --test tests/fog*.test.mjs` from the repository root. Focused tests cover hidden-state differential output, exact visible contacts, stale memory glyphs, unknown citadel health, birth visibility, event deduplication, lost-sight particles, paid placement admission and pointer cancellation. Canvas-model checks are not native viewport evidence.

The desktop managed Chromium smoke check ran at 1180 × 757 with ordinary paid construction, cancel, pause, hidden Volley rejection, camera navigation, optional audio unlock, default-off/new/restart binding and interrupted-panel behavior. The initial modal close resumed after tab interruption; closing a panel now explicitly preserves pause, and that final behavior was retested.

Native 320 × 430, 390 × 650 and 844 × 390 checks remain blocked/unrun. The browser rejected opening DevTools with “DevTools not allowed on this page” and “Your organization has blocked the use of DevTools on this page.” No alternate emulation route was used. No physical touch/gamepad check, device FPS assessment, completed paid match, ordinary-match memory transition or balance evaluation is claimed.

The preview was stopped after QA. No remote publication, service-worker changes, profile backup or production-tab operation was performed.

## Synthetic building-memory scene

`memory-scene.html` is a separate, explicitly labelled desktop QA fixture, not a normal match and not a hidden-state switch in the playable shell. It deliberately steps a fixed scout and structure sequence through the real observation and renderer. The rendering module receives only the detached observation. It has no profile/storage access.

The seven steps cover unseen structure, current Watchtower contact, sight lost, an unobserved interval, re-observed empty ground, a newly observed Barracks and its later memory. The unobserved interval includes a hidden upgrade, damage and sale; the displayed Watchtower level and 0:12 timestamp remain unchanged until the empty location is seen. The timestamp is frozen simulation time of the observation, not current age or inferred health. The Barracks later shows its own 1:00 timestamp.

Native desktop inspection at 1180 × 757 confirmed the current actor/health bar versus dashed stale marker distinction, frozen labels, empty-location clearing, replacement identity, corresponding minimap markers, and camera/animation-pause invariance. Pre-fix pixels showed a cryptic stale abbreviation without time and clipped unknown-citadel text. The limited fixes add an explicit name/level/time badge and measured horizontal label containment. Source-level tests also cover multiple camera/zoom combinations and identical field/minimap calls across hidden changes. These tests do not certify phone layouts or dense overlapping memories.

Follow-up evidence is in `../reports/memory-pass/` from the repository root. Phase1 source and screenshots remain preserved separately in `ironroot-fog-prototype-phase1-frozen`. The synthetic pass does not turn phase1 paid-play coverage into an ordinary-match memory transition claim.
