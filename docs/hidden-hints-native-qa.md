# Hidden-hint collapse: independent source and native QA

Date: 2026-11-07 UTC. Bounded review of the unreleased candidate, using supported Sites managed preview and actual cloud Chromium CUA. No production tab, upload, publication, real profile edit, arbitrary HTTP server, or shell browser was used by this reviewer.

## Result

The full hint banner disappears rather than being replaced with text. The entire teaching row is recovered, Show remains reachable outside the closed Build drawer, keyboard focus survives repeated toggles, and first-build/manual teaching state stays independent of hint visibility.

Two native visual defects were found during review at 320×430: the collapsed manual **Resume** label overflowed its 44px button, and placement **Cancel** overflowed the compact Build button into Show. Both were repaired and passed targeted native text-bound and screenshot retests. No remaining functional or layout defect was found within the completed scope.

After all functional checks, the final standalone storage-verification action encountered Chromium renderer **Error 9**. The last completed measurement still reported exact shared-storage equality. No post-crash hash is claimed. See the cleanup limitation below.

## Source and deterministic checks

- `campaignTeaching` is hidden as a whole; hidden live-region strings are cleared. No `coachRailStatus` or replacement “Hints hidden” message remains.
- The same `coachActions` and buttons move to existing mobile navigation (ordinary desktop uses `commandDeck`), preserving handlers and accessible names. `coach-collapsed` sets the teaching track to zero. The existing mobile layout and safety latch remain in force.
- First-build hold suppresses separate Start/Resume until the paid first barracks. Later manual teaching retains Start/Resume. Hide/Show changes presentation, not resources, time, saves, or hold state.
- Focus restoration occurs after reparent/layout interruption, with controller menu focus restored when appropriate.
- Independently ran `node --test tests/hidden-coaching.test.mjs`: **12 passed, 0 failed** (final run, including the two label-regression tests). This includes synthetic insets and insufficient-height latch cases. These are deterministic checks, not physical-device evidence.
- The full aggregate and browser matrix are owned by the parent review and are not claimed here. Focused hidden-coaching tests were rerun after each CSS repair and passed against the final source.

## Native responsive geometry

The same fresh Roadside Watch was resized through each viewport. Values are CSS pixels, measured from rendered DOM via an external QA wrapper; no runtime simulation hook or clock override was used.

| Viewport | Shown battlefield height | Hidden height | Recovered banner | Hidden banner | Show | Safety |
|---|---:|---:|---:|---|---|---|
| 320×430 | 294 | 338 | 44 | 0×0 | 44×44 | safe |
| 320×568 | 256 | 344 | 88 | 0×0 | 44×44 | safe |
| 390×650 | 338 | 426 | 88 | 0×0 | 44×44 | safe |
| 844×390 | 326 | 390 | 64 | 0×0 | 44×44 | safe |

Each hidden state had `--mobile-teaching: 0px`, no placeholder, no coaching highlight, and actions under `protectedNavigation`. All measured visible controls were at least 44×44 and their centers hit the intended elements. The game document exactly matched each viewport, with no overflow or screen-size pause. Screenshots confirmed the recovered field and compact Show in the normal navigation.

Repeated Space/Enter toggles retained actual keyboard focus on the same Hide/Show element. This was read immediately after activation, before clicking the wrapper's measurement control (clicking outside the iframe naturally changes focus).

## Native teaching and menu flows

1. Fresh first hold stayed at **420 gold / 00:00 / 0 troops**, including Hide/Show, all four viewport sizes, and Pause → Options → Back to pause menu → Resume. No extra Start/Resume teaching control appeared.
2. With hints hidden at 844×390, Build → Barracks → native click on a visible legal site immediately spent **420→280**, exactly the displayed 140 cost. Placement ended, Build closed, the banner remained absent, and combat started without an additional Start action. By 00:11, the game had 337 gold and two troops.
3. At 320×430, the normal **Pause to learn** action after combat began opened the teaching dialog. Build while paused entered manual hold; Hide removed the full 44px row and retained a separate Resume button. Time/gold stayed **00:17 / 369** before and after hiding and throughout rotations to 320×568, 390×650, 844×390 and back to 320×430. All sizes stayed geometry-safe with no screen-size pause.
4. The actual manual Resume button advanced the game to **00:20 / 384**, removed the Resume teaching control, and kept Show/the collapsed banner state. Normal Pause opened Battle Menu, and Options → Back → Resume worked after combat had started.

## Detected short-portrait label issue

