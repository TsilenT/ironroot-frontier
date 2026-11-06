# 0.9 battlefield and font UI review

Reviewed 2026-11-06 UTC against the managed preview at `http://127.0.0.1:4173/`.
This was an independent, bounded browser review, not an implementation change or a balance sign-off.

## Result

**No blocking UI or map-state defect found in the exercised flows.** Both new maps started, rendered distinct geometry, accepted legal construction, rejected occupied placement without moving the purchase, navigated correctly and survived explicit save/return/reload/resume. The 320px codex Cooldown issue is visibly fixed.

Two nonblocking polish opportunities:

1. At 320×568, the battle HUD's map name and lane/site detail are extremely small. The two-line `TWO LANES · 16 SITES` detail fits, but is less comfortable to read than the selector and main counters. Preserve the working layout while considering a more legible compact treatment.
2. At 844×390, the build tray intentionally scrolls horizontally and the Aerie card is initially only partly visible, but its helper says `Choose a building, then place it in your territory.` It lacks the portrait layout's `Swipe for more buildings` hint. The visible scrollbar is an affordance; matching the helper to actual tray overflow would improve discoverability.

## Method and limits

- Existing Chromium tab 23 was verified from a fresh inventory, then used through documented native CUA accessibility and coordinate input only.
- No Playwright, DOM evaluation, browser-runtime instrumentation, shell browser automation, new server, import picker or implementation edits.
- Desktop browser content measured by the returned screenshot was 1180×757. The other reviewed viewports were 390×650, 320×568 and 844×390, using one temporary same-origin iframe fixture because the documented CUA API has no viewport setter.
- The fixture only chose iframe width/height and loaded the production page. It did not read or change game internals. It was removed after the review.
- Font appearance and UI fit were inspected visually. This does **not** independently prove loaded font-face identity, Font Loading API status, network request provenance, first-launch offline behavior or native packaged rendering.
- No physical phone, touch hardware, controller, screen reader or audio assessment is claimed.
- Browser interactions changed the preview's disposable local battle save. Existing campaign medals were not earned or changed during this pass. The last explicitly observed browser state was title/campaign selection with an Emberwatch save at 00:15.

## Bounded flow results

1. **Desktop picker and Long March start:** The disclosure exposes Classic, Long March and Twin Span with readable 3-road/24-site or 2-road/16-site labels and small plan previews. Long March start displays its correct HUD name and three roads. At home, the construction overlay has eight positions on each of the three roads, including the initial occupied barracks position: 24 positions per side. The crossing is visibly longer than Classic/Twin Span. Exact world width is an implementation/engine-test assertion, not measured by this UI-only review.
2. **Long March build and rejection:** Selecting Gold mine and clicking the existing middle-road barracks showed `Too close to another building.` without buying at a nearby site. A legal mine, forward barracks and archery range then appeared at the chosen positions. Income rose from +5/s to +7.5/s. Dragging while a building choice was active panned the terrain without an unintended extra purchase.
3. **Long March camera:** Drag moved the camera smoothly between sampled screenshots. Clicking the far-right minimap reached the enemy citadel, Home returned to the player citadel, and Front centered the combat area. The minimap viewport indicator followed these positions without a visible blank edge.
4. **Long March persistence:** Pause → Save & return to title → browser reload showed `RESUME LONG MARCH · 01:04`. Resume restored the LONG MARCH HUD, existing army/economy and battlefield. Selection reset to Classic after full reload while the resume label still identified the saved map correctly. An earlier preview reload, coincident with creating the temporary fixture, also recovered an autosave; the explicit save flow above was tested separately.
5. **390×650 picker/start:** The three map cards and labels fit in one row. Twin Span started with two visible roads and a usable HUD, minimap, controls, horizontally scrolling building tray and fixed Rally card. The selector/title panel scrolls vertically to its lower controls rather than clipping them permanently.
6. **390×650 font notices:** Preferences → Credits & font licenses opened. Complete Barlow and DM Sans license text was exposed in the accessibility tree. The inner notice pane wrapped long commit/URL text, scrolled to the final disclaimer and kept Back to the frontier accessible. Nested scrolling is functional, though less effortless than one long document.
7. **320×568 title and codex:** Opponent/map names wrap rather than overlap. Map descriptions, Start and Resume remain reachable through vertical scrolling. Field guide → Units & economy → Warrior visibly uses a single stat pair per row. `Cooldown` and `1.05 s` are fully readable, as are Health, Hit, Range, Speed and Repeat spawn. The credits pane also fits and wraps. Resuming Twin Span displayed the narrow battle HUD without page overflow; the tiny map-detail type is the polish note above.
8. **844×390 landscape:** Title/map selection scrolls vertically and preserves all choices and actions. Twin Span resume fits the short battle area, control buttons, minimap and tray. Preferences and credits also remain reachable and scrollable. No accidental whole-page horizontal overflow was seen; the build tray's intentional horizontal scroll is noted above.
9. **Twin Span geometry/build:** At desktop home view, there are exactly two roads and two bridges, with eight construction positions on each road (16 per side, including the occupied north-road starting barracks). Clicking that occupied barracks while placing a mine produced the same rejection. A legal mine, south-road barracks and archery range were built. Dragging panned without an accidental additional purchase. No invisible third road was observed.
10. **Twin Span navigation and persistence:** Far-right minimap reached the enemy citadel; Home returned correctly; Front targeted current battle positions. Pause → Save & return → reload displayed `RESUME TWIN SPAN · 01:02`. Resume restored TWIN SPAN, two lanes/16 sites, four units, +7.5/s and the 98% player-citadel state from that battle.
11. **Same-theme geometry refresh:** Without reloading the live page, a saved Twin Span battle was followed by a fresh Long March selection/start. The unchanged green theme correctly changed from two roads/bridges to three, and the river/crossing moved to the longer map geometry. This explicitly exercised Twin Span → Long March in the same renderer lifetime, not merely a new-page load.
12. **Return to Classic campaign and desktop credits:** From Long March, Campaign → Chapter 1 → Emberwatch started with its authored 460 gold, mission objective, three roads and Classic's shorter crossing in the same green theme. Desktop Preferences → Credits also wrapped and scrolled cleanly. The mission was paused and saved back to title after inspection.

