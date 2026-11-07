# Synthetic controller input hardening

## Evidence and scope

The exact `598925cbfea60acc734513d05dc14eeafe80a57d` cloud report in
`qa/cloud-598925c/Ironroot-PR2-598925c-QA-report.json` records test-generated
controller holds and cursor drift. The original failed gate remains failed.
Its unchanged focused reruns are evidence about those failures, not a browser
pass for this revision.

- Discrete bumper input stayed pressed for roughly 331 to 450 ms. It could
  cross the production controller's intentional 350 ms repeat delay, changing
  Mint to Archery and then Barracks at 202 to 204 gold. All four unchanged
  bumper cases passed with two workers.
- The shoulder case similarly repeated. The subsequent explicit Archery
  pointer click toggled an already selected Archery off. It passed unchanged
  on rerun.
- Steering observed a cursor within its 8 px stop threshold, then sent a
  neutral command through a separate runner round trip. Continued synthetic
  movement left it 16.877 px from the target, failing the unchanged 15 px
  bound. That case also passed unchanged on rerun.

Only `accessibility-backup.spec.mjs` and `build-completion.spec.mjs` adopt the
new shared helpers. No runtime, cost, selection, purchase-count, no-extra-build,
or target-distance assertion is relaxed. No timeout is increased, and no
force click, retry of a purchase, skip, or expected failure is added. Other
browser consumers, including `map-controller-helpers.mjs`, are unchanged.

## Input contract

`qa/browser/synthetic-gamepad-provider.mjs` installs only a standard Gamepad
API double. Its command state belongs to the test, not to the application.
The real controller polling, repeat handling, cursor movement, build selection,
placement validation, and purchases remain in charge.

- `padButton` is a discrete tap. The provider returns one pressed snapshot
  and releases its own synthetic button immediately after copying that
  snapshot. The next sample is neutral even when the runner or a later frame
  is delayed. Copied axes and button objects prevent that release from
  mutating the snapshot the application is consuming.
- `holdPadButton` is deliberately different. It stays physically pressed
  through at least two samples and the explicitly requested duration before
  neutral input. Both existing 650 ms Start/Resume confirm holds remain real
  holds. Production repeat behavior is unchanged and separately tested.
- Each new command follows three observed neutral polls so pointer-triggered
  resets and context changes can establish their real neutral baseline.
- Steering reads `#controllerCursor.getBoundingClientRect()` during each
  provider sample, then supplies the next ordinary stick/precision input.
  Once the rendered cursor is within the original strict 8 px stop threshold,
  that very sample is neutral. A late runner response cannot keep an obsolete
  direction held. The provider never writes cursor coordinates, styles, app
  state, or simulation time. Missing geometry stops synthetic input and fails
  arrival rather than pretending that the target was reached.
- After arrival, the helper observes neutral polls and still requires the
  original strict distance of less than 15 px. The default assertion timeout
  is used without increasing any configured timeout.

## Local verification

The focused dependency-free Node run passed **62 tests, zero failures or
skips**, including 17 new provider/consumer contracts:

```sh
node --test tests/synthetic-gamepad-provider.test.mjs tests/controller.test.mjs tests/build-completion.test.mjs tests/browser-harness-regression.test.mjs
node --check qa/browser/synthetic-gamepad-provider.mjs
node --check qa/browser/synthetic-gamepad-helpers.mjs
node --check qa/browser/accessibility-backup.spec.mjs
node --check qa/browser/build-completion.spec.mjs
```

All four syntax checks passed. The provider is serialized into a Node VM as
it is for browser initialization. Tests use the production `GamepadInput`,
`moveCursor`, and affordable-card ordering with a read-only DOM geometry
double. They cover 16, 331, 350, 450, and 2,000 ms tap delays, intentional
bumper repeats, held-confirm scope changes, and steering with 16, 80, and
450 ms frame gaps. After reaching the target, later frames up to 10 seconds
apart cause no drift without any further runner release command.

These are Node/source checks, not browser or physical-controller evidence.
No browser, server, upload, merge, or deployment was performed. Browser
execution of the revised helpers remains **pending**. The final combined
candidate must rerun the assigned specs across all four configured profiles
in the authorized cloud runner, including the previously failing cases and
the deliberate held-confirm/click-through case. The complete candidate gate
remains separate from these focused checks.

The parent integrates the two new helper syntax checks and the provider
contract test into the shared browser package preflight; that package is not
edited by this scoped change.
