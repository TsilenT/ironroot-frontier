# Borrowed Ground UI review

Reviewed the local v0.25.0 candidate on 2026-11-08. This review added tests and this note, with no runtime edits. The scope is bounded to app integration, field rendering, selection, scouting, copy and native desktop acceptance. No remaining Borrowed-specific blocker was found in these paths. This is not release or human-balance acceptance.

## Source and fixture result

**52 passed, 0 failed**, running:

```sh
node --test --test-concurrency=2 tests/borrowed-app.test.mjs tests/campaign-progression-ui.test.mjs tests/renderer-maps.test.mjs tests/scouting.test.mjs
```

The 12 new Borrowed cases cover:

- Actual app start and Restart → briefing → Begin retain `borrowed-ground@1`, `frontier-campaign-borrowed-ground@1` and `borrowed-yard@1`. Restart clears purchased structures, elapsed combat and selection, without mutating the retained attempt before Begin.
- Title and battle field guides use the actual 12-building map and full roster. The camp has nine ordinary assets, three free rear plots, 420 gold, 7.5 gold/sec and no protection or teaching lock. The enemy uses normal adaptive AI and full sight.
- Real field commands reject an occupied site without moving or spending, build on a free plot at ordinary cost, and select the purchased structure. Inherited towers, barracks, archery ranges and mines offer ordinary paid upgrades and health-adjusted, rounded-down salvage. They are not protected objectives.
- Original roadblock IDs 12 and 13 drive objective credit. A synthetic original-loss/replacement scene retains 1/2 credit and does not substitute the replacement ID. This is an integration boundary test, not paid combat evidence.
- Snap, build grid and ghost use only four columns across three roads, including mirrored enemy plots and exact ties. Selection highlights the true building/range. Canvas commands remain finite and balanced in desktop and two synthetic compact sizes. Terrain switches correctly and the minimap projects all 17 starting structures and three roads.
- Scouting matches actual type, location, road and level for both armies, names both original roadblocks and shows no protected or fog-chart markers. Briefing and hints distinguish optional salvage/composition and bonus medals from the victory requirements. The public Skirmish picker remains Classic, Long March and Twin Span.

The broader 40 checks also passed, including actual quick navigation across the current campaign and preserved Classic rendering fixtures.

## Finding resolved

The current mission title initially failed at `renderCampaign → populateFieldGuide → createCodex`: a ruleset-only guide defaulted to Classic, which correctly failed the Borrowed map/ruleset pairing guard. The source owner now supplies both the launch ruleset and exact mission map to the guide. The new regression exercises that actual title path and actual battle start, asserting 12 buildings per side. No identity guard or codex fallback was weakened.

## Bounded native desktop acceptance

Native Chromium review used a 1180 × 757 content viewport, visible UI and ordinary keyboard/mouse input only. The managed preview's exact returned URL was `http://127.0.0.1:4173/`. Its disclosed synthetic prerequisites and paid-engine checkpoints used fixture-specific `sessionStorage`, with service-worker installation disabled. No production tab/profile was used. The near-win result below was **not a browser-earned full mission win**.

Source runtime aggregate SHA-256: `b290af28815926fbdb90e76d8fc77cf64b97d567327928acc8197dd514db6ed8`. Preview aggregate: `cf6cd8ba4ae2059e66f7e85d5018e63a7693aece8ca18c2bb5d19a8cd0d62c9c`. The fixture manifest records 58 runtime files, with only the documented `app.js` and `index.html` isolation/navigation wrappers differing. Source hashes were rechecked after native review and still matched.

Passed within this scope:

- **Briefing:** Campaign shows 23 missions; Borrowed is Chapter 6 mission 4 of 4, with Next disabled. The 10:00 goal, ordinary adaptive opponent, optional salvage/composition, health-scaled refund and replacement rule are readable. Scouting depicts and lists the real 9-versus-8 starting forces and named roadblocks. The title Field Guide correctly says 12 buildings per side.
- **Fresh paid interaction:** The north starting tower upgraded at the listed 154-gold price and became level 2 with 1,400 HP. The south starting tower's ordinary Salvage button returned an explicit 110 gold, freed its forward plot and did not fail the mission. Keyboard 1 selected a 140-gold barracks; placing it on that plot succeeded and cleared placement. Keyboard 8 correctly selected Warden Lodge in battle. Field, selection, site grid and minimap were readable without overlap in this desktop view.
- **Back/save/restart:** Browser Back dismissed the title Field Guide and later paused combat. Save & return, same-tab reload and Resume retained the 00:45 attempt, upgraded northern tower and replacement southern barracks. Cancel restart retained the paused 00:51 attempt. Confirming restart returned to briefing without starting combat; Begin restored 00:00, 0/2 and the original nine-asset camp.
- **Paid checkpoint restore:** The 00:15 selective-salvage fixture resumed with both paid outer forward barracks, the middle tower and 0/2 targets. These earlier purchases were supplied paid-engine actions, not reviewer browser inputs.
- **Terminal/replay:** The supplied 03:12 checkpoint showed 1/2 and naturally won at 03:14 with no additional player commands. The result awarded three stars. Its report identified the exact Borrowed map/ruleset/scenario, both citadels at 6,000 HP, 2/2 original roadblocks and the limited 03:12–03:14 recording window. Replay returned to the completed mission briefing; explicit Replay then restored 00:00, 0/2 and the original camp. The preview was left paused, Chromium was released and the managed preview was stopped.

**Minor copy follow-up:** Before battle starts, the title Field Guide's keyboard-help sentence lists the default seven building shortcuts and omits Warden Lodge. This title-only text was left unchanged. The full roster is present, and native key 8 selects Warden Lodge during Borrowed play, so no in-battle command blocker was found.

## Evidence and limits

Raw logs and nine screenshots are outside source in sibling `local-evidence/ui/`: `native-guide.png`, `native-hint.png`, `native-salvage.png`, `native-warden.png`, `native-restored.png`, `native-rebuilt.png`, `native-victory.png`, `native-objectives.png` and `native-replay-fresh.png`. Historical evidence was preserved.

The source-VM, small-DOM and canvas checks are separate from the native pass. The native accessibility source exposed only the window, so this is screenshot/input evidence, not an accessibility-tree or screen-reader audit. No full human-earned match, native defeat/deadline/core-win route, native same-site enemy replacement, broad strategy/balance matrix, sustained performance, full browser matrix, phone emulation, physical device, controller, audio listening, PWA/offline/update or production-profile durability was tested. The 23-mission label was seen natively; catalog totals and admission are covered separately by source/profile tests.
