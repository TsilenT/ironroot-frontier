# Independent review of phase-one test expectation repairs

Compared the two modified existing test files against the supplied v0.20.2 source. No runtime edit was made for these repairs. No broad suite or 135-cohort rerun was performed by this reviewer.

## Approval

The changes are legitimate additive expectation maintenance and do not weaken the existing legacy behavior claim.

### `tests/citadel-options.test.mjs`

- The exact ordered list of citadel-enabled rules adds only the new fog identity. No prior identity is removed and no permissive filtering replaces the list assertion.
- Added assertions require QA-only, experimental, Skirmish-only, open-ended, legacy economy/no bridge income, and deeply frozen fog/rules records.
- Existing units, buildings, spell, movement, endgame, economy and citadel definitions are compared exactly against current ordinary citadel Skirmish.
- Classic construction must succeed; all four other public/authored maps must reject.
- The remainder of the prior file is unchanged.

### `tests/autonomous-air-legacy-parity.test.mjs`

- Four named literal transforms cover only the reviewed observation prelude, observation-aware citadel choice, observed troop state selection and observed structure selection.
- Each literal must occur exactly once before replacement. No broad regular-expression stripping, substring wildcard or silent optional replacement was added.
- For frozen identities, `supportsFog` is false both on the pinned original definitions and the current registry bindings. Thus observation is null, the troop state remains `this.state`, and the structure fallback is the prior full-information expression.
- The non-observation citadel path still calls the existing helper; the original frozen identities have no citadel option, as separately asserted.
- After these narrow transforms, the existing exactly-once citadel gate, exact `FrozenGame._ai` source equality and exact floating-point fallback line assertion remain.
- All original 135 paid-action/AI/movement/RNG/cross-restore cohorts and their count assertion are byte-for-byte unchanged.
- The predecessor fixture hash checks remain unchanged.

## Result accounting

The parent's initial aggregate discovered 1,566 tests: 1,563 passed, these two stale expectations failed, and one existing optional desktop check skipped. The core worker then reported all 17 cases in the two repaired files passing. The existing 135 behavioral cohorts had already passed in the aggregate. There was no second full aggregate run at this point, so the correct statement is **initial aggregate plus a passing affected-file recheck**, not a newly green complete aggregate.
