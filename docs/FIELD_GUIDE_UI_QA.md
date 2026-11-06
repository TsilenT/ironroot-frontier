# v0.8 field guide and Normal skirmish UI review

Date: 2026-11-06. Independent review of the managed Chromium preview. The reviewer did not edit runtime sources.

## Field guide

Verified on desktop (1180 × 757) and CSS-sized iframe viewports at 390 × 650, 320 × 568 and 844 × 390:

- Units & economy expands through native summary controls. The five portraits are distinct, match the game's visual language, and remain within their cards. Warrior, archer, siege ram, wizard and gryphon stats/counters, the two support cards, and the economy reference are exposed to the accessibility tree.
- Cards use a single column on portrait phones and two columns on desktop/landscape. Long descriptions remain scrollable. There was no page-width overflow at 320 or 844 pixels. The bottom Ready action remains reachable.
- Space expands both the overall reference and individual disclosures. Focus is visibly outlined. Tab from Ready wraps to Close, Escape exits, and Ready works with Enter.
- Opening the guide from a paused battle, expanding a unit and escaping returns to PAUSED without advancing the battle clock. Resume subsequently restores normal play.
- The reference appropriately distinguishes baseline statistics and nominal intervals from guaranteed combat outcomes. Mine payback is explicitly labeled a best case, with opportunity cost and destruction caveats.

One low-severity readability issue was reported: at 320 pixels, the two-column stats grid breaks “Cooldown” into a word fragment and a lone final letter. The builder queued a one-column grid at ≤360 pixels, rather than shrinking the text. This report will identify any later retest separately.

These are real browser pointer/keyboard tests at CSS viewport sizes, not physical touch, mobile browser or controller hardware testing. Import controls were not touched.

## Ordinary Normal skirmish play

Two human-directed openings are being sampled through ordinary UI, with no state injection or perfect-policy simulation. Differences in timing and AI decisions prevent a controlled balance comparison.

### Mixed production opening

- Added a center Barracks and Archery around 00:09, lower Barracks around 00:17, and a late upper Barracks around 00:43. Added lower Archery around 01:10 and upper Archery around 01:48. The free rear Barracks remained active.
- Early three-lane AI pressure forced a choice between supporting the center push and covering leaks. The upper leak cost only 2% citadel health and was recoverable.
- Warrior/archer support broke the center tower. At 01:48 the player's citadel was 98%, enemy 55%, with no mines or Rally. One center Barracks upgrade was added late, around 02:08.
- Recent battles recorded VICTORY · Skirmish · 02:13. Play was at 1× until 01:20, then 1.5×. The final result panel was not fully inspected because a late intended minimap click landed during the result transition and returned to title; the history confirms the outcome.
- Qualitatively, the opening allowed recovery and visible momentum. This single win does not establish overall difficulty or balance.

### Screened one-mine opening

- Added a forward center Barracks and rear center mine at the start, then center Archery at 00:21. Deliberately ordinary, imperfect play included delayed upper-lane coverage: Barracks and Archery around 01:11.
- The AI chose a center wizard composition rather than the first game's tower. Its splash stopped the center advance and damaged the forward Barracks. At 01:11 the player's citadel was 97%, enemy 100%.
- Added Aerie at 01:32, used Rally at 01:40, upgraded the damaged center Barracks around 01:55, and added Sanctum around 02:26. The mine's +2.5/s was visible in the HUD and supported these responses, while spending decisions still mattered.
- Stopped and saved at 02:47 to keep the review bounded: player citadel 96%, enemy 100%, 17 troops, 360 gold and +7.5/s income. The mine remained intact and the center was holding, while the upper line advanced. Play was 1× until 01:55, then 1.5×. No win/loss result is claimed for this run.
- Qualitatively, the one-mine investment was viable behind a screen and did not guarantee victory. The changed enemy composition made the match feel different and required counterplay. Slower input, delayed spending and different AI choices make the two runs unsuitable for measuring the mine's relative strength.

## Independent automated checks

The independent run passed 257 tests, with zero failures, skips or TODOs. All JavaScript modules parsed. Log: `/tmp/ironroot-qa-v08-tests.txt`.

## Cleanup and limits

The responsive fixture was removed from `dist` before skirmish play. No import attempt, browser storage mutation or synthetic hardware claim was made. The browser is on the normal title page with “Resume battle · 02:47.” The runtime freeze was released to the builder. No new blocking UI issue was observed.

A non-blocking game-feel opportunity: Follow frontline tended to center on the broader army rather than the winning group attacking the distant citadel, so the finishing action could remain offscreen. Manual minimap navigation remains available. This is a framing preference, not a verified camera malfunction.

A late intended minimap click in the first run coincided with the result transition and returned to title. The precise event ordering was not captured, so this is not reported as a reproduced same-gesture click-through bug; a future automated transition-input guard test would be useful if not already covered.
