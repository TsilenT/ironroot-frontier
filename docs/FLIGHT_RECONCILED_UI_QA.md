# Reconciled flight UI: native-browser QA

2026-11-07. Local-only review, v0.16.0. No runtime source edits, publishing or commits.

## Result

The bounded requested UI pass succeeded without a renderer crash. Actual paid construction during Wings teaching, three flight orders, keyboard activation, four viewport layouts, saved-battle reload, live warning/transit Pause text, Roadside Watch scout naming and mobile campaign browser Back were exercised. No confirmed new blocker was found. This is not exhaustive flight visual, physical-device or accessibility certification.

## Isolation and reproducibility

Private fixture: `/workspace/shared/ironroot-flight-reconciled-preview`. Runtime copied from the reconciled `dist` into this NEW directory, original index retained as `dist/game.html`. Fixture adapted from prior private review. Frozen-clock checkbox defaults OFF and remained off throughout. Only the explicitly labeled **Synthetic campaign unlocked** fixture was used. Its pre-completed prerequisite progress is synthetic; all purchases, flight orders and subsequent simulation below used normal application UI and engine behavior.

Iframe localStorage and sessionStorage are parent-owned in-memory Maps, installed before application startup. Shared localStorage was read only, never cleared or seeded. Supported `sites-preview start` returned `http://127.0.0.1:4173/`; new review tab 72 used that exact URL. No production tabs, shell Chromium, separate server, browser restart or security setting changes.

Shared storage SHA-256 before and after the full pass:

`a9c9b81a8ab25736ac9d1117cbcba27443990d65d2111088b2d3d4d801ae1104`

Every completed measurement reported memoryStorage true and allSharedKeysExact true; final Verify after both browser Back actions returned exact equality.

Snapshot hashes:

- game.html: `8fb61de1cd216f342daa4a114d5c6b6fb20ad2ceb6cdd38d79c246e51564cc1f`
- app.js: `f21c6e541ab0f8c6cc17ae782a6f714940207f2b757976fd0daf7ac3b3af7c56`
- styles.css: `13f15faa0921467f6e280de4b4c3c49379449bdc7d8a2e4a689d76fe66d17753`
- engine.js: `548f1b67763e710aad5d1e1a7e70a1e39c4d93eddd3b47daf68a2b385b823168`
- campaign.js: `56f4a2d7bf50a316a60274dde63ffb1501ab89c36937612fbb25e2f3c13456eb`
- flight-orders-view.js: `8024be77be159d9c81260c4e9d45a9363a92673cd866741db5a50d31976857e8`
- flight-visuals.js: `880521372f56cd8c687bd037e7b5cfeefef96b1db1115c3ae58f36f489ac142f`

## Actual teaching and purchase

At 390×650, BEGIN MISSION opened Wings of Ash's real “Take control of the sky” teaching dialog. It explains adjacent-road orders, two-second warning, no attacks while crossing, future-only orders and paid planning. Build while paused opened planning at 550 gold and 00:00. Ordinary Build → Gryphon aerie → visible middle-road site purchased one aerie for 250. Gold became 300 and clock stayed 00:00. Selecting the actual canvas building opened its inspector, initially “Next launch: hold middle road.”

North click updated the order. South Enter updated it; Hold Enter returned it to hold; subsequent South Enter set the saved destination. Hold retained actual focus and `rgb(255, 244, 201) solid 3px` outline. No hidden runtime state was altered for this sequence.

## Responsive inspector and controls

All sizes were real CSS-pixel iframe viewports, not physical-device emulation. Resizing dismissed selection, then the same visible purchased aerie was reselected by native canvas click. North/Hold/South were each activated successfully with Enter at each remaining size.

| Viewport | Order target widths | Heights | Game document |
| --- | --- | --- | --- |
| 390×650 | 104.33 / 104.34 / 104.33 | 44 | 390×650 |
| 320×430 | 46.33 / 46.34 / 46.33 | 46 | 320×430 |
| 844×390 | 162.66 / 162.67 / 162.67 | 44 | 844×390 |
| 1200×700 | 80.33 / 80.34 / 80.33 | 44 | 1200×700 |

