# Automatic-air campaign integration

Local combined candidate, 7 November 2026. This is not a deployment or human balance certification.

## Fresh starts

All fresh **eight-building campaign attempts** bind `frontier-campaign-air-local@1`, with scenario revision **4**. That includes:

- Open Three Roads, immediately after winning Shield at the Fork.
- All sixteen continuation missions, including Emberwatch, Three Roads and Winter Stores.
- Roadside Watch and Shield at the Fork replays after the full roster is earned.
- Returning players with valid original-main-campaign progress.

The first two reduced-roster openings still use their original two/five-building identities and scenario revision 1. There are still exactly three roster stages. Automatic air is not a fourth unlock, and the third opening is not gated behind its own completion.

The optional First Watch and Forked Road lessons keep their separate records, original seven-building roster, objectives and introductory build-card presentation. Fresh deliberate launches also use revision 4, bound to `frontier-authored-air-local@1`, including flyers revealed by All buildings. They do not gain Rootwardens or grant modern roster unlocks. The normal nineteen-mission campaign does not include these optional lesson identities.

## Integration API

- `getCampaignLaunchMission(id, progress)` is the authoritative current preview/start descriptor. It chooses the actual opening roster and matching revision together.
- `createProgressionCampaignMission(id, progress)` uses that descriptor and normal mission locks. This also handles fresh optional First Watch/Forked Road starts. Their only prerequisites are the original optional-lesson prerequisites, not modern-opening completion.
- `getCurrentCampaignRevision(id, progress)` now accepts progress. Without progress, the first two openings select revision 1 and Open Three Roads selects revision 4. Do not use a progress-free call to preview an earned replay.
- `getCampaignRoster(progress).stage` remains 1, 2 or 3. Stage 3's current `rulesetId` is `frontier-campaign-air-local`.
- `getCampaignMission(id, revision)` and `createCampaignMission(id, {revision})` remain explicit historical entry points. Their default remains revision 1. The published `CAMPAIGN_RULESET_IDS` list is unchanged.
- `AUTONOMOUS_AIR_CAMPAIGN_MISSIONS` contains nineteen frozen full-roster revision-4 descriptors. It derives from the original opening and revision-2 continuation catalogs, not the manual-flight catalog. `AUTONOMOUS_AIR_INTRO_MISSIONS` separately contains the two seven-building optional revision-4 descriptors.
- `getProgressionCampaignOverview(progress).legacyIntroduction.missions` supplies current optional descriptors with the existing records and status. Historical `getCampaignOverview` and exact default factories remain unchanged; live fresh launches must not special-case optional lessons back to those historical factories.
- `campaignScenarioForGame` derives scenario revision from the game's bound ruleset. `campaignRulesetAllowed` admits full-roster revision 4 only with the automatic campaign identity, and optional revision 4 only with the seven-building authored identity. Automatic skirmish identities cannot masquerade as campaign rules.
- The UI passes `autonomousAir: supportsAutonomousAir(game.ruleset)` to `campaignTeaching`. It must not pass the old `flightOrders` flag in the live teaching flow. No manual controls or manual-order lesson are needed.

## Teaching and prose

Fresh Wings of Ash and Stonegate explain nearby autonomous engagement, adjacent roads, physical approach, normal attack range and ground anti-air. Open Three Roads adds a short explanation to its existing mixed-force lesson. Its coach and the Wings coach describe neighboring-road threats without promising that archers leave their own road or shoot across an unreachable gap.

Revision-4 briefings for the three openings, Wings and Stonegate explain that gryphons do not take route orders. The first two full-roster replay briefings explicitly list all eight earned buildings rather than implying the initial restricted roster. No gateway, two-second warning or future-launch instruction is inherited by fresh revision-4 descriptors.

Other reviewed writing prose is unchanged. All formations, objective conditions, gold, HP, seeds, deadlines, prerequisites, maps and medals are unchanged. The new mechanic is the engine's `autonomous-air-local-v1`: 300-unit sight, eligible living target retention to 420, normal 84 speed and 110 attack range. Archers stay on roads and attack at real range.

## Persistent records

Campaign completion records, stars and best times keep their existing version-1 shape. Old valid main-campaign progress still grants the full roster. Historical records aggregate achievements without claiming tactical equivalence between revisions. Unknown or mismatched identities remain rejected before storage writes.

Published revision-1, revision-2 and manual-flight revision-3 descriptor hashes are unchanged from the reviewed writing candidate. Existing explicit old factories and old identity interpretation remain, but active old-save support is not a polish acceptance requirement. No additional preservation work is needed for the current scope.

Historical simulation helpers are explicitly pinned: `campaign-roster-historical.mjs` uses revision-1 openings and revision-2 continuations; `flight-campaign-balance.mjs` uses revision-1 openings and revision-2/3 continuations. Neither silently follows current automatic-air launch selection. Existing frozen fixtures were not changed.

## Focused evidence

`tests/automatic-air-campaign.test.mjs` checks frozen published descriptor hashes, all earned opening replay tiers, all nineteen full-roster starts, matching scenario identity, locked-roster rejection, persistent best stars, protected objectives, deadlines, current teaching and playable codec/backup paths. The existing campaign tests retain explicit historical coverage while updating deliberate-current-start expectations.

`node tests/automatic-air-campaign-smoke.mjs` produced `AUTOMATIC_AIR_CAMPAIGN_SMOKE.json`:

- Nineteen current missions cleared in sequence through real paid commands and ordinary result recording, with **52/57 stars**.
- Both earlier openings also won when replayed with the full automatic-air roster.
- **232 paid actions**, **41,291 gold spent**, **246 playable restore checks**. Every command pays its normal cost. Exact restart and short deterministic continuation probes passed as part of the existing safety harness.
- Open Three Roads cleared in **103.15 seconds**, Wings of Ash in **71.75 seconds**, and Stonegate in **73.15 seconds**.
- No synthetic progress, free troops, HP/gold changes or automatic victories. Openings use a ten-second reading delay and one action every five seconds; continuations use the existing one-second reference policies.

These are one-seed authored smoke results, not a large balance sweep, optimal-play proof, human difficulty claim, browser evidence or release approval. The report records source hashes and refuses source changes during a run.

## Optional-lesson fresh-flow closure

`tests/automatic-air-optional-campaign.test.mjs` closes the visible optional replay path without adding any roster unlock or legacy-save work. The two new descriptors preserve all original content and change only scenario/ruleset identity. All buildings still reveals seven choices, including an aerie whose spawned gryphons carry automatic targeting, and rejects Warden lodges without spending gold. Current codec/history identity and separate progress records pass.

Paid current optional clears, using a ten-second reading delay and one command every five seconds:

- First Watch: **58.10 seconds**, **3 stars**, **4 paid actions**, **553 gold**.
- Forked Road: **97.90 seconds**, **3 stars**, **7 paid actions**, **1,016 gold**.

The profile still has modern roster stage 1 and its next modern mission remains Roadside Watch. The combined optional/current campaign/progression run passed **17 tests**.
