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

## PR #4 exact-head gate follow-up

The automated gate at `7551c5639c33773b8b21f0df60a3e0e61043cacb` remains historical failure evidence: 195 browser passes, 23 failures and 30 intentional skips. A separate unchanged six-case rerun passed but did not erase the original failures. The follow-up test changes distinguish three kinds of evidence:

- **Layout failures remain strict.** Full-character text evidence now checks every non-whitespace character through nested spans, owning controls, the visible viewport and clipping ancestors. A visible parent box cannot conceal hidden, clipped, transparent or zero-font “Critical” text. The script-free render fixture retains the authored North/South watchtower strings with full critical and missing-original statuses. Short-portrait gold line-box containment is still required.
- **Held-input assertions use a real baseline.** A paused pre-gesture save supplies the cumulative build counter and owned building IDs. Releasing a held pointer after a viewport move must add no building and spend no gold beyond ordinary income. A new independent placement must add exactly one building and pay its normal 210-gold cost. No cumulative-zero assumption remains.
- **Timing checks follow the relevant observable.** Resize checks wait for rendered, fitted geometry before unchanged strict hit tests. Paused clock text must first settle to the saved simulation time, then remain unchanged with the save. Migration checks replay every elapsed fixed tick and compare the complete simulated state and RNG seed. The RAF sub-tick accumulator is separately bounded as a fractional clock remainder, rather than misclassifying legitimate resumed simulation as migration corruption.

The taller protected sidebar uses a 104px objective row and 64px named targets; the ordinary sidebar retains its 56px row. Safe-area validation uses the root's computed content rectangle. At 568×280 with a synthetic 21px bottom inset, the protected 272px minimum grid fits the outer screen but intrudes into the reserved band, so it must pause. Growing the screen makes Resume available but does not restart combat automatically. Root fitting and fallback-modal sizing continue to use the full visual viewport.

Local follow-up verification: 143 focused Node checks passed, including malformed/hidden nested text rejection, authoritative paused-clock formatting, deterministic resume replay, ruleset-admission startup, profile-session startup and safe-area overflow/recovery. The changed browser modules pass syntax checks. The phone browser specification now has 16 cases, or 64 instances across the existing four projects. These revised browser cases have not been executed locally; a new exact-head browser gate is required. Native QA results and device limitations remain in `PHONE_VIEWPORT_NATIVE_QA.md`.
