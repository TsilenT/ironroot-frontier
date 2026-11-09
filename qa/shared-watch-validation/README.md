# Outcome-informed v2 validation: pending implementation review

Epoch1 remains CUT. This QA-only slice proposes the narrower middle/south
safety-versus-advancing tradeoff from proposal REV3. No new validation seed has
run. PLAN.json is a proposed execution contract, not permission or admission.

Base: PR41 head53a01352cf76bba4cf45119d69aebb7de7483c8f,
tree283c901ba50ff7c8b14e2ec7d0f2b50b9845010b. Sparse omissions remain retained.
Source002's workspace/commit are untouched. In this new workspace only, the old
QA runner gains an optional per-instance passive position observer and reuses
one private executor behind a separate guarded v2 entrypoint. The epoch1 default
entrypoint keeps its original approval/seed checks and position-free output.
Factory, engine, player policies and epoch1 PLAN bytes remain exact.

The separate adapter binds the v2 plan/seeds/policies, source closure, actual
Node/platform/workspace and exact invocation. Missing approvals, wrong seeds and
existing/inside-repo output refuse before games. OUTPUT.stop is checked every100
fixed ticks and between cases; signal handlers yield between cases. Every raw is
written before record evaluation; errors retain partial records and stop without
retry. Save/restore probes have no observers and cannot pollute main-case logs.

Analysis validates real ordinary spawn identity/type/producer provenance, stable
fire-to-effective-damage joins and event-time XY. Only positive actual primary
hit damage is credited; unattributed splash remains raw diagnostic evidence.
Clean prefixes exclude divergent non-watch payments/results, including the old
placement collision and affordability failure. Complete earlier loss/output
witnesses remain eligible; incomplete/later evidence cannot qualify. All five
seeds stay in the denominator. Cheaper-substitute retention compares both defended middle/south roads; the
primary north-placement material witness remains southern. Mechanical passing
remains provisional pending
independent force-context review, never campaign readiness.

Focused checks (synthetic/mechanical and zero-case refusal fixtures only):
`node --test tests/shared-watch-prototype.test.mjs tests/shared-watch-validation-evaluate.test.mjs tests/shared-watch-validation-observer.test.mjs`.

After independent implementation approval, freeze externally with
`node qa/shared-watch-validation/run.mjs --freeze EXTERNAL_FILE`.
Then obtain actual coordinator authorization and an independently reviewed packet
with format shared-watch-v2-approved-validation-v1, approved status, named
reviewer, exact authorization, unchanged freeze and exact invocation array.
Only then use --run-approved APPROVAL_PACKET NEW_EXTERNAL_DIRECTORY.
All generated freezes, results, proofs and logs stay outside the repo. There are
no game/profile/version/campaign changes or remote actions in this slice.
