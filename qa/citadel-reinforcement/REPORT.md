# Citadel reinforcement: retain as a negative engine experiment

Do not integrate the 190-gold, +600 current/max HP, 90-second reinforcement on
this evidence. The bounded study found brief delayed defeats, no recovered wins,
and four paid buffers that were never touched. This does not establish that
all citadel upgrades are unhelpful. It does not justify a UI, compulsory ladder,
economy/spell redesign, or cost/HP retuning to force a favorable result.

Private main was verified by `git ls-remote` at
`5ec1f967a1c8c8f9861f68b8fef3cf99c4fa460d`; package version is `0.19.0`.
The supplied handoff identifies this as the live bridge release. No live site
inspection or deployment was performed. The README still contains historical
pre-merge release wording; this study does not silently update that documentation.
The experiment is on `experiment/citadel-reinforcement-190-600`, in its own
worktree. No production assets or profile/settings/history/campaign/trial code
changed. PR14 was not fetched, incorporated, changed, or diagnosed.

## Registered design and provenance

The plan was committed before outcomes at
`261101ab3d3e31f35a9ce9030de06b105b84b60d`.
The executable first-run source is
`92ce6cc1015349b2bbd220f1e093c2b892ef503c`. `results.json` contains SHA-256
hashes of the actual engine, rulesets, bridge, autonomous-air, prototype,
harness and plan used. `provenance.json` verifies those against that Git commit
and records final evidence hashes. No local AGENTS.md or .agents/skills files
were present. The repository CI uses Node 22; local execution used Node 24.22.1.

The fixed contract is optional and symmetric: one purchase per side, >=90
simulated seconds, 190 normal gold, live citadels, ongoing match, no safety limit.
It adds exactly 600 current and maximum HP, preserving the existing deficit.
A 3396/6000 citadel becomes 3996/6600. It has no income, attack, range, troop,
spell, regeneration or full-heal effect. Existing damage, overtime and timed
decay are inherited unchanged. The opt-in QA wrapper is separate from dist and
accepts only current public-map Skirmish identities. Its strict snapshot envelope
is rejected by the production codec. It has no profile/storage access.

The source verifies 6000 starting HP, 420 starting gold, 5/sec base income,
190-gold mines at 2.5/sec, 140-gold barracks and 175-gold archery. The game's
built-in starting barracks per side are explicitly retained, not falsely charged
as purchases. Every subsequent action uses the paid engine APIs.

`PREREGISTRATION.md` fixes both opening/support scripts, placement order, seeds
17/91, maps, mirrored focal sides, three choices and 900-second bound. All three
branches share the same legal prehistory hash. Archery keeps the 15-gold saving;
failed purchases keep all their gold. No assigned case was dropped or replaced.
All observed 90-second decision states were alive and ongoing; dead/ended/time
failures were exercised in labeled contract fixtures, not manufactured gameplay.

There are 108 distinct games: 72 primary, 24 bridge interaction and 12 separate
symmetric AI probes. `MEASUREMENT_NOTE.md` documents 24 measurement-only bridge
replays added after observing early endings, to obtain the preregistered common
terminal horizon. All replayed actions, ledgers and final state hashes match the
first run. No parameter or gameplay policy changed. This is 132 game executions,
not 132 independent or distinct cases.

## Primary: bridge disabled

There are 24 paired decision states, each with three choices (72 runs).
The two scripts are economy-screen versus pressure and the reversed focal role.
The rival never selects reinforcement in these player-choice branches; both
sides are eligible but this is not symmetric reinforcement strategy evidence.

| Choice | Assigned | Alive/time eligible | Actual paid | Assigned W/L | Paid W/L |
|---|---:|---:|---:|---:|---:|
| Reinforcement, 190 | 24 | 24 | 20 | 12/12 | 12/8 |
| Archery, 175 | 24 | 24 | 20 | 12/12 | 12/8 |
| Mine, 190 | 24 | 24 | 20 | 12/12 | 12/8 |

