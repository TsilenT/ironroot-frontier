# The Open Frontier campaign expansion

## Scope and integration

Chapter five continues the original ending rather than rewriting it. The crown is gone; Rowan, Sera and Iona are reopening roads and establishing shared settlements. Four authored battles bring the campaign to **16 missions / 48 stars**, with the original **12 missions / 36 stars** preserved.

- `open-horizon` (`long-march`) unlocks after `ironroot`.
- `river-charter` (`twin-span`) and `far-beacon` (`long-march`) both unlock after `open-horizon`.
- `common-ground` (`twin-span`) requires both branches.
- All mission objects expose `mapId`. The original twelve declare `classic` without changing their simulation or save payload.
- Existing public campaign function signatures and result shapes remain intact. `deployment.player` and `deployment.enemy` are additive, human-readable briefing facts on the new missions.
- Progress stays `ironroot-campaign`, version **1**, at **`ironroot.campaign.v1`**. Existing records remain valid and merge additively. A completed original campaign now unlocks the frontier instead of reporting the entire expanded campaign complete.
- Target lookup, evaluation and result recording reject a battlefield mismatch with `Campaign battlefield mismatch`. They do not treat missing structures on another map as completed targets.
- Factory placement and reference policies use `game.map.lanes`. Authored target identity is derived from each map's initial ID state and the placement's original index, so rebuilding a marked structure cannot replace its identity.
- Profile protocol admission and backup/history map compatibility are implemented separately. They do not require a campaign progress version/key migration.

No combat stats, unit types, spawning rules, income modifiers, timers, simulation code, or save rules were changed by this expansion. Initial structures and upgrades use the ordinary build/upgrade methods. Only their authored starting allocations are supplied; during battle all reference and mastery commands spend ordinary gold.

## Authored battles

### 13. Open Horizon

**Long March, three lanes, width 4,000, 24 sites per side.** 1,100 gold; 5,200 citadel HP; fixed enemy.

A protected level-2 middle barracks accompanies the relief column. Break two level-3 middle toll towers in 4:00 without losing or salvaging that barracks. Middle siege needs an infantry screen and ranged protection; level-3 aeries threaten both the center and the outer roads. The longer neutral ground makes starting production before the first contact useful.

Optional stars: win within 3:20; retain 4,200 citadel HP.

### 14. The River Charter

**Twin Span, two lanes, width 3,200, 16 sites per side.** 1,100 gold; 3,800 citadel HP; fixed enemy.

Keep both level-3 bridge watchposts alive and reach 17.5 gold/sec at 3:30. Northern siege calls for gryphons; three southern aeries call for archers. The ordinary three-mine cap still applies, even though the map has only two lanes. Players must place a third mine on an existing bank and leave room for production rather than relying on a nonexistent middle lane.

The reference policy funds the required 17.5/sec before improving combat buildings. The mastery route spends on all three level-3 mines and a sixth upgraded surviving building, deliberately trading earlier military upgrades for economic medals.

Optional stars: finish with 20 gold/sec; retain six living level-2+ buildings.

### 15. The Far Beacons

**Long March, three lanes, width 4,000, 24 sites per side.** 1,350 gold; 5,400 citadel HP; fixed enemy.

Close both outer pay stations and hold until 3:10, within a 4:40 deadline. Falling below 2,000 citadel HP fails immediately. Level-3 outer flyers require ranged support, while a central level-3 foundry and two sanctums punish leaving the third road unguarded. An aerial central counter buys time to build income and reach both distant mines.

Optional stars: win within 4:05; finish with 15 gold/sec.

### 16. Common Ground

**Twin Span, two lanes, width 3,200, 16 sites per side.** 1,500 gold; 6,000 citadel HP; hard adaptive enemy with 80 starting gold and one ordinary mine.

Destroy the northern foundry and southern sanctum within 5:00 while preserving the northern council mine and the original southern barracks. The southern protected barracks sits at x=690 rather than the front build row, allowing a real layered defense. The opponent pays for all reinforcements, upgrades and rally strikes, and responds to the army it sees. Limited sites make composition and upgrades more important than filling a third lane.

Optional stars: win within 4:05; retain 4,500 citadel HP.

### Objective precedence