All three controls meet 44×44 and were actually reachable. No game document overflow occurred. Outer QA host page scrolls because it contains the iframe plus diagnostic report; this is not game overflow.

- 390: teaching reserves 88px; drawer is 338px high and scrolls slightly (364 scrollHeight / 337 clientHeight). Help text and order controls fit after normal focus scrolling. Close target 44×44.
- 320: released compact protected side rail remained visible, no screen-size safety modal. Drawer is 216×294 with 524 scrollHeight / 293 clientHeight. Inspector needs substantial vertical scrolling; after order activation scrollTop 148, upper title/close are above the clipped drawer viewport. Close was successfully reached via keyboard activation, which scrolls it into view, returning the Open building controls button. This is a scrollable inspector, not an all-at-once fit claim. Exhaustive touch/scroll QA remains unperformed.
- 844: drawer 568×313.39 with scrollHeight equal clientHeight (312), order row and 44×44 close fit. Closing via actual click succeeded.
- Desktop: inspector 300×230.20 bounded scroll panel (363 scrollHeight / 228 clientHeight). Order buttons reachable; close via Enter succeeded. The 1200px iframe is wider than the host browser screenshot viewport, so screenshots show part of the desktop; DOM geometry verifies complete game dimensions.

## Save, reload and ordinary live flight

Opened options from teaching, closed options and returned to planning with focus on Open options. Started battle, then used normal Pause at 00:03 → Save & return to title. Clicked fixture Reload retained memory (recreates app with same isolated Maps), then actual RESUME MISSION · WINGS OF ASH · 00:03. No teaching replay appeared. Paused after resumption at time 6.15.

The rendered fixture report of normal app checkpoint showed campaign revision 3, frontier-campaign-flight, own aerie id6 / lane1 / plan2, alongside enemy aeries. Thus actual paid construction and south order survived save/reload. A gryphon id10 had warning route from1/to2, remaining1.65. This checkpoint was produced by ordinary play, not a phase seed.

Expanded real Pause **Air routes** read:

“Your 1 gryphon: Middle road to South road. Next crossing starts in 1.7 seconds.”

After Resume and a screenshot, Pause at 00:09 read:

“Your 1 gryphon: Middle road to South road. Crossing now; cannot attack.”

Both included “Select an aerie after resuming to change future launches.” The live battlefield screenshot showed a cyan own-unit AIR directional banner and cyan minimap signal, with the objective panel separately above. This demonstrates rendered transit signals in ordinary play at desktop, not a full crowded-signal or all-viewport animation pass. No frozen clock or further authored checkpoint was needed.

## Scout naming and mobile Back

Saved and returned to title, resized to 390×650, opened Story → The Road to Emberwatch → Roadside Watch. Expanded scout summary actually read **Scout battlefield · Roadside Watch**. Image accessible name started **Roadside Watch: starting deployment**. Its map descriptor still properly says First Watch (map name), distinct from mission title.

Actual browser Back from mission returned to the chapter (“Build the company” focused); another actual browser Back returned to “The Ironroot Campaign”. Saved Wings resume remained available throughout. Escape on mission heading did not navigate; no Escape-as-Back claim is made.

## Evidence and limits

Screenshots captured inline in the CUA review transcript: aerie placement, narrow side-rail view, landscape, desktop, expanded warning Pause, live transit world/minimap. They were not exported as local files. Read-only DOM measurements and fixture report supplement, rather than replace, observed UI actions.

No renderer failure occurred. A getByLabel exact selector mismatch on the outer fixture was resolved from a fresh DOM snapshot using observed IDs; no browser recovery/reset was needed.

Still outside this bounded pass: physical phone touch, complete native Tab traversal/focus trap or screen-reader audit, all-size warning/transit/crowded-banner readability, reduced-motion comparison, outer-road option hiding, mixed grouped routes, full Stonegate teaching, and broad campaign balance. Passing this report does not close those broader gates. Later runtime changes should be checked against the snapshot hashes and retested where relevant.
