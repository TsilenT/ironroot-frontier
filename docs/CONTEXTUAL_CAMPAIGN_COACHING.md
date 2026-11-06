# Paused teaching in the progression campaign

## Scope and source

Adapted locally from [PR 7](https://github.com/TsilenT/ironroot-frontier/pull/7),
head `f4d4c0668360b3b89cdce75ab3e594a901b54977`, onto the isolated campaign
integration baseline captured on November 6, 2026. The original PR's legacy
optional introductions and its prior browser results are not evidence for this
combined tree. This integration does not publish, merge or deploy anything.

The current campaign remains the 19-mission path in
[CAMPAIGN_ROSTER_CONTRACT.md](CAMPAIGN_ROSTER_CONTRACT.md). Teaching now opens on:

- Roadside Watch: one road, the real Barracks/Archery roster.
- Shield at the Fork: two roads, five buildings including Warden Lodge. Explain
  Rootwarden screening, ranged damage, a second road, forward towers and rear mines.
- Open Three Roads: three roads, all eight buildings. Explain anti-air in the
  north, a screened siege choice in the middle and coverage in the south.

The earlier optional introductions remain available only through their existing
legacy route. Emberwatch does not repeat the basics after either first lesson
has been completed. Three Roads and Winter Stores retain optional defense and
income teaching, without calling previously earned buildings new unlocks.

## Player-visible contract

A fresh unfinished teaching mission opens before its first simulation tick.
The player can choose **Build while paused** or **Start battle now**. The latter
skips planning immediately without purchasing anything. Planning uses only the
normal build bar, legal green sites, ordinary prices and existing engine calls.
Time, both armies, production, AI and income stay stopped until explicit Resume.
No building order or purchase is required. A player can choose another building,
spend nothing, use another legal site or leave some roads uncovered.

**Hide hints does not release the teaching pause.** Resume remains available.
Returning from help or options preserves the hold. A running battle offers
Pause to learn as an explicit optional action. Restoring a saved battle and
replaying a completed mission never open teaching automatically. Restarting an
unfinished attempt is a fresh lesson, with its original battle identity and
starting resources. Completed replays restarted again remain untaught.

Teaching is transient UI state, never a new saved field. Existing campaign
factories, admission, protocol 4, ownership checks, restart identity, progress,
gold costs, stats and legacy schemas are unchanged. Guidance cannot unlock a
building or award progress. No version or cache identity changes are included.

## Placement guidance

All recommendations filter actual map sites through `Game.canBuild` against the
bound battle roster. Frontline producers prefer a forward position while leaving
space for defense. A watchtower must be ahead of that road's troop production;
when no forward site remains, the UI explains the limitation rather than quietly
ringing a rear fallback. Mines prefer rear sites. Archery, siege and wizard
production prefer a site behind that road's Barracks or Warden Lodge. If there
is no screen, the suggestion says so. Existing enemies near a suggestion and
alternate-road fallbacks are disclosed.

The selected alternative producer keeps the current lesson's intended road.
This is advice, never a placement restriction. Hints update from actual
construction and can recover after losses. Rings appear only when inside the
current canvas. Hidden/clipped cards are not highlighted; a suggestion outside
the view directs the player to pan or use the minimap. Selecting a build tool
during planning brings its suggestion into view.

Affordability advice in the module is neutral about whether time is running.
Only the active teaching UI says that time/income are stopped and asks the
player to Resume for more gold.

## Safety and interruption policy

Teaching never releases a visibility, viewport, recovery, stale-storage or
simulation-safety hold. A lesson is armed even if its first screen measurement
is unusable, but the higher-priority safety dialog retains input and focus.
Start/Resume checks the existing guards before clearing teaching. Hidden
windows cannot resume. Help/options close without silently starting simulation.
The shared input-scope guard retires held pointers/keys when teaching opens,
closes, or changes the build drawer. The teaching dialog is below pause,
viewport and recovery dialogs in both focus order and visual stacking.

## Validation boundary

`tests/campaign-teaching-integration.test.mjs` executes the actual app startup,
selection, placement, teaching, pause and frame functions with real engines,
mission factories and progression rules. Its 15 cases cover all three lessons'
paid planning, freezing, skip, normal restore, completed replay, fresh restart,
optional alternative composition, help/options, hidden/stale/recovery/safety
blocks, first-start viewport safety, legality, affordability and Rootwarden
screens. The source-extraction DOM fixture is not browser, focus, touch or
rendering evidence.

The retained campaign-flow/mobile tests cover neutral guidance, legacy parity,
forward towers, occupied sites, exposure, real cost/roster checks, clipped cards
and drawing state. Existing strict startup negative controls are unchanged.
Non-teaching browser flows explicitly press Start battle now at fresh launch;
there is no blanket hidden-state mutation or automatic dismissal in shared
input helpers. New `contextual-coaching.spec.mjs` cases exercise real native
teaching controls across configured viewports, including the three actual
rosters, paid planning, optional strategy, pause/restore/restart, input/focus and
safety. Those browser cases are prepared, **not run in this integration task**.

Exact command outcomes and file hashes are in the delivered integration
manifest. Native browser QA must use the final combined checkout after the
parent merges the separate navigation and amended pause/settings work.
Physical devices, Safari/WebKit, Firefox, installed PWA and controller hardware
remain unverified.
