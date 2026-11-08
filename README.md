# Ironroot Frontier

A single-player real-time strategy tug-of-war for desktop and mobile browsers. Build an army, defend your economy and push along the battlefield lanes.

## Live v0.20.3 and local candidate

The 8 November 2026 release handoff identifies **v0.20.3 as live** at https://ironroot.stevets.ai/, from private main `f8eec7afb417a2d6616388c524f733e7853e8fa8` ([PR #21](https://github.com/TsilenT/ironroot-frontier/pull/21)), tree `92da8b6c80560ad52240890acabcc24d38ff9080`. Its cache is `ironroot-v0.20.3`. This documentation reconciliation used the supplied release handoff and approved source documents; it did not perform another remote or live-browser verification.

The released game includes immediate 190-gold Citadel choices, optional default-off Skirmish bridge income, restart/briefing improvements, Ashen Crossroads and remappable Battle keyboard controls. Arrow volley cannot replace the selected barracks during forced first-barracks teaching; the existing card explains the lock and becomes available after a successful paid placement. Later planning lessons and ordinary paid Volley behavior are unchanged. See [the tutorial guard validation](docs/TUTORIAL_SPELL_GUARD.md) and [current feature dispositions](docs/FEATURE_DELIVERY.md). Held compact-toolbar PR #14 remains separate.

### Released longer score

**v0.20.3** ships the original 64-bar **The Long Reach — Hearth to Standard** experiment from `604de18910d7ddceda648d8156283b42c321e8ba`: 142.22 seconds rather than 35.56 seconds. Four sections develop the theme through Hearth, The Road, The Crossing and The Standard. Menu voicing is simpler, transitions preserve musical position, and priority cues temporarily lower only music. All 19 existing SFX synthesis sequences and aliases, audio settings, gameplay rules and profile protocol 11 remain unchanged by the music release.

The exact audio source passed fresh native Chromium technical verification: 12 PCM scenarios and 15 live controls. **No actual listening assessment was performed.** These measurements do not establish musical quality, fatigue or physical-device behavior. [The dated audio integration report](docs/AUDIO_INTEGRATION_0_20_3.md) preserves its pre-release source and technical evidence, including the transition-lookahead caveat; its preparation-time live-version statements are historical.

### Unpublished v0.21.0 fog candidate

This working tree is the **local v0.21.0 candidate**, not the live release. Its fog work began on v0.20.2 and now includes the approved PR #20 documentation and PR #21 audio changes from current main while retaining the distinct `ironroot-v0.21.0` version/cache identity. It has not been published, merged or deployed and is not approved for release.

New Skirmish offers **Fog of war**, unchecked by default and session-only, for Classic, open endgame and bridge income off. Field, minimap, HUD and audio use the detached observation; stale buildings retain explicitly last-seen details and unseen enemy citadel health remains unknown. Existing fog-off modes, progress and settings are preserved. The candidate uses profile protocol 12 and the distinct `frontier-fog-skirmish-open` identity; the old experimental QA identity remains rejected by normal save/history/backup paths. See [scope, evidence epochs and open gates](docs/FOG_SKIRMISH_INTEGRATION.md).

The final combined source recorded **1,634 tests passed, zero failed and one optional skip**, with syntax and 56-file / 1,081,989-byte runtime checks passing. Earlier native desktop main-app play and later synthetic dense-memory checks cover different source stages. The final bounded paid native attempt ended in a genuine defeat at 01:18, with no enemy-building memory observed. Nonempty Pause details and memory save/restore therefore remain unverified; that one attempt is not a balance/fairness conclusion. Displayed options and campaign progress were preserved, and the final title had no unfinished Resume checkpoint. Native mobile coverage is blocked; sustained browser performance and offline/update acceptance remain unverified. A possible stale-badge/known-citadel-title overlap remains documented. These results do not establish release readiness.

### Previous live validation

