# Browser timing oracle repair

The exact `598925c` cloud report at
`qa/cloud-598925c/Ironroot-PR2-598925c-QA-report.json` records two test-oracle
faults, not evidence of incorrect payment or changed legacy simulation:

- Placement reached 272.75 gold: `420 - 175 + 5 × 5.55`. One Archery range
  existed and the occupied-site attempt was rejected. The old fixed 270-gold
  bound stopped the test before its upgrade and salvage assertions.
- The v0.12 Far Beacon save resumed from tick 13, time 0.65 and accumulator
  0.049999999999999996 to tick 27, time 1.3500000000000005 and accumulator
  0.04989999999999964. Adding `.05` to the starting remainder made the old
  oracle execute two ticks on its first update. Independent fourteen-tick
  replay matched every simulated field, RNG value and identity field.

The placement case now uses ordinary Pause saves before placement, after the
paid placement and after the occupied-site attempt. Exact gold expectations
deduct one normal building cost for the first interval and zero for the second,
then add 0.25 gold for each observed fixed tick. Each interval independently
checks the saved clock by repeated `.05` addition, unchanged kill counts,
five-gold income, no owned mines and the number of buildings constructed.
No wall-clock allowance or widened gold tolerance is used. Rejection, one-shot
placement, upgrade and salvage assertions remain in the browser case.

The passive oracle completes the next tick with
`update(.05 - replay.accumulator)` and checks exactly one tick and zero residual
after every call. Both saved accumulators must independently be finite and in
`[0, .05)`. Their difference plus fixed-tick elapsed time must be nonnegative
and below the existing three-second bound. The full serialized simulation,
including RNG, units and identity, still compares exactly; only the separately
bounded RAF remainder is supplied by observation. Production-upgrade evidence
also retains both continuation summaries and the second resumed save.

`tests/browser-timing-oracles.test.mjs` reproduces the measured Far Beacon
clock pair using the immutable historical engine, tests additional frame
patterns and rejects altered state, identity, RNG, ticks and remainders. It
also executes the browser case's actual economic assertion block against pure
engine checkpoints, including delayed income and negative payment controls.
Run it with `node --test tests/browser-timing-oracles.test.mjs
tests/phone-browser-evidence.test.mjs tests/browser-harness-regression.test.mjs`.

These are pure tests and syntax checks only. No new browser execution, runtime
change, upload, merge or release is part of this repair. The final combined
candidate still requires its exact-source browser gate.
