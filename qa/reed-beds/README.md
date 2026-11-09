# Fresh Through the Reed Beds paid feasibility

These are fresh production-engine measurements for the reconstructed mission, not recovered historical evidence, browser-earned wins, native UI acceptance, or human-difficulty certification. The authoritative Road baseline is commit `6b6cf964097a815b214933c7e74bb3f23b72d5d5`, tree `50c098a436ddee2e36d629a2e7d36e6887ae6b25`.

## Inputs and boundaries

`scenario.mjs` checks the exact revision-one Reed Beds / Classic identity, authored formation, original targets 7/9/11, 1,100/100 starting gold, 6,000 HP cores, normal adaptive AI, 600-second deadline, no fog and no forced core decay. Both real opening mines and the cached tick-zero income are 7.5 gold/second. Starting authored structures are reported separately from spendable gold.

`paid-policies.mjs` contains nine explicit, deeply frozen policies: all three target pairs, screened siege, supported Rootwarden, single-road core rush, air core, broad novice and idle. Decisions use the clear player observation. A successful paid action starts a five-second cooldown shared by builds, upgrades and volleys; no successful action can bypass it. Player policies do not write state, add resources, edit health, alter AI, impose extra attrition or steer unit movement.

`VALIDATION_PLAN.json` froze the policies, exact formation, harness and combat files at 2026-11-09 04:14:40 UTC. Four authored-seed exploratory runs preceded this freeze. The reported 54-run batch was freshly executed after the freeze: four development seeds and two newly selected held-out seeds. No policy or formation edits were made after seeing held-outs. `verifyFrozen()` still passes.

## Measured results

- `fresh-development.json`: 36 runs, four seeds per policy. Every target-pair policy, screened siege, supported Rootwarden and broad novice won 4/4. Core rush won 3/4. Air core and idle lost 4/4.
- `fresh-held-out.json`: 18 runs, two seeds per frozen policy. Every target-pair policy, screened siege, supported Rootwarden, broad novice and core rush won 2/2. Air core and idle lost 2/2.
- Strong outer-pair wins remain valid. On authored seed 7307 the South Ember Hall fell at 46.95 seconds and North Reed Watch at 65.70 seconds, with the player's core at 6,000 HP.
- Core bypass remains valid. Authored-seed core rush destroyed only South Ember Hall before killing the enemy core at 138.65 seconds, with the player's core at 1,986 HP. One development seed lost the player's core, so this policy is not guaranteed safe.
- `receipt-audit.json`: all 54 runs passed. Full-precision conservation, ordinary action prices, kill bounties, successful player cadence, and independently reconstructed mine-event income reconcile. Maximum per-tick ledger error was zero.
- `paid-checkpoints.json`: portable summaries at 25 seconds, the first original target loss, and the active near-terminal target state. At 64.30 seconds one original was destroyed, North had 141 HP, Middle had 650 HP, and the two cores had 6,000/5,895 HP. Normal continuation won at 65.70 seconds.

These are strong scripted feasibility routes, not claims that every novice will win or that the mission needs a higher difficulty. No roster/formation tuning or artificial attrition was added to blunt successful strategies. The ordinary 5:00 escalation exists, but none of these short runs exercised it. Native save/resume/UI acceptance belongs to the separately generated preview and review.

## Receipts and reproduction

Raw full-precision NDJSON stays outside the source checkout. The portable summaries record each raw filename, byte count and SHA256; the source does not depend on a machine-specific absolute raw path. `economy.mjs` wraps the real successful action methods and clones receipts immediately, before later upgrades or entity mutation. Actual mine income is accumulated only on real engine ticks, including correct next-tick effects of builds, upgrades and destruction. The independent auditor reconstructs mine-rate changes from detached receipts and natural structure losses.

Run the focused contract tests:

```sh
node --test tests/reed-beds-economy.test.mjs
```

The recorded plan is already frozen. Verify it before reproducing either batch:

```sh
node -e "import('./qa/reed-beds/simulate.mjs').then(m => m.verifyFrozen())"
node qa/reed-beds/simulate.mjs --out=../reed-development.ndjson --summary=qa/reed-beds/reproduced-development.json
node qa/reed-beds/simulate.mjs --held-out --out=../reed-held-out.ndjson --summary=qa/reed-beds/reproduced-held-out.json
node qa/reed-beds/verify-evidence.mjs --raw=../reed-development.ndjson,../reed-held-out.ndjson --out=qa/reed-beds/reproduced-audit.json
```

Do not overwrite the frozen plan or call old seeds newly held-out after making policy changes. Any future changed-policy experiment needs a separately labelled evidence epoch and newly chosen held-outs.

## Final evaluator provenance binding

The original freeze did not hash `dist/campaign.js`, which contains target identity and mission evaluation. That original plan and its prior results remain unchanged. `final-source-binding.json` records a separate final-source verification epoch: the final campaign file is byte-identical to both checkpoint 001's verified overlay content and archived file, and is SHA256 `f7ca6747229778f7583c4a3ab78efd3c90a4ce6ab13465327457a1ed1f819bea`.

`bind-final-source.mjs` freshly reran the existing 54-run matrix against that final evaluator, verified the old frozen inputs before and after, independently audited each rerun, and compared every full run and detached receipt with the originals. All 54 matched exactly, the new combined raw file is byte-identical to the concatenated original files, and ledger error remains zero. This verifies deterministic reproduction against the final evaluator; it does not add new held-out samples or retroactively change the original freeze.
