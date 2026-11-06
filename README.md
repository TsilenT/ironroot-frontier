# Ironroot Frontier

A single-player, mobile-friendly real-time strategy tug-of-war. Place production buildings, create a combined-arms army, manage an economy, and break the opposing citadel across three long lanes.

**Status:** actively developed pre-release game. Not Steam-ready and not multiplayer. Play at https://ironroot.stevets.ai/.

## Play

- **Campaign:** 12 authored missions across four chapters. Destroy enemy strongpoints, guard original structures, build an economy or survive a siege. Earn up to 36 optional stars and unlock the next branches.
- **Skirmish:** three AI difficulties with the same economy and roster as the player.
- **Field trials:** five standalone counter, siege, economic and survival challenges.

The campaign's woodland, highland, ashland and citadel themes are visual treatments of the same three-lane map, not distinct pathfinding layouts. All seven buildings remain available. Original characters, dialogue, vector/canvas models, effects and procedural music are included.

## Run

Serve `dist/` with a static HTTP server. No build step or runtime dependencies are required. ES modules cannot run from a `file://` URL.

```sh
python3 -m http.server 8000 --directory dist
```

Open `http://localhost:8000`. Production uses the contents of `dist/` as the site root. An optional, separately packaged Electron shell is described in `docs/DESKTOP.md`.

## Check

```sh
npm test
npm run check
```

The isolated browser regression project is in `qa/browser/`. See `docs/BROWSER_REGRESSIONS.md` for execution and coverage limits. Its dependencies are separate from the dependency-free game.

## Controls and saves

- Choose a building, then tap a slot in your frontier.
- Drag the map or tap its minimap to navigate.
- Tap an owned building to upgrade or salvage it. Campaign-protected structures cannot be salvaged from the UI.
- 1–7: choose building. R: rally strike. Space: pause. Escape: cancel. Arrow keys: camera.
- Battles autosave every five seconds and on pause. Resume from the title screen. One active battle slot is shared across all modes.
- Campaign stars, trial records, preferences and battle history remain on that browser/device. Clearing browser data removes them.
- Switching away pauses the battle. Failed writes show warnings; Save & return stays in the battle if saving fails.
- Preferences include independent music/effects, volume, reduced motion and visual quality. Audio starts only after a user gesture.

## Roster

| Production | Unit | Purpose | Counterplay |
| --- | --- | --- | --- |
| Barracks | Warrior | Shielded melee screen | Ground splash, flyers |
| Archery range | Archer | Fragile ranged support and anti-air | Melee pressure |
| Siege foundry | Siege engine | Long-range structure destruction | Faster units, air |
| Arcane sanctum | Wizard | Protected ground splash that bypasses shields | Focused ranged fire, air |
| Gryphon aerie | Gryphon | Airborne raider | Archers and towers |
| Watchtower | — | Holds ground with finite health | Siege and sustained pressure |
| Gold mine | — | Long-term income, three-mine cap | Early pressure; vulnerable investment |

## Architecture

- `dist/engine.js`: seeded DOM-free fixed-step simulation, economy, targeting, combat, AI and engine saves.
- `dist/render.js`, `dist/vfx.js`: original 2D models, terrain themes, animation and bounded effects.
- `dist/challenges.js`, `dist/campaign.js`: authored setups, briefings, objective evaluation and campaign progress.
- `dist/objectives.js`: fixed-step objective evaluation and exact deadline handling.
- `dist/persistence.js`: safe storage operations, battle envelopes, history normalization and native-control keyboard handling.
- `dist/audio.js`: original procedural score and synthesized effects.
- `dist/app.js`: input, camera, menus, HUD, settings, saves and integration.
- `dist/styles.css`, `dist/index.html`: responsive shell and accessible controls.
- `tests/`, `qa/browser/`, `docs/`: deterministic tests, browser regressions and measured development records.

All battlefield art and music are original code-authored works. No downloaded game art, licensed third-party characters, paid assets, tracking or backend. Google Fonts have system fallbacks; gameplay does not require the font service. Models are 2D canvas/vector drawings, not 3D meshes.

## Deployment separation

The private source repository contains source, tests and development records. The public `ironroot-frontier-play` repository contains only the browser build. Browser JavaScript and assets are inherently downloadable by visitors. Never put secrets or private development records in `dist/`.

## Known limitations

- No network PvP, matchmaking, account service or authoritative server.
- The map has one physical lane layout; campaign variety comes from formations, objectives, resources and visual themes.
- Balance is iterated from deterministic simulations and browser reviews, not competitively certified. Normal AI remains vulnerable to some forward-infantry rush policies.
- No physical iOS/Android device testing or subjective music-listening review yet. Cloud desktop tests do not establish mobile performance.
- Canvas battlefield has textual controls and shortcuts, but full nonvisual battlefield accessibility remains unfinished.
- Controller support, verified desktop runtime, Steamworks, localization, store assets and platform certification remain release gates.
