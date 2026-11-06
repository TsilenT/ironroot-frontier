# Phone viewport repair

Status: local repair under review, not released. Base is merged private main `b8b2e6d1b200b9550803f5cb16b8d96ccc28f222` (the tested PR #1 tree). The public game remains v0.13. Campaign roster/progression work is separate.

## Observed defects

Native Chromium inspection reproduced two different failures:

- With a 390 × 650 layout, a simulated 50px smaller visual viewport or 1px offset left the game shell at its old size/origin. Navigation or the top bar lay outside the guard's visible rectangle, triggering a persistent pause despite ample world space. The user's private phone screenshot also reports this containment failure, not the minimum-height reason. The screenshot is not stored in the repository.
- At 667 × 300, the existing 48px header plus 60px dock left a 192px world, below the 212px limit. Navigation controls actually overlapped. Lowering the guard alone would be wrong.

## Repair

- Fit the mobile shell to visual viewport offsets and dimensions in CSS pixels before inspecting its geometry. Preserve browser zoom, retain safe-area padding once, clear fixed sizing on desktop, and cache requested fractional dimensions rather than CSS serialization.
- Cancel held input when the fitted rectangle moves or changes size and refresh renderer dimensions before subsequent commands. A finger held across a browser-toolbar movement must not place a building at a newly shifted location.
- In short landscape, stack the existing HUD, objective and navigation nodes in a 276px right sidebar. The battlefield receives the full available height. The build drawer scrolls over only the world area.
- In short portrait, reduce display-only header/objective space while retaining the same 44px actionable controls and named protected health.
- Keep the 212px world minimum, overlap/clipping checks, explicit resume after a genuinely unsafe interruption, all simulation rules and saved-data formats unchanged.

## Evidence limits

Responsive iframe checks validate actual DOM layout, hit targets and ordinary UI actions. The visual viewport overrides are deliberately synthetic. They do not certify real Android Chrome toolbar timing, iOS Safari, installed PWA safe-area behavior or physical devices. Fullscreen is a separate requested feature, not a prerequisite for ordinary phone play. Final automated counts and exact tested revision belong in the PR validation record after review.
