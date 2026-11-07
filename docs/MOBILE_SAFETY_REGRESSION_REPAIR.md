# Mobile safety regression repair after 46d324b

## Evidence and scope

The unchanged exact-candidate report at
`qa/cloud-46d324b/Ironroot-PR2-46d324b-QA-report.json` records
1,568 passed, 11 failed and 49 intentionally skipped browser instances on
`46d324b94754fe88ed9d324456f284af0aa4537d`:

- Three legacy agency cases inspected All buildings while its compact drawer
  was closed. The case now opens the actual Build control first. Its original
  two-card/hidden-Foundry, paid unmarked Archery, Hide, frozen clock, Options,
  focus return, explicit Resume and final composition checks remain. Frozen
  gold is additionally checked across Hide and Options.
- Four 320×568 income cases failed the original text-center occlusion check
  after safe-area insets. The tall layout left only 195px of battlefield and
  opened the safety overlay. The original text bounds, no-collision,
  no-occlusion, 48px/72px header and income-height assertions remain.
- Four 320×370 coached cases became falsely ready after pausing. The confirmed
  Hide/minimap overlap disappeared during paused grid reflow, then returned
  after Resume. The original blocked/disabled assertion and 320×400 explicit
  recovery remain; neither boundary was loosened.

## Added coverage

`portrait-income.spec.mjs` checks padding addition and removal without a
viewport resize or dispatched resize event. It requires the correct short/tall
layout, unoccluded income, 44px controls, safe world/control bounds, an advancing
clock and no safety interruption. Two additional cases install insets before
mobile battle entry and before a desktop-to-mobile transition.

`short-coached-portrait.spec.mjs` removes the old 431px/430px resize nudge. It
retains the 257px inset and 278px restored battlefield heights. The 370px case
checks three 1.1-second frozen intervals, exact saved state and clock, disabled
Resume, active-dialog semantics, foreground button hit targets and native Tab
focus trapping. At 400px it requires explicit Resume, then two further clock
advances with valid geometry and no re-pause.

A third added browser case holds the native Sound control while bottom padding
is added or removed. The control center stays fixed, so a stale gesture cannot
pass merely because the target moved. A fresh 350ms held gesture at stable
insets must work across HUD updates. Both stale releases must be canceled.

`mobile-safety-evidence.mjs` contains read-only DOM probes and a modal transition
observer. It retains committed intermediate states so a ready/blocked flip or
re-pause cannot disappear between periodic samples. The original short-layout
geometry probe was extracted unchanged. No engine-state hook, forced click,
viewport nudge, widened tolerance, new skip or changed test deadline is used.
Three dependency-free Node tests cover the observation buffer only, not layout.

## Verification status and next gate

Local syntax checks for all three changed specs and the new helper passed.
`node --test tests/mobile-safety-evidence.test.mjs` passed 3/3. No browser was
launched for this regression-authoring task. These results do not establish
that the runtime repair passes Chromium or a physical device.

Run the three focused specs against the final integrated source in the
browser-authorized cloud environment, then run the complete matrix with its
existing deadlines and skips. The focused files add three logical cases,
therefore twelve instances across the four unchanged projects. Record actual
counts, source commit and any further failures; do not substitute Node checks
or these expected discovery counts for a browser pass.
