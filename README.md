# Ironroot Frontier

A single-player real-time strategy tug-of-war for desktop and mobile browsers. Build an army, defend your economy and push along the battlefield lanes.

## Live v0.23.0 and local v0.24.1 candidate

The verified release handoff identifies **v0.23.0 as live** at https://ironroot.stevets.ai/, from private main `02fcb4f823c067b4495ea40e93d0a4ceec64b1e6` ([PR #24](https://github.com/TsilenT/ironroot-frontier/pull/24)), tree `70b0d6c833fd9a9c2a08d46c401ff7229d3e4958`. Public commit `8f8cda592e3f9895cd2f60c9e3ea369c21af8016` contains its 57 runtime files under cache `ironroot-v0.23.0`. Release smoke checked a paid older checkpoint, Back/save/reload, retained settings and the gated One Signal briefing. It did not earn a live mission win or certify phones. This local v0.24.1 source has not been deployed.

The released game includes immediate 190-gold Citadel choices, optional default-off Skirmish bridge income, restart/briefing improvements, Ashen Crossroads and remappable Battle keyboard controls. Arrow volley cannot replace the selected barracks during forced first-barracks teaching; the existing card explains the lock and becomes available after a successful paid placement. Later planning lessons and ordinary paid Volley behavior are unchanged. See [the tutorial guard validation](docs/TUTORIAL_SPELL_GUARD.md) and [current feature dispositions](docs/FEATURE_DELIVERY.md). Held compact-toolbar PR #14 remains separate.

### Released longer score

**v0.20.3** ships the original 64-bar **The Long Reach — Hearth to Standard** experiment from `604de18910d7ddceda648d8156283b42c321e8ba`: 142.22 seconds rather than 35.56 seconds. Four sections develop the theme through Hearth, The Road, The Crossing and The Standard. Menu voicing is simpler, transitions preserve musical position, and priority cues temporarily lower only music. All 19 existing SFX synthesis sequences and aliases, audio settings, gameplay rules and profile protocol 11 remain unchanged by the music release.

The exact audio source passed fresh native Chromium technical verification: 12 PCM scenarios and 15 live controls. **No actual listening assessment was performed.** These measurements do not establish musical quality, fatigue or physical-device behavior. [The dated audio integration report](docs/AUDIO_INTEGRATION_0_20_3.md) preserves its pre-release source and technical evidence, including the transition-lookahead caveat; its preparation-time live-version statements are historical.

### Released experimental fog and Chapter 6

Fog PR #22 is merged on private main `772d7d90897b8ad27d48ede574dc62aaacbd77ad`, tree `589e8c06f0564e595540d24503b9cf17e3fc7bed`. Both exact-head and merged-source CI passed: 1,641 Node checks, no failures and one optional tooling skip. That source was subsequently included in the verified v0.22.0 release; its limited experimental acceptance scope remains unchanged.

New Skirmish offers **Fog of war**, unchecked by default and session-only, for Classic, open endgame and bridge income off. Field, minimap, HUD and audio use the detached observation; stale buildings retain explicitly last-seen details and unseen enemy citadel health remains unknown. Existing fog-off modes, progress and settings are preserved. The original fog candidate introduced profile protocol 12 and the distinct `frontier-fog-skirmish-open` identity; the old experimental QA identity remains rejected by normal save/history/backup paths. See [scope, evidence epochs and limitations](docs/FOG_SKIRMISH_INTEGRATION.md).

The [recovery status](docs/FOG_RECOVERY_2026_11_08.md) distinguishes exact recovered code from missing local artifacts after a workspace reset. Its 79 fresh focused checks and short desktop paid-Fog save/reload smoke are separate from earlier measurements; nonempty memory did not arise in that fresh session. Physical-phone, offline/update, sustained-performance and fairness validation remain incomplete. Performance and wider device coverage are follow-up work for the user-approved opt-in experiment, not claims of correctness or speed.

Live **v0.22.0** added the first Chapter 6 mission, **Shared Crossing**, after Common Ground. Hold any two uncontested owned bridges for a cumulative 60 seconds within 4:30, or destroy the enemy citadel. Lost control pauses the shared clock rather than resetting it, empty ownership persists, and these bridges grant no gold. Ground troops capture; opposing flyers can deny. The briefing shows the fixed enemy formation. Fog is off in this mission.

