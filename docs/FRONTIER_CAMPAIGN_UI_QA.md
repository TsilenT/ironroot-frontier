# Frontier campaign UI and ordinary-play review

Date: 2026-11-06. Build: isolated Ironroot v0.10 preview, before the four follow-up clarity fixes. This is a native Chromium/CUA review, not the separate cloud-browser matrix.

## Result

The fifth chapter, four new mission briefings, optional scouting, earned branch unlock, ordinary save/resume, and tested responsive layouts work. One Open Horizon completion was earned through ordinary paid game controls after two failures. River Charter was played to a failure, not completed. The sample is useful for discoverability and game feel; it is not a balance proof.

Four actionable clarity findings were reported to the parent and accepted for follow-up:

1. Building detail displays expose floating-point maximum HP, for example `980 / 979.9999999999999` on the level-2 protected barracks and `910 / 909.9999999999999` on a level-2 foundry.
2. After browser reload, the title defaults to the Skirmish selector while the saved campaign button says only `Resume mission · 01:09`. Resume itself correctly restores Open Horizon. Including the mission name would make the distinction clear.
3. At narrow widths, the horizontal chapter strip initially shows Chapters 1–2 while Chapter 5's selected content is displayed. The active chapter should be brought into view.
4. Open Horizon's hint should call out the supplied mine and forward middle-lane anti-air/defense before expansion. Two plausible openings lost the protected barracks despite a healthy citadel. An early forward watchtower stabilized the successful third attempt.

These are pre-fix observations. The targeted clarity-fix retest below records what was subsequently verified; it does not replace the separate full cloud/browser matrix.

## Method and isolation

- Exact served game URL: `http://127.0.0.1:4173/`, backed by `/workspace/shared/ironroot-v010`.
- Read current CUA documentation and checked tab inventory. Closed the one obsolete localhost game tab before setup. Did not alter the other new-tab or cloud-thread tabs.
- All game/navigation input was through the documented native CUA Chromium window, using visible screenshots and ordinary clicks, keys, and scroll. Native accessibility exposed only the x11 window, not page elements.
- No Playwright, DOM/runtime instrumentation, DevTools, route interception, engine mutation, injected battle actions, or file-picker/import retry.
- A labeled developer setup page retained the original five save domains in same-tab session storage. Its only synthetic achievement input was the first 12 campaign clears needed to expose Chapter 5. Those clears were fixtures, not earned victories. No live-battle advantage was injected.
- The same tab was used throughout. The temporary responsive page only resized an ordinary iframe containing the game; it did not inspect or modify game internals.
- Original v0.9 and the public site were not modified.

## New chapter and briefing review

The title shows Campaign 16 and v0.10. The initial synthetic profile showed 12/16 missions and 36/48 stars, with four earlier chapters at 9/9 and The Open Frontier at 0/12.

All four new mission cards were selectable for reading, including locked missions. Locked cards retained their briefing, scouting and hint while the primary action correctly said Mission Locked. Requirements were explicit:

- Open Horizon: ready after the synthetic earlier campaign clears. Long March, 4,000 × 900 world units, 3 roads, 24 building sites per side. Destroy both marked middle-lane toll towers within 4:00 and preserve the starting barracks. An enemy-citadel win still requires the barracks. Scouting showed 3 allied and 7 enemy starting buildings, 1 protected ally and 2 destruction targets. The shield and dashed rings identified the same structures described in the text.
- The River Charter: requires Open Horizon. Twin Span, 3,200 × 900, 2 roads, 16 sites per side. Preserve both marked watchtowers and reach 17.5 gold/sec at 3:30; early enemy-citadel victory still requires both towers. Scouting showed 5 allied and 6 enemy buildings, 2 protections and no destruction targets. North siege and south gryphon pressure were correctly disclosed.
- The Far Beacons: requires Open Horizon. Long March, 4,000 × 900, 3 roads, 24 sites. Destroy the two outer-lane mines and hold to 3:10 within the 4:40 deadline with at least 2,000 citadel HP; alternate citadel victory still requires that HP. Scouting showed 5 allied and 11 enemy starting buildings, no protected structure and 2 targets on the outer roads. The HP failure condition was explicit.
- Common Ground: requires both The River Charter and The Far Beacons. Twin Span, 3,200 × 900, 2 roads, 16 sites. Destroy the northern foundry and southern sanctum within 5:00 while preserving the starting northern mine and southern barracks. The alternate citadel route still requires both protections. Scouting showed 5 allied and 7 enemy starting buildings, 2 protections and 2 destruction targets. Its adaptive paid enemy, unlike the other three fixed deployments, was explicitly described.

