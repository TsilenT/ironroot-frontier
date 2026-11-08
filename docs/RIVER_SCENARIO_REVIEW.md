# A River Between Us: independent scenario review

## Scope and finding

Read-only review of the frozen Classic scenario, compound control, exact identity codec, progression/profile tests and paid-policy harness. No runtime or test edits, browser work, broad suite or duplicate policy matrix. No correctness blocker found in the inspected source and focused boundary probes. The completed 15-run paid-policy matrix supports viable authored routes and both goal orders on the default seed, with the limitations below.

## Contract and boundaries

- Exact new identity is `a-river-between-us@1`, `frontier-campaign-river-between@1`, Classic@1. Codec cross-checks all three, including history-only rows.
- Original North Command Post is the authored watchtower at x1950, lane 0. Target lookup requires its deterministic original ID plus side/type/site; a later replacement does not erase credit.
- Both post destruction and 60 cumulative seconds with any two uncontested bridges are required, in either order; enemy core destruction is an alternative. Own-core loss/draw takes precedence. One surviving HP suffices.
- `endOnGoal:false` is opt-in only. Control credit caps at 60, while ownership, contest, combat, AI and economy continue. Published Shared Crossing retains its terminal goal behavior and unchanged descriptor. Tests pin old rule fingerprints and old seeded simulations.
- Independent probes confirmed combined completion at 599.95 and 600.00, rejection at 600.05, and own-loss precedence. A real final .05 simulation tick from 599.95/59.95 credit reached exactly 600/60 and completed with 1 HP after original-post removal. These are synthetic boundary checks, not balance evidence.
- Mission mode derives from its first control objective, so the shared evaluator applies the 600-second deadline to both victory routes. The app must retain `advanceObjectiveBattle` per-tick evaluation; raw Game alone does not know the post objective.

## Authored economy and decisions

The production setup uses legal paid-build authoring, then restores the declared 1050/160 treasuries. Both sides have a starting mine and 7.5 gold/sec. The player has eight authored buildings, enemy ten; the northern post has supporting northern production, while middle and south create alternative route pressure. This is intentionally asymmetric authored deployment, not equal treasury or equal starting investment. No fog, bridge income, scripted grants or reinforcements were found.

The paid policies make visibly different opening commitments: north-first delays its second route until 40 seconds, crossings-first funds south/middle before the north assault. Actions use production build/upgrade/cast APIs, at most one command per five seconds. The independent harness records actual objective timestamps, remaining goals, core damage, AI purchases, ordinary income, bounties, refunds and spending, and rejects ledger mismatch. Both-order test requires separated objective completion timestamps and an untouched enemy core, which is stronger than merely winning twice. Final measured outcomes demonstrate these claims on the default seed. Passing two scripted routes cannot establish human enjoyment, general balance, or absence of busywork.

## Preservation and limits

Progression appends the encounter after Borrowed Ground and changes current completion rather than historical campaign catalogs. Profile tests explicitly pin protocol-16 source, marker-only protocol-17 admission, prior earned-byte retention, stale-writer fencing, rollback, historical backups, every mission's explicit save/history identity and new capped-control checkpoint continuation. These tests were inspected, not independently rerun here; aggregate results own pass/fail status.

No physical-mobile or human-balance claim is made. UI presentation is reviewed separately. Final paid-policy output was independently read from `/tmp/river-final-frozen.jsonl` and its summary after the author confirmed completion; these temporary evidence paths are not release artifacts.

## Measured final formation

The final 15 runs cover seeds 6501, 719 and 51017 across five policies. All reported ledger residuals round to zero; the harness asserts less than 1e-6 each tick. Default north-first destroys the post at 91.75s and completes control at 117.25s; default crossings-first completes control at 84.25s and destroys the post at 130.05s. Both leave the enemy core at 6000 HP, with 6/9 paid enemy purchases and player spending 2012/2155. The 25.5s and 45.8s gaps demonstrate distinct unfinished second goals rather than coincident automatic credit.

North-first wins compound objectives on all three seeds, but its other two seeds actually finish crossings first: policy names describe intent, not guaranteed goal order. Crossings-first has two compound wins and one permitted enemy-core win. Infantry routes win via enemy core on all three seeds. North-only yields one loss, one core win and one compound win; idle loses all three around 105–106s. Thus the scenario requires intervention and allows several compositions, but neither exclusive forced goal-order choice nor broad human balance is established. Two successful default compound routes finish with full player HP, so the evidence supports accessibility and tactical alternatives rather than a claim of tight survival pressure.

## Initial aggregate fixture-correction review

Read the five failures in `local-evidence/npm-test-initial.log` and diffed the five affected test files against the Borrowed Ground worktree. Independently computed Git blob hashes for all five baseline files: each exactly matches the released 46b3e17a base-tree manifest, so no publisher-base difference is being silently attributed to this patch.

The corrections are scoped and justified: campaign catalog 25→26 (including historical introductions), current route 23→24 and stars 69→72; opening title count 23→24; new River ruleset added to the complete current citadel-capable rules list; River excluded only from pre-River historical fog identity subsets; and the Lanterns earned-progress fixture no longer invents completion of its new dependent River encounter before Lanterns itself. Historical ID comparisons and the literal Lanterns historical SHA-256 remain unchanged. No assertions or test cases were removed. All 46 pre-existing files under `tests/fixtures` remain byte-identical and present.

The historical exclusions do not exempt River from current-identity coverage: the complete citadel list explicitly includes it, and new River control/mission/profile tests require its exact rule/scenario/map tuple, immutable descriptor, non-fog behavior, restored checkpoints and historical-identity preservation. No concrete issue found. This was a source/evidence review only; the final stable aggregate remains the owner's verification, with no rerun initiated here.