Shared Crossing adds one mission and three optional stars: 20 main-path missions / 60 stars, with every previous record retained. Its separate revision-one identity and profile protocol 13 keep older tabs from overwriting the expanded catalog. The rest of Chapter 6 and Chapters 7–10 remain [design proposals](docs/CAMPAIGN_TEN_CHAPTER_PLAN.md); the original Chapter 5 expansion notes remain unchanged. [Rules, paid routes and limitations](docs/SHARED_CROSSING_RULES.md) describe the provisional setup; automated successes are not a human-balance claim. Independent review and desktop acceptance are recorded in [the validation record](docs/SHARED_CROSSING_VALIDATION.md): 1,674 Node checks passed with one optional skip; full browser preflight passed, but no Playwright matrix or physical-device pass is claimed. The actual desktop-paid attempt lost; separate paid-engine checkpoints verified nonzero control and the victory UI.

**Released v0.23.0: One Signal Is Enough.** Chapter 6’s second mission asks you to keep either Ridge Signal or River Signal standing until evacuation at 3:30. Losing the first is allowed; losing the last or your citadel ends the attempt. An enemy-citadel victory still needs one original signal. Saving both is optional, signals cannot be salvaged, and replacements do not count. The opponent uses ordinary adaptive AI and earned income, not just a fixed producer layout. It added one mission for 21 main-path missions / 63 optional stars, preserving earlier records with profile protocol 14. Exact-source CI passed 1,727 checks with one optional skip; these are not a full browser or human-balance claim.

**Local v0.24.1 candidate: Lanterns on the Water.** Chapter 6’s first fog mission charts two customs houses without exposing their defenders, current health or upgrades. Destroy both originals or the enemy citadel within ten minutes. Dispatch confirms original-post destruction even outside sight, and replacements cannot erase that credit. The opponent builds and upgrades with ordinary income, using the same visibility and last-seen rules as the player. Known chart controls focus the camera without granting sight. Current health appears only on contact; stale observations are labelled. This candidate adds one mission for 22 main-path missions / 66 stars, profile protocol 15 and a new immutable battle identity. Earlier missions and records retain their rules. See [provisional design and paid-route limits](docs/LANTERNS_DESIGN.md) and [validation scope](docs/LANTERNS_VALIDATION.md). Local aggregate checks passed 1,786 with one optional skip, and bounded native desktop acceptance passed. This is not a full browser/physical-device or human-balance claim, and it is not yet published.

The source also preserves the isolated [Last Ascent experiment](qa/last-ascent/ACCEPTANCE.md). It is not a campaign entry, difficulty certification or public runtime asset. Current chapter design allows longer arcs where useful, with adaptive enemies the default for future encounters; extra mission counts are not quotas.

### Previous live validation

