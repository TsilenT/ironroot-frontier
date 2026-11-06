# Optional campaign opening

Implemented in the single combined checkout. This is local validation, not publication approval.

## What joins the game

The optional **First Roads** chapter has two new mission IDs, then points to Emberwatch. The old 16 missions keep their maps, deadlines, goals, starting formations, prerequisites and medal meanings. Their completion total is still 16 missions / 48 stars. Introduction records use the same progress schema but have a separate 2 missions / 6 stars total.

- `first-watch`: one road at y=450; 420 starting gold; no player buildings; one level-1 enemy barracks at x=2370. Clear that barracks or the enemy citadel within 3:00. Optional stars require a living barracks and a living archery range.
- `forked-road`: two roads at y=340 and y=560; 610 starting gold; no player buildings; one level-1 enemy barracks per road at x=2370. Clear both barracks or the enemy citadel within 3:30. Optional stars require a living troop-producing building on each road and at least 7.5 gold/sec.

Both maps are 3200×900 with the standard eight site columns per road. They are authored-scenario maps, not added to the skirmish map picker. Both scenarios pin `frontier-legacy@1` with scenario/map revision 1 and engine-save v3. The enemy cannot build, upgrade or cast. There are no free player actions, artificial reward grants, tech locks, changed costs or Rootwardens in these battles.

The one/two-road geometry and fixed-enemy teaching idea were reviewed in private source commit `7e76e79c2097f33406e272ad7e7eaf19db40388b`. No QA engine or crossing rule was copied. Flying crossings remain deferred.

## Joining the UI and saves

`intro-campaign.js` exports the new descriptors and live-state medal checks. `campaign.js` exposes:

- `ALL_CAMPAIGN_MISSIONS`, `ALL_CAMPAIGN_CHAPTERS`, `getCampaignMission(id)` for HUD/start/restore/catalog lookups.
- Existing `CAMPAIGN_MISSIONS` and `CAMPAIGN_CHAPTERS` retain their original contents and order.
- `getCampaignOverview().introduction` contains the optional chapter, mission records, next intro ID, completion, recommendation and separate star totals. The original overview fields keep their old meaning.
- Recommendation is true only while introductions are unfinished and no legacy mission has been cleared. First Watch is unlocked immediately; Forked Road requires First Watch. Emberwatch remains unlocked without either introduction.

All ordinary progress operations include intro records. They merge best stars and best times without overwriting historical records. Old profiles do not receive unearned intro stars. Entering the old campaign gives its full seven-building roster. Intro build-card reductions are advisory and the UI's **All buildings** escape remains immediate.

Medals describe the evidence actually evaluated: surviving buildings and current income, not an unsaved action ledger. If a player rushes the enemy citadel without a mine, the victory remains valid and the income star stays unearned. A destroyed or salvaged mine cannot earn that star. The result screen can offer replay without making it mandatory.

Original target IDs are derived from the same constructor and authored placement order used at creation. Save/restore and enemy replacement do not turn a new building into an original target. The shared battle codec checks the new scenario/rules/map pairing and campaign unlocks.

## Paid routes and observed limits

`node scripts/check-intro-campaign.mjs` records twelve short cases in `qa/intro-campaign-evidence.json`, including every successful command, cost and time. Decisions are five seconds apart with a ten-second reading delay. Every game is restored repeatedly from its actual snapshot.

| Route | Outcome | Time | Stars | Citadel HP |
| --- | --- | ---: | ---: | ---: |
| First Watch, barracks + archery | Win | 58.10 s | 3 | 6000 |
| First Watch, start at 30 s | Win | 78.50 s | 3 | 5937 |
| Forked Road, both roads + mine | Win | 97.90 s | 3 | 6000 |
| Forked Road, start at 30 s | Win | 112.40 s | 3 | 5622 |
| Forked Road, tower alternative | Win | 132.60 s | 3 | 6000 |
| Forked Road, no mine | Win | 87.80 s | 2 | 6000 |
| Forked Road, seed 999 and 30 s delay | Core victory | 165.45 s | 1 | 2073 |

First Watch's reference commands are barracks (970,450), archery (830,450), barracks (1110,450), then upgrade the first barracks. Forked Road first puts barracks at x=970 on both roads, then a northern mine at x=410, archery at x=830 on both roads, then upgrades both barracks. Commands wait for normal funds. The tower alternative uses a southern tower at x=1110 instead of the southern archery.

Idle and mines-only play fail both missions. First Watch idle reaches its deadline with 4950 HP; Forked Road idle loses its citadel at 108.30 s. These are gentle fixed openings, not proof that fewer roads make generic AI easy.

The authored seeds tolerate a 30-second reading delay. The additional seed-999 delayed route loses its northern production and mine, then wins through the southern road with one star. That is intentionally recorded rather than hidden or retuned away. The tests also check three seeds with the ordinary ten-second delay. This small scripted sample does not establish human difficulty.

## Compatibility and copy checks

`tests/intro-campaign.test.mjs` covers the two descriptors, original 16 mission semantics, optional progress, paid routes, missing-learning stars, failed strategies, stable targets, partial-accumulator restore and shared save admission. `tests/fixtures/campaign-v012-semantics.json` pins the original numeric/goal/prerequisite fields. Existing frozen simulation hashes are unchanged.

The approved campaign prose edits from `c4ae6842e70794310c6ea878b7dc6c03c46dad2b` change 38 presentation fields. `tests/fixtures/campaign-copy-approved.json` records only those reviewed before/after fields. The original snapshot test reverses that explicit presentation overlay before checking old metadata hashes; initial-state, simulation and evaluation hashes are not rewritten.

## Human review still needed

1. Fresh profile: start First Watch, notice the normal build-bar highlight, pay for a barracks, and understand that troops move automatically. Let the player read for 10–30 seconds before acting.
2. On a narrow screen, confirm Build opens the shared drawer, selecting a card returns to the battlefield, and the suggested site is visible without obscuring targets or the clock. Check keyboard/controller equivalents and cancellation.
3. Use **All buildings** immediately and win by another route. Verify no fake completed lesson message appears; missing stars are named and replay is optional.
4. Forked Road: ask the player to inspect both roads before buying a mine. Confirm they understand the income star and can choose a tower without being told it spawns troops.
5. Save mid-intro, leave, reload and resume; check original targets, highlights, remaining gold and later earned stars. Repeat after a target is destroyed.
6. Open a genuine old profile and an old active battle. Main-campaign progress, full roster and Resume must remain available without intro replay. Finish a two-star intro, Continue to the next mission, then replay it and verify best records stay intact.

The content worker did not perform browser/mobile/human play, change service-worker release metadata, publish, or modify original labs.
