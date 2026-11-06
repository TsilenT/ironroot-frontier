# Minimap native-coordinate test contract

This is a test-only correction in the validation candidate. It does not change runtime input, camera math, or world-unit accuracy.

## Confirmed cloud observations

Candidate 2's native targeting checks passed. Three 390px-phone camera checks failed because their oracle used the requested fractional coordinate rather than the coordinate delivered by Chromium's native click:

- Requested x: 244.68 CSS pixels.
- Minimap left: 87; width: 216.
- Trusted pointerdown and pointerup x: 244.6799927.
- Trusted click x: 245.
- All three events targeted the minimap and were not prevented.
- Camera was exactly `(245 - 87) / 216 * mapWidth`.

The 0.32 CSS-pixel shift is 4.7407407 world units on Classic/Twin Span and 5.9259259 on Long March. This is native coordinate precision, not an inaccurate camera projection.

A passing narrow-phone Classic sample had requested/pointer/click x 206, minimap left 60 and width 200, and camera 2336. Its requested y 368.40625 became native click y 368. The contract therefore does not assume one rounding algorithm. Pinned Playwright 1.65 forwards touch coordinates unchanged to Chromium's input protocol.

## Preserved and strengthened checks

- The raw requested taps remain exactly 73% of the minimap width and one CSS pixel inside each edge. There is one input operation per request, with no retries, re-centering, coordinate rewriting, or synthetic DOM events.
- Native trusted pointerdown, pointerup and click must still occur in that order and target the minimap. The requested pixel must geometrically belong to the minimap.
- Pointer coordinates must be within 0.01 CSS pixels of the requested point (floating-point noise only).
- The click coordinate must be within one CSS pixel of the requested point, measured as Euclidean x/y distance. This is a separate bounded native-input check, not a larger camera tolerance.
- The 73% camera oracle uses the observed click x and observed minimap rectangle. `expectCamera` is unchanged and still requires less than three world units of error. Left/right endpoint assertions remain at world 0/map width. Home, Front and whole-world viewport checks are unchanged.
- Passive capture listeners attach JSON telemetry for every tap, including requested coordinates, native event coordinates/targets/trust, default-prevention state at capture, minimap rectangles, and projected activation x. The observer never changes propagation or defaults.

## Files and validation

- `qa/browser/maps.spec.mjs`: observes native events and attaches evidence; requests the same coordinates.
- `qa/browser/minimap-input-contract.mjs`: executable QA-only sequence, pixel-proximity and projection oracle.
- `tests/minimap-input-contract.test.mjs`: eight regressions cover both reported coordinate samples, fractional native clicks, exact edge inputs, wrong/untrusted/extra/missing events, strict pointer precision, the one-pixel boundary including diagonal drift, invalid values, and unchanged inputs.

Focused input/controller/report tests: 82 passed, zero failures. Full Node suite: 635 passed, zero failures, one optional-tooling skip (636 discovered). Root syntax, runtime preflight and browser syntax/fixture checks passed. Exact cloud browser execution remains required; no local browser or server was launched for this repair. The unchanged runtime input guard and native minimap handler retain the earlier held-game-result protections.