The preceding **v0.20.2** release used source merge `0cdd1f5f3ff35c538c36b6cfe30848b2cfb632e7` ([PR #19](https://github.com/TsilenT/ironroot-frontier/pull/19)) and public commit `f2ad682fa35aec7c5f1cbbea9b2d10b94d931399`. Its 54 runtime files matched the released source. Head CI, merged CI and Pages deployment passed; desktop smoke covered the tutorial guard, paid construction and Volley, save/reload and preserved progress/settings/history. Those historical results are not a full browser matrix for v0.20.3 or the fog candidate. Physical-device, installed-PWA, controller and non-Chromium certification remain open.

## Local v0.24.1 interaction repairs

Select the home citadel or its visible badge to open Citadel upgrades directly; the pause-menu shortcut remains. The existing battle pause, 190-gold price, one-choice limit, save behavior and fog privacy are unchanged. In portrait Skirmish setup, tapping unavailable Fog labels or explanation text now preserves the reading position while passive focus is repaired. Deliberate keyboard navigation still reveals focused controls. These source-only repairs are not deployed. See [combined verification and limits](docs/UI_INTERACTION_VALIDATION.md).

## Game features

- **Campaign opens first:** three authored one-, two-, then three-road battles introduce the company before the sixteen established continuation missions; Shared Crossing and One Signal are Chapter 6’s released encounters. Any victory advances; stars are optional. A one- or two-star win offers replay without reducing the best record.
- **Real roster progression:** the opening has barracks and archery ranges. Winning it adds Warden lodges, mines and towers. Winning the second battle makes all eight buildings available before the third starts. The Rootwarden is a high-HP, low-damage screen, not a mandatory winning strategy.
- **One game interface:** construction and upgrades use normal gold and the real build bar. Optional coaching marks useful tools and legal sites. The first fresh Roadside Watch opens directly on the battlefield: time, income and spawning stay stopped until its first paid barracks is placed, then combat starts automatically. Other spending is temporarily blocked for that first step so the opening cannot run out of gold. Later lessons retain their explicit planning choices; hiding hints never starts them. Hide removes the whole hint banner and returns its space to the field, leaving a compact Show control and any necessary teaching Resume action. Restored attempts and completed replays do not automatically stop for teaching.
- **Readable mission navigation:** the current briefing opens first. Story and Chapter links expose the broader route. Flavor and plain goals remain prominent; exact rules, scouting and bonus stars expand on request. Required protection, hold, income and health conditions stay visible.
- **Skirmish and field trials:** optional title-screen routes. New skirmishes include Rootwardens, an explicit open/timed endgame choice, and optional persistent bridge income (off by default). Guided practice remains optional and temporary, with no profile rewards.
- **Automatic flyers:** gryphons notice nearby troops on their current or an adjacent road and fly into attack range without commands. After losing a target they find another nearby enemy or advance along the nearest road, so successive fights can carry them across roads. Detours can expose enemies or pull flyers away from their own army. Archers remain on their roads but can hit nearby flyers between roads; towers can intercept them too. There are no route buttons, gateways, crossing countdowns or forced returns.
- **Small screens:** Income remains visible beside gold in portrait, including short layouts. Build opens a shared drawer. Named protected-objective controls focus the actual structures. The released visible-viewport repair supports short portrait and landscape layouts; truly insufficient space pauses combat until it fits and the player explicitly resumes.

Campaign stars, unlocks, settings, trial records and result history remain persistent. Fresh attempts of the existing Campaign missions use revision 5 while preserving earned 2/5/8-building stages; Shared Crossing, One Signal and the new Lanterns candidate each use their own revision 1. Fresh Field Trials use revision 3 with their seven-building roster. Guided Practice retains its existing rules. The released One Signal build uses profile protocol 14. The local Lanterns candidate advances it to 15 while preserving existing profile data; historical protocol fixtures retain their original scope. Older clients cannot overwrite the newer profile. The session-only setup checkbox is not a saved preference, while a resumed fog battle retains its bound identity and validated memory. Existing bought checkpoints retain their exact choice and state; unbought citadel-enabled checkpoints gain immediate availability. Older non-citadel battles keep their bound rules. Close old game tabs before importing a backup. No in-progress battle migration is added.

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

- Click or tap the home citadel or its upgrade/status badge to open Citadel upgrades. The battle pauses while you choose; Resume battle returns to play. The same dialog remains available in the pause menu.

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
- `dist/bridge-control.js`: separate optional Skirmish bridge-income and campaign cumulative-control contracts; `campaign-control-view.js` formats the campaign status.
- `dist/fog.js`, `dist/fog-view.js`: observation, frozen memories and observation-filtered field, minimap and audio presentation. `campaign-intelligence.js` keeps authored chart information separate from current visibility and confirmed dispatch reports.
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

The private source repository contains development records. Only `dist/` belongs in the public browser build. Browser assets are downloadable; never put secrets or private reports there. Live v0.23.0 uses `ironroot-v0.23.0`; the local Lanterns candidate uses `ironroot-v0.24.1`. The [v0.20.2 tutorial-guard manifest](qa/tutorial-spell-guard/runtime-inventory.json), [v0.20 runtime evidence](qa/citadel-playtest/runtime-final.json) and [v0.20.3 audio integration report](docs/AUDIO_INTEGRATION_0_20_3.md) retain their original historical scopes and do not certify this combined fog candidate. PR #14 remains held with unresolved history failures and Ward remains unshipped. Shared Crossing, One Signal Is Enough and experimental Skirmish fog are live in v0.23.0. Lanterns on the Water is an unreleased candidate; Last Ascent is a developer-only experiment with no campaign entry. The remaining Chapter 6–10 encounters are design proposals. The current candidate has not been published; release status must be verified separately. Never publish changed assets under an old cache identity.

There is no network PvP, account service or authoritative server. Physical mobile/controller testing, full nonvisual battlefield access and desktop/store certification remain separate work. Automated balance simulations do not establish human difficulty or mobile performance. See `docs/DESKTOP.md` for the optional desktop shell.
