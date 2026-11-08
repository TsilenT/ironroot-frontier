> Lean repository checkpoint: screenshots, raw simulation rows, terminal logs and accessibility dumps from this investigation remain in the local development workspace and are intentionally omitted from this PR. References to those artifacts below describe the reviewed local evidence, not files included in the repository. Concise findings, reproducible code, essential tests/fixtures and limitations are retained. Historical base evidence is not removed.

# One Signal Is Enough: local validation

## Implemented contract

Additive `one-signal-is-enough@1`, Chapter 6 after Shared Crossing, ruleset `frontier-campaign-one-signal@1`. Historical descriptors and progress schema stay unchanged. Current launch navigation unlocks the new encounter.

Classic battlefield, 210-second evacuation, 1,100 opening gold, 6,000 citadel HP. **Normal adaptive enemy**, 0 opening treasury, ordinary 5 gold/sec base income plus any paid mines, ordinary paid buildings/upgrades/volleys. Automatic flyers, full earned roster and citadel purchases; no special combat multipliers. The enemy's authored buildings cost 1,463 gold and the player's cost 770 gold. Adaptive AI follows the user's later instruction, superseding the original fixed-enemy proposal.

Original Ridge Signal N970 and River Signal S1250 use `protect.minimumSurvivors: 1`. Losing either alone is allowed. Losing both or the own citadel overrides the deadline and enemy-core win. Positive 1 HP is sufficient. Replacement structures never restore the original objective or earn the explicit `original-survivors` medal. Saving both and a <=180-second clear are optional medals.

## Bounded authored tuning

Only three authored setups were tested:

1. **A, historical fixed enemy proposal**: 700 gold, north level-2 foundry N1950 plus barracks N2090/archery N2370. North wardens won; south-only defenses lost their core. This is not the release candidate and does not satisfy the later adaptive-enemy request.
2. **B, adaptive normal enemy**: same opening formation and cash. All initial policy families failed. Retained without overwriting results.
3. **C, final adaptive candidate**: 1,100 gold; north foundry level 1 N2230, barracks N2370, archery N2650. South and middle unchanged. No further authored formation tuning.

Policy changes are normal purchases, upgrades, and optional delayed investment. Never inject HP, troops, income, movement restrictions, forced winners, or a narrowly engineered closing result. Logs assert the complete ordinary economy ledger, including kill income. Waiting before rear defense is deliberate strategic sacrifice, not removal of the target by the test.

## Evidence files

- `qa/one-signal-setup-a.jsonl` and `qa/one-signal-setup-a-rear-defense.jsonl`: failed and successful fixed-enemy attempts.
- `qa/one-signal-setup-b-adaptive.jsonl`: failed initial adaptive attempts.
- `qa/one-signal-setup-c-adaptive.jsonl`, `qa/one-signal-setup-c-layered.jsonl`: earlier paid policies, including failures.
- `qa/one-signal-setup-c-policy-probes.jsonl`, `qa/one-signal-setup-c-sacrifice-probes.jsonl`: composition and timed rear-defense investigations.
- `qa/one-signal-setup-c-final.jsonl`: 44 runs, 11 policy families × four seeds (6201, 123, 719, 51017), restoring active checkpoints every 10 seconds for seed719. All logs include paid actions, spending, ordinary income, first target damage, post-loss times, core HP, survivor names, and 10-second battle trace.
- `tests/one-signal-policies.mjs`: reproducible paid route runner; `node tests/one-signal-balance.mjs --restore` prints the expanded matrix (including the later northSacrifice route). Older policy snapshots are retained beside their results.

The matrix's southSacrifice route clears with only River Signal in 4/4 seeds. It opens archery south1110, tower south970, then waits until 40 seconds before building rear north wardens410 and foundries270/550. Ridge falls naturally at 39.1 seconds in the authored seed. Its surviving army destroys the enemy core at 192.85 seconds with 6,000 own HP.

