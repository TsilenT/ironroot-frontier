# A River Between Us: Chapter 6 capstone

Frozen candidate: `a-river-between-us@1`, `frontier-campaign-river-between@1`, Classic@1. Normal adaptive opponent. Prerequisite: Borrowed Ground. Current progression becomes 24 main-path missions / 72 optional stars, five encounters in Chapter 6. Historical catalogs and the isolated Chapter 10 prototype are unchanged. Chapter length is a design choice, not a quota; future work retains the 90%+ adaptive-opponent direction.

## Contract

Destroy the original North Command Post (ordinary watchtower, north road x=1950) AND bank 60 cumulative seconds with any two uncontested owned bridges, by 600 seconds. Either order works. Destroying the enemy citadel is an alternative. Own citadel death or draw takes precedence; one surviving HP is sufficient. Rebuilt towers cannot undo original-post credit. Optional health/time stars never gate progress.

Lingering ownership, two-second ground capture, flyer denial, pause without reset and zero bridge income remain intact. After 60 seconds, the counter is capped but ownership, combat and ordinary AI continue. `endOnGoal:false` only removes the control-alone terminal condition for this new identity. `advanceObjectiveBattle` evaluates the compound result after each 0.05-second tick, like other destruction missions. A direct raw `Game.update` caller must still evaluate campaign objectives.

No fog, reserve, scripted gift, new AI algorithm, forced decay or special unit requirement. Classic's ordinary build geometry and costs apply. Player starts with 1,455 gold of buildings and 1,050 treasury; enemy with 1,890 of buildings and 160 treasury. Each side has a real mine and starts at 7.5 gold/sec. All runtime purchases use income, kill bounties and treasury. Ordinary escalation remains disclosed at 5:00.

## Why keep both goals?

Two paid policies on the authored seed 6501 demonstrate different orders:

| Policy | Post destroyed | Control banked | Finish | Remaining work |
|---|---:|---:|---:|---|
| North first | 91.75s | 117.25s | compound, 117.25s | 25.50s securing the second route |
| Crossings first | 130.05s | 84.25s | compound, 130.05s | 45.80s breaking the command post |

The first policy concentrates early construction and upgrades north for 40 seconds, then funds the southern route. The second buys southern and middle support before northern siege. Neither goal is merely simultaneous bookkeeping. Both default-seed wins leave the enemy core at full health. An infantry-led approach can instead win through ordinary core pressure without destroying the command post. Efficient core races remain valid.

The early sparse formation failed all five exploratory policies. Adding ordinary initial middle support and outer barracks made openings viable; moving the post forward and adding an ordinary middle tower separated the goals. These are disclosed setup choices, not hidden boosts. This candidate was then frozen, not repeatedly tuned to demand low-health wins.

## Paid evidence and limits

Sources retained: `qa/river-between/scenario.mjs`, `paid-policies.mjs`, `simulate.mjs`. Run with seeds 6501, 719 and 51017, policies north-first, crossings-first, infantry-routes, north-only and idle. One successful player command per five simulated seconds; casts and salvage count. Policies use visible ordinary state, no seed/outcome lookahead. Transactions and read-only measurements reconcile both economies to under 0.000001 gold. Raw logs belong outside the repository.

15-run frozen sample:
- North first: 3 compound wins, 117.25–134.85s.
- Crossings first: 2 compound wins, 1 core win, 130.05–140.80s.
- Infantry routes: 3 core wins, 173.00–194.95s; no purchased siege, flyer or Rootwarden in this policy; it uses warriors, archers and wizard support.
- North only: one loss, one core win and one compound win. AI seed variation matters; this is not a guaranteed failure recipe.
- Idle: 3 own-core losses, 105.40–105.95s.
- Enemy: 5–15 ordinary paid transactions per run. Successful active routes need not be nail-biting; starting troops do not win by themselves.

These are feasibility and objective-separation checks, not human balance or native playtest claims. Different random choices can reverse the order of goals or produce a legal core alternative. The automated policies are deliberately simple, not optimal play. Human difficulty and native visual usability remain separate review questions.

## Reproduction and native fixtures

`node --test tests/river-between-mission.test.mjs`

`node qa/river-between/simulate.mjs --policies=north-first,crossings-first,infantry-routes,north-only,idle --seeds=6501,719,51017 --out=/tmp/river-between-runs.jsonl`

`node qa/river-between/prepare-native.mjs /tmp/ironroot-river-preview --write-preview`

The native helper creates synthetic prerequisite records plus paid-engine checkpoints: fresh, established at35s, and banked at84.25s with the original command post still alive. All checkpoint battles round-trip through the real codec. No manufactured near-win or health edit. The isolated preview uses namespaced sessionStorage, disables service-worker installation and discloses synthetic history. It never reads or writes a real profile. Metadata is written outside source. Only preview app/index are modified; other runtime bytes are hash-checked. This creates inspection fixtures, not browser-earned wins.