The four Classic economy-screen states held 171.25 or 173.25 gold, so all three
alternatives failed. These 12 rejected branches remain in every assigned-case
outcome total. There were no draws or bound-censored primary games. Terminal
ranges were 103.70–174.30 seconds for reinforcement, 103.70–169.85 for archery,
and 103.70–170.60 for mines. No paired winner changed, including after restricting
to the 20 states where all alternatives were actually purchased.

Eight paid reinforcement branches lost. Compared with their paid archery
branches, defeat moved 1.95–5.40 seconds later; compared with mines, 1.95–3.70
seconds later. The four Long March losses still had six producers alive at
reinforcement defeat; the four Twin Span losses had two. Surviving production
did not convert the small extension into a recovered outcome under these scripts.
The winning branches stayed wins under either alternative. Small shifts in
winning terminal times (including reinforcement wins up to 0.45 seconds earlier
than archery) are retained; extra producers alter combat and RNG consumption and
these are not estimates of human superiority.

Four of 20 paid purchases repaired an existing deficit: Twin Span began at
2850–3753 HP, added exactly 600, and fell back to the pre-purchase HP at
92.35–92.95 seconds. Sixteen purchases were made at full HP, buying a buffer.
Of all 20 purchases, 16 consumed the full 600 and four consumed zero; the unused
four were already-winning Twin Span pressure branches. Consumption means
`min(600, observed damage + decay after purchase)` under the preregistered
incremental-first accounting rule, not a special shield or causal damage model.
The complete damage and HP observations are retained.

The opportunity cost was real. At 120 seconds, the 12 paid Classic/Long March
archery branches had produced three more focal troops than reinforcement. At
150 seconds, the advantage was 6–12 troops. In the four Twin Span losing states,
archery kept a third producer where reinforcement retained two (matched bridge
replays show this at the earlier terminal horizon). Terminal spawn totals also
appear in `paired-comparisons.json`, but their unequal durations must not be
mistaken for common-time production. A mine's nominal 76-second payback assumes
survival; many runs ended before that. The study does not prove an optimal mine
or saving policy.

## Bridge interaction: separate smaller set

Eight decision states on Classic/Twin Span, economy-screen focal only, both
seeds and focal sides: 24 runs. The released bridge implementation retains empty
ownership indefinitely, pays only while uncontested and caps total map income
at 0.5/sec. The obsolete shadow lease model is not used.

All eight assigned focal outcomes were losses under each choice. Four Classic
purchases failed; four Twin Span purchases succeeded for each choice. Paid
reinforcement delayed defeat by 1.95–2.30 seconds versus both alternatives, with
no recovered win. It repaired and consumed all 600 HP in each of its four paid
cases. Bridge receipts did not make the four Classic cases affordable at 90.

At matched common terminal horizons, receipts for both sides were exactly equal
across all three branches in each triplet. For the four paid Twin Span states,
focal receipts were 9.3875–10.425 gold at that horizon. Reinforcement's terminal
receipts were 9.9125–11.0, an apparent increase of 0.4875–0.575 gold entirely
accounted for by its extra 1.95–2.30 seconds at 0.25/sec. The opponent also earned
for the extra duration. This is survival duration, not improved ownership.
The bridge-enabled and disabled counterparts retained the same winners and
terminal times in this interaction set; one bridge case could afford a later
barracks during its extension, yet still lost. This small, one-matchup set is
not evidence that all bridge interactions are neutral.

## Symmetric native-decision probes

Twelve separate runs: three maps x two seeds x reactive policy on/off. Both
sides use the released normal `_ai(side)` at a declared fixed 5-second cadence,
alternating call order. This cadence differs from ordinary native timer jitter.
Before the AI decision, the enabled policy tries reinforcement if >=600 HP is
missing. There is no reservation, injection, price reduction, or hidden subsidy.

