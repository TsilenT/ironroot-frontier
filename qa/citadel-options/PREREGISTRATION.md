# Citadel alternatives: fixed bounded engine experiment

Frozen before outcomes on isolated experiment/citadel-shot-regen-arrows from
private main 5ec1f967a1c8c8f9861f68b8fef3cf99c4fa460d (0.19.0).
No production, UI, profile, campaign, trial, bridge, spell or PR14 changes.
The previous HP study remains separate: 12 distinct joint prehistories / 24 focal
choice triplets, not 24 independent battles. Its symmetric gross accounting was
corrected separately without replay or outcome changes (4470568 on its branch).

## Fixed mechanics and rationale

The released base already attacks the nearest enemy within strict distance <310
for 32 damage, on a 1.15-second cooldown. At time >=300 damage is 18. The engine
uses .05-second ticks, so observed firing intervals can include tick rounding.
All new alternatives use the same existing cadence and range. No free upgrade.
One optional purchase per side: 190 gold, tick>=1800 (90 seconds), ongoing match,
both bases alive, sufficient funds and no safety limit. All have equal eligibility;
only one upgrade kind may be bought by a side. Default wrapper mode is disabled.
Only current non-bridge open/timed Skirmish rules and public maps are admitted.

- Shot: multiply each ordinary single base shot by 1.25: 40 before overtime,
  22.5 after. A modest +25% single-target effect, with no extra target or rate.
- Regen: restore 3 HP/sec only on fixed steps beginning at least 8 seconds after
  both purchase and last actual citadel damage. No immediate heal; cap total
  lifetime restoration at 600. Never exceed existing maximum HP, resurrect,
  heal an ended game, or heal at/after 420 in timed mode. Damage resets the delay.
  The short disengagement requirement supplies counterplay; the finite 600 cap
  bounds this first repair hypothesis to the prior HP quantity without raising
  max HP. It is not a permanent unlimited regeneration design.
- Arrows: one additional shot at 50% of ordinary base damage (16 or 9) per existing
  firing cycle, aimed at the nearest different living enemy strictly inside 310.
  No second target means no second shot. It cannot hit the first target twice.
  Both use the released simultaneous-damage snapshot. Extra damage is limited
  to crowded fights; +50% total damage ceiling contrasts with shot's +25% focused
  damage. Faster firing is a separate interpretation and is explicitly NOT tested.

No tuning after outcomes. Full HP, range, production, income, spells and ordinary
end conditions remain unchanged. No forced ending is introduced. The 190/90
benchmark gives a direct spending comparison; these are hypotheses, not balanced
prices or a user mandate. Stronger shots and arrows have lasting effects while
regen has a finite restoration budget; report that asymmetry.

## Paid comparison: 120 games, 24 shared-history choice groups

Classic and Twin Span x threats swarm/siege/air x seeds 17/91 x focal sides 0/1
x choices shot/regen/arrows/archery/hold. Twelve map/threat/seed setups are mirrored;
they are correlated deterministic cases, not 120 independent samples.
Each focal history is cloned at tick1800 into all five choices. Archery costs
175 and retains the 15-gold difference. Hold spends nothing and keeps all gold
available to the same later support script. Record one attempt at the assigned
boundary, including early-ended, dead, unaffordable or blocked cases. Never drop
or replace a case. No retries for the assigned upgrade/archery decision.

Use normal initial 420 gold and the released free starting barracks per side.
All scripted structures thereafter use legal build() calls, ordinary prices and
queues retried every five seconds while prehistory is ongoing:

Focal opening: 0 barracks; 0 archery; 30 mine; 60 warden lodge.
Swarm rival: 0 barracks; 0 barracks; 30 archery; 60 barracks.
Siege rival: 0 foundry; 20 barracks; 55 foundry.
Air rival: 0 aerie; 20 aerie; 60 archery.

Each side's successful scripted purchase index cycles preferred lanes, searching
other lanes if blocked. Rear columns for focal archery/mines:
[270,410,550,690,830,970,1110,1250]. Focal other buildings:
[690,550,830,410,970,270,1110,1250]. Rival mine columns are the same rear order;
other rival buildings: [1110,970,830,690,550,410,270,1250]. This explicitly tests
more home-supported defense than the pressure-dominated old study; it does not
select states by observed threat or success. Placement stays identical across
upgrade branches. The archery choice uses the next preferred script lane, without
advancing the common support index.

After 90, stop the opening queue. Beginning at 110, every 15 seconds attempt the
next support item, retaining it until affordable/placeable. Focal cycle:
[barracks,archery,wardenLodge,archery,sanctum]. Rival cycles:
swarm [barracks,archery,barracks]; siege [foundry,barracks,archery];
air [aerie,archery,aerie]. Both sides continue paying. Neither selects Volley,
sales, or upgrades outside the assigned citadel choice. No native AI in these
paid comparisons; both sides eligible, but rival script never selects a citadel
upgrade. This is player-choice evidence, not symmetric strategic policy evidence.

Natural terminal or tick18000 (900 seconds) observation bound. Ongoing is not
a draw. Long or stalled games caused by player strategy are acceptable user
preferences; report them as defensive tradeoffs, not automatic failures. Separate
prolonged contested production from a mechanical no-progress loop. No forced
end to open games. A late-battle stalemate remains possible in released open
rules regardless of these alternatives.

## Observation and contract fixtures

Both ledgers record gross paid costs and ALL actual kill bounties (at damage
resolution, including between-tick Volley in accounting regression fixtures).
Check every step and at actions: 420 + base/mine income + 2 per actual kill -
gross spending = actual gold. Native economy/spell rules are unchanged.
Record exact action tick/time/gold/HP/cost, first base damage, actual incoming
base damage by attacker type, enemy composition, base shots/targets/damage/kills,
HP restored, surviving production, troops spawned, winner/time or ongoing bound.
Store five-second traces for matched observed horizons and final observations;
compare casualties/bounties and production at common horizons, not just unequal
terminal times. Report unused upgrades and threats that never reach the citadel.

Synthetic fixtures are explicitly separate from paid cases: no/one/many targets,
warrior/siege/gryphon (and archer breakpoint), ranged boundary, same-target
exclusion, overtime damage, cooldown parity, out-of-combat delay reset, continuous
siege versus interruption, HP and lifetime caps, dead/ended/safety-limit guards,
strict admission/restore and disabled parity. A long controlled open/timed regen
fixture checks consumption/stall risk without claiming paid-match balance.
Accounting regression must assert a 75-gold gross Volley plus immediate bounties.

Recommendation distinguishes narrower targeted benefit, generalized automatic
purchase, recovery versus delayed loss, and inconclusive sensitivity. Preserve
negative/null cases. Propose a design/PR only if evidence supports useful choice;
otherwise retain a negative/inconclusive QA report. No release, merge or UI work.
