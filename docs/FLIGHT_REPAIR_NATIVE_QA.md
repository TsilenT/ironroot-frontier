# Flight layout repairs: bounded native review

Date: 2026-11-07 UTC. Independent local-only review of the held next candidate. No runtime changes, production interaction, publication, upload, or commit was performed.

## Result

The three reported defects passed their bounded native retests:

- North is fully inside the 320×430 inspector after ordinary nearest-edge scrolling and focus.
- At 320×568, the initial Pause view includes the collapsed Air routes disclosure and every primary action, including Restart. Keyboard boundary wrapping and Resume work.
- Selected-aerie NEXT no longer covers the committed warning/transit labels in the tested close-source 390×650 portrait and 844×390 landscape scenes.

Actual paid campaign construction, native flight orders, ordinary production and live transit were also exercised. The stable close-source visual checkpoints are explicitly geometry evidence, not gameplay or balance proof. No new defect or browser crash was observed within this scope.

## Frozen source

The parent froze runtime before preview creation. SHA-256 values:

| File | SHA-256 |
| --- | --- |
| styles.css | `1fe8c072007e667c3498143c27e03608ee10c97a391b5d0774c7dcbf0ec142dd` |
| app.js | `f4ca172dac45bf1c85556041bce4e19cd27e17f21136f189320b82ace058232c` |
| index.html | `b5d4584af9bf44ea7979557d87063233f848a5bf7574dbada22a6ffd110f1ddc` |
| engine.js | `548f1b67763e710aad5d1e1a7e70a1e39c4d93eddd3b47daf68a2b385b823168` |
| flight-visuals.js | `216031a0e08f0ade9d61b81c3372d4a0c8a7f2619b1c2d830f6fc06b6bbe04d6` |

The preview used unchanged copies of runtime files, with original index.html served inside the isolated iframe as game.html. A final byte comparison covered all 49 dist files and found zero mismatches. QA wrapper/instrumentation files existed only in the temporary external preview.

## Initial Pause and keyboard: 320×568

Started ordinary Skirmish from an empty in-memory profile and used the real Pause action. The Air routes disclosure was visible and collapsed. Before any modal scrolling, the menu had scrollTop 0 and bounds x16, y16, width 288, height 536, bottom 552. Its clientHeight was 534 and scrollHeight 536; the small overflow did not hide a primary action.

| Control | Top | Bottom | Height |
| --- | ---: | ---: | ---: |
| Resume | 212.578125 | 256.578125 | 44 |
| Options | 264.578125 | 335.578125 | 71 |
| Field guide | 264.578125 | 335.578125 | 71 |
| Air routes disclosure | 343.578125 | 389.578125 | 46 |
| Save & return to title | 440.765625 | 484.765625 | 44 |
| Restart | 492.765625 | 536.765625 | 44 |

All primary action horizontal bounds were within x35–270. The prior Restart bottom 586.765625 is now 536.765625, within the actual 568px viewport without a tolerance exception. Native screenshot confirmed all labels and controls.

Native Shift+Tab from Resume focused Restart; Tab from Restart returned to Resume. Escape dismissed Pause and restored actual focus to the Pause button. Space from the battlefield opened Pause with Resume focused; Enter resumed. This closes the previously unreached boundary-wrap/Resume checks for this viewport, not a complete accessibility audit. Expanded Air routes remains a scrollable-content case; no all-at-once expanded-fit claim is made.

## Paid aerie and North: 320×430

The clearly labeled **Synthetic campaign unlocked** fixture supplied prerequisite campaign progress only. It did not supply a battle, gold, buildings, units, or clock override. Through the normal Story → High Pass → Wings of Ash flow, BEGIN MISSION → Build while paused opened teaching at 550 gold and 00:00. Build → Gryphon aerie → a native click on the visible middle-road site purchased one aerie for 250. Gold became 300, time stayed 00:00, placement ended, and clicking the actual aerie opened its inspector.

After resizing to 320×430, the real aerie was reselected. An explicit external QA control invoked ordinary `scrollIntoView({block:'nearest'})`, focus, and two animation frames before reading rendered geometry. It did not alter CSS, app state, or the game clock.

- North: x25, y287.765625, width 46.328125, height 46, bottom 333.765625.
- Drawer: x0, y48, width 216, height 294, bottom 342; clientHeight 293, scrollHeight 524, scrollTop 33.
- The full North rectangle was inside the drawer, with 8.234375px below it. Both center and a point 0.1px above its bottom hit North.
- Native Enter selected North and showed its 3px focus outline. Later native Hold, South and North activations succeeded. Gold remained 300 and time 00:00.
- After native keyboard activation/focus scrolling, North bottom 218.765625 with drawer scrollTop 148 was also fully contained.

