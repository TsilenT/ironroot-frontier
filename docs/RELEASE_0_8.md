# Release candidate 0.8: Know your army

Public deployment remains 0.7 until this candidate passes its browser and actual-play reviews.

## Added

- Field guide now includes five detailed unit cards with enlarged original 2D portraits, targeting rules, exact base statistics, counters and production costs.
- Watchtower and Gold mine reference cards explain their tradeoffs. Mine payback uses marginal income for upgrades and explicitly excludes defense costs, destruction and lost tempo.
- Economy, upgrades, salvage, unit/building caps and overtime are explained separately from level-1 stats. Campaign briefings remain authoritative for altered starting conditions.
- Normal AI responds to early infantry pressure with screened production and improved use of the same legal economy. Easy and Hard rules are unchanged.
- Desktop source metadata, minimum Node version and scoped development dependencies have been reviewed. The dependency audit is clean in the measured environment; native runtime remains unverified.

## Validation so far

258 Node tests pass with installed optional desktop build dependencies, zero failures or skipped tests; all runtime JavaScript parses. Isolated copies without desktop dependencies intentionally skip the tooling compatibility test, not the seven shell/security/export-guard tests.

The codex's 14 focused tests execute real combat and economy to pin air targeting, shield modifiers, splash exclusions, siege/tower reach, mine marginal income, upgrades and caps. Two portrait tests verify all five existing unit drawing paths for both sides and reject missing contexts.

The normal-AI integration has three supplied and six additional boundary/response tests. Focused validation ran 240 skirmishes with exact ledgers, valid saves and 36/36 identical Easy/Hard pairs. A screened one-mine route won 12/12, with 11/12 mines repaying the full purchase and upgrade investment. These are diagnostic scripted policies, not human win rates.

Across 192 paired campaign runs, baseline and candidate each cleared 95/96, with the identical inherited Last Light seed 33003 failure. All 48 mastery routes per version earned three stars. The apparent rush-side split reverses when the first decision order is reversed, so it is not presented as evidence of a new combat-side bias.

Native browser review passed desktop, narrow/standard portrait and short landscape field-guide layout, native Space disclosures, focus containment, and read-only pause restoration. A 320px stat-label wrap was corrected and its targeted retest is pending. An ordinary mixed-army Normal opening won at 2:13. A screened one-mine opening remained contested at 2:47, with 96% player/100% enemy citadel and a surviving mine supporting adaptation. These are two non-controlled browser playthroughs, not difficulty certification.

The extended cloud browser suite has 212 instances, including three existing intentional skips. It adds every guide disclosure, exact stats, original nonempty portraits and real service-worker offline play/save/resume. Its execution is pending.

## Release boundaries

No new troop type, campaign mission or physical map layout ships in this increment. The campaign's four terrain themes still share the same three-lane geometry. No multiplayer, account system or remote file service was added.

Physical controllers, real iOS/Android devices, non-Chromium, subjective music listening, desktop gameplay and storefront requirements remain open. The project remains pre-release and is not represented as Steam-ready. See `NAME_REVIEW.md` before committing to store branding.
