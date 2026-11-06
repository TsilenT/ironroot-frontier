# Field Trials UI QA

Date: 2026-11-06 UTC. Build: 0.4 development preview.

## Verified

- Real Chromium testing through the managed preview, not programmatic mutation of game state.
- All five trial selectors show the correct briefing, objective, starting conditions, and Commander’s hint.
- Shieldbreaker was played to completion using ordinary UI input. Added a forward Barracks, Sanctum, and Archery to the starting Barracks. Outcome: COMPLETE at 01:10, 3/3 targets destroyed, 23 kills, 4 buildings.
- Partial progress advanced to 1/3 while two target diamonds remained over the surviving enemy structures.
- Pause → Save & return to title → browser reload → Resume trial restored Shieldbreaker, its objective, 00:14 battle time, 46 gold, and 4 troops correctly.
- Completion removed the finished battle’s Resume option. The Shieldbreaker checkmark and Best 01:10 survived returning to title and a browser reload.
- Holdfast was allowed to fail without intervention. At 00:59 the UI showed TRIAL FAILED and “Holdfast: Your citadel fell.” No completion medal was granted.
- Returning from hard Holdfast to Skirmish preserved the visible Easy selection and actually launched THE OUTRIDER, verifying the cross-mode difficulty fix.
- Responsive trial menus were reviewed at 390 × 650 and 320 × 568. The smaller menu scrolls vertically and Start remains accessible.
- Final trial progress and countdown use a dedicated readable strip rather than the prior 5–6px central subtitle. Screenshot and DOM checks confirmed 10px objective text and no clipping at 320 × 568 and 844 × 390. Landscape command deck ends exactly at the viewport bottom.
- Final trial selector retains focus on the selected button after activation.
- The temporary viewport fixture was removed from dist after review.

## Regression discovered

Starting a trial overwrote the selected skirmish difficulty. Reproduction: Shieldbreaker → save/title → Skirmish, with Outrider still highlighted → Start launched The Iron Marshal. The builder changed trial start to preserve the independent skirmish selection and made resumed skirmishes synchronize their active difficulty button. Behavioral retest passed after hard Holdfast: Easy remained selected and THE OUTRIDER launched.

## Scope limits

Responsive content viewports are not real mobile hardware. Offline production-browser behavior, device touch and multi-touch, and packaged desktop execution are not covered by this UI pass. Automated strategy checks for the other trials are not equivalent to human playthroughs.

## Remaining non-blocking observations

- At 320px the five-column trial selector has approximately 6px of content overflow and Gold Rush wraps onto two text lines. No blocked control was observed, but a two-row compact selector would improve consistency.
- Countdown display rounds down, so a newly started 2:30 trial displays 2:29 remaining during its first fractional second. This is cosmetic.
- The completed Shieldbreaker trial provides a clear counter-unit lesson: a mixed warrior/wizard/archer force visibly advances the objective and earns a persistent medal. The other three trials still need independent active-player UI playthroughs beyond automated strategy coverage.

## Final automated checks

At the end of this pass, npm test passed 71/71 tests and npm run check passed. This includes independently developed audio and desktop module tests that appeared during the review; it does not mean their runtime integration or native desktop packaging was browser-verified here.
