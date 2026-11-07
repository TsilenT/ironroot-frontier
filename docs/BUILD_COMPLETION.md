# Build-order completion

A successful building placement now finishes the current order. The build card
and placement cursor clear, and mobile returns to the closed Build drawer.
Choose another building for another order. Mouse Shift-click keeps the same
building armed only while another purchase is affordable. This follows the
actual pointer type, not viewport size: a narrow desktop window still supports
mouse Shift-click, while touch and pen never repeat from a modifier. Controller
confirmation uses the shared one-shot default.

Rejected occupied, outside-territory and unaffordable placements leave the
selection available for correction and do not spend gold. Teaching remains
frozen after paid construction; completion does not press Resume, change save
identity or persist UI-only placement state. Right cancel, middle pan, gesture
interruption and held-input scope boundaries are unchanged.

## Validation on this isolated source

- Node 24.22.1: `npm test` passed 978 tests, failed 0, with the existing optional
  desktop-dependency skip (979 discovered). Five new tests execute the actual
  app placement handler against the real engine, including exact unchanged
  engine bytes for all three rejection types.
- `node scripts/check.mjs`, `node scripts/verify-runtime.mjs`, and the browser
  package's `npm run check` passed. Runtime version/cache identity is unchanged.
- New `qa/browser/build-completion.spec.mjs`: nine logical cases, 36 profile
  instances, including nine intentional non-desktop exclusions for the three
  mouse-only cases. Discovery succeeded using preinstalled Playwright 1.57.0.
- Browser execution is **not verified** here. One normal sandbox-enabled
  Chromium 156.0.8078.79 launch failed before page load with
  `process_singleton_posix.cc: socket() failed: Operation not permitted`.
  No retry, sandbox bypass or installation was attempted. The package-pinned
  Playwright 1.65.0 combined-source browser gate remains required.

The new browser cases use the actual app, trusted mouse/touch/pen input, the
standard Gamepad API fixture, normal UI save writes and restored engine saves
as the state oracle. They cover regular placement, explicit mouse repeat and
release, narrow-desktop mouse repeat, affordability termination, touch/pen with
Shift, controller with Shift, the actual mobile drawer, rejected placement,
frozen teaching, and a held gesture crossing a visibility/pause boundary.

Existing tests that assumed automatic repeated orders were adapted explicitly:
regression and maps reselect before the occupied-site attempt; maps reselect
before a separate controller order; campaign-onboarding and battle-report no
longer press Cancel after success; contextual-coaching now asserts completion
instead of silently cancelling. The shared-mobile-shell Node case deliberately
selects a second order before checking its survival through help. Existing
cost, building-count, occupied-site, upgrade, salvage and save assertions remain.

No campaign layout, teaching-entry policy, runtime version or publication is
included in this patch.