At 320×430 in collapsed manual hold:
- Resume button bounds: x270–314, width 44; text bounds: x275–321.953125, width 46.953125.
- Font: bold 12px DM Sans, padding 4px; clientWidth 42, scrollWidth 51.
- The screenshot visibly clipped the final characters at the viewport edge. Accessible name remained “Resume battle”, and hit testing succeeded.

The implementation changed only the short collapsed Resume control to bundled 14px Barlow Condensed with zero inline padding. Native retest found text x271.859375–312.125 inside button x270–314, text width 40.265625, and scrollWidth/clientWidth both 42. The full word is visible in the screenshot; hit target remains 44×44 and geometry stays safe. Retested stylesheet SHA-256: `9a4aebfd67c4cd415c96dcc0bf6697f2bae41853b7ad1e7644dc904dd09233d5`.

During this retest, the related Cancel label issue was found: compactBuild button x222–266, text x227–278.3125, width 51.3125 (16px DM Sans, 4px padding). Its visible text ran into Show during placement. A matching scoped typography repair was applied to the collapsed short-portrait compact control. The final native retest found:

| Label | Text x range | Text width | Target x range | Result |
|---|---|---:|---|---|
| Build | 231.9375–256.046875 | 24.109375 | 222–266 | contained |
| Close | 230.890625–257.09375 | 26.203125 | 222–266 | contained |
| Cancel | 227.6875–260.3125 | 32.625 | 222–266 | contained |
| Resume | 271.859375–312.125 | 40.265625 | 270–314 | contained |

All four controls retained 44×44 targets, used 14px bundled Barlow Condensed, and had scrollWidth/clientWidth 42. Screenshot confirmed Cancel no longer overlapped Show and Resume was fully legible. Clicking Cancel returned to Build with 420 gold / 00:00 unchanged; a subsequent first barracks again spent 420→280 and started combat. Manual hold then remained geometry-safe at 00:03 / 296 gold with hidden banner and reachable Show/Resume. Both findings and verified repairs were sent to the implementation worker and parent.

Final stylesheet SHA-256: `47fb9a489353dc9d89cfb6970b755395d4be489ae9edef045bb59a4f01a30162`. Other frozen hashes below were unchanged; final app and stylesheet copies were verified identical to source.

## Isolation and evidence boundary

The external fixture loaded copied, unchanged game assets into a same-origin responsive iframe and replaced localStorage/sessionStorage with empty in-memory implementations before app startup. The outer wrapper only read actual preview-origin storage. It did not seed or clear real localStorage. Every completed measurement reported exact shared-storage equality. Full all-key SHA-256 comparisons before both CSS reloads also matched the original.

Initial all-key SHA-256: `a9c9b81a8ab25736ac9d1117cbcba27443990d65d2111088b2d3d4d801ae1104` (five keys).

Frozen runtime hashes for the initial native pass:
- app.js: `f4ca172dac45bf1c85556041bce4e19cd27e17f21136f189320b82ace058232c`
- index.html: `b5d4584af9bf44ea7979557d87063233f848a5bf7574dbada22a6ffd110f1ddc`
- styles.css: `0640735609771bac7b5de5ab85c6c93b1ee13e940804f37dc991001eceee19b7`
- engine.js: `548f1b67763e710aad5d1e1a7e70a1e39c4d93eddd3b47daf68a2b385b823168`
- mobile-battlefield.js: `3f8c756a8548df12cc32ed24d27d0b68b2e3c425961cb43ddd44ff588ed715e0`

Physical phones, touch/pen/controller hardware, browser chrome, safe areas, PWA/fullscreen, non-Chromium behavior, later campaign missions, restored saves, and native manual Start at zero time were not certified. Flight visual changes were explicitly outside this pass. Synthetic insets and manual Start have deterministic coverage only.

## Final interruption and cleanup

After the final targeted retest, the standalone Verify shared profile unchanged button action timed out with `Runtime.evaluate timed out`. A native desktop screenshot confirmed the same isolated preview tab had crashed with “Can’t open this page”, Error code 9. Its cause was not diagnosed, and the error is not attributed to an established app defect. No reload, alternate browser/profile, or reset retry was attempted.

The last successful game measurement immediately before that attempt reported `allSharedKeysExact:true`, and earlier complete original/current hashes both equaled `a9c9b81a8ab25736ac9d1117cbcba27443990d65d2111088b2d3d4d801ae1104`. A separate post-crash fingerprint was unavailable. No shared-storage write or restoration occurred.

The isolated preview tab closed successfully. `sites-preview stop` confirmed shutdown, and the temporary external runtime fixture was removed. No QA fixture was placed in the source runtime. This reviewer changed only this report in the candidate checkout.
