# Ironroot Frontier

A single-player real-time strategy tug-of-war for desktop and mobile browsers. Build an army, defend your economy and push along the battlefield lanes.

## Status

The verified live release is **v0.14.1**, source merge `27e9477e4abb8188f59e71e0663486507a34603d`, at https://ironroot.stevets.ai/. Its tested source passed 898 Node checks with one optional desktop-dependency skip, and 222 selected Chromium cases with 30 intentional exclusions. Live smoke verified older campaign saves, paid building, reload, right-click cancellation and fullscreen. The user's physical phone/PWA is not certified by those emulations.

This checkout is **unreleased v0.15.0 campaign integration work**. It combines the released phone/input repair, real campaign roster progression, focused campaign navigation and amended pause/options menus. Paused teaching uses the same controls. A final combined-source browser gate and deliberate release decision are still required. Production has not changed to this checkout.

## Play in this candidate

- **Campaign opens first:** three authored one-, two-, then three-road battles introduce the company before the sixteen continuation missions. Any victory advances; stars are optional. A one- or two-star win offers replay without reducing the best record.
- **Real roster progression:** the opening has barracks and archery ranges. Winning it adds Warden lodges, mines and towers. Winning the second battle makes all eight buildings available before the third starts. The Rootwarden is a high-HP, low-damage screen, not a mandatory winning strategy.
- **One game interface:** construction and upgrades use normal gold and the real build bar. Optional coaching marks useful tools and legal sites. Fresh unfinished opening lessons offer a planning hold: battle time, income and spawning stay stopped while paid building remains available. Start/Resume begins combat explicitly; hiding hints does not. Restored attempts and completed replays do not automatically stop for teaching.
- **Readable mission navigation:** the current briefing opens first. Story and Chapter links expose the broader route. Flavor and plain goals remain prominent; exact rules, scouting and bonus stars expand on request. Required protection, hold, income and health conditions stay visible.
- **Skirmish and field trials:** optional title-screen routes. New skirmishes include Rootwardens and an explicit open/timed endgame choice. Guided practice remains optional and temporary, with no profile rewards.
- **Small screens:** Build opens a shared drawer. Named protected-objective controls focus the actual structures. The released visible-viewport repair supports short portrait and landscape layouts; truly insufficient space pauses combat until it fits and the player explicitly resumes.

Existing saves keep their map, scenario revision and roster. The two published optional lessons remain separate legacy records; they do not bypass new roster unlocks. Earlier main-campaign progress keeps the full roster available. A deliberate new replay may use earned units; a saved attempt or confirmed restart keeps the attempt's original roster. Profile protocol 4 fences ordinary stale writes. Close other game tabs before intentionally restoring a backup, since historical versions may still offer their own explicit recovery flow. Unsupported data remains unchanged.

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
- Keys 1–7 (legacy) or 1–8 (Rootwarden) select visible building options, R selects Arrow volley, Space pauses, Escape cancels and arrows move the camera. Only buildings available in the active battle can be selected. The legacy optional lessons retain their old All buildings presentation control.
- Battles autosave every five seconds and on pause. One active battle slot is shared across modes. A failed Save & return keeps the battle on the page.
- Browser Back closes nested menus, pauses running combat, then uses Save & return. Teaching stays frozen when its reading dialog is dismissed. Forward never starts or resumes a battle. Top-level Back can leave normally; platform limits and validation are in `docs/BACK_NAVIGATION.md`.
- Stars, records, preferences and history stay on that browser/device. Options → Save backups exports or imports a local JSON file. Import previews the replacement and asks for confirmation.
- Reports describe the current battle, including sampled timelines. They are not playable replays, are not part of backups, and disappear on a new battle or reload unless exported.
- Sound begins after a user gesture. Options include music, effects, volume, reduced motion and visual quality.

## Source map

- `dist/engine.js`: deterministic combat, maps, AI and engine saves.
- `dist/campaign.js`, `dist/campaign-onboarding.js`, `dist/challenges.js`, `dist/objectives.js`: authored battles, progression, immutable attempt identity and fixed-step objective checks.
- `dist/campaign-flow.js`, `dist/campaign-presentation.js`: shared-control guidance, teaching policy and concise briefings.
- `dist/mobile-battlefield.js`, `dist/protected-objectives.js`, `dist/objective-alerts.js`: visible-geometry checks, pause latch, original-objective tracking and current-page warning policy.
- `dist/persistence.js`, `dist/profile-session.js`, `dist/backup.js`: storage safety, profile coordination and portable saves.
- `dist/menu-history.js`: finite, same-document menu navigation with opaque history entries.
- `dist/app.js`, `dist/index.html`, `dist/styles.css`: controls, menus and integration.
- `dist/render.js`, `dist/combat-feedback.js`, `dist/vfx.js`, `dist/audio.js`: original canvas art, timer-based poses, effects and procedural sound.
- `tests/`, `qa/browser/`, `docs/`: checks and measured development records.

Fonts are bundled under OFL 1.1 with notices in `dist/FONTS-NOTICES.txt`. No external font service, game-art downloads, tracking or backend is required.

## Release boundaries

The private source repository contains development records. Only `dist/` belongs in the public browser build. Browser assets are downloadable; never put secrets or private reports there. This candidate uses the distinct unreleased v0.15.0 cache/version. Live remains v0.14.1 until a deliberate tested release. Never publish changed assets under the old cache identity.

There is no network PvP, account service or authoritative server. Physical mobile/controller testing, full nonvisual battlefield access and desktop/store certification remain separate work. Automated balance simulations do not establish human difficulty or mobile performance. See `docs/DESKTOP.md` for the optional desktop shell.
