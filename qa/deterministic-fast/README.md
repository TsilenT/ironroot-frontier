# Optional deterministic gameplay checks

From `qa/browser`, after the existing `npm ci` / Chromium setup:

```sh
npm run test:deterministic-fast
npm run test:deterministic-real
# The same two cases on one profile:
npm run test:deterministic-fast -- --project=desktop
```

Both commands run exactly two cases across the four existing profiles, with one
worker and zero retries. The fast command is a targeted development check. Adding
it does **not** reduce the unchanged full-release-gate runtime. Existing `npm
test`, all other pre-existing scripts, `qa/browser/playwright.config.mjs` and the
original real-time tests are unchanged. Default discovery remains **1,596
instances**. This directory is outside that config's test directory, and
`cases.mjs` also avoids its default spec filename pattern.

These counterparts are adapted from the classic paid continuation in
`qa/browser/flight-orders.spec.mjs` and the ordinary siege completion in
`qa/browser/training.spec.mjs`, at source commit
`342d8b594091d323f2c0e92d9a170de0fcbdc2b9`. The earlier bounded benchmark established
the public-engine replay and passive training-observer approach; the command
measurements in `evidence.json` cover this reviewed slice with the restored
reference-case assertions and normal Playwright tracing.

## What each command proves

- The flyer starts from the existing fully paid fixture: ordinary 420 starting
  gold, a paid 250-gold aerie and 210-gold opposing lodge, default barracks and
  ordinary ticks. Native Resume, Front and Pause actions remain. The original
  pursuit, damage, gold, construction count, removed-control selectors, actual
  canvas-label and stable paused-save checks remain. Each full saved envelope is
  compared with ordinary replay at its **actual observed tick**, including RNG,
  units, buildings, effects, projectiles, scenario and outcome.
- The siege case pays the actual foundry cost through native controls, preserves
  the zero-time instructions, rendered nonblank canvas, objective text/time,
  completed-screen stability, screenshot, unchanged profile/storage and
  Next-lesson checks. The matching Node oracle boots the default lesson before
  selecting siege, retaining `attemptId: 2`, seed 12012 and
  `frontier-authored-air-local`. Full captured game/objective snapshots must match
  ordinary fixed-step replay. Only an explicitly bounded fractional RAF
  accumulator below 0.05 seconds is normalized.
- The real command additionally checks the natural siege wall-time lower bound.
  The original uninstrumented real-time test, including its explicit wall-time
  assertion, remains the release pacing proof. Accelerated results are never
  labeled natural pacing coverage.

Native Pause obtains the flyer save in both counterparts. Its subsequent 400ms
stability hold uses real host time with callbacks running; it is not shortened by
the virtual clock. The lesson's 250ms instruction hold is likewise host paced,
and its completed screen remains observed for 400ms in real time. The original
held-input, pause/lifecycle, Back/reload, controller, viewport safety, offline and
service-worker tests remain untouched and real-time.

## Clock and observer limits

The clock is installed/paused on an empty document after natural-time fixture
seeding/reload, before loading the app again. Only the two deterministic gameplay
paths use callback-preserving `clock.runFor(250)` increments. Ordinary native
click/tap actionability is retained; a bounded `runFor(16)` pump lets those actions
observe stable RAF geometry. No giant timestamp jump, dropped fixed tick,
injected win, runtime/stat/dt-cap edit, forced DOM action or new skip is used.
The existing 0.05-second simulation ticks and per-tick objective checks remain.

Training deliberately has no ordinary saved battle or live session global. Both
clock modes therefore use the **same** passive public `snapshot()` / `update()`
observer. It calls each original once with unchanged arguments/receiver, returns
the original result, records clones only, and adds no timers or RAF requests. The
live receiver stays in a closure. Read-only overhead batches audit complete game
and objective state before/after; per-tick public-engine comparisons additionally
guard against observer side effects. Signed overhead estimates include browser
round-trip noise; full evidence readback cost is also recorded.

This helper is deliberately limited to these two cases. Do not use it as a clock
adapter for lifecycle or timing-sensitive input tests. Service-worker scheduling
is not accelerated by game speed. No whole-pipeline speedup is claimed.

## Reports and reproduction

Outputs normally go to ignored
`qa/browser/test-results/deterministic-{virtual,real}/`, with HTML/JSON reports,
rendered screenshots and complete state evidence. Set the absolute
`IRONROOT_DETERMINISTIC_OUTPUT` path to retain separate runs. The two commands use
the same loopback-only static dist server on port 4291 and refuse server reuse.
They reuse the browser package's pinned Playwright 1.65.0 installation.

`run.mjs` records host time around the entire Playwright child, including startup,
setup, gameplay, readback/oracles, reports and teardown. The recorded comparison
also measured the enclosing **npm process from spawn through exit** and sampled
dedicated-container resources. It ran all four profiles in real / fast / fast /
real command order, without overlapping CPU-heavy work. Case segment timers use
Node host clocks; their `totalMs` is an active-case diagnostic, not complete npm
command elapsed time. Exact command wall times, proof hashes and scope are in
`evidence.json`; individual case timings are in `case-metrics.csv`.

| Full optional command | First run | Bounded repeat | Results |
| --- | ---: | ---: | --- |
| Real-time control | 175.87s | 175.92s | 8/8 each |
| Deterministic fast | 66.71s | 66.79s | 8/8 each |

The mean command improvement is **2.64×**, or **62.1% shorter**, for this slice.
All 32 final instances passed with zero skips/retries; all 16 cross-mode pair
comparisons passed. The same Playwright 1.65.0 / Chromium 155 / Node 24.22.1 setup,
one worker, four-core quota and 16 GiB container were used. QA fixture/harness
preflight and new-module syntax checks passed. The unchanged full browser matrix
was not executed for this optional test-only change; no pipeline speedup is
claimed.

An initial integration trial passed 7/8 fast instances and exposed a blank canvas
at the desktop instruction transition: native input had synchronously resized
and cleared the canvas after the last pumped RAF. The helper now delivers the
next already-scheduled renderer frame after input, preserving the original
`>30`-color proof. Three focused siege repeats and both final four-profile fast
runs passed. This preliminary failure is retained in `evidence.json`; no renderer
or other production code changed.