Six enabled games produced 49 purchase attempts: one succeeded, 48 were
unaffordable. Only side 1 in Classic seed 91 bought: 270 seconds, 193 gold to 3,
5034/6000 HP to 5634/6600. It returned to pre-purchase HP at 334.90 seconds and
lost at 349.60 versus 349.05 without the purchase. All six paired winners stayed
the same; the other five paired terminal times were unchanged. These probes
expose cash scarcity in this reactive policy. They do not establish a useful
symmetric strategy or prove that saving ahead would be bad. Automatic safe-
economy purchase value remains unestablished; four unused preemptive buffers
and their production opportunity cost argue against assuming it.

## Contracts, ledgers and limits

Six focused tests passed: equal costs/single use/deficit preservation, exact
time and gold boundaries, invalid/dead/ended/repeat rejection, protected mode
rejection, strict shape and restore continuity, disabled parity with the exact
released engine, controlled decay and seven-day safety limit (multiple assertions
per test). Every gameplay final snapshot also passed strict restore and exact
round-trip comparison. The strict extension is a QA format, not a finished
production persistence integration or adversarial proof of purchase history.

Both sides' ledgers reconcile every simulation step:
420 + base income + mine income + actual bridge receipts + 2/kill bounties
+ recorded refunds - actual paid actions = gold. Maximum absolute residual was
1.9782e-11 gold. Initial free barracks, rejected actions, native spells/upgrades,
all successful actions with time/gold/HP, and production counts are disclosed.
No ledger gold became negative.

A synthetic no-army contract removes production deliberately, buys once, then
applies 100 ordinary siege damage. Open mode stays ongoing at 1800 seconds
with 6500/6000 HP. Timed mode keeps native decay and ends at 564.15 seconds,
with the reinforced side winning on about 498.04 remaining HP. This demonstrates
a timed-stalemate result advantage and unchanged decay, not human balance.
A separate synthetic seven-day limit state safely refuses update and purchase.

Repository checks: `npm test` 1461 passed, 0 failed, 1 existing optional desktop
compatibility skip; `npm run check` passed; `npm run check:release` passed.
The runtime inventory and base-tree comparison verify dist is unchanged.
No browser, device, live gameplay, or human playtest was performed or claimed.

## Evidence and reproduction

Run from the repository root (no added packages):

```sh
node --test qa/citadel-reinforcement/contracts.test.mjs
node qa/citadel-reinforcement/study.mjs
node qa/citadel-reinforcement/summarize.mjs
node qa/citadel-reinforcement/bridge-replay.mjs
npm test
npm run check
npm run check:release
```

For byte-identical original first-run provenance, run the study at source commit
`92ce6cc1015349b2bbd220f1e093c2b892ef503c` in another worktree. Running the final
measurement-capable harness yields the same game trajectories with a newer
source hash. Do not overwrite retained evidence when verifying hashes; copy the
worktree or output directory first.

- `results.json`: all 108 per-case observations, actions, checkpoints, ledgers,
  first damage, HP consumption and final hashes, including failures/null findings.
- `cases.csv`: compact per-case table; `summary.json`: explicit denominators.
- `paired-comparisons.json`: outcome/time and common checkpoint comparisons.
- `bridge-matched-horizons.json`: earlier common terminal bridge comparisons.
- `controlled.json`, `contracts.log`, repository/syntax/runtime logs: validation.
- `provenance.json`: exact Git/source/evidence hashes and unchanged runtime proof.

This is a small, correlated deterministic study with only two seeds and two
fixed scripted matchups. Pressure won every primary matchup regardless of the
90-second choice, limiting sensitivity to comeback decisions. Only four primary
paid cases involved an already-damaged citadel. There is no hold-gold branch,
no adaptive human placement, no saving policy experiment, no main timed balance
sample, and only one bridge matchup. No outcomes were selected away, and no
additional tuning was done. Retain this as a reproducible negative result; do
not open a gameplay feature PR or ship the reinforcement on this evidence.