These battles retain the original campaign's explicit citadel shortcut. Destroying the enemy citadel can end an economy or hold objective early. It never waives a protected original building, mandatory HP floor, or the player's own defeat. Far Beacons therefore has both a 3:10 hold route and an explicitly disclosed early citadel route. The tested paid reference route destroys both mines before its early citadel finish.

## Exact disclosure

Every new briefing derives its battlefield width, lane/site counts, starting gold/health, full per-lane player and enemy force counts and upgrade levels, and fixed/adaptive behavior directly from the authored data. Handwritten narrative does not stand in for this factual deployment list. Changing an authored formation automatically updates its displayed deployment; tests independently reconstruct the expected disclosure.

`getCampaignTargets` verifies that every marked target actually belongs to its authored placement list. New-map saves use the engine's existing version-2 map identity; Classic saves retain the original version-1 shape.

## Verification

Commands:

- `node --test tests/campaign.test.mjs tests/campaign-expansion.test.mjs`
- `node tests/campaign-balance.mjs 12`
- `node tests/campaign-expansion-balance.mjs 12`
- `node scripts/check.mjs`

The original campaign tests retain explicit original-four-chapter, twelve-mission and 36-star assertions. Additive tests cover the fifth chapter and 48-star total rather than weakening those legacy checks. The frozen 0.9 snapshot fixture checks all twelve missions' prose/metadata, initial serialized state, and exact 40-second idle, reference and mastery simulation/evaluation hashes. The only intentionally excluded metadata is the new `mapId` and Ironroot's reward text, which now unlocks Open Horizon.

Focused suite: **26/26 tests passed**. Coverage includes deterministic/restorable formations, every actual map site and upgrade, wrong-map rejection for every mission/map pair, original target identity after selling/rebuilding/restoring, deadline/protection/HP precedence, branching/merge behavior, all new mastery stars, paid-action accounting, and delayed single-command play.

### Full campaign stress run

The 12-sample full report executes **384 runs**: 16 missions × 12 seeds × reference/mastery. The first sample is each mission's authored seed; the others use a deterministic golden-ratio seed sequence. Every fourth sample restores the full game every ten simulated seconds.

- Reference clears: **192/192**.
- Mastery clears: **192/192**.
- Three-star mastery clears: **192/192**, covering all 48 stars.
- All final states pass strict engine restore validation.

### Frontier timing/composition controls

The separate 12-sample frontier report executes **288 runs**, including the above reference/mastery policies, pacing controls, idle play and an unsuitable ground-only splash army. The paced route starts five seconds late and permits only **one successful paid command every two seconds**. The more severe delayed route starts ten seconds late and permits one command every three seconds. These caps include builds, upgrades and rally strikes, not only policy callbacks.

| Mission | Reference clears | Three-star mastery | Paced clears | Delayed clears | Idle clears | All-wizard clears |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Open Horizon | 12/12 | 12/12 | 12/12 | 12/12 | 0/12 | 0/12 |
| River Charter | 12/12 | 12/12 | 12/12 | 4/12 | 0/12 | 0/12 |
| Far Beacons | 12/12 | 12/12 | 12/12 | 3/12 | 0/12 | 0/12 |
| Common Ground | 12/12 | 12/12 | 8/12 | 9/12 | 0/12 | 2/12 |

Reference win times: Open Horizon **86.2–87.1s**, River Charter **114.65–121.8s**, Far Beacons **111.1–111.8s**, Common Ground **89.7–134.45s**. Mastery River Charter runs take **115.3–123.15s**. The reference River Charter route intentionally stops short of its optional 20/sec medal; the mastery route earns it honestly.

These are deterministic policy controls, **not estimates of human difficulty or guarantees for every strategy**. Common Ground's adaptive response makes fixed slow policies non-monotonic: spending later can lead to a different enemy composition. Its imperfect paced result is reported, not hidden. All four missions also clear the paced single-command route on the authored seed plus seeds 1, 57 and 999 with repeated restores; those are regression-tested. The harder ten-second/three-second-delay route is intentionally not made a guaranteed win. Human players may respond to threats, pause, or choose a different production order. No exact-frame-only route is needed to earn a star.

## Boundaries

This work does not itself publish the game, change the engine or renderer, add units, alter the original twelve missions, or claim that synthetic policy testing replaces full browser playtesting. UI scouting, resume admission, backup compatibility, full repository/browser checks and release review are separate integration responsibilities.