## Game-feel impressions, not balance conclusions

Ordinary Outrider openings were sampled for approximately 1:04 on Long March and 1:06 on Twin Span, using real UI construction and no simulation shortcuts. Neither was played to victory/defeat. There was therefore no full-match balance experiment, late-game/overtime audit or difficulty comparison.

- Long March's larger neutral area is immediately readable and gives the opening waves more travel space. Front and the minimap are especially useful because home view does not show the enemy frontier.
- Twin Span makes the two fronts easier to parse. Pressure on an unattended lane became apparent during the sampled opening, and the AI visibly built and fought on both roads. This is a qualitative experience, not evidence that a particular opening or difficulty is fair.
- Construction feedback is prompt and specific. Occupied rejection leaves the intended selection active, which supports trying another deliberate site. Map selection stays compact enough not to dominate the main menu.
- Main typography, title treatment, buttons, gold/time counters and dense codex rows looked coherent with the bundled font design. No missing letters or obvious fallback mismatch was visible. Small secondary captions remain the principal legibility tradeoff.

## Remaining coverage

Full ordinary matches on both maps, exact map-width/site-validation engine assertions, reverse same-page Long March → Twin Span transition, all campaign/trial scenarios, every unit's expanded codex, offline/font-face/network verification and packaged/native/physical-device/controller checks were outside this bounded browser pass. The existing deterministic test and balance audit suites should remain the authority for numeric contracts and statistical claims.

## Targeted polish retest

A follow-up retest on 2026-11-06 used the same native CUA route and a temporary iframe with width/height buttons. It resized one live battle, rather than reloading for every size.

- **Overflow guidance resolved:** At 320×568 and 844×390, the build tray now says `Scroll for more buildings. Choose one, then tap a green slot.` Live resize to 1180×700, where all cards fit, changes it to `Choose a building, then place it in your territory.` Resizing back to 320×568 restores the scrolling hint. The helper therefore follows actual tested layout changes without requiring reload.
- **Selector captions pass:** The revised 10px lane/site captions on the map-selection cards fit at 320×568 (wrapped) and 844×390 (single line), with readable labels and no clipping.
- **Original battle-HUD legibility note remains:** The original first polish note referred to the in-battle center map label, not the selector cards. It still appears extremely small at 320px. Read-only stylesheet inspection confirms `.phase small` remains 5px under the narrowest media rule; the 10px change is to `.map-choices small`. This is a nonblocking polish item, not a functional regression.
- Temporary fixture removed again after this retest. No implementation change was made by the reviewer. No other flows were repeated or claimed.

## Final in-battle HUD retest

The intended battle-HUD typography correction was then checked visually at 320×568 and 844×390 on 2026-11-06, using native CUA and a temporary live-resize iframe only.

**The remaining HUD legibility note is resolved for the tested layouts.** Twin Span's enlarged heading and lane/site subtitle fit between both citadel HP panels. At 320px the subtitle wraps naturally across two lines; at 844px it stays on one line. No collision with either HP panel or the control buttons was visible.

Wings of Ash was used as the campaign sample. At 320px its title wraps as `WINGS OF` / `ASH`, with `CAMPAIGN` beneath; the header stays above the objective strip with visible separation. The objective count/timer and adjacent pause controls remain distinct. At 844×390 the title, campaign subtitle, left-side objective strip, HP panels and horizontal controls all fit without overlap. This specifically checks a multiword campaign title, not just Emberwatch.

