# Narrow post-run validation and provenance

2026-11-07. All 120 paid outcomes were generated at
ff760756df5e9a99f0c349ebcff17344b2f60338 and remain unchanged in results.json.
No additional paid games or parameter sweeps were run.

Independent review requested explicit frame fairness and actual-damage delay
checks. Added synthetic tests exercise distinct queued extra-arrow targets on
both sides, a target already scheduled to die, applied versus requested damage,
no overkill/repeated bounty, and queued/zero damage versus actual base damage
resetting regeneration's delay. Existing tests cover single targets, exact range,
cadence, each target class, and before/after-300 damage.

One timed-only boundary was aligned exactly to the released engine: suppress
regen when `forcedDecay && time > 420`, the same condition that applies decay.
The first prototype used `time >= 420 - 1e-8`, which could suppress one heal step
at the exact mathematical 420 boundary before decay. The new synthetic boundary
fixture explicitly tests 420 and 420.05. This is not an outcome-driven balance
change. Every paid game used frontier-air-local-open, so this predicate cannot
change any recorded paid trajectory; no replay is needed. Original source and
contract outputs remain available at the first-run Git commit.

Damage history is tracked from the start of each prehistory and copied into
all branches. Regen also waits eight seconds from purchase: the first eligible
step begins eight seconds after max(purchase time, last actual damage time).
It never resets from a merely queued strike, and is available in timed mode
before decay starts. No lifetime healing allowance exists in the tested paid
hypothesis. The superseded finite reserve has synthetic fixtures only.

The finite-to-recurring correction is dated by the immutable 2026-11-07 Git
commits: finite fixtures at 9c1ab98 (21:48:00 UTC), corrected hypothesis at
ff76075 (21:48:49 UTC), before the paid outcome invocation. The latter's
preregistration SHA-256 is preserved in results.json.
