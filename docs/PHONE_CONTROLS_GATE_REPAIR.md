# Phone controls gate repair

This is an unreleased follow-up to draft PR #4 head `7551c5639c33773b8b21f0df60a3e0e61043cacb`. It preserves the phone/fullscreen integration and both PR histories. Production remains v0.13.

## What the first combined gate found

The requested browser suites reported 195 passes, 23 failures and 30 intentional skips. The root suite reported 889 passes and one optional desktop-tooling skip.

- Twelve short-portrait cases found the gold text line box extending two pixels above the viewport. The screenshot did not establish cropped glyphs, but the line-box overflow is a real layout defect.
- Four render-only cases found critical-health text clipped under two-line watchtower names in the short-landscape objective cards.
- Four held-pointer checks expected zero buildings ever built, although the starting skirmish already records one. Passive tracing confirmed the held release added no building and spent no gold.
- Three timing-sensitive checks passed unchanged reruns. They sampled layout immediately after a resize, compared a paused HUD before its final render, or compared the mutable RNG seed after resumed simulation ticks. These are addressed with explicit readiness and authoritative-state comparisons, not by removing the checks.

Middle drag, right-click cancellation, supported and unsupported fullscreen paths, ordinary safe-area layouts, pinch suspension and the other migration cases passed that component gate. Downstream assertions blocked by earlier failures were not verified there.

## Runtime corrections

Short-portrait resources use centered cross-axis alignment instead of aligning unlike font baselines. This keeps the gold text in its existing 20px row without taking space from the battlefield.

Protected short-landscape cards have a 64px row within a 104px objective dock. Two-line names and critical health retain their existing font sizes. Ordinary sidebar, portrait and 44px navigation controls are unchanged.

The taller cards prompted an additional safe-area review. At 568×280 with 21px reserved bottom padding, minimum grid rows can extend into the home-indicator band while still remaining within the outer viewport. The safety check now uses the root's inset content rectangle, derived from actual computed CSS padding. The fixed root and pause dialog still use the outer visual viewport. Truly insufficient safe content remains paused, and recovery still requires an explicit Resume.

No engine, combat, profile or save-schema change is included. The candidate retains the unreleased v0.14.1 cache namespace. A new exact-head cloud gate and authorized release remain required.

## Evidence and limits

Final local results and source hashes are recorded in `PHONE_CONTROLS_REPAIR_VALIDATION.json`. Native retest results are documented separately; source-derived unit fixtures do not substitute for browser layout. Physical Android/iOS phones, installed PWAs, real OS safe areas and Safari/Firefox remain unverified. The user's screenshot is not included in the repository.

## Final local validation of this repair

- Full root suite: **898 passed, 0 failed, 1 optional desktop-tooling skip** (899 discovered).
- Runtime JavaScript syntax, runtime inventory and complete browser preflight/immutable fixture checks passed.
- Focused test-worker pass: 143/143. New rejection checks cover clipped/hidden nested health text and corrupt passive-replay states; the full aggregate includes those tests.
- The phone browser suite now contains 16 cases, or 64 configured project instances. The combined requested suites require a new exact-head cloud run; none of the prior gate results is relabelled as a repaired-candidate pass.
- Bounded native retest passed paid play at 320×430, full two-line watchtower/critical-health text at 667×300, and correct suspension at 568×280 with a synthetic 21px bottom inset. The profile remained unchanged and temporary runtime fixtures were removed. See the native report for measured rectangles and limits.
- Independent source review found no remaining blocker in the inset helper or the revised row budget.
