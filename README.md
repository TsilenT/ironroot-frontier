# Ironroot Frontier

A single-player, mobile-friendly real-time strategy tug-of-war. Place production buildings, create a combined-arms army, manage an economy, and break the opposing citadel across long battlefield lanes.

**Status:** this is the isolated local 0.12 pre-release candidate, not the deployed build. The last verified live version is 0.7 at https://ironroot.stevets.ai/. Neither is Steam-ready or multiplayer. Newer source/publication gates are pending. Frozen 0.10 and 0.11 candidates remain unchanged.

## Play

- **Guided practice:** five short replayable lessons teach paid placement, automatic spawning, combined arms, mines/upgrades, siege and anti-air using the real engine. Instructions stop time; observation steps run normally. Practice is separate, temporary and has no saves or rewards. Your existing battle and progress are untouched.
- **Campaign:** 16 authored missions across five chapters. Destroy enemy strongpoints, guard original structures, build an economy or survive a siege. Earn up to 48 optional stars and unlock the next branches.
- **Skirmish:** three AI difficulties with the same economy and roster as the player.
- **Field trials:** five standalone counter, siege, economic and survival challenges.

The original four campaign chapters retain their Classic geography. The isolated fifth chapter uses the same distinct Long March and Twin Span geometry introduced for skirmishes: Long March has a 4000-unit world and longer reinforcement routes; Twin Span has two roads and a hard 16-site limit per side. The expansion and map release gates remain separate from the public version. All seven buildings remain available. Original characters, dialogue, vector/canvas models, effects and procedural music are included.

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
# After removing any temporary developer-only preview fixtures:
npm run check:release
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
- Local JSON export/import is available in Preferences → Save backups. Import previews the contents and requires explicit replacement confirmation. Browser files never leave the device.
- Experimental standard-controller input uses a visible virtual cursor, shared placement rules and menu focus. Mapping is in the field guide/preferences; physical hardware validation remains pending.
- After a battle, open **Battle report** for both sides' totals, sampled army/economy/citadel timelines, final forces and objective outcomes. **Last battle report** reopens it from the title without recording another result. Reports are available only until a new battle or page reload; download their local JSON to retain the data. They are not playable replays and are not part of saves, backups or stored history. A resumed battle explicitly marks its missing earlier timeline.

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

- `dist/engine.js`: immutable battlefield descriptors, seeded DOM-free fixed-step simulation, economy, targeting, combat, AI and versioned engine saves.
- `dist/render.js`, `dist/vfx.js`: original 2D models, terrain themes, animation and bounded effects.
- `dist/challenges.js`, `dist/campaign.js`: authored setups, briefings, objective evaluation and campaign progress.
- `dist/objectives.js`: fixed-step objective evaluation and exact deadline handling.
- `dist/persistence.js`: safe storage operations, battle envelopes, history normalization and native-control keyboard handling.
- `dist/audio.js`: original procedural score and synthesized effects.
- `dist/controller.js`, `dist/backup.js`: isolated controller state and validated portable saves.
- `dist/codex.js`: engine-derived unit, counter and economy reference shown in the field guide.
- `dist/scouting.js`: safe, data-derived campaign battlefield and deployment previews.
- `dist/training.js`, `dist/training-app.js`, `dist/training.html`, `dist/training.css`: isolated real-engine learning sessions and responsive practice UI, with no profile or persistence access.
- `dist/battle-report.js`, `dist/report-view.js`, `dist/report-view.css`: immutable bounded observations and accessible current-page battle debriefs. They do not change the simulation or save formats.
- `dist/app.js`: input, camera, menus, HUD, settings, saves and integration.
- `dist/styles.css`, `dist/index.html`: responsive shell and accessible controls.
- `tests/`, `qa/browser/`, `docs/`: deterministic tests, browser regressions and measured development records.

All battlefield art and music are original code-authored works. No downloaded game art, licensed third-party characters, paid assets, tracking or backend. Barlow Condensed and DM Sans are bundled locally under OFL 1.1, with full notices in Preferences and FONTS-NOTICES.txt. No font-service connection is needed; uncommon symbols still use system fallbacks. Models are 2D canvas/vector drawings, not 3D meshes.

## Deployment separation

The private source repository contains source, tests and development records. The public `ironroot-frontier-play` repository contains only the browser build. Browser JavaScript and assets are inherently downloadable by visitors. Never put secrets or private development records in `dist/`.

## Known limitations

- No network PvP, matchmaking, account service or authoritative server.
- The original campaign remains on Classic; the isolated expansion uses both new layouts. All maps use straight roads without terrain obstacles, bent-road pathfinding or air shortcuts.
- Balance is iterated from deterministic simulations and browser reviews, not competitively certified. The 0.8 normal AI responds to early infantry pressure, but scripted tests do not establish human difficulty or eliminate all openings. The local 0.9 Long March Hard fast center-lane rush weakness is documented. Counter prototypes were rejected because they worsened economy pressure or pacing; the validated baseline is retained pending a pre-release balance decision and exact-commit browser QA.
- No physical iOS/Android device testing or subjective music-listening review yet. Cloud desktop tests do not establish mobile performance.
- Canvas battlefield has textual controls and shortcuts, but full nonvisual battlefield accessibility remains unfinished.
- Controller hardware validation, verified desktop runtime, Steamworks, localization, store assets and platform certification remain release gates. The desktop shell does not yet permit portable file export.
- The 0.11 report's independent paired simulations verify exact engine/RNG/action parity, not mobile performance. Native Chromium reviewed actual fresh and resumed defeat reports; the full four-profile automated report suite is prepared but unrun. Reports deliberately do not infer spending, earnings, casualties, production totals or causes of defeat from sampled counters.
