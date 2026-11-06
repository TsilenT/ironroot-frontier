# Protected mobile battlefield prototype

This is a local prototype, not a published build. It was copied from the reviewed combined clarity baseline into `ironroot-mobile-battlefield-lab`. `MOBILE_BATTLEFIELD_BASELINE.json` records the copied source hashes. The original clarity workspace, deployed v0.12, renderer, VFX, simulation rules, save schema and profile/history/preference modules are unchanged.

## One battle-first structure

Protected mobile battles use the same named original-target buttons and Build/Close/Cancel drawer in both orientations. The existing citadel HP, toolbelt, map controls, Build button and selection panel are moved, not cloned. IDs, listeners and original-target identity are retained. Layout transitions invalidate held input and restore focus only to a still-visible, connected control.

Portrait has four reserved rows:

- 72px header: resources and the original citadel HP/mission nodes.
- Flexible, unobscured battlefield.
- 84px objectives: difficulty/Protect identity, remaining time, progress and named original HP buttons, each at least 44px.
- 96px navigation: a 44px Build/tool row and a 44px Home/minimap/Front row, a 4px gap and 4px combined outer vertical padding.

The source budget leaves 228px of world at 320×480, 248px at 390×500 and 316px at 320×568, before safe-area insets. Landscape retains the reviewed 48px header, 60px objective dock and 152px side rail, leaving 212px of world at 568×320. Protected short landscape now uses this drawer organization consistently rather than a second permanently exposed deck layout.

Only optional card descriptions/captions are omitted. Cards, prices, names, HP and critical text retain readable typography. A selected friendly building opens the same intentional drawer for inspection/upgrading; closing it and reopening Build returns to building cards. Persistent controls never overlay the world. Toast placement chooses a band clear of the original structures, including protected Middle-road structures.

## Insufficient-space pause

`mobile-battlefield.js` is a presentation-only module. Actual DOM canvas/control/region rectangles are checked against the visible viewport, including visual-viewport offsets and safe-area-induced layout changes. The predicate requires a 212px visible world, visible full-size controls and no control/world or control/control overlap. There is no 568px portrait-height requirement.

When geometry cannot fit, the app enters normal pause, cancels placement and held input, closes the drawer, and attempts the existing save once. No simulation steps, objective time, income or HP advancement occur behind the panel, and the frame clock continues updating to prevent catch-up. The readiness change does not resume play. A fresh explicit Resume must pass the existing profile/recovery/stale-session checks.

The body-level safety dialog has separate blocked/ready input scopes, a scrollable explanation/status region and two full-size actions. Save & return to title shares the existing guarded handler. A failed save retains the paused in-memory battle and reports failure inside the panel. Preferences, Help, backup/recovery and result dialogs keep priority, and their automatic dismissal paths cannot clear the viewport pause. No new save field or preference is introduced.

The source geometry model fits 390×500 with a 34px bottom safe inset. A 320×480 area with that same inset does not fit and pauses rather than shrinking the world or controls. This is a real space tradeoff, not a universal device-size claim. The fallback reserves 8px plus each safe-area inset. Its bounded review floor is 320px wide and 160px of usable height after vertical insets: a 34px bottom inset requires 194px total height. Below that usable-height floor the game still pauses and full-size safe actions can remain available, but complete readable-panel usability is not claimed. The labelled, keyboard-focusable explanation region scrolls inside the existing dialog trap; initial focus remains on the safe title action.

## Independent review correction

The first candidate's source review found two material defects. Startup measured the initially hidden objective HUD before its first update, falsely pausing fitting new/restored battles. Startup now populates and reveals the real HUD synchronously before geometry measurement. The fallback initially ignored safe areas; its padding now reserves them on all four sides. Executable regressions run the real startup, restore, HUD and safety handlers with actual HTML hidden-ancestor semantics and reproduce the original failure by removing the correction. Separate source-geometry tests reproduce the old 26px bottom-target intrusion and calculate the corrected usable-height floor. These are explicitly source models, not native browser evidence.

## Validation and remaining gate

`MOBILE_BATTLEFIELD_VALIDATION.json` records the final local checks and exact runtime hashes. Tests cover every authored protected original with the pinned renderer, geometry and safe areas, actual extracted pause/frame/modal/save handlers, held pointer/key transitions, no hidden simulation or catch-up, original target identity, existing recovery and training behavior, and source-level pointer inheritance. The source/cascade fixture is deliberately narrow, not a browser layout engine.

The prepared browser spec uses ordinary mouse clicks or the existing synthetic Chromium touch helper, real element-from-point checks and actual drawer transitions. Browser source validation is not browser execution or physical-device evidence.

Before preview replacement, independently review the finished candidate. Then one bounded native gate should cover 320×480, 390×500, 320×568, 568×320 and 844×390; critical original focus, drawer/card prices, building inspection, pointer activation, dialog precedence, below-fit suspension, explicit recovery and profile restoration. Physical devices/controllers and screen-reader behavior remain unverified. No hosting, publication, version bump or browser actions were performed during this work.
