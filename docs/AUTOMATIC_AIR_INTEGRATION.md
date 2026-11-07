# Automatic flyers and player prose: integration candidate

Status: local v0.17.0 candidate, not merged or deployed. Live remains v0.16.0. Base is writing PR #9 head `477d529f28da56873ed6461da7a1277c08d349bf`, whose focused gate passed before these gameplay changes.

## Player intent and selected behavior

The player clarified that air units should not take orders; they should see enemies on a neighboring road because they fly. Gryphons now acquire eligible nearby troops within 300 world units, retain a living local target up to 420 units away and physically fly into their unchanged 110-unit attack range. They keep their normal speed, health, damage and costs. Both sides use identical unit behavior, without an AI command planner.

There is no birth-road tether, fixed crossing, warning phase or forced return. When a target is lost, the flyer seeks locally or advances along the nearest road. Separate encounters can carry it across successive roads; there is no direct remote targeting across two roads. Ordinary distraction and bad strategic stalls remain possible. Ground anti-air stays on its road and does not freeze chasing an unreachable vertical gap.

The initial return-home experiment was rejected after tests found periodic retreats against moving Rootwardens and failure to retaliate across a bookkeeping boundary. A later arithmetic regression was caught by exact old-engine checks and corrected before integration. Those failures remain historical evidence, not current passes.

## Coherent new-game flow

- Manual Hold/North/South controls, route summaries, gateway warnings and route-specific teaching are removed from the actual interface.
- All fresh full-roster campaign attempts use automatic-air revision 4, including Open Three Roads and full-roster opening replays. The first two reduced-roster openings retain their earned progression.
- Fresh skirmishes use automatic open-ended or timed rules.
- Fresh Field Trials and standalone practice use the original seven-building roster and prices with automatic air behavior, without introducing an extra Rootwarden unlock there.
- Guide and aerie copy describe autonomy, actual range and the risk of being drawn away from support, rather than asking for commands.
- PR #9's broader dialogue, coaching and practice prose is retained.

## Scope and data

The player explicitly said not to worry about in-progress saves because there are no users yet. No extra old-battle migration UI or release matrix is being built. Existing decoder support can remain internally without becoming a compatibility commitment. Persistent campaign stars/unlocks, preferences, trial records and history are still protected. Protocol 6 fences old clients before newer persistent data is written; historical result identities remain readable.

## Evidence so far

- Independently reviewed engine prototype: 1,299 Node checks passed, zero failed, one optional tooling skip, including 135 exact legacy comparison cohorts and bounded 140-unit simulations. This is not integrated browser evidence.
- Independent targeted review found no remaining actionable engine defect after the return-home, self-defense, reachability and arithmetic repairs.
- Campaign smoke: 19/19 paid sequential clears, 52/57 stars, 232 paid actions spending 41,291 gold; both full-roster early replays also won. Synthetic policies are not human balance certification.
- Fresh trials: five winning strategies across four seeds, five idle losses; all five practice lessons completed through paid actions across seven seeds.
- Profile/persistence checks: 215 passed, including new chase and trial roundtrips; no extra old-route matrix.
- Final combined Node run: **1,357 passed, zero failed, one optional tooling skip**; syntax, exact runtime inventory and browser fixture preflight pass. The first run’s nine stale harness/default failures were repaired while retaining paid-action, focus, geometry and state assertions.

## Remaining before review

The 52 focused browser instances are prepared for the normal cloud runner. The local runner could not create required Chromium sockets and executed zero test bodies; no security workaround was used. Validate actual paid automatic flight, campaign/practice launch, mobile controls, guide wording, pause and new saves on the exact uploaded candidate. The archived manual-command browser spec is superseded by current-behavior tests, not treated as a skipped current requirement. No physical-phone, non-Chromium, subjective-audio or Steam-readiness claim follows from these checks.
