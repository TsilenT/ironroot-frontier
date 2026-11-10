# Leave No Road Closed: registered-air regression coverage

`supportsAutonomousAir` requires both the autonomous-air movement policy and
exact identity in `RULESETS`. Equal descriptors are insufficient. The historical
`qa/leave-no-road-closed/scenario.mjs` binds a clone under an unregistered QA ID;
its dynamic `Game._step` air gate is therefore disabled. That source and its
frozen experiments are preserved unchanged.

The nine existing production/prototype comparisons establish equality only for
their particular known-input trajectories. They do not establish equivalence of
every identity-gated feature. The old native manual control result used the QA
clone and is not full registered-production autonomous-air evidence. This says
nothing about a live defect or whether the production control route is possible.
The single unchanged registered-production manual control attempt ended in a loss
and leaves that control route unvalidated. No flyers were observed and command
timing differed from the historical QA run, so that result cannot be attributed
to autonomous air and does not prove the control objective impossible.
Registered-production scripted core wins remain valid separate evidence.

`tests/leave-roads-registered-air.test.mjs` checks both actual Road factories
against the registered rules object. Its explicitly synthetic, isolated unit
fixture then exercises adjacent-road target acquisition, physical pursuit and
damage through native `_step`. Engine restore and the ordinary campaign battle
codec retain registered identity, the active target, fractional time and exact
four-second continuation. The fixture clears the authored armies and delays AI
only within the test; it is not a natural mission attempt, paid route, human
playthrough, balance result or full feature certification. Rules, mission setup,
purse, seed and objectives in production remain unchanged.

This change adds tests and clarifies coverage claims only. It does not alter the
historical prototype/evidence, runtime, package/version/cache or campaign admission.
