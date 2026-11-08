# Ironroot Frontier

A single-player real-time strategy tug-of-war for desktop and mobile browsers. Build an army, defend your economy and push along the battlefield lanes.

## Last verified live baseline

Release status in this section was last verified on 8 November 2026 against private main `fdbd86c31ec2225009faa572f66ed4ccc4970315`. Source version changes below do not by themselves verify a newer deployment.

**v0.20.2 was verified live** at https://ironroot.stevets.ai/, from private source merge `0cdd1f5f3ff35c538c36b6cfe30848b2cfb632e7` ([PR #19](https://github.com/TsilenT/ironroot-frontier/pull/19)) and public commit `f2ad682fa35aec7c5f1cbbea9b2d10b94d931399`. The 54 runtime files match the released source and use `ironroot-v0.20.2`.

Arrow volley cannot replace the selected barracks during forced first-barracks teaching. The existing card explains the temporary lock and becomes available after a successful paid barracks placement. Later planning lessons and ordinary paid Volley behavior are unchanged. See [the tutorial guard validation](docs/TUTORIAL_SPELL_GUARD.md).

The release includes immediate 190-gold Citadel choices, optional default-off Skirmish bridge income, restart/briefing improvements, Ashen Crossroads and remappable Battle keyboard controls. [FEATURE_DELIVERY.md](docs/FEATURE_DELIVERY.md) distinguishes shipped work, held PR #14 and retained experiments. Historical candidate reports remain unchanged.

Head CI, merged CI and Pages deployment passed. Live desktop smoke covered the tutorial guard, paid construction and Volley, save/reload and preserved progress/settings/history. This was not a new full browser matrix; physical-device, installed-PWA, controller and non-Chromium certification remain open.

## Reviewed v0.20.3 source

The **v0.20.3 longer-music integration** is based on private main `fdbd86c31ec2225009faa572f66ed4ccc4970315`. Its source scope is separate from the commit-bound live baseline above. It integrates the original 64-bar **The Long Reach — Hearth to Standard** experiment from `604de18910d7ddceda648d8156283b42c321e8ba`: about 2 minutes 22 seconds rather than 36 seconds, with two new middle sections, a developed reprise, simpler menu voicing, preserved musical position and priority-cue music ducking. Existing SFX and audio settings remain compatible.

The exact audio source passed fresh native Chromium technical verification: 12 PCM scenarios and 15 live controls. No actual listening pass was performed; these measurements do not establish musical quality, fatigue or physical-device behavior. See [AUDIO_INTEGRATION_0_20_3.md](docs/AUDIO_INTEGRATION_0_20_3.md). This isolated source version uses `ironroot-v0.20.3`; optional fog and held PR #14 are not included.

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

The private source repository contains development records. Only `dist/` belongs in the public browser build. Browser assets are downloadable; never put secrets or private reports there. The released v0.20.2 build uses `ironroot-v0.20.2`. Its exact inventory is [the tutorial-guard runtime manifest](qa/tutorial-spell-guard/runtime-inventory.json). Earlier [v0.20 runtime evidence](qa/citadel-playtest/runtime-final.json) is retained unchanged and is historical. PR #14 remains held and separate. The reviewed v0.20.3 source changes only audio and release metadata at runtime and uses its own `ironroot-v0.20.3` cache identity. Acceptance and release observations are recorded in [the dated integration report](docs/AUDIO_INTEGRATION_0_20_3.md). Optional fog remains separate. Never publish changed assets under an old cache identity.

There is no network PvP, account service or authoritative server. Physical mobile/controller testing, full nonvisual battlefield access and desktop/store certification remain separate work. Automated balance simulations do not establish human difficulty or mobile performance. See `docs/DESKTOP.md` for the optional desktop shell.