No other gameplay, balance, font-loading or platform claims are added by this final check. The fixture was removed after verification and the runtime freeze released. Both originally reported polish items now have passing targeted visual checks.

## Full-match follow-up: Long March center-only barracks rush

### Result and scope

One complete ordinary UI-mediated game on the unchanged 0.9 baseline ended in **DEFEAT at 01:59**, verified through Preferences → Recent battles (`DEFEAT · Skirmish · Long March · 01:59`). The selected opponent was **Hard / The Warlord**. The parent assignment's `Iron Marshal` label was stale; the current selector's `data-difficulty="hard"` mapping was verified with read-only source inspection before play, and the live battle header showed THE WARLORD.

This was a single native-CUA-driven match with normal purchase/input delays, not a frame-perfect simulation and not a human-subject study. It does **not** invalidate the independent scripted center-rush finding or establish balance. It records how one ordinary, delayed execution differed.

### Rules actually followed

- Desktop, same managed preview and disposable local profile; existing progress was not cleared.
- **1× throughout**, with no pause, reload, import, storage manipulation, engine instrumentation or artificial advancement.
- All seven paid buildings were middle-road barracks, filling the road front-to-back around its free starting barracks. Total paid construction: 980 gold; eight barracks on the middle road including the starter.
- No mines, other production, towers or Rally; no survival deviation.
- No upgrades were purchased. The final middle-road site was filled at the last observed 01:50 checkpoint, when only 53 gold remained, and the match ended nine displayed seconds later.
- Home, Front and minimap were used to move between home construction and enemy-side observation. No build placement was rejected and no unintended building was observed.

### Observed timeline

Times below are the displayed battle-clock checkpoints at which each resulting state was observed. They are not exact individual click timestamps.

| Displayed time | Action/state | Player citadel | Enemy citadel |
| --- | --- | ---: | ---: |
| 00:00 | Started Long March / The Warlord with 420 starting gold and the free middle barracks. | 100% | 100% |
| 00:08 | Selected Barracks and inspected the site overlay. | 100% | 100% |
| 00:18 | Three new middle barracks were complete at the three forwardmost available sites, approximately world x=1250, 1110 and 970. | 100% | 100% |
| 00:29 | 10 troops, 149 gold; used Front to inspect the early push. | 100% | 100% |
| 00:42 | Fourth paid middle barracks completed, approximately x=830. Flank units had reached the player citadel. | 99% | 100% |
| 00:59 | 20 troops, 187 gold; selected the next barracks. | 91% | 100% |
| 01:06 | Fifth paid middle barracks completed, approximately x=690. Enemy-side view showed the push attacking forward center production and an enemy center sanctum. | 84% | 100% |
| 01:21 | 26 troops, 172 gold; selected the next barracks. | 65% | 100% |
| 01:28 | Sixth paid middle barracks completed, approximately x=550. Enemy forward middle barracks/sanctum were gone; the push was advancing toward the rear middle barracks. | 53% | 100% |
| 01:41 | 41 troops, 148 gold. Returned Home to use the final empty middle site. | 27% | 94% |
| 01:50 | Seventh paid middle barracks completed at the remaining rear site, approximately x=270. All eight middle positions were occupied; 46 troops, 53 gold. | 9% | 65% |
| 01:59 | Defeat, recorded in Recent battles. Exact final enemy HP was not captured. | Defeated | Not captured |

Approximate world positions describe the observed site order using the already reviewed map contract, not browser instrumentation. The first three purchases occurred between the 00:08 and 00:18 observations. Subsequent spending was not instant when gold first became affordable: camera changes, state observations and ordinary tool/input latency introduced delays. This is a meaningful difference from a scripted zero-delay opening.

### What this game shows

The middle concentration eventually broke the enemy center defenses and began damaging its citadel, while unattended top/bottom waves steadily damaged the player citadel first. The visible tradeoff sharpened from 84% versus 100% at 01:06 to 9% versus 65% at 01:50. The side-lane damage won the race before the center army could finish. No claim is made about what would have happened with earlier purchases, a different seed, upgrades, Rally or a different opening.

The desktop view remained readable. Home made repeat construction easy; the minimap's far-right jump exposed enemy production and the approaching push. The global Front command did not always frame the furthest advancing center troops because the other lanes were moving in the opposite direction, so the minimap was more useful for following this asymmetric strategy. That is a game-feel observation, not a camera malfunction.

### Result-screen caveat

After the 01:50 observation, a planned minimap coordinate click occurred while the match was ending. The next returned state was already the title screen, so the result overlay and its detailed statistics were not captured. The subsequent Recent battles entry independently confirmed defeat and the 01:59 duration. The click may have dismissed the result screen during the transition; it is not evidence of a game defect. No exact final enemy HP or unobserved result statistics are inferred.

The full match completed without blocking tools or an implementation change. Runtime freeze released after the result was verified. No second match or survival-variation test was attempted.