The diagram legend distinguishes allied squares, enemy diamonds, protected shield outlines, and destruction rings. The text says symbols are enlarged and that the view is a starting deployment, not a battle prediction. The paired roster cards give names, levels, roads and objective annotations, so the diagram is not the only source of meaning.

## Scouting availability across all 16 missions

Opened the report/roster for every mission through the ordinary campaign UI:

- Emberwatch; Three Roads; Winter Stores.
- Wings of Ash; Stonegate; The Long Vigil.
- The Cold Forge; The Black Ledger; Heart of the Furnace.
- A Foothold in Iron; The Last Light; Ironroot.
- Open Horizon; The River Charter; The Far Beacons; Common Ground.

Reports remained optional. The disclosure defaulted closed after a fresh app load, and its open state was usefully preserved while switching missions during a session. Legacy roster text included the relevant protection/destruction annotations and road-level inventories. This was UI availability and text review only; none of the 12 old missions was played in this pass.

A suspected Black Ledger level mismatch was retracted after revisiting the exact card: both its aggregate and Middle road roster say Watchtower level 1. The first small screenshot digit was misread. A separate read-only source/factory audit also found them consistent. No scouting runtime fix was warranted. Future small-text discrepancy checks should use visible zoom before escalation.

## Ordinary Open Horizon play

All three attempts used 1× speed. Pausing to plan was used. No 2× play was performed.

### Attempt 1: failure at 1:37

Bought two additional mines, archery ranges on both outer roads, a middle foundry, upgrades, a later forward middle range and a paid rally strike. The early foundry and forward range were overwhelmed by the middle gryphons; the protected barracks then fell. Result explicitly said `Open Horizon: Keep the relief barracks alive: failed.` It awarded zero stars, with 27 enemies felled and 9 buildings raised. No marked tower had been destroyed.

### Attempt 2: failure at 1:20

Retried through the visible Retry Mission button. Built three-mine economy, two level-3 middle archery ranges behind the protected barracks, outer level-2 ranges, and later a barracks upgrade/strike. The outer lanes held better than the center, but the barracks still fell. Result was zero stars, 23 enemies felled and 8 buildings raised. This showed that nominal anti-air quantity behind the objective was not enough to make that opening safe.

### Attempt 3: victory at 3:55

Independently changed the opening to a watchtower ahead of the barracks on the middle road, upgraded it to level 3, built outer ranges and developed economy while it held. Added the middle foundry behind the tower at roughly 1:38 and upgraded it to level 3, then improved the archer/warrior escort. Used the minimap to follow the assault and paid rally strikes at the marked towers.

The parent supplied an additional player-facing tactical hint at about 2:00 of this attempt: the existing mine already provides 7.5 gold/sec total income; prioritize forward middle anti-air/screen before more mines or expensive upgrades. That hint arrived after the independently chosen forward tower had stabilized the defense, but it was received and must not be omitted from the assisted-review context.

The first target was visibly gone by 3:22. The second fell at 3:55, before the 4:00 deadline. Victory was the authored two-tower destruction route, not an enemy-citadel kill. The protected barracks survived and the citadel stayed at its starting 87% display. Result: 2 stars, 120 enemies felled, 9 buildings raised. The speed condition `Win in 3:20 or less` was unchecked; `Keep at least 4,200 citadel HP` was checked.

