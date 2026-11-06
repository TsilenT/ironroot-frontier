# Ironroot Frontier

A single-player real-time strategy tug-of-war for desktop and mobile browsers. Build an army, defend your economy and push along the battlefield lanes.

## Status

The verified live release is **v0.13**, source commit `76135e7b56077a661f67b0b5eeab7c118ec57844`, at https://ironroot.stevets.ai/. Its exact Chromium matrix passed 841 checks with zero failures and three intentional skips; root tests passed 825 with one optional desktop-dependency skip. Live smoke verified older campaign save migration and introductory mission completion, replay and resume.

This checkout now contains a **next-batch work in progress** for combat feedback, protected-objective warnings and an intro Resume-label correction. Those changes are not the deployed build. See `docs/ROADMAP.md` and the individual review records for acceptance status and unrun gates. Historical release results do not certify unfinished work.

## Play

- **Campaign opens first:** two optional one- and two-road opening missions lead into the original 16 missions across five chapters. Their 6 optional stars are separate from the original 48. Continue after a win, or replay a one- or two-star result without losing your best record.
- **Learn in the battle:** short hints mark the existing build cards and controls. Construction and upgrades use their normal gold costs. Early build bars are smaller, but **All buildings** always restores the full roster. Saved battles retain the full roster.
- **Skirmish and field trials:** optional routes from the title screen. New skirmishes include the Rootwarden lodge and an explicit open/timed endgame choice. Saved battles and authored missions keep their own roster and rules.
- **Guided practice:** optional, temporary lessons without profile saves or rewards.
- **Every battle on small screens:** Build opens the shared drawer. Close or choose a card to return to the field. Named objective controls focus the original structures. If the battlefield and controls cannot fit, combat pauses until the screen fits and you explicitly resume.

Existing missions and saved battles retain their original identities and rules. The new optional introductions have separate map/scenario IDs, and new skirmishes pin their chosen rules in version-3 saves. Profile protocol 3 blocks ordinary stale writes from older tabs. A cached v0.12 tab can still replace the profile through its explicitly confirmed backup-recovery flow; close other Ironroot tabs before restoring any backup. The opening build bars are presentation defaults, not technology locks. Unsupported saves remain unchanged.

## Run and check

The game has no build step or runtime dependencies. Serve `dist/` with a static HTTP server; ES modules do not run from a `file://` URL.

```sh
python3 -m http.server 8000 --directory dist
node --test tests/*.test.mjs
node scripts/check.mjs
node scripts/verify-runtime.mjs
```

Open http://localhost:8000. The separate browser project is in `qa/browser/`; its setup and coverage limits are in `docs/BROWSER_REGRESSIONS.md`. Do not treat source/Node checks as native browser or physical-device evidence.

## Controls and saves

- Choose a building, then a legal site. Troops spawn and fight automatically.
- Drag the field with touch, left mouse or middle mouse, or use Home, Front and the minimap to navigate. Middle mouse only pans; right-click on the battlefield cancels building or volley placement. Escape and the visible Cancel button remain available.
- Fullscreen is in Preferences, available from the title screen or pause menu. Activate the button with a click, tap, Enter or Space; browser/device support and permissions apply. If unavailable, keep playing in the window. Ordinary browser and installed-app play do not require fullscreen; screen-size pause rules still apply.
- Select an owned building to upgrade or salvage it. Original protected structures cannot be salvaged from the UI.
- Keys 1–7 (legacy) or 1–8 (Rootwarden) select visible building options, R selects Arrow volley, Space pauses, Escape cancels and arrows move the camera. Expand **All buildings** for the full shortcut set.
- Battles autosave every five seconds and on pause. One active battle slot is shared across modes. A failed Save & return keeps the battle on the page.
- Stars, records, preferences and history stay on that browser/device. Preferences → Save backups exports or imports a local JSON file. Import previews the replacement and asks for confirmation.
- Reports describe the current battle, including sampled timelines. They are not playable replays, are not part of backups, and disappear on a new battle or reload unless exported.
- Sound begins after a user gesture. Preferences include music, effects, volume, reduced motion and visual quality.

## Source map

- `dist/engine.js`: deterministic combat, maps, AI and engine saves.
- `dist/campaign.js`, `dist/challenges.js`, `dist/objectives.js`: authored battles, progress and fixed-step objective checks.
- `dist/campaign-flow.js`: presentation-only build choices and guidance inferred from the real battle.
- `dist/mobile-battlefield.js`, `dist/protected-objectives.js`, `dist/objective-alerts.js`: visible-geometry checks, pause latch, original-objective tracking and current-page warning policy.
- `dist/persistence.js`, `dist/profile-session.js`, `dist/backup.js`: storage safety, profile coordination and portable saves.
- `dist/app.js`, `dist/index.html`, `dist/styles.css`: controls, menus and integration.
- `dist/render.js`, `dist/combat-feedback.js`, `dist/vfx.js`, `dist/audio.js`: original canvas art, timer-based poses, effects and procedural sound.
- `tests/`, `qa/browser/`, `docs/`: checks and measured development records.

Fonts are bundled under OFL 1.1 with notices in `dist/FONTS-NOTICES.txt`. No external font service, game-art downloads, tracking or backend is required.

## Release boundaries

The private source repository contains development records. Only `dist/` belongs in the public browser build. Browser assets are downloadable; never put secrets or private reports there. Next-batch source uses the distinct unreleased v0.14 cache/version. This is not a publication claim; live remains v0.13 until a deliberate tested release. Never publish changed assets under the old cache identity.

There is no network PvP, account service or authoritative server. Physical mobile/controller testing, full nonvisual battlefield access and desktop/store certification remain separate work. Automated balance simulations do not establish human difficulty or mobile performance. See `docs/DESKTOP.md` for the optional desktop shell.
