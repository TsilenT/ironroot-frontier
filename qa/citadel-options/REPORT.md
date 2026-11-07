# Citadel shot, regeneration and extra-arrow hypotheses

Keep these as separate QA hypotheses. This 190-gold/90-second study does not
support a production upgrade PR yet. Extra arrows show the clearest crowded-fight
niche; stronger shots offer smaller focused defense; recurring regeneration
works during genuine recovery windows but those windows were scarce here.
The evidence is negative for these spending choices under these scripts and
inconclusive for broader human strategy. No UI, default, bridge, spell,
campaign, trial, profile or navigation change is proposed or made.

## First correct the old accounting

The earlier HP study's outcome conclusions were independently confirmed, but its
symmetric observer mislabeled net Volley payments as gross spending. It omitted
2146 gold of immediate Volley bounties from BOTH spending and bounty categories
across 12 AI probes (113 of 123 casts). Actual balances, legal affordability and
all outcomes were unchanged. A separate deterministic artifact on
`experiment/citadel-reinforcement-190-600` fixes both categories from retained
actions without replaying games. Every gross Volley cost is 75. Correction source:
4470568; shared-history clarification: b47d6cf. See that branch's
`qa/citadel-reinforcement/CORRECTION.md` and `corrected-accounting.json`.
The old study has 12 distinct joint prehistories / 24 focal decision triplets,
not 24 independent battles. Its raw evidence and source hashes remain intact.

This study uses a new observer. It records bounties on every actual damage
resolution, including between-step casts, and gross cost separately. A synthetic
three-kill Volley costs 75, earns 6, and changes gold by -69; the ledger records
75 spent and 6 earned. The paid scripts themselves do not cast spells.

## Frozen alternatives and exact source

Private main was verified at 5ec1f967a1c8c8f9861f68b8fef3cf99c4fa460d, package
0.19.0. Work is isolated on `experiment/citadel-shot-regen-arrows`.
Initial preregistration: dec2b39. Finite-repair synthetic preflight: 9c1ab98.
Before any paid outcomes, the parent corrected finite repair to recurring regen
to represent Steve's request. The corrected preregistration and executable paid
source were frozen on **2026-11-07** at
**ff760756df5e9a99f0c349ebcff17344b2f60338**. All 120 outcomes use that source.
The initial finite reserve ran zero paid games; its synthetic outputs are retained
under `superseded-finite-reserve`. They are not recurring-regen evidence.

The released citadel already shoots: 32 damage every 1.15-second cooldown,
strict range <310; damage becomes 18 at 300 seconds. All three candidates cost
190 normal gold, once per side from tick 1800, require an ongoing match, living
bases, sufficient gold and no safety limit. No ladder, initial HP addition,
range increase, production bonus, income bonus or spell benefit is added.

| Hypothesis | Fixed effect | Distinct limitation |
|---|---|---|
| Shot | Single shot 32→40; after 300 seconds 18→22.5 | Same target, range and cadence; +25% focused damage |
| Regen | Recurring 3 HP/sec after 8 seconds without actual citadel damage | Ordinary max HP; eight-second purchase wait too; no healing when native timed decay is active |
| Arrows | One extra shot for 16 damage, or 9 after 300 seconds | Different living target in range; no extra shot against a lone enemy; no faster firing |

Recurring regen has **no lifetime HP allowance**. It never resurrects, overheals
or heals an ended game. Last actual damage is tracked from prehistory and restored
with the snapshot; the first eligible fixed step begins eight seconds after
max(purchase time, last damage time). Queuing a strike or applying zero damage
does not reset this timer.

The extra arrow uses the nearest different living enemy under the released
simultaneous-damage frame. A target already scheduled to die can consume the
extra shot, just as ordinary attacks can overkill; the shot is not retargeted
after resolution and generates no duplicate kill bounty. Both sides use the
same selection. Faster firing is explicitly a different, untested interpretation.

Post-run review added targeted synthetic fairness checks and aligned one timed
boundary exactly with native decay (`forcedDecay && time > 420`). The first
prototype suppressed at `time >= 420 - 1e-8`, potentially one heal step early
at the exact mathematical boundary. All paid cases are OPEN, so this timed-only
correction cannot change their recorded trajectories. No paid reruns or tuning
were done. `POSTRUN_VALIDATION.md` and source hashes preserve this distinction.

## Paid comparison and eligibility