Continue Campaign correctly showed 13/16 missions and 38/48 stars, Open Horizon with two stars, River Charter and Far Beacons both Ready to Play, and Common Ground still locked. The result made the parallel branch unlock understandable.

### Game-feel findings

- The protected-objective failure remains meaningful even when the citadel is safe. Failure and retry were clear and immediate.
- The successful long-road push had a legible buildup, then a close deadline finish. The minimap was important for moving between home defense and the remote objective.
- The tower screen changed the outcome much more than early economic expansion or simply maxing rear archers. The original hint did not make that placement lesson explicit enough for this reviewer.
- Short confirmation toasts repeatedly overlap the compact objective strip during active building/upgrading. They disappear, and the objective is recoverable, but frequent spending briefly obscures progress/time information.
- The last tower assault was tense and readable at desktop scale. These three runs do not establish a difficulty curve, optimal build, or balance across all campaign missions.

## River Charter play sample

One ordinary 1× attempt reached failure at 1:03. Built two extra mines and a northern aerie ahead of the protected watchtower, upgraded the aerie to level 3, and upgraded the southern starting archery range to level 3. Northern siege destroyed the forward aerie, then a protected watchpost was lost. The failure screen correctly named the watchpost protection condition, awarded zero stars, and showed 23 enemies felled and 8 buildings raised.

This is a useful failed placement/counter sample, not a River Charter completion or balance conclusion. No Far Beacons or Common Ground battle was played in this pass.

## Save, title, reload and profile behavior

- During the first Open Horizon attempt, paused at 1:09 with 262 gold, 12.5 gold/sec and 5 army, selected Save & return to title, and saw Resume mission · 01:09.
- Reloading through the browser returned to the normal title with a Resume mission button. Pressing it restored Open Horizon, Long March, its objective/deployment and economy, with the clock advancing normally to 1:10. The title selector defaulting to Skirmish did not convert the saved mission into a skirmish.
- The saved profile continued to accept new campaign progress and recent battle history. Preferences → Recent battles visibly recorded River Charter defeat 01:03, Open Horizon victory 03:55, and both Open Horizon defeats 01:20 and 01:37.
- The ordinary backup disclosure remained reachable and clearly explained which local data import replaces. No export/import or file-picker sequence was attempted here.
- The setup and restoration pages explicitly reported protocol 2. An old-version writer fence was not exercised in the browser; that remains separate from this visible save/resume pass and the source tests.

## Responsive and keyboard review

Tested native desktop Chromium (window inventory 1212 × 886), plus explicitly sized iframe content viewports 320 × 568, 390 × 650, 844 × 390, and 1120 × 700. These are desktop mouse/keyboard observations, not actual phone/touch-device coverage.

- 320 × 568: campaign cards wrap to two columns, chapter strip scrolls horizontally, briefing/scouting scroll vertically, and the primary Begin/Locked action stays pinned and reachable. Roster cards stack into one column. The diagram is necessarily small, but the full text legend and road descriptions remain available.
- 390 × 650: the four new mission cards fit in a readable two-by-two grid. Long March scouting, objective counts and stacked roster cards remained within the content area without horizontal clipping.
- 844 × 390: condensed title/navigation leaves the main panel available; all five chapters and four new missions span the width. Scouting scrolls above the pinned action without covering it.
- 1120 × 700/native desktop: the paired roster cards, larger schematic and mission briefings were readable. Long reports require deliberate scrolling; no control was stranded below an inaccessible edge.
- Space closed a focused scouting summary and produced a visible focus outline. Enter reopened it. Tab moved to Commander’s hint; Enter opened the hint; Tab reached Begin Mission with a visible focus ring. The expanded text scrolled into view as focus advanced. No keyboard trap was observed in this tested sequence.
- Active chapter offscreen in the narrow strip is the outstanding navigation clarity finding above.

