# Ironroot Frontier

A single-player, mobile-friendly real-time strategy tug-of-war. Place production buildings, create a combined-arms army, manage an economy, and break the opposing citadel across three long lanes.

**Status:** actively developed pre-release vertical slice. Not Steam-ready and not multiplayer.

## Run

Serve `dist/` with any static web server. No build step or dependencies are required. ES modules require HTTP rather than opening the file directly.

```sh
python3 -m http.server 8000 --directory dist
```

Open `http://localhost:8000`. Production uses the contents of `dist/` as the site root.

## Check

```sh
npm test
npm run check
```

## Controls

- Choose a building, then tap a slot in your frontier.
- Drag the map or tap its minimap to navigate.
- Tap an owned building to upgrade or salvage it.
- 1–7: choose building. R: rally strike. Space: pause. Escape: cancel. Arrow keys: camera.
- Battles autosave in the browser every five seconds and on pause. Resume from the title screen. Saves remain on that browser/device.
- Switching away from the page pauses the battle.

## Roster

| Production | Unit | Purpose | Counterplay |
| --- | --- | --- | --- |
| Barracks | Warrior | Shielded melee screen | Wizard splash, siege splash, flyers |
| Archery range | Archer | Fragile ranged support and anti-air | Melee pressure |
| Siege foundry | Siege engine | Long-range structure destruction | Faster units, air |
| Arcane sanctum | Wizard | Ground splash that bypasses shields | Archers, air |
| Gryphon aerie | Gryphon | Airborne raider | Archers and towers |
| Watchtower | — | Holds ground, finite health | Siege and sustained pressure |
| Gold mine | — | Long-term income | Early pressure; vulnerable investment |

## Architecture

- `dist/engine.js`: seeded DOM-free fixed-step simulation, economy, targeting, combat, AI, persistence.
- `dist/render.js`: original procedural canvas terrain and original 2D models, animation and effects.
- `dist/app.js`: input, camera coordination, menus, HUD, local saves and audio.
- `dist/styles.css`, `dist/index.html`: responsive shell and accessible controls.
- `tests/`: deterministic engine regression tests.
- `docs/`: design, QA findings and development roadmap.

Original vector/canvas art is authored in code. No downloaded game art, licensed third-party characters, paid assets, tracking, or backend. Fonts use Google Fonts with system fallbacks; gameplay does not require them. Sound effects are synthesized in the browser and off by default.

## Deployment separation

The private source repository contains source, tests and development records. The public `ironroot-frontier-play` repository contains only the browser build. Browser JavaScript and assets are inherently downloadable by visitors. Never put secrets or private development records in `dist/`.

## Known limitations

- Solo skirmishes only; no network PvP, matchmaking, account services or authoritative server.
- One battlefield layout; difficulty varies AI decisions, not faction content.
- Local saves only. Clearing browser data removes progress.
- Balance is being iterated from deterministic simulations plus browser reviews, not claimed to be competitively solved.
- Canvas battlefield has keyboard shortcuts and textual controls, but full nonvisual battlefield accessibility remains unfinished.
- No Steam packaging, controller mapping, platform achievements, localization, store assets or certification.
