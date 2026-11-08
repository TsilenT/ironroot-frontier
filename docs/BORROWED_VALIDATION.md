# Borrowed Ground validation

This is the local v0.25.0 candidate on source `870d3576346397e684c7d30a91f57980fda9a103` (released v0.24.1). It adds one Chapter 6 mission after Lanterns on the Water. Remote CI, merging and publication are separate gates.

## Automated checks

- Final aggregate: **1,832 passed, 0 failed, 1 optional desktop-tooling skip**, in 108.0 seconds. There were 1,833 discovered tests.
- Syntax and release inventory passed: **58 runtime files, 1,141,127 bytes**. Exact runtime hashes are in `qa/borrowed-ground/runtime-final.json`.
- Browser harness source and fixture preflight passed. This was **not** a Playwright run or a full browser matrix.
- New mission, map admission, profile and UI tests cover 38 cases. Independent UI/legacy checks passed 52 cases, and the campaign/restart/mission group passed 45. These groups overlap the aggregate and are not additional unique tests.

The first aggregate had three fixture failures. A non-flight ruleset fixture supplied Classic instead of the new mission-only map; two historical Lanterns fixtures accidentally included the new additive identity/completion. Corrections retain the original hash, rejection and preservation assertions. The two targeted suites then passed 22/22, followed by the final aggregate above. The independent map review records the baseline comparison. Failed and final raw logs remain outside the repository.

## Review findings resolved

The mission title's Field Guide initially constructed the new ruleset with the default Classic map. It now receives the mission's actual map and roster. The regression exercises the real title and start paths; no pairing guard was weakened.

The Borrowed result evaluator now rejects wins recorded after the disclosed 600-second deadline, including post-deadline citadel destruction. Exact-deadline victory and victory at 1 HP remain valid; own-citadel defeat takes precedence. This boundary change applies only to the new mission and leaves historical outcomes unchanged.

The new map is confined to its exact campaign identity. Old campaign records and public Skirmish maps remain intact. Profile protocol 16 fences old tabs while retaining campaign progress, preferences, records and ordinary saves. No AI algorithm, fog behavior or bridge-income rule was changed.

## Paid gameplay evidence

One authored formation was tested with four ordinary paid policies across three seeds, plus one idle run. Commands are limited to one every five simulated seconds, including salvage and Volley. Keeping the inherited camp won 3/3; selective outer-tower replacement won 3/3; rear siege support won 2/3; the tested greedy-mine route lost 3/3. Idle lost. Enemy construction and upgrades remained adaptive and paid, and both ledgers reconciled within 1e-6 gold.

These thirteen runs establish feasible alternatives, not human difficulty or exhaustive balance. Every sampled victory retained full citadel health. No health floor or artificial close outcome was introduced. See `BORROWED_GROUND_DESIGN.md` for exact prices, formation, timing and policy limits.

## Native acceptance

The independent desktop pass and its limitations are recorded in `BORROWED_REVIEW.md`. It uses an isolated session-storage preview with synthetic prerequisite records and ordinary paid checkpoints. It does not touch a production profile, award earned progress to a user, or substitute a checkpoint continuation for a full browser-played mission.

## Remaining limits

Physical phones, PWA/offline behavior, non-Chromium browsers, full screen-reader/controller usage, subjective audio and sustained rendering performance were not newly verified. Compact canvas fixtures are geometry checks, not device tests. No full browser matrix was rerun for this additive encounter.

Source assembly is sparse: the release handoff must preserve every unlisted remote base path, including historical evidence. New screenshots and raw run logs remain outside the source repository under the requested lean-evidence policy.
