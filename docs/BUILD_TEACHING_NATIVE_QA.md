# Build and persistent teaching: bounded native QA

Date: 2026-11-07 UTC.

## Result

The actual first-mission Plan → choose Barracks → paid placement flow passed in native Chromium at **320×568** and **740×320**. Both had a persistent hint and explicit Start control outside the Build drawer, a battlefield taller than the 212px minimum, no screen-size pause, and one-shot mouse placement that spent exactly the building cost.

The review was **partially blocked**, not a full QA pass. Chromium displayed **“Aw, Snap! Error code: 9”** during the next resize/measurement attempt at 390×650. The worker stopped without reload/reset loops as instructed. No app defect was established by the crash, and its cause was not diagnosed.

## Method and frozen build

- Managed URL: `http://127.0.0.1:4173/__qa_campaign.html`.
- Frozen assets: `/workspace/shared/ironroot-placement-teaching-preview/dist`.
- The developer fixture loaded the actual game HTML/CSS/modules into a correctly sized same-origin iframe. It installed isolated in-memory localStorage/sessionStorage before startup.
- Fresh-game controls were used only for these isolated memory profiles. No production tab was operated, no file import was attempted, and no runtime source was edited.
- UI selections used native-browser accessibility/locator actions. Placement used actual mouse clicks on the visible canvas. Geometry came from the fixture’s rendered-DOM measurement button, not source estimates.
- These are desktop Chromium responsive-iframe pointer checks. They do **not** certify physical touch/pen/controller input, Android/iOS browser chrome, real device safe areas, or installed-PWA behavior.
- The separate Back-menu and optional-fullscreen patches were absent and were not reviewed.

Frozen runtime SHA-256 values from `runtime-sha256.json`:

| File | SHA-256 |
|---|---|
| app.js | ba40cbc4fcff7063aa530bcd0a210169dbf0df81690a06c4299981abff7bc3ba |
| styles.css | b2a0baa83f196fa91d0b9c1b5636a8ac14e5b44fe9649fef35c448f19d4f9ab5 |
| index.html | 100a7542a335e3740d9b6ad0fad6e9199c541538083c0efdbb6a7f85f03952e6 |
| campaign-onboarding.js | 2f9fcc9839d1a844ff0ea60f71e9e80715c188cd847c9d063b6530d6f90c33af |
| mobile-battlefield.js | 3f8c756a8548df12cc32ed24d27d0b68b2e3c425961cb43ddd44ff588ed715e0 |

## Completed: 320×568

Used the actual Roadside Watch campaign page and Begin Mission button.

1. The initial teaching modal’s two actions were reachable within the iframe viewport. “Build while paused” was x35–285/y431–475, and “Start battle now” was x35–285/y483–527. Each was 250×44. The instructions had an internal scroll area rather than pushing those actions beyond the viewport.
2. Chose **Build while paused**. The normal teaching rail was outside the closed Build drawer, at x0–320/y328–416. It showed “Paused. Build → Barracks.”
3. The explicit **Start battle** control was 56×44 at x210–266/y350–394. Hide hints was 44×44 beside it. Both remained visible while opening the drawer, selecting Barracks, and after placement.
4. Focused the scrollable hint and pressed Space. Hint scrollTop became 20, focus stayed on `campaignCoach`, and the battle stayed paused: time 00:00, gold 420, army 0, Pause’s accessible label “Resume game.” This directly verifies the focused-hint Space case; separate wheel/touch scrolling was not completed.
5. Opened Build and chose Barracks. The drawer closed, the green sites were visible, and the hint changed to the placement instruction. The teaching rail did not overlap the battlefield.
6. Clicked the visible suggested green site. Gold changed **420→280**, matching the 140-gold Barracks cost. The compact control returned from Cancel to Build, the drawer stayed closed, and the hint advanced to **“Paused. Build → Archery range.”** This confirms successful default mouse placement ended the order.
7. Time and troops remained **00:00 / 0** through the planning and building observations. Gold did not increase while planning; it only decreased for the actual purchase.

Measured battlefield: **320×256**, x0–320/y72–328. Geometry result was safe, with no screen-size modal. The visible normal controls were at least 44px in each dimension: pause, speed, sound, settings, home and front were 44×44, minimap 212×44, Build 56×44, Start 56×44, and Hide 44×44. The iframe document measured exactly 320×568 with no overflow.

First recorded planning measurement: 2026-11-07T00:09:27.927Z.

## Completed: 740×320

Loaded a fresh isolated game at 740×320 and entered Roadside Watch through Begin Mission, then Build while paused.

1. Plan showed “Paused. Build → Barracks.” and an explicit Start control outside the drawer.
2. The teaching rail occupied x0–464/y0–64. The battlefield was below it, **464×256**, x0–464/y64–320; therefore the rail did not cover its build sites.
3. Start was **56×44** at x354–410/y10–54, visible before selection and after placement.
4. Opened Build, selected Barracks, and clicked the visible suggested site with an ordinary mouse click.
5. Gold changed **420→280**. Placement ended and the drawer was closed. The next action became **“Paused. Build → Archery range.”** Clock and troops remained **00:00 / 0**.
6. Both the pre-build and post-build measurements reported safe geometry and no screen-size modal.

Recorded pre-build measurement: 2026-11-07T00:10:21.869Z.

## Renderer interruption

The first tab-opening attempt returned “Unknown CDP tab 55”; browser inventory subsequently reported no controlled tabs. One fresh opening succeeded as tab 61, and all checks above ran in that tab.

After the successful 740×320 paid build, the worker selected 390×650 and resized the existing game. The subsequent Measure rendered game action timed out with `Runtime.evaluate timed out`. A fresh accessibility/screenshot request then timed out in `DOMSnapshot.captureSnapshot`, and the screenshot-only request timed out in `Page.getLayoutMetrics`.

A native desktop screenshot confirmed the selected private fixture tab at the expected URL was showing Chromium’s **“Aw, Snap! Error code: 9”** page. No reload, browser reset, alternate profile, or repeated recreation was attempted after that confirmed recurrence. The failed tab was left in that state; it was not possible to obtain a final measurement or profile-verification result from it.

## Shared-profile preservation evidence

The fixture initially captured five shared `ironroot.*` keys read-only, with SHA-256 `a9c9b81a8ab25736ac9d1117cbcba27443990d65d2111088b2d3d4d801ae1104`.

Every completed game measurement reported `localStorageIsMemory: true` and `sharedProfileExact: true`, including the last successful post-build 740×320 measurement. No shared-profile restoration was performed or needed during those checks. **Final post-crash verification was unavailable**, so this report does not claim a separate end-of-session comparison.

## Not completed / no certification

- 390×650 measurement, 320×480, 844×390, and synthetic bottom34 inset.
- Shift+mouse repeated placement, including the narrow desktop viewport case.
- Invalid placement retaining selection and spending nothing.
- Right-click cancellation.
- Touch, pen, and controller one-shot behavior.
- Clicking Hide hints without starting, and showing hints again.
- Clicking explicit Start/Resume and verifying running simulation.
- Broader menu/focus navigation and save/reload of the retained memory profile.
- Physical-phone, touchscreen, installed-PWA, real safe-area, and browser-chrome checks.

The two successful viewport flows are useful bounded evidence. The uncompleted items require separate automated coverage or a later stable native-browser pass and must not be represented as passed by this report.
