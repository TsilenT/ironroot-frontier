# Flight banner painter-order repair

Base: `46d324b94754fe88ed9d324456f284af0aa4537d`. The exact-candidate QA report at `qa/cloud-46d324b/Ironroot-PR2-46d324b-QA-report.json` records building pennants obscuring downward glyphs in congested two-row banners. Background separation did not prevent this: the entire flight pass preceded the actors.

## Change

- `drawFlightRoutes` still paints route paths, route arrows and displaced-label leaders beneath bases and actors. It returns the detached signals, scale and measured banner/NEXT layout for that frame.
- `drawFlightLabels` paints complete opaque committed/NEXT banners from that same layout after actors and projectiles. It does not reread the game, remeasure text or recompute geometry.
- `Renderer.draw` invokes the label pass immediately before its unchanged mission/protected badge pass. Existing placement and spell overlays retain their order.
- No changes to flight mechanics, warning timing, banner geometry, NEXT separation, minimap, reduced-motion behavior, objectives or protected overlays.

## Regression evidence

`tests/flight-visuals-layering.test.mjs` exercises the actual `Renderer.draw` calls with six paid aeries and all eight directed routes, each with eight warning and eight transit units. Across four portrait/landscape battlefield sizes and all high/low-effects plus reduced-motion combinations, it checks actual up/down countdown/AIR text, ownership and NEXT text after all building pennants, actor draws and projectile arrows. Route strokes remain beneath actors; objective/protected badges remain above labels. It checks paint order, not merely banner rectangles.

The same 16 layering cases were run against an untouched local copy of the pre-repair runtime: **0 passed, 16 failed**, specifically because actual arrow/countdown text preceded building pennants. The repaired runtime passes all 16.

The existing visual suite retains its geometry/NEXT, old-rules, minimap and simulation-immutability coverage. A new two-pass test also freezes the returned layout, invalidates live inputs and forbids text measurement before replaying the labels identically.

Validation passed:

- `node --check` on both changed runtime files and both visual test files.
- `node --test --test-concurrency=4 tests/flight-visuals*.test.mjs tests/flight-order-engine.test.mjs tests/flight-order-legacy-parity.test.mjs tests/flight-orders-view.test.mjs tests/renderer-maps.test.mjs tests/readability.test.mjs tests/vfx.test.mjs tests/protected-objectives-layout.test.mjs`: **101 passed, 0 failed, 0 skipped**.

These are local Node/canvas-command checks, not browser pixels or physical-device certification. Native congested portrait/landscape review and the combined exact-candidate gate remain pending. No browser fixtures, external publication, PR, merge or deployment was performed for this repair.
