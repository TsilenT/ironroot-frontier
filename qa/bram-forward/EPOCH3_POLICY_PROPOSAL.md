# Proposed Bram development epoch3: cap-aware comparison policy

PROPOSAL ONLY. No epoch3 development game has opened. Formation and engine remain exact played checkpoint004/PR40 bytes. Epoch1/2 failures and checkpoint004 remain immutable. No Screen rebase, mission/profile/catalog/version change or release claim.

## One correction

In policies.mjs, only enter the existing forward-candidate loop when the player's current living-building count is below the unchanged map build limit. At16/16, skip impossible forward build candidates and fall through to the existing upgrade selection. No new action, sale, replacement plan or resource rule is added. At15/16 or below, the old opening, gate priority, pad safety, purchase choice, affordability behavior and cadence are byte-for-byte unchanged. Safety rules themselves do not change. Full-cap skips no longer generate misleading unsafe-pad notes, because a forward building cannot then be purchased.

This is a comparison-policy bug correction, not formation or game tuning. Epoch2 prompt incurred25 cap failures and cautious13 after15 rear buildings plus one camp filled the16th slot. Those failed commands blocked their existing upgrade path. The corrected comparison can ask whether sensible forward investment has a strategic purpose, rather than measuring repeated impossible purchases.

## Exact source/test scope

- qa/bram-forward/policies.mjs: one conditional guard only. Back-projecting that guard restores exact004/PR40 source SHA25679b63bc246af903d2a7117b6b8d8534dd45651a8d8d49832c92c776dbcbcabc2 and Git blob2257cdb4bc0866efe64d4841553fcf65550e419a.
- tests/bram-cap-policy.test.mjs: synthetic command-selection regressions for both active forward policies at full cap; unchanged below-cap purchases; unchanged cautious-danger fallback; one failed unaffordable upgrade and no off-cadence action; exact source-delta proof. These are not development outcomes.
- This concise proposal document. No generated evidence belongs in the source patch.

No engine, formation, original gate ID, map/rules identity, price, cap, opening, safety criterion, AI, player cadence, ordinary rear/idle policy, auditor or simulation harness change. The frozen epoch2 PLAN remains untouched pending approval and a separately declared/frozen epoch3 PLAN/environment/case identity.

## If approved

Use only the same eight known cases: rear/prompt/cautious/idle by7301/9127. No protected seeds or heldouts. Freeze source, corrected policy, plan, case formation identity and environment before opening. Preserve every outcome and failed action. Stop on any unexpected setting difference or first-set error; no silent retry, further correction or rescue change within that boundary.

Predeclare a HOLD/reject/rework outcome if forward access still follows an effectively decisive lead, or no credible strategic value appears. Damage alone is not a usefulness threshold. Fastest victory alone is not the only useful outcome either: assess contested reinforcement, exposed losses, resource and road tradeoffs, optional no-forward viability, visible safety decisions and natural restore evidence with actual ordinary AI reactions. Retain causal limitations from different paid enemy decisions and unit-cap competition. Do not force this candidate into the fifth slot.

Full aggregate remains NOT PASSED. Existing registry/runtime guards are not relaxed. Campaign admission, native UI/Scout/briefing, profile/history/envelope integration, human readability and release remain separate blockers.
