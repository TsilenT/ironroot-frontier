# Automatic air: replacement browser contract

Prepared on 2026-11-07. The current user direction is automatic nearby-enemy pursuit, not building-issued flight orders. Existing manual engine rules and fixtures remain for their historical tests. The complete old browser spec is preserved verbatim at `qa/historical/manual-flight/flight-orders.spec.mjs.txt`, outside Playwright discovery. `tests/flight-browser-transitions.test.mjs` explicitly tests that archive. No obsolete case is silently skipped or marked expected-failure.

## Current coverage

`flight-orders.spec.mjs` now contains 12 logical current-contract cases. The name is retained so existing focused commands find the replacement:

- Wings and Stonegate: real paid 250-gold aerie placement, one-shot completion, no order controls, zero-time planning, Back/Forward through Options, explicit Start/Resume, exact passive continuation, and unchanged stars/settings/history/trial records.
- Classic, Twin Span and Long March: declared paid checkpoints advance through the real app clock, pursue the adjacent-road enemy and deal damage without an order. Full-state/RNG replay, actual costs, construction count, removed route labels and pause stability are asserted.
- Mid-chase save/reload, export, canceled import, confirmed import and explicit continuation use exact public engine replay and unchanged persistent profile domains.
- Fresh Open War and Timed War expose only current rule IDs, retain the normal eight-building roster and overtime choice, show the accurate automatic-air guide, and preserve identity across canceled/confirmed restart.
- At 320×430 and 667×300, ordinary inspector actions remain at least 44×44, visible, hit-testable, and strictly within every clipping ancestor. Native scrolling/focus is allowed; fractional clipping is not. Closing inspection does not buy again or advance planning.
- A newer tab's automatic chase cannot be overwritten by stale Save or restart.
- A completed Wings replay uses revision 4 without repeating teaching or changing progress/preferences/history.

`flight-pause-layout.spec.mjs` retains its strict 320×568 initial-action geometry, zero initial scrolling, 44px targets, keyboard focus trap and return tests. The removed Air routes disclosure is replaced by an explicit absence assertion and repeated real Options/Field guide keyboard round trips. Its original no-tolerance geometry oracle is unchanged.

This is 13 cases × four existing profiles = **52 prepared instances**, with no added skips. Existing shared input, navigation, profile, viewport and persistence suites continue to apply.

## Fixture provenance and local results

`autonomous-air-fixtures.mjs` starts at ordinary 420 gold with the default barracks. Public build calls pay 250 for the friendly aerie and 210 for the enemy Rootwarden lodge. Only normal 0.05-second ticks produce each checkpoint. There is no hidden state injection, extra income, free building, forced outcome or live application hook. Synthetic existing profile records in the browser suite are disclosed persistence sentinels, not earned wins.

`npm run check:automatic-air` passes syntax and three paid checkpoints. The new Node validator makes 360 exact continuation comparisons and verifies backup admission and four ordinary 17-damage hits after six seconds. Eight retained archive/strict-geometry Node tests passed. These are not browser results.

The broader browser package's `npm run check` also passed after its owner corrected the stale fresh-Emberwatch revision-2 expectation to revision 4. The final preflight log was inspected; this remains Node/source/fixture validation, not browser execution.

One bounded attempt used existing Playwright 1.57.0, isolated test profiles, the ordinary loopback QA server and `/usr/bin/chromium` with Chromium sandbox explicitly enabled. The server started, but Chromium failed before page creation with `process_singleton_posix.cc:297 ... socket() failed: Operation not permitted (1)`, alongside a crashpad startup error. There were **zero executed test bodies and zero browser passes**: three launch failures, one launch interrupted by the failure cap, and 48 unrun instances. No sandbox disabling, alternate transport, installation or retry workaround was attempted. The concise source/evidence record is `autonomous-air-validation.json`; its raw ignored report is in `test-results/automatic-air-results.json`.

The authorized normal cloud runner must use the package's pinned Playwright 1.65.0, run `npm run check`, repeat discovery, execute `npm test -- flight-orders.spec.mjs flight-pause-layout.spec.mjs`, and then run the applicable shared/full suite. Discovery and source inspection do not establish layout, pointer, focus, physical-device or balance behavior.