120 games form **24 paired quintets**, not independent trials: Classic/Twin Span
× swarm/siege/air rivals × seeds 17/91 × mirrored focal sides × five choices.
Each quintet shares one legal prehistory to 90 seconds, then chooses shot, regen,
arrows, 175-gold archery, or holding all gold. Archery retains its 15-gold saving.
Holding gold may fund later support; it is not locked away. Exact openings,
placement order and paid support queues are in `PREREGISTRATION.md`.

All 24 histories were alive, ongoing, time eligible and affordable for every
paid choice. There were 96 paid assigned actions (72 citadel purchases and 24
archeries); 24 hold branches spent zero at the decision. No case was excluded,
replaced, subsidized, or selected for favorable incoming pressure. Four histories
already had citadel damage at purchase; the others were full HP.
Both sides are eligible, but the rival script never buys a citadel option. This
is a player spending-choice comparison, not symmetric strategic AI evidence.
All later construction uses ordinary gold and legal sites. The standard starting
420 gold and one free barracks per side are disclosed and unchanged.

| Choice | Wins / losses | Swarm | Siege | Air | Observed terminal seconds |
|---|---:|---:|---:|---:|---:|
| Shot | 7 / 17 | 3 / 5 | 0 / 8 | 4 / 4 | 127.10–248.10 |
| Regen | 7 / 17 | 3 / 5 | 0 / 8 | 4 / 4 | 123.60–255.80 |
| Arrows | 7 / 17 | 3 / 5 | 0 / 8 | 4 / 4 | 132.40–250.45 |
| Archery | 11 / 13 | 3 / 5 | 0 / 8 | 8 / 0 | 124.10–390.45 |
| Hold | 7 / 17 | 3 / 5 | 0 / 8 | 4 / 4 | 123.60–302.05 |

Every game ended naturally. None reached the 900-second observation bound;
no open game was force-ended. Each upgrade preserved all paired hold outcomes.
Archery converted the same four Classic-air losses into wins versus every
upgrade and hold; no citadel option converted a loss to a win. These are paired
observations, not independent win-rate estimates or proof all upgrades are useless.

## What the distinct effects actually did

**Shot:** Under Classic ground pressure, defeat moved 3.20–7.30 seconds later
than holding gold. Under Classic air, it came 51.40–74.80 seconds sooner. Across
all 13 losses shared with archery, the time difference ranged from 23.45 seconds
earlier to 4.20 later. Synthetic full-HP isolated targets explain some breakpoints:
before overtime, a warrior needs 5 shots instead of 6, an archer 2 instead of 3,
a siege ram 6 instead of 8; a gryphon still needs 4. The base has no extra
warrior-armour multiplier; these use actual released base damage and unit HP.
Real mixed combat and prior troop damage make these illustrative, not kill-time
predictions for the paid games.

**Arrows:** Classic swarm/siege defeats moved 7.95–14.70 seconds later than hold,
but Classic-air defeats came 36.50–74.00 seconds sooner. Across losses shared
with archery, it ranged from 22.45 seconds earlier to 14.20 later. The additional
shot sometimes preserved a real defensive window, but none became a recovered
win under the fixed support scripts.

For a concrete matched-horizon example, Classic/swarm/17/focal-1 at 120 seconds:
arrows had 40 primary and 26 extra shots, 1486.6 directly applied base damage,
12 base kills and 1495 citadel HP. Hold had the same 40 primary shots, 1116.6
applied damage, 9 base kills and 676 HP. Both had three surviving producers and
39 focal troops spawned. The three additional base kills yielded six real gold;
extra damage was 370 after overkill and prior damage, not 26×16 assumed damage.
Arrows ultimately lost at 138.30 versus hold at 123.60 seconds: a 14.70-second
window with production still operating, not a demonstrated recovery. Raw per-case
base damage, kills, actual bounty receipts and composition remain available.

**Regen:** The scripts did expose chip-and-recovery windows, but only in four
Classic-air cases. Each recovered the initial 119 or 136 HP fully, then later
lost during sustained pressure. The other 20 purchases restored zero: seven
winning citadels were never damaged, while the other 13 cases did not create
eligible damaged recovery time. Zero opportunity in those cases is not proof
of an intrinsically useless regeneration mechanic. No paid case exercised
repeated recoveries exceeding 600 HP; recurring behavior is contract-tested.

