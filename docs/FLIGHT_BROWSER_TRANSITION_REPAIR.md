# Flight browser transition setup repair

This repair belongs only to the held local next candidate. The frozen cloud
candidate `598925cbfea60acc734513d05dc14eeafe80a57d` and its running gate were not
changed. The reported focused gate result was 113 passed and 11 failed; that is
evidence about the frozen candidate, not a pass claim for this repair.

The paid Wings/Stonegate sequence opened Options to save each exact planning
checkpoint, then tried its next order without reopening the compact inspector.
Production intentionally closes that inspector when pausing. The test now taps
the actual aerie again when its inspector is hidden. It does not open Build,
which would clear the current selection, or reveal controls by changing state.

On desktop the inspector can remain visible while its buttons await the next
HUD update after Options closes. The test now waits for the requested control to
be visible and enabled before ordinary scrolling/focus and the unchanged full
reachability check. Native Space requires confirmed South focus first. Its old
350 ms delay is replaced by a read-only MutationObserver that waits for a later
flight-status render, then verifies the original node still holds focus.

Every paid-order exact checkpoint comparison remains, including time, gold,
units, RNG, accumulator and construction costs. Free repeated orders, native
Space, campaign bytes, Start, save/reload and passive continuation remain
required. No browser case was removed, skipped or marked expected-failure.
The short 320×430 North clipping failure still requires 100% visibility and is
not covered up by the transition repair. Runtime and CSS changes are separate.

The companion pure harness checks exercise collapsed-inspector routing,
desktop enabled readiness and a permanently disabled control, plus source
contracts for the retained native-input/state assertions. They do not establish
browser visibility, input, focus, timing or clipping correctness. Authorized
browser execution of the combined final candidate is still pending.

Local checks passed:

- Syntax: `node --check qa/browser/flight-orders.spec.mjs` and
  `node --check tests/flight-browser-transitions.test.mjs`.
- 45 pure tests, zero failures: the transition harness, flight-orders view,
  campaign teaching, flight-order engine and flight-profile protocol suites.
- Fixture validation: 56 authored UI checkpoints, 3,920 exact continuation
  comparisons, backup admission, historical revisions and protocol 5.

No browser, server, upload, merge or deployment was run for this repair.
