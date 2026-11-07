# Citadel reinforcement: preregistered engine experiment

Recorded before implementing/running the study or inspecting its outcomes.
Base: private main 5ec1f967a1c8c8f9861f68b8fef3cf99c4fa460d, package 0.19.0.
No AGENTS.md or local .agents/skills was present. Current workflow: Node 22,
`npm test`, `npm run check`. Isolated branch experiment/citadel-reinforcement-190-600.
No production, profile, campaign, trial, navigation/PR14, or default changes.

## Fixed candidate

Engine-only opt-in QA wrapper, only current open/timed Skirmish identities,
including bridge variants, only public Skirmish maps. Disabled by default.
One purchase per side, at simulated time >=90, alive citadel, ongoing match,
no safety limit, at least 190 gold. Subtract exactly 190 and add exactly 600
current HP AND 600 maximum HP. No other benefit, healing, regen, discounts,
production, attack, range, spell, income, or changed end conditions. Both sides
have identical eligibility. Current deficits persist (e.g. 4000/6000 becomes
4600/6600). Normal damage, overtime and timed decay remain unchanged.
Strict separate experimental snapshot envelope; ordinary runtime cannot admit it.
No config adjustment after outcomes. Contract tests may use labeled synthetic
states, never include them as paid-game evidence.

## Comparisons (108 games maximum)

Primary 72 bridge-disabled open games = three maps (classic, long-march,
twin-span) x seeds 17 and 91 x two declared matchups x mirrored focal sides
0/1 x choices reinforcement / archery (175, retain 15) / mine (190).

Matchup E: focal economy-screen vs rival pressure. Matchup P: focal pressure
vs rival economy-screen. Normal starting 420 gold and one built-in barracks
per side are retained; these built-in barracks are disclosed, not paid purchases.
Economy-screen opening: at 0 mint, 0 archery, 30 barracks, 55 wardenLodge,
75 archery. Pressure opening: at 0 barracks, 0 archery, 25 barracks, 55 archery.
Queue unpaid openings; retry every 5 seconds using legal build() calls.
Try rear columns [270,410,550,690,830,970,1110,1250] for mines; front columns
[1110,970,830,690,550,410,270,1250] otherwise. Cycle preferred lanes by successful
script purchase index and search other lanes if blocked. No free placement,
resource injection, deficit removal, forced outcome, or unrecorded upgrade.

At tick 1800 (90 seconds, floating-point tolerance only for clock comparison),
clone the same full legal prehistory into each choice. Exactly one attempt:
record too early/ended/unaffordable/site-blocked failure; retain every branch.
If ended earlier, retain it as ineligible, without replacing the case.
The branch purchase gets the next scripted preferred lane. The common support
script is independent of the branch choice: at 110 then every 20 seconds try next
queued building. Economy-screen support cycle: barracks, archery, wardenLodge,
archery, foundry. Pressure: archery, barracks, sanctum, archery, foundry.
Retry blocked/unaffordable support at the next support interval. No automatic
second branch purchase. Stop only at natural winner or tick 18000 (900 seconds);
report ongoing at bound, never call bound a draw. Both sides eligible, but rival
script never selects reinforcement in these player-choice branches.

Bridge interaction: 24 more games, identical paired method, only matchup E,
classic and twin-span, both seeds and focal sides. Keep these results separate
from primary and from earlier bridge studies. Ledger includes exact receipts.

Symmetric strategic probes: 12 bridge-disabled games = three maps x seeds 17/91
x both sides native normal AI with reinforcement policy off / reactive on.
Use native _ai(side) every 5 seconds, alternate call order, native ai timer
otherwise off. In reactive policy each side tries reinforcement before ordinary
AI if eligible and missing at least 600 HP. No reservation, subsidy, changed
native prices, or guaranteed purchase. Report actual purchases and failures.
These are small AI-policy probes, separate from primary player-choice evidence;
not enough to establish an optimal policy or human balance.

## Measurements and tests

Per game retain source hashes, prehistory hash, exact action times, side, gold,
HP before/after, cost, rejection, both ledgers (420 + base/mine receipts +
bridge receipts + 2/kill bounties - actual spending), units spawned, producer
counts/HP at decision, +30/+60/+120 and terminal/bound, first citadel damage,
terminal winner/time, postpurchase ordinary damage and timed decay. Attribute
600 added HP by a declared incremental-first accounting convention: min(600,
postpurchase damage+decay). Split purchase into repaired deficit min(600,deficit)
and above-old-cap buffer max(0,600-deficit); these are accounting descriptions,
not separable physical shields or a causal damage prediction. Record the first
time observed HP reaches the pre-purchase level. Compare production foregone
and recovery window from paired branches, including adverse/null cases.

Contract tests: single-use, both sides, insufficient gold, exact time boundary,
dead/ended/invalid side, repeat synchronous input, strict unknown/missing/invalid
snapshot fields and restore continuity, disabled parity with unmodified engine,
protected-identity rejection. Controlled no-army open/timed stalemate to 1800
seconds exercises decay and bound; synthetic safety-limit/cap boundary checks
are explicitly not balance evidence. No forced ending in open games.

Decision: recommend only a bounded review proposal if observed recoveries justify
it; distinguish useful time with surviving production from merely delaying a
loss, an automatic economy purchase, and negligible benefit. Keep adverse/null
results. Do not tune costs/HP/time to manufacture variety. No UI or integration
PR without useful evidence; negative results remain a reproducible study.

Pre-run clarification from parent: checkpoints include exact cumulative bridge
receipts for both sides, and final analysis compares only shared observed
horizons (120/150/210 seconds, or earlier paired minimum terminal time), so
longer survival is not misidentified as improved capture economics.