The 190-gold cost delayed support. In Classic/air/17/focal-0, holding gold bought
a warden lodge at 140 seconds and archery at 155; the regen branch could afford
them only at 170 and 200. At 210 seconds, hold had nine producers and 115 spawns;
regen had seven producers and 107 spawns despite recovering to full citadel HP.
Regen lost at 255.80 versus hold at 296.45; the 175-gold archery decision won
at 333.70 with 14 producers remaining. This is an observed economic/production
tradeoff; it does not isolate each downstream RNG or targeting change.

Actual incoming composition confirms the threat labels were not merely scenario
names: siege inflicted 31,833–33,930 aggregate citadel damage in each upgrade's
eight siege branches, with warriors supplying the remainder. Gryphons inflicted
8,900.4–13,195.4 in the eight air branches per upgrade, alongside archers and
some warriors. The archery air branches took no gryphon citadel damage. Swarm
citadel damage was entirely warriors/archers. All applied base damage was
attributed; unknown-source total was zero. These aggregate terminal exposures
have unequal durations and are descriptive, not common-time treatment effects.
`comparisons.json` includes five-second matched horizons to avoid that mistake.

## Long games and strategic stalls

Long defensive games are an accepted user preference. They are not rejected
merely for lasting longer, and this prototype adds no forced end condition.
The paid sample provides no long-stall evidence because all games ended by
390.45 seconds. All upgrade branches ended before 300, so post-300 upgrade
behavior is verified by fixtures rather than paid-game outcomes.

The synthetic no-production regeneration fixture distinguishes counterplay:
10 incoming damage every six seconds prevented all healing and left 3150 HP
at 1800 seconds. Thirty damage every twenty seconds allowed 2556 total HP to
be restored, leaving about 5976 HP at the same bound. Both open games remained
ongoing. The latter fixed periodic attack can repeatedly be repaired between
hits; it is a real regeneration loop under that prescribed schedule. It is not
shown to be an unavoidable no-progress loop in strategic play: continuous damage
interrupts it, and real attacks/production can change the schedule. This may be
a rational defensive benefit; human tempo/preferences remain untested.

Timed synthetic versions still ended under ordinary decay (about 551.60 and
560.40 seconds). Regen is allowed beforehand and stops only when decay applies.
No lifetime cap, invisible decay cancellation, resurrection or forced open result
is introduced. Fixtures are labeled synthetic and never mixed with paid results.

## Validation, limits and reproduction

Twelve focused contract tests passed, including exact costs and guards, strict
snapshot/restore, recurring >600 healing, interruption, both-side extra-shot frame
fairness, range/single-target/cadence/overtime checks, disabled parity, gross Volley
accounting, and long open/timed fixtures. Every paid final state passed strict
restore/round-trip. Every step and successful action reconciled both gold ledgers;
maximum residual was zero in this run. Every final bounty total equals exactly
two times actual kills. The QA envelope is not production persistence integration.

`npm run check` and `npm run check:release` passed. The full production runtime
is byte-identical to verified main, as recorded by `audit.mjs`/`provenance.json`.
The prior exact-runtime repository suite passed 1461 tests with one optional
skip; it was not redundantly rerun for this QA-only branch. No browser, device,
live-site or human playtesting is claimed. PR14 remains untouched.

This is a bounded, correlated study with two seeds, two maps, fixed placement
and support queues, one army comparator, no bridge interaction, no adaptive
upgrade-buying opponent and few regen recovery windows. Neither no-change
winners nor delayed losses prove global balance. Do not outcome-tune these
parameters or treat the four air recoveries as universal archery dominance.

Reproduce from repository root, using a separate worktree/output copy to preserve
the retained evidence:

```sh
node --test qa/citadel-options/contracts.test.mjs
node qa/citadel-options/study.mjs
node qa/citadel-options/summarize.mjs
node qa/citadel-options/audit.mjs
```

For original source hashes use ff760756df5e9a99f0c349ebcff17344b2f60338. Current
source adds only the documented timed boundary correction and validation; paid
open trajectories are unaffected. Deliverables: `results.json` (120 full cases),
`cases.csv`, `summary.json`, `comparisons.json`, source/test/controlled-fixture
files, dated preregistration and amendment, and `provenance.json`.

Recommendation: retain the results, with extra arrows the most concrete niche
for possible later player exploration and recurring regen still under-sampled.
There is insufficient evidence to offer a useful 190-gold gameplay upgrade PR
now. No PR, production change, merge, release or parameter sweep is included.
