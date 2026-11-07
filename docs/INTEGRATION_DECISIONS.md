# Current integration decisions

Live production is v0.16.0, source merge `2094b5fb71755ddd37677ae65d5b3d1438487366`. This local v0.17.0 candidate is not merged or deployed.

The player clarified that flying units should notice enemies on adjacent roads, not take orders. Automatic combat therefore supersedes the manual-routing design shipped in v0.16. PR #9's reviewed narrative and interface prose is the base, with its route-specific instructions replaced rather than published unchanged.

Selected work:
- Nearby automatic flyer targeting and physical engagement with unchanged combat stats and costs.
- Consistent fresh campaign, skirmish, trial and practice behavior, with no manual routing controls or route-specific teaching.
- The campaign keeps its 2 → 5 → 8 roster progression and optional stars; automatic flight is not a fourth unlock.
- Protocol 6 protects campaign progress, preferences and history from outdated clients. The player explicitly waived maintaining in-progress battle compatibility; do not add release gates or UI for that concern.
- Existing phone, first-barracks auto-start, hidden hints, Back, input and storage safety behavior remains part of regression coverage.

Not selected:
- Rootwarden AI experiments have not yet demonstrated useful paid support and are not included merely to clear a branch.
- The longer music experiment still lacks an actual listening review.
- Fixed gateway crossings, forced home-road returns, new flight commands and AI command planners are rejected for this behavior.
- PvP, packaged desktop/physical-device certification and Steam/store readiness remain separate work.

See [AUTOMATIC_AIR_INTEGRATION.md](AUTOMATIC_AIR_INTEGRATION.md) for current evidence and remaining checks. Previous candidate decisions remain in the historical documents; their publication and gate descriptions are dated evidence, not current status.