BothNoWardens retains both in 4/4 seeds using south archery/tower and two rear north barracks plus two foundries. Authored seed clears at 202.35 seconds with 6,000 own HP. SouthRanged and SouthAir also demonstrate evacuation-time wins. The rules require no unit type, and BothNoWardens proves that wardens can be omitted. Every successful sampled recipe still uses archery and foundry support, so these runs do not prove that each common unit can be omitted. Idle/economy-only, air-heavy, unfocused broad builds, and the tested weak screened-siege opening all fail. Success is not guaranteed by spending all available cash.

The initial northWardens route preserves Ridge and sacrifices River, with authored-seed core victory at 175.85 seconds and 402.24 own HP, earning the speed medal. It wins only 2/4 tested seeds because the abandoned south road can kill the core. This sensitivity is retained, not presented as four reliable clears. Rear-defense improvements are recorded separately.

## Focused mechanics and parity checks

`node --test tests/one-signal-mission.test.mjs` passes seven tests. It covers either original loss, last-post failure, one-HP victory, early enemy-core victory, simultaneous core/deadline/last-loss precedence, exact 210-second tick stop under a .25-second batch, replacement/upgrade medal rejection, active one-loss restore, terminal-save rejection, restart original IDs, one-star progress, and unchanged historical protect-all failure. Three ordinary paid routes replay byte-for-byte identically with and without active checkpoint restoration. Runtime objective stepping required no changes.

Integrated source-VM tests cover named cards, allowed-loss announcement priority, restored unknown timing and action-time salvage protection. Profile protocol14 tests preserve previous domain bytes. Aggregate and native results are recorded under qa/one-signal; this module-level report does not substitute for them. This report makes no browser, deployment, or published-release claim. The Last Ascent prototype was not changed.

## Robust northern sacrifice confirmation

`qa/one-signal-setup-c-north-defense.jsonl` retains failed rear-defense variations. `qa/one-signal-setup-c-north-siege.jsonl` shows the stronger forward double-siege investment wins 4/4, occasionally saving the southern post as well. The final `northSacrifice` policy delays southern rear-defense spending until 55 seconds, retaining its forward northern advantage while allowing River Signal to fall naturally. `qa/one-signal-setup-c-north-sacrifice.jsonl` records **north-only 4/4 wins** at 136.65–151 seconds, with 2,824.8–4,800.48 own citadel HP. Seed719 includes active restoration. The authored-seed result is 142.1 seconds, River lost at 50.2, own core 4,800.48 HP. This route is now included in the reusable policy runner and exact restore-parity test.

The two sacrifice choices therefore have distinct costs and positions: forward north wardens/double siege for a fast core attack, versus south anti-air while allowing Ridge to fall before establishing rear northern cover. The fast northern route earns the time medal and gives up the save-both medal; retaining both remains an optional paid composition challenge. All three authored configurations and every failed probe remain on disk.

## Independent interpretation

The two sacrifice routes are genuinely different in placement and timing, but are tuned scripted openings with explicit waits. Four combat seeds are a regression sample, not a human win-rate estimate or proof of broad player robustness. The normal adaptive enemy was independently observed making an ordinary paid archery purchase at 38.45 seconds; its income, bounty and purchase ledger reconciled exactly through the idle failure at 42.30 seconds. Established starting assets are disclosed, with no ongoing hidden grant.

## Bounded timing probes

Eight additional authored-seed probes changed only player timing, preserving the final formation: each sacrifice route with rear defense four seconds early or late, and with its opening delayed two or four seconds. Seven cleared. The south route with rear northern defense delayed from 40 to 44 seconds lost its citadel at 132.10 seconds while River Signal remained alive; every northern variant and both delayed openings cleared. `qa/one-signal/timing-probes.jsonl` retains all actions and outcomes. This identifies a meaningful rear-defense timing sensitivity, not a proven human difficulty band. No retuning was performed to erase the failure.
