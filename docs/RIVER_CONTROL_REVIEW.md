# A River Between Us: control boundary review

## Contract

The new immutable `frontier-campaign-river-between@1` ruleset uses Classic@1, ordinary adaptive AI, the existing autonomous-air roster and citadel options, and legacy economy. It adds neither fog nor bridge income. Its campaign control rule is the existing cumulative-route-v1 policy with any two bridges, 60 cumulative seconds, a 600-second deadline, and the sole opt-in `endOnGoal:false`.

Default behavior remains unchanged when that flag is absent: Shared Crossing ends immediately at 60 seconds or its 270-second deadline. No published rule object or state schema was altered. Raw pre-change snapshots are retained outside the repository in local evidence; committed tests pin their SHA-256 values.

## Why this boundary

The engine already calls `campaignControlEnded` before updates, before individual steps, and after control advancement. Changing that helper is sufficient; engine.js needs no edit or campaign import. For the new rule, the helper continues to guard either core loss and the deadline, but does not mistake a completed sub-objective for a completed mission.

`advanceCampaignControl` continues sampling captures after 60 seconds only for the opt-in rule. Credit remains capped at 60. Ownership, captures, and contest indicators therefore remain current while the player finishes the command post objective. Ordinary AI and regeneration continue too.

The campaign evaluator owns the original command post identity and combined objective. Direct Game consumers must evaluate the mission outcome or use `advanceObjectiveBattle`, exactly as for existing destruction missions. The engine intentionally does not know which building is an authored objective. App simulation must stop at the first combined success, not wait for core destruction or the deadline.

## Admission

The battle codec explicitly binds `a-river-between-us@1`, `frontier-campaign-river-between@1`, and Classic@1 even for identity-only history rows. Existing constructor/save validation requires Classic, exact fixed-tick clocks, bounded credit/capture state, the deadline, and an unchanged strict state shape. Save-envelope admission additionally evaluates campaign completion; a capped timer with the post still standing remains resumable, whereas combined success is terminal.

## Verification

`tests/river-between-control.test.mjs` covers immutable old rule fingerprints, four exact old seeded simulation snapshots, partial-tick overlap, contested/aborted/symmetric captures, retained empty ownership, capped credit with live post-goal state and AI, no bridge income, 600-second terminal boundary, core guards, deterministic capped-state restore, malformed saves and exact history-only identity admission.

Initial run: 7/7 new control tests pass. Existing Shared Crossing control run: 12/13 pass, with only the additive progression count assertion needing integration update (24 current missions versus the old expected 23). All old control, terminal, saved-state, and deterministic route checks passed. Compound objective/wrapper and full release validation are covered by the mission and integration owners.
