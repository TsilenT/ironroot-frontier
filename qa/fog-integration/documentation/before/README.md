# Ironroot Frontier

A single-player real-time strategy tug-of-war for desktop and mobile browsers. Build an army, defend your economy and push along the battlefield lanes.

## Current draft candidate

The **v0.21.0 local candidate** adds optional experimental Fog of war to New Skirmish, unchecked and session-only. It supports Classic, open endgame and bridge income off, with observation-filtered field/minimap/HUD/audio, stale building memories and truthful unknown enemy citadel health. Existing fog-off modes remain supported. See [the local integration scope and validation](docs/FOG_SKIRMISH_INTEGRATION.md).

This candidate is based on released v0.20.2 (`0cdd1f5f3ff35c538c36b6cfe30848b2cfb632e7`) and uses `ironroot-v0.21.0`. It is local only: no remote write, PR, merge, deployment or release approval. Current live remains v0.20.2. The held mobile Volley PR #14 remains separate.

## Release baseline

The release handoff identifies **v0.20.1** as live, from private main `f5bfe05144e0862d1b6bfb4237dacdf276e61fe8`, which merged [PR #18](https://github.com/TsilenT/ironroot-frontier/pull/18). That release removed the purchase delay from paid Citadel choices; see [CITADEL_CHOICES.md](docs/CITADEL_CHOICES.md) and [CITADEL_IMMEDIATE_PURCHASE.md](docs/CITADEL_IMMEDIATE_PURCHASE.md). This task performs no publication. Earlier bridge-income, restart/briefing and Ashen Crossroads work remains documented in [BRIDGE_CONTROL.md](docs/BRIDGE_CONTROL.md), [RESTART_BRIEFING.md](docs/RESTART_BRIEFING.md) and [ASHEN_CROSSROADS.md](docs/ASHEN_CROSSROADS.md).

Historical v0.17.0 shipped automatic flyers and PR #9's prose from source `342d8b594091d323f2c0e92d9a170de0fcbdc2b9`, public commit `b2d3cbb550b929a8813c0a251fb6792bfcc4d59f`. Its live smoke was desktop; portrait evidence was emulated source QA, not physical-phone validation. PR #10 (`3548031a3e8d8e04c7b81784d6c0fe174b1522fe`) subsequently added opt-in deterministic tests. The keyboard work originally described as the v0.17.1 candidate is included in v0.17.2. Earlier development records remain in [FEATURE_DELIVERY.md](docs/FEATURE_DELIVERY.md) and [AUTOMATIC_AIR_INTEGRATION.md](docs/AUTOMATIC_AIR_INTEGRATION.md). Physical-device and non-Chromium certification remain open.

## Game features

- **Campaign opens first:** three authored one-, two-, then three-road battles introduce the company before the sixteen continuation missions. Any victory advances; stars are optional. A one- or two-star win offers replay without reducing the best record.
- **Real roster progression:** the opening has barracks and archery ranges. Winning it adds Warden lodges, mines and towers. Winning the second battle makes all eight buildings available before the third starts. The Rootwarden is a high-HP, low-damage screen, not a mandatory winning strategy.
- **One game interface:** construction and upgrades use normal gold and the real build bar. Optional coaching marks useful tools and legal sites. The first fresh Roadside Watch opens directly on the battlefield: time, income and spawning stay stopped until its first paid barracks is placed, then combat starts automatically. Other spending is temporarily blocked for that first step so the opening cannot run out of gold. Later lessons retain their explicit planning choices; hiding hints never starts them. Hide removes the whole hint banner and returns its space to the field, leaving a compact Show control and any necessary teaching Resume action. Restored attempts and completed replays do not automatically stop for teaching.
- **Readable mission navigation:** the current briefing opens first. Story and Chapter links expose the broader route. Flavor and plain goals remain prominent; exact rules, scouting and bonus stars expand on request. Required protection, hold, income and health conditions stay visible.
- **Skirmish and field trials:** optional title-screen routes. New skirmishes include Rootwardens, an explicit open/timed endgame choice, and optional persistent bridge income (off by default). Guided practice remains optional and temporary, with no profile rewards.
- **Automatic flyers:** gryphons notice nearby troops on their current or an adjacent road and fly into attack range without commands. After losing a target they find another nearby enemy or advance along the nearest road, so successive fights can carry them across roads. Detours can expose enemies or pull flyers away from their own army. Archers remain on their roads but can hit nearby flyers between roads; towers can intercept them too. There are no route buttons, gateways, crossing countdowns or forced returns.
- **Small screens:** Income remains visible beside gold in portrait, including short layouts. Build opens a shared drawer. Named protected-objective controls focus the actual structures. The released visible-viewport repair supports short portrait and landscape layouts; truly insufficient space pauses combat until it fits and the player explicitly resumes.

Campaign stars, unlocks, settings, trial records and result history remain persistent. Fresh Campaign attempts use revision 5 while preserving earned 2/5/8-building stages; fresh Field Trials use revision 3 with their seven-building roster. Guided Practice retains its existing rules. Profile protocol 11 prevents older writers from rejecting early citadel purchases. Existing bought checkpoints retain their exact choice and state; unbought citadel-enabled checkpoints gain immediate availability. Older non-citadel battles keep their bound rules. Close old game tabs before importing a backup. No in-progress battle migration is added.

## Run and check

The game has no build step or runtime dependencies. Serve `dist/` with a static HTTP server; ES modules do not run from a `file://` URL.

```sh
python3 -m http.server 8000 --directory dist
npm test
node scripts/check.mjs
node scripts/verify-runtime.mjs
```

The default Node test command limits concurrent test files to four so renderer/simulation checks do not exhaust shared-machine resources; assertions and cases are unchanged.

Open http://localhost:8000. The separate browser project is in `qa/browser/`; its setup and coverage limits are in `docs/BROWSER_REGRESSIONS.md`. Do not treat source/Node checks as native browser or physical-device evidence.

## Controls and saves

- Choose a building, then a legal site. A successful placement finishes that build order and leaves the mobile drawer closed. With a mouse, hold Shift when placing to keep the same building selected while you can afford another. Touch, pen and controller placement are one-shot; rejected sites keep your selection and spend nothing. Troops spawn and fight automatically.
- Drag the field with touch, left mouse or middle mouse, or use Home, Front and the minimap to navigate. Middle mouse only pans; right-click on the battlefield cancels building or volley placement. Escape and the visible Cancel button remain available.
- Fullscreen is in Options, available from the title screen or pause menu. Activate the button with a click, tap, Enter or Space; browser/device support and permissions apply. If unavailable, keep playing in the window. Ordinary browser and installed-app play do not require fullscreen; screen-size pause rules still apply.
- Select an owned building to upgrade or salvage it. Original protected structures cannot be salvaged from the UI.
- Options → Battle keyboard controls can change, clear or restore twelve shortcuts. Defaults are 1–8 for visible build slots, R for Arrow volley, Space for pause, and Left/Right arrows for camera pan. Slots follow the active roster and earned unlocks, so the same slot can name a different building in another roster. Bindings use physical key positions (`KeyboardEvent.code`), which may differ from printed characters on another keyboard layout. Escape remains cancel/menu; Tab and native Enter/Space activation stay available. Optional guided practice retains its default shortcuts and has no profile access; shared campaign coaching uses the configured bindings.
- Battles autosave every five seconds and on pause. One active battle slot is shared across modes. A failed Save & return keeps the battle on the page.
- Browser Back closes nested menus, pauses running combat, then uses Save & return. Teaching stays frozen when its reading dialog is dismissed. Forward never starts or resumes a battle. Top-level Back can leave normally; platform limits and validation are in `docs/BACK_NAVIGATION.md`.
- Stars, records, preferences and history stay on that browser/device. Options → Save backups exports or imports a local JSON file. Import previews the replacement and asks for confirmation.
- Reports describe the current battle, including sampled timelines. They are not playable replays, are not part of backups, and disappear on a new battle or reload unless exported.
- Sound begins after a user gesture. Options include music, effects, volume, reduced motion and visual quality.

## Source map

- `dist/engine.js`: deterministic combat, maps, AI and engine saves.
- `dist/citadel-options.js`, `dist/citadel-view.js`: paid choice mechanics and readable state.
- `dist/bridge-control.js`: the optional Skirmish capture, denial, persistent ownership and bounded income contract.
- `dist/campaign.js`, `dist/campaign-onboarding.js`, `dist/challenges.js`, `dist/objectives.js`: authored battles, progression, immutable attempt identity and fixed-step objective checks.
- `dist/campaign-flow.js`, `dist/campaign-presentation.js`: shared-control guidance, teaching policy and concise briefings.
- `dist/mobile-battlefield.js`, `dist/protected-objectives.js`, `dist/objective-alerts.js`: visible-geometry checks, pause latch, original-objective tracking and current-page warning policy.
- `dist/persistence.js`, `dist/profile-session.js`, `dist/backup.js`: storage safety, profile coordination and portable saves.
- `dist/autonomous-air.js`: automatic nearby-enemy flyer behavior. `dist/flight-orders.js`, `dist/flight-orders-view.js` and `dist/flight-visuals.js` retain historical flight-rule support and shared presentation helpers.
- `dist/menu-history.js`: finite, same-document menu navigation with opaque history entries.
- `dist/keyboard.js`: bounded physical-key defaults, validation, labels and shortcut safety for battle keyboard controls.
- `dist/app.js`, `dist/index.html`, `dist/styles.css`: controls, menus and integration.
- `dist/render.js`, `dist/combat-feedback.js`, `dist/vfx.js`, `dist/audio.js`: original canvas art, timer-based poses, effects and procedural sound.
- `tests/`, `qa/browser/`, `docs/`: checks and measured development records.

Fonts are bundled under OFL 1.1 with notices in `dist/FONTS-NOTICES.txt`. No external font service, game-art downloads, tracking or backend is required.

## Release boundaries

The private source repository contains development records. Only `dist/` belongs in the public browser build. Browser assets are downloadable; never put secrets or private reports there. The v0.21.0 local fog candidate remains separate from the released v0.20.2 baseline and uses the distinct `ironroot-v0.21.0` cache/version. Earlier [v0.20 runtime evidence](qa/citadel-playtest/runtime-final.json) is retained unchanged and does not describe this candidate. PR #14 remains held and untouched. No merge or publication is included in this candidate work. Never publish changed assets under an old cache identity.

There is no network PvP, account service or authoritative server. Physical mobile/controller testing, full nonvisual battlefield access and desktop/store certification remain separate work. Automated balance simulations do not establish human difficulty or mobile performance. See `docs/DESKTOP.md` for the optional desktop shell.
