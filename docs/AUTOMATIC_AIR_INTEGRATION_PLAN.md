# Automatic air combat: replacement plan

Status: historical planning document from the initial local investigation. The selected behavior is integrated in the local v0.17.0 candidate; see AUTOMATIC_AIR_INTEGRATION.md for current status. No deployment has occurred.

## Intended behavior

Flying units should discover nearby enemies on their own, including an adjacent road, and approach them through normal combat movement. Players should not select a route for each aerie. The present flight-order mechanic in v0.16 is therefore being superseded rather than extended with an AI order planner.

The selected direction uses a 300-world-pixel acquisition radius, current physical/nearest-road adjacency and stable retention by actual target distance. A flyer physically approaches at its existing speed and attacks at its existing range; after target loss it seeks locally or continues toward the enemy along the nearest road. There is no birth-road confinement, encounter anchor or forced return. Successive local engagements may naturally carry a flyer across successive roads, but it cannot select a remote nonadjacent target directly. Neighboring-road sight grants no free ranged attack, teleport, health reset or invulnerability; both sides use the same autonomy.

The initial home-road/anchor experiment was rejected after reproducible periodic retreats against moving Rootwardens and a boundary case that ignored a nearby attacker. Its evidence is preserved separately rather than treating its passing tests as design approval. The simpler design also needs a reachability check for ground anti-air: an archer must not freeze while trying to close a vertical gap larger than its attack range without leaving its road.

## Current implementation that must be replaced

- `engine.js`: manual `setFlightPlan`, per-producer plans, fixed-gateway approach, warning and transit phases currently cause crossing. Ordinary targeting otherwise excludes neighboring-road enemies.
- `app.js` and `index.html`: owned-aerie Hold/North/South controls, build toast, read-only Air routes menu, warning announcements and guide section explain manual routing.
- `campaign-flow.js`: Wings of Ash and Stonegate have flight-order teaching.
- `campaign.js`: current revision-3 mission briefings explicitly describe manual orders, gateways and two-second warnings.
- `render.js` and `flight-visuals.js`: planned-route arrows, gateway/countdown signals and committed-route minimap markers present that old mechanic.
- New skirmish selection currently chooses `frontier-flight-open/timed`.

The new-game flow must not retain those controls, route lessons, countdowns or promises after automatic combat replaces them. A concise aerie/guide description should explain autonomous adjacent-road engagement and anti-air vulnerability. If any combat feedback is added, it should show an actual current engagement rather than a player command or future plan.

## Compatibility and integration boundary

The prototype is isolated from the writing PR and Rootwarden AI experiment and uses new immutable rule identities. Existing released rules, engine snapshots and stored route metadata remain interpretable. The player subsequently waived in-progress save compatibility. No additional migration UI or release matrix is required; persistent progress, settings and history remain protected.

For new campaign attempts, use an explicit new descriptor revision and compatible full-roster tier. Existing mission progression and stars should remain; new movement is not another building unlock. New skirmishes should use the selected autonomous rules. Any profile-protocol change must be tested against the actual old client, not only the new decoder.

PR #9's broad narrative/coaching improvements can be carried forward, but its old flight-specific instructions must not be published as the instructions for automatic air combat. Integrate and test those affected passages with the new behavior before the next public batch.

## Required checks

- Neighboring-road acquisition at a finite sight radius; no remote or nonadjacent acquisition.
- Physical travel and normal attack range/cooldown/damage, with no movement-order side bias.
- Stable target loss/death, local target retention and forward movement from the nearest road; no repeated forced returns, switching loops or restored health.
- Archers/towers can hit flyers in the gap at real distance; ground units do not cross roads merely to pursue them.
- One-, two- and three-road maps, both sides, multiple flyers, moving/flying targets and terminal games.
- Deterministic save/restore in each meaningful state, malformed metadata rejection and exact released-rule continuation.
- Paid tactical counterexamples, useful and harmful autonomous detours, economy exposure and bounded 140-unit performance. Synthetic outcomes are not human balance certification.
- Actual new-game UI has no manual flight commands, and tutorials/copy describe the chosen automatic behavior. Legacy save presentation and Back/resume remain usable.
