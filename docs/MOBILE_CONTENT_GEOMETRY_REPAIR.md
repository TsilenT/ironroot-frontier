# Mobile content geometry repair

Local, unreleased work in `ironroot-flight-layout-repair-next`, based on PR #2
source `46d324b94754fe88ed9d324456f284af0aa4537d`. This record covers only the
three mobile runtime repairs and their focused Node regressions. It is not a
browser, physical-device, deployment, or publication approval.

## Runtime changes

- `dist/app.js` applies the mobile shell classes before reading computed
  padding. Short portrait now uses content height below 560 CSS pixels while
  the root remains fitted to the outer visible viewport. The portrait and
  landscape predicates are unchanged. In the confirmed 320×568 case with
  top/bottom/left/right insets 12/21/8/8, usable content is 304×535 and the
  existing coached short layout provides a 200×383 battlefield.
- `dist/mobile-battlefield.js` includes the effective numeric content bounds in
  the existing fit signature. The current safety checks therefore detect
  padding-only changes, including movement with unchanged content dimensions,
  without a resize event. Equivalent padding and stable frames do not repeatedly
  invalidate input. `syncProtectedLayout` reports whether it already interrupted
  input so the safety caller does not repeat that operation for the same change.
- `dist/styles.css` gives the viewport safety overlay z-index 10. Its position
  after Pause and before the other regular dialogs makes its painted precedence
  match its logical precedence. Direct teaching children occupy explicit
  column 1/2, row 1 cells, so hiding the hint during Pause cannot move its actions
  into a falsely safe position. Actions reparented into hidden-hint navigation
  do not match these direct-child selectors.

No simulation, save schema, gameplay timing, zoom behavior, 212px world-height,
128px world-width, or 44px control requirement was changed. A genuinely unsafe
320×370 coached layout stays paused and cannot offer a false Ready state.
Recovery still requires explicit Resume.

## Focused checks

`node --test tests/mobile-content-geometry.test.mjs`: **10 passed, 0 failed**.
The tests execute actual app startup, layout, safety, pause and HUD functions,
using the existing DOM fixture with a test-local source-derived content-grid
provider. They cover:

- First inset launch and restore, and the first desktop-to-phone transition.
- Exact 560px content boundary, visual viewport offsets and preserved zoom.
- Padding-only addition, origin movement and removal for mouse, touch and pen.
  Each change calls `interruptMobileInput` once, rejects held releases, and
  permits fresh gestures over 120 stable safety checks per change.
- Stable numeric helper signatures across equivalent CSS padding and desktop
  exit/re-entry.
- Manual pause preservation, repeated unsafe 370px HUD cycles, 400px explicit
  recovery and returning to unsafe geometry without changing saved game state.
- Negative mutations reproducing old outer-height selection and the hidden-hint
  false Ready state, plus scoped CSS cell and overlay-order assertions.

Before adding these cases, the existing focused mobile, pause, coaching and
hidden-hint group passed **44/44**. `node scripts/check.mjs` and
`node scripts/verify-runtime.mjs` also passed on the repaired mobile runtime.

The grid provider and negative auto-placement model are deliberately limited
arithmetic checks, not browser CSS layout or hit-testing evidence. Native/browser
review and the final combined-source test gate belong to the parent task.
The intermediate full Node run during parallel work reported 1,222 passed,
9 failed and 1 skipped (1,232 total). All nine failures were the existing
`protected-objectives-ui.test.mjs` VM harness missing the newly used browser
`getComputedStyle` global. Its approved narrow fixture repair imports/passes
`insetViewportRect` and supplies zero CSS padding, without changing assertions
or timeouts. The dedicated content tests above separately distinguish real
nonzero and dynamically changing inset values.

After that fixture repair, running `tests/protected-objectives-ui.test.mjs`
and `tests/mobile-content-geometry.test.mjs` together passed **41/41**, including
all nine previously failing cases. The final combined-source suite remains the
parent task's gate.

## Mobile runtime hashes (SHA-256)

- `dist/app.js`: `3c6f021b864c9eea3311e159efb0357fe5f9b9370691368619ee1fd9392d1398`
- `dist/styles.css`: `f9a133decc1f3aef5515af2b7d796f765c4eb2b01fedfa3271ad71e896bb340f`
- `dist/mobile-battlefield.js`: `1c2a0d492e5bbaaca7e7788b97b18edd2d2993a967235014051e32dcd9d605b3`
- `tests/mobile-content-geometry.test.mjs`: `037fa102d398a29216b38f6a478fd4886c8c6cd3a3ecc80fce5c8e1be01218f8`
- `tests/protected-objectives-ui.test.mjs`: `60802a5802fb27db9cc8c29c07b948fa21ce5fe0fcf3f747d5e5b92f1a347fb9`
