# Authored challenge battles

Five short missions reuse the unmodified combat, economy, placement, production, upgrades, active strike and save rules. Enemies have a disclosed fixed formation, not an economy that silently adds new structures. Each mission explains its starting resources, damaged citadel or upgraded opponents, exact objective, deadline and a useful tactical hint.

Destroying the enemy citadel is an alternate win in every mission. This matters because one victorious lane can reach the core while structures remain in another lane. Losing the player's citadel always fails the challenge. The UI must stop updates on either challenge outcome even when the engine's ordinary `winner` remains null.

## Missions

| Mission | Setup | Primary objective | Tested successful approach |
| --- | --- | --- | --- |
| Shieldbreaker | 520 gold, one central barracks; enemy has three central barracks | Destroy all three barracks by 3:30 | Warriors protect wizard splash and archer support |
| Skyguard | 525 gold, 4,500 citadel HP; level-3 aeries in both outer lanes | Destroy both aeries by 3:30 | Early archery ranges in both outer lanes |
| Siegecraft | 500 gold; three level-2 towers and a barracks in the middle lane | Destroy all three towers by 4:00 | Warriors screen siege engines, with archer support |
| Gold Rush | 500 gold, 3,500 citadel HP; outer-lane warriors and middle-lane archers | Have 15 gold/sec and a living citadel at 2:30 | Two outer-lane towers, three protected mines, two mine upgrades |
| Holdfast | 650 gold, 1,800 citadel HP; infantry in every lane, middle archers, northern flyers | Survive 2:20 | Cover all lanes with towers, then archers and infantry |

## Integration contract

`dist/challenges.js` exports:

- `CHALLENGES`: briefing metadata plus deterministic setup data. `markedTargets` contains type, world x, and lane for objective markers.
- `createChallenge(id)`: returns a normal `Game`. Throws for unknown IDs.
- `getChallengeTargets(game, id)`: returns the configured target descriptors plus their current live building or `null`. It finds authored positions rather than retaining object references or relying on IDs across restore.
- `evaluateChallenge(game, id)`: returns `{completed, failed, progress, label}`. Progress is normalized 0–1. Results require no extra engine fields. The economy objective calculates current income from living mines, avoiding a stale HUD cache immediately after an upgrade or salvage.

Save the challenge ID in the UI save envelope, outside the versioned engine save. Restore the engine normally, validate the ID against `CHALLENGES`, and evaluate again. Do not force a challenge outcome into `game.state.winner`, whose engine contract requires the opposing base to be destroyed.

## Automated playtests

`tests/challenges.test.mjs` exercises every mission with its authored seed and combat seeds 1, 57 and 999. The final seed is serialized/restored every ten simulated seconds during the winning policy. Policies use normal paid build and upgrade actions, with no health, income or enemy-state manipulation after setup.

Results from the initial balance pass:

- Shieldbreaker: recommended combined arms clears in roughly 57–62 seconds.
- Skyguard: split-lane archers clear in roughly 75 seconds.
- Siegecraft: combined arms with siege clears in roughly 82 seconds.
- Gold Rush: reaches and preserves 15 gold/sec through the 150-second check.
- Holdfast: defensive mixed arms survives the 140-second check.
- Idle play loses all five missions.
- Archer-only Shieldbreaker, wizard-only Skyguard, gryphon-only Siegecraft and archer-only Holdfast lose, establishing that composition affects the outcome.

Other viable strategies are intentionally allowed. These are onboarding/counter challenges, not proof of competitive balance or substitute for human playtests. There are no hidden unit restrictions or prescribed build orders.

Regression coverage includes valid/independent setup, exact and near-deadline behavior, partial objective progress, dead-but-not-yet-filtered target handling, core victory/defeat priority, stale economy caches, unknown IDs, deterministic midcombat restoration, and objective evaluation after restore.