The inspector remains intentionally scrollable. This is complete visibility of the focused control, not a claim that all inspector content fits at once. The old clipped bottom 342.375 beyond drawer bottom 342 was not reproduced.

## Ordinary paid flight

Returned the same purchased aerie to 390×650, retained its North order and used the normal Start action. No frozen clock or authored battle checkpoint was active. Ordinary production launched gryphons, and the app's normal Pause checkpoint at 11 seconds recorded the first unit's completed route from middle to north.

At 23 seconds, the next ordinary flight was observed in transit with the selected aerie's NEXT arrow still visible. The screenshot showed **NEXT ↑** and **YOU ↑ AIR** separately. Actual Canvas2D pass-through observations recorded NEXT x160–230, y113.2–133.2 and the committed banner x258.365841–343.488885, y122.322224–144.322223, relative to the battlefield canvas. Pause's expanded Air routes read: “Your 1 gryphon: Middle road to North road. Crossing now; cannot attack.”

This is live purchase/order/launch/transit evidence. The purchased home-550 aerie leaves more horizontal space than the original close-source defect, so the closer geometry was checked separately below.

## Close-source warning/transit geometry

Two separately labeled **authored checkpoint (geometry only)** fixtures used a legal paid middle-road aerie at world x1250, ai:false, and ordinary engine updates until the first warning or transit. They were encoded before the app loaded and placed only into the iframe's in-memory profile. The warning checkpoint was at 2.5 seconds with remaining 1.95; transit at 4.45 seconds. A clearly labeled frozen-animation-clock option kept those snapshots stable for visual inspection. These are not evidence of live browser progression, AI effectiveness, or human play.

The actual app resumed each checkpoint. Native canvas selection chose the aerie, and the real compact Build/Close button closed the inspector while retaining selection. Native minimap input positioned the scene. The wrapper observed actual Canvas2D draw calls without replacing drawing or changing runtime layout.

| Viewport / phase | NEXT bounds, canvas CSS px | Committed bounds, canvas CSS px | Separation |
| --- | --- | --- | --- |
| 390×650 warning | x171.582–241.582, y133.033–153.033 | x172.234–264.582, y157.033–179.033 | 4px vertical |
| 844×390 warning | x318.830–388.830, y75.600–95.600 | x296.482–388.830, y99.600–121.600 | 4px vertical |
| 844×390 transit | x81.560–151.560, y75.600–95.600 | x66.437–151.560, y99.600–121.600 | 4px vertical |
| 390×650 transit, left edge | x4.000–74.000, y133.033–153.033 | x4.000–89.123, y157.033–179.033 | 4px vertical |

Observed text was **NEXT ↑**, **YOU ↑ 2.0s** or **YOU ↑ AIR**, with 12px fonts. Native screenshots confirmed distinct full labels, visible source/crossing relationships and no NEXT occlusion in all four cases. Portrait transit also covered viewport-edge clamping. Tiny native matrix roundoff was approximately a few millionths of a CSS pixel, not a substantive overlap or clipping tolerance.

## Isolation, evidence and cleanup

- Supported `sites-preview start` served a new external preview at its exact returned URL, `http://127.0.0.1:4173/`. No arbitrary HTTP server, shell browser, browser reset, security change, alternative route, or production page was used.
- A new review tab 76 was created only after inspecting the existing browser inventory. Existing tabs 65–70, including both production tabs, were not opened or manipulated.
- Before app startup, iframe localStorage and sessionStorage were replaced with fresh parent-owned in-memory Maps. The outer page only read shared localStorage. Every completed measurement reported memoryStorage true and exact shared-key equality.
- Original, intermediate and final all-key storage SHA-256 all matched: `a9c9b81a8ab25736ac9d1117cbcba27443990d65d2111088b2d3d4d801ae1104`.
- Screenshots and numeric observations are retained inline in the native review transcript, not exported as local image files.
- Tab 76 closed successfully. Final inventory contained the same six original tabs 65–70. The supported preview was stopped and the external preview directory and its preparation script removed.

The earlier hidden-hint reviewer encountered Chromium Error 9 during its final standalone storage check, after its completed measurements had reported equality. That historical limit remains documented in `hidden-hints-native-qa.md`; this separate pass did not reproduce a renderer error and completed its own final hash verification.

## Limits

Cloud Chromium, native mouse/keyboard and real CSS-pixel iframe sizes only. No physical phone, touch/pen/controller hardware, browser chrome, PWA/fullscreen, safe-area or non-Chromium certification. No full screen-reader or focus-traversal audit. This pass did not test every crowded/mixed-route state, later-unit/objective layering, or the documented exceptionally short crowded-field fallback.

Hint collapse and first-paid-barracks auto-start were not broadly rerun here; their completed independent report and parent aggregate remain separate evidence. This reviewer did not change their runtime. Passing this bounded review does not replace the final exact-candidate cloud matrix or authorize merge/deployment.