The preceding **v0.20.2** release used source merge `0cdd1f5f3ff35c538c36b6cfe30848b2cfb632e7` ([PR #19](https://github.com/TsilenT/ironroot-frontier/pull/19)) and public commit `f2ad682fa35aec7c5f1cbbea9b2d10b94d931399`. Its 54 runtime files matched the released source. Head CI, merged CI and Pages deployment passed; desktop smoke covered the tutorial guard, paid construction and Volley, save/reload and preserved progress/settings/history. Those historical results are not a full browser matrix for v0.20.3 or the fog candidate. Physical-device, installed-PWA, controller and non-Chromium certification remain open.

## Game features

- **Campaign opens first:** three authored one-, two-, then three-road battles introduce the company before the sixteen continuation missions. Any victory advances; stars are optional. A one- or two-star win offers replay without reducing the best record.
- **Real roster progression:** the opening has barracks and archery ranges. Winning it adds Warden lodges, mines and towers. Winning the second battle makes all eight buildings available before the third starts. The Rootwarden is a high-HP, low-damage screen, not a mandatory winning strategy.
- **One game interface:** construction and upgrades use normal gold and the real build bar. Optional coaching marks useful tools and legal sites. The first fresh Roadside Watch opens directly on the battlefield: time, income and spawning stay stopped until its first paid barracks is placed, then combat starts automatically. Other spending is temporarily blocked for that first step so the opening cannot run out of gold. Later lessons retain their explicit planning choices; hiding hints never starts them. Hide removes the whole hint banner and returns its space to the field, leaving a compact Show control and any necessary teaching Resume action. Restored attempts and completed replays do not automatically stop for teaching.
- **Readable mission navigation:** the current briefing opens first. Story and Chapter links expose the broader route. Flavor and plain goals remain prominent; exact rules, scouting and bonus stars expand on request. Required protection, hold, income and health conditions stay visible.
- **Skirmish and field trials:** optional title-screen routes. New skirmishes include Rootwardens, an explicit open/timed endgame choice, and optional persistent bridge income (off by default). Guided practice remains optional and temporary, with no profile rewards.
- **Automatic flyers:** gryphons notice nearby troops on their current or an adjacent road and fly into attack range without commands. After losing a target they find another nearby enemy or advance along the nearest road, so successive fights can carry them across roads. Detours can expose enemies or pull flyers away from their own army. Archers remain on their roads but can hit nearby flyers between roads; towers can intercept them too. There are no route buttons, gateways, crossing countdowns or forced returns.
- **Small screens:** Income remains visible beside gold in portrait, including short layouts. Build opens a shared drawer. Named protected-objective controls focus the actual structures. The released visible-viewport repair supports short portrait and landscape layouts; truly insufficient space pauses combat until it fits and the player explicitly resumes.

Campaign stars, unlocks, settings, trial records and result history remain persistent. Fresh Campaign attempts use revision 5 while preserving earned 2/5/8-building stages; fresh Field Trials use revision 3 with their seven-building roster. Guided Practice retains its existing rules. The live music release retains profile protocol 11. This fog candidate advances the profile fence to protocol 12 while preserving existing profile data; older clients cannot overwrite a candidate profile. The session-only setup checkbox is not a saved preference, while a resumed fog battle retains its bound identity and validated memory. Existing bought checkpoints retain their exact choice and state; unbought citadel-enabled checkpoints gain immediate availability. Older non-citadel battles keep their bound rules. Close old game tabs before importing a backup. No in-progress battle migration is added.

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
- `dist/fog.js`, `dist/fog-view.js`: candidate observation, frozen memories and observation-filtered field, minimap and audio presentation.
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

The private source repository contains development records. Only `dist/` belongs in the public browser build. Browser assets are downloadable; never put secrets or private reports there. Live v0.20.3 uses `ironroot-v0.20.3`; the unpublished v0.21.0 fog candidate uses `ironroot-v0.21.0` and must remain separate. The [v0.20.2 tutorial-guard manifest](qa/tutorial-spell-guard/runtime-inventory.json), [v0.20 runtime evidence](qa/citadel-playtest/runtime-final.json) and [v0.20.3 audio integration report](docs/AUDIO_INTEGRATION_0_20_3.md) retain their original historical scopes and do not certify this combined fog candidate. PR #14 remains held with unresolved history failures; Ward remains unshipped, and Chapter 6 / the ten-chapter design are queued after fog/music work, not implemented. No merge or publication is included in this candidate work. Never publish changed assets under an old cache identity.

There is no network PvP, account service or authoritative server. Physical mobile/controller testing, full nonvisual battlefield access and desktop/store certification remain separate work. Automated balance simulations do not establish human difficulty or mobile performance. See `docs/DESKTOP.md` for the optional desktop shell.
