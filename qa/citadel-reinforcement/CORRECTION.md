# Gross Volley accounting correction

The old observer used net gold decrease as spending and sampled bounties only
inside engine steps. Volley can kill immediately between steps, so its immediate
bounties reduced recorded spending and were also absent from bounty receipts.
Both omissions cancel in the balance equation. A near-zero residual was therefore
insufficient evidence for the report's gross-cost decomposition.

The independent finding is confirmed: 123 successful casts, 113 with immediate
bounties, 2146 gold missing from each gross category across 12 symmetric probes.
The exact correction per cast is 75 - (before.gold - after.gold), added to both
spending and bounty. All casts had at least 75 gold before payment. No game
replay, engine edit, policy change, subsidy or outcome change is involved.

Run `node qa/citadel-reinforcement/correct-accounting.mjs` to reproduce the
separate corrected-accounting.json. It asserts all 123 gross costs are 75,
checks both corrected ledgers, and deep-compares every non-ledger field of each
corrected case with the original, including every action and before/after state.
Raw results.json and all old source/evidence commits remain unchanged. The old
provenance.json deliberately remains historical; its original REPORT.md hash
refers to the report at aabf5f9, before this explicit correction.

The original harness and audit are retained for historical reproduction, with
their known net-category limitation. Any new experiment must observe each actual
kill bounty at damage resolution and account gross action cost separately.
Primary/bridge scripts had no casts and are unchanged. No primary/bridge games
were rerun. No production files changed.
