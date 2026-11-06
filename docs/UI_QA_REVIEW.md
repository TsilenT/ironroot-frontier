# UI and experience QA review

Date: 2026-11-06 UTC

## Verdict

The reviewed browser prototype has a functioning build/manage/fight/save/replay loop. No release-blocking UI defect remained in the flows retested below. This is not a Steam release-readiness certification. Real touch hardware, Safari, packaged desktop distribution, performance profiling, full accessibility, and representative human balance testing remain unverified.

## Method and scope

- Real Chromium UI interaction against the managed Sites preview at http://127.0.0.1:4173/.
- Desktop viewport: 1180 × 757.
- Responsive content viewports: 390 × 650, 320 × 568, and 844 × 390, using a temporary same-origin iframe fixture. These validate layout dimensions, not mobile device/browser behavior.
- Pointer interactions used mouse input, not real touch or multi-touch emulation.
- The temporary fixture was removed from the deliverable dist directory after testing.
- The preview live-reloads when source files change. Lifecycle tests were repeated during a coordinated stable-source window to avoid confusing reloads with game defects.

## Verified flows

1. Welcome screen, opponent choices, opening and closing field guide.
2. Desktop: select Archery, place in a valid slot, cancel build mode, select placed building, upgrade, salvage. HUD costs/refund and upgrade production interval updated correctly.
3. Phone layout: select Barracks, place, cancel, select building details.
4. Drag during active build mode moved the camera without accidentally building or charging construction cost.
5. Minimap tap visibly moved the view to enemy territory.
6. Rally targeting, casting, recharge display, and a repeated press during recharge. The second press showed a cooldown explanation rather than recasting.
7. Pause, reload, and saved-battle resume retained battle time, gold, and army state.
8. Save & return to title, followed by Resume battle, retained the current match.
9. Field guide during a running game paused the simulation and could be dismissed.
10. A complete unattended normal-difficulty loss at 2× speed reached the defeat screen at 01:30 simulated time. Results displayed 11 kills and 1 building. This measures a no-action baseline, not difficulty balance for an active player.
11. Defeat → Inspect battlefield → Return to title → New battle → Pause worked. The completed match was no longer offered as a saved game.
12. Final pause icon uses visible CSS bars. Pause/save/title/resume now resets the accessible label to “Pause game” correctly.
13. Final narrow-deck text explicitly says “Swipe for more buildings.”
14. Final accessibility smoke: welcome → guide → close → start works. Tab from the last guide control wraps to Close; Shift+Tab wraps back. Background controls are absent from the accessibility tree while a dialog is open. In-game guide → Escape returns focus to the battlefield and normal Pause still works.

## Found, fixed, and retested

- **Landscape clipping:** At 844 × 390, the app initially exceeded the viewport; building prices were clipped and Sound/Help were completely hidden. Retest measured app and command deck ending at exactly y=390, with all tools and card prices visible.
- **Poor phone starting camera:** Initial phone view showed empty lanes rather than the starting citadel and barracks. Retest of the new home framing showed both.
- **Offscreen emergency action:** Rally was initially the eighth horizontally scrolling card. It is now pinned and visible on narrow screens.
- **Small touch targets:** Portrait tool buttons were initially 32 × 32 and map jumps 27 × 27. Retest showed 44 × 44 portrait controls. Compact landscape intentionally uses smaller controls and still needs hardware usability testing.
- **Small-screen HP text collision:** At 320 × 568, the enemy citadel label collided with its percentage. Retest showed separation.
- **Unrendered pause glyph:** The original Unicode pause glyph appeared as an empty box. Final screenshot showed two visible CSS bars.
- **Stale pause accessibility label:** Resuming a paused save originally left the label “Resume game” while running. Final DOM inspection and save/title/resume retest returned “Pause game.”
- **Outdated field guide:** The original guide listed keys 1–5 and omitted the new unit counters. Retest showed 1–7 and wizard/gryphon guidance.

## Remaining release-gate work

- Test on real iPhone/iPad Safari and Android Chrome, including dynamic browser bars, safe areas, touch scrolling, drag thresholds, orientation changes, and multi-touch. The added multi-touch source guard was not exercised on real hardware.
- Assess keyboard-only play and any supported assistive-technology experience. Modal semantics and guide focus trapping were added and smoke-tested, but they do not establish full accessibility for the canvas game.
- Run representative first-time-player sessions. The normal no-input baseline collapses in 90 seconds; players unfamiliar with lane reinforcement may benefit from guided first-match placement or an explicitly recommended beginner mode.
- Test a victory path, every difficulty with active play, late-game crowd readability, long-duration performance, sound quality, and save migration across deployed versions.
- Conduct a separate packaged desktop/Steam readiness review. Store presentation, controls/remapping, controller support if intended, packaging/signing, achievements/cloud saves if intended, crash reporting, legal/licensing, compatibility, and sustained human playtesting are outside this UI pass.

## Automated checks

- npm test: initial 27/27 and final 33/33 tests passed during this review.
- npm run check: passed.
- node --check dist/render.js: passed.

The browser console entries inspected were extension metadata errors, not application-origin errors. This is not a comprehensive console-log audit.