Not covered: actual touch pointer delivery, held-touch release on Retry, physical controller input, audio listening, screen-reader semantics, every keyboard route, full accessibility audit, all new mission wins, or the full cloud/browser/device matrix.

## Restoration and cleanup

Returned in the same tab to the explicit developer profile page and clicked Restore the retained original saves. The visible result was:

> Original five save domains restored and byte-verified. Protocol2 is retained. The game can now be reopened; no synthetic chapter-five progress remains unless it was present in the original profile.

This restoration was observed before removing the setup file. The temporary profile and responsive fixture HTML files were then removed from isolated dist. The stable review window was released to the parent for the accepted clarity fixes. No review-earned or synthetic campaign progress was intentionally left in the original profile.

## Targeted clarity-fix retest

The parent applied the four accepted clarity changes and supplied a new retain-only profile fixture. Retain visibly reported that the original five save domains were retained and byte-verified without changing local game data. No synthetic wins were created during this retest. The restored original campaign contained 3/16 clears and 9/48 stars.

Verified through the same native CUA method:

- On initial Campaign entry at 320 pixels, the original profile's active Chapter 2 was in view. Manually selected the readable but locked Chapter 5, switched to Skirmish and back to Campaign, and confirmed Chapter 5 remained visible at 320 pixels. It also remained visible at 390 pixels, after selecting Common Ground, through 844-pixel landscape, and after returning to 320 pixels. No synthetic Chapter-5 progress was needed.
- The revised Open Horizon hint visibly says the starting mine already brings income to 7.5 gold/sec, recommends a forward middle watchtower and archers ahead of the marked barracks before more mines, then describes screened siege and outer archers.
- Started a short ordinary Emberwatch replay and bought real upgrades. Level-2 Barracks displayed `980 / 980`; level-2 Siege foundry displayed `910 / 910`. No floating maximum-HP digits remained in these tested details. Stopped at 00:48, before any outcome.
- Save & return to title showed `Resume mission · Emberwatch · 00:48`. The name/time fit at 320 × 568 and 844 × 390 without clipping.
- Started a disposable Shieldbreaker field trial, paused at 00:09, and saved. The button correctly said `Resume trial · Shieldbreaker · 00:09`. It fit at 844 × 390 and wrapped cleanly over two lines at 320 × 568.

The runtime window was released for the parent's separate toast-placement adjustment. At that checkpoint the original profile remained retained for the final bounded visual check.

## Final toast-position retest and cleanup

Reloaded the revised runtime and used an ordinary Winter Stores start, whose income/protection/time HUD is longer than a simple target counter. Checked both initial objective text and paid Barracks-build confirmations:

- Native desktop: the objective counter and remaining time stayed fully visible above the confirmation, with a clear gap.
- 320 × 568: the objective wrapped to two lines. The build confirmation was positioned below the entire wrapped HUD, not over its second line. Its text remained within the viewport.
- 844 × 390: both the initial objective toast and a paid-build confirmation sat below the objective strip; the strip remained readable and the right-side controls were accessible.

These were disposable layout checks, not additional balance runs. Winter Stores was not defended as a complete tactical attempt; it reached a protected-mine failure while the responsive checks continued and was retried for the final landscape build check. No new campaign completion was earned. The confirmation still uses battlefield space, but the previously observed objective/time occlusion was resolved in all three tested sizes.

Returned to the retain-only fixture in the same tab, clicked Restore, and visibly received:

> Original five save domains restored and byte-verified. Protocol 2 is retained. No synthetic progress was created by this fixture.

Both temporary fixture files were removed again after that observed restoration. All requested targeted clarity checks are complete. No confirmed blocking issue remains from this native UI pass. Full cloud-browser matrix, true touch/controller/audio coverage, and the other play/balance limits above remain explicitly unverified by this review.
