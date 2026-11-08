> Historical starting proposal. The later candidate uses adaptive normal AI and setup C rather than the fixed-enemy formations below. Current implementation, paid-route outcomes and limits are recorded in [ONE_SIGNAL_VALIDATION.md](ONE_SIGNAL_VALIDATION.md). No hypothetical setup below is a balance claim.

# One Signal Is Enough: integration plan

Read-only assessment of `/workspace/shared/ironroot-shared-crossing/work` (v0.22.0), 8 November 2026. This is a deferred Chapter 6 proposal; the Chapter 10 finale remains primary. No runtime changes, balance simulations, browser sessions, or external writes were made. Formations below are starting hypotheses, not proven viable strategies.

## Recommended minimum implementation

1. Add `one-signal-is-enough@1` after Shared Crossing in the additive Chapter 6 catalog, not the frozen historical mission arrays. Give it its own campaign-only ruleset identity with the current full roster, automatic flyers, ordinary economy and citadel choices. It needs no fog, bridge income, control counter, reserve phase, special unit, or evacuation unit. A disclosed survival clock represents the departing column.
2. Combine existing `survive(T)` with `type: 'protect', minimumSurvivors: 1` over exactly two named original watchtowers: **Ridge Signal** and **River Signal**. Keep the existing protect branch byte-for-byte equivalent when the new field is absent. Validate an integer minimum between 1 and the number of unique, valid starting targets. This small opt-in avoids introducing a new type that target extraction, advancing-progress filters and monitors would otherwise silently ignore.
3. For the opted-in objective, count living original IDs, not structures of the same type or replacements at the same coordinates. `met = count >= minimum`; `failed = count < minimum`. One loss is nonterminal; zero survivors fails immediately. A positive-health player citadel and at least one post are required for either evacuation-time victory or early enemy-core victory. Resolve same-tick last-post loss/player-core loss before victory. One HP is sufficient for either surviving asset. Do not add a health-floor objective.
4. Add an explicit original-survivors medal for retaining both posts. The existing medal fallthrough counts upgraded buildings, so a new medal cannot merely be given a new label/type. Keep three-star conventions with a second ordinary optional time medal for an early core win; neither medal gates progression.
5. Register the exact scenario/ruleset pair in current launch selection, identity resolution, roster admission, restart and progression overview. Update Shared Crossing's current navigation reward to unlock this mission without rewriting its published descriptor. Preserve all old records and all old protect-all behavior.

Existing code already supplies survival timing, per-tick objective evaluation, the correct failure-before-core-win precedence, deterministic original IDs, upgrades, paid construction, fixed/adaptive AI, target focus controls, loss details, modern save/history envelopes and restart reconstruction. No independent saved survivor counter is needed: original building existence plus saved battle time is authoritative. A dedicated evacuation progress state would be unnecessary duplication.

## Formation proposals

For both: clear visibility, normal difficulty, fixed enemy (`ai:false`, enemy gold 0), player citadel 6,000 HP, normal earned roster/prices, no hidden multipliers. Factories begin spawning normally; disabling AI does not stop production or ordinary income. All unspecified levels are 1. Coordinates are x positions; N/M/S denote north/middle/south roads. Named posts cannot be salvaged, but may be abandoned to enemy attacks. Do not present either setup as balanced before playtesting.

### A. Classic: exposed southern yard (preferred first test)

- Evacuation: 3:30. Opening cash: 700 gold.
- Player: Ridge Signal watchtower N970; River Signal watchtower S1250; mine M410; barracks M690. Starting structures represent **770 gold**.
- Enemy north: foundry N1950 level 2; barracks N2090; archery N2370.
- Enemy south: barracks S1950 level 2; aeries S2090 and S2370.
- Enemy middle: barracks M2510. Total enemy investment: **1,652 gold**.
- Decision: the north post leaves two familiar forward columns for a ground counterattack against a reachable foundry. The farther-forward southern post leaves seven normal columns behind it for layered defense, but meets fast flyers plus infantry screening. The middle starting barracks limits unrelated opening chores without winning either signal road for free.
- Candidate paid openings to test, not prescribed builds: north barracks + sanctum (370), or lodge + foundry (480); south archery + tower (395), or aerie + tower (470), adding support as needed. Retaining both should consume enough money/attention that sacrifice is a sensible ordinary clear. A tower alone may defeat sparse air waves, so explicitly test whether southern ground screening creates real pressure.

### B. Long March: established north screen, longer reinforcement choice

- Evacuation: 4:00. Opening cash: 750 gold.
- Player: Ridge Signal watchtower N830 level 2; barracks N970; River Signal watchtower S1110; mine M410; archery M690. Starting investment: **1,099 gold**.
- Enemy north: foundry N2750 level 2; barracks N2890 level 2; foundry N3030; archery N3170.
- Enemy south: barracks S2750 level 2; aerie S2890 level 2; aerie S3170.
- Enemy middle: barracks M3030; sanctum M3310. Total enemy investment: **2,425 gold**.
- Decision: a useful northern starting screen and tougher post reward spending forward to reach two siege sources; preserving the southern signal instead asks for anti-air/support behind it while the northern army buys time. Long travel makes forward production versus safe rear production consequential. The southern signal still has more build room behind it than the northern one. This is a fallback to investigate, not an extra required mission or a claim that longer automatically means better.

These proposals use legal existing columns and ordinary level-2 upgrades (70% of base price, rounded). Baseline costs: barracks 140, archery 175, foundry 270, tower 220, mine 190, sanctum 230, aerie 250, lodge 210. Both proposals end before the existing five-minute escalation. Do not switch off autonomous air to force lane purity: flyers can pursue nearby enemies on an adjacent road. Classic/Long March's separated outer roads are preferable here to Twin Span's closely coupled air defenses.

## UI, alert and save hazards

- **Names and meaning:** target objects already retain optional names, and scouting supports them, but `protectedTargetLabels()` currently discards names. Prefer an authored name with road context while preserving legacy generated labels. Change this mission's briefing, scout summary, HUD identity, selection copy and accessibility text to say “Keep at least 1 of 2 signals until 3:30.” Generic current copy incorrectly says losing any one fails.
- **Allowed loss must be unmistakable:** keep both stable target cards mounted. After the first loss show “Ridge Signal lost. River Signal remains; the evacuation can continue.” Show `1/2 signals alive; need 1`, not “half complete” or a failure toast. The progress bar should still represent evacuation time, which existing exclusion of `protect` already permits. Losing the last post ends the attempt immediately.
- **Alerts:** retain the existing 30% critical threshold, 40% rearm threshold, six-second sound quiet period, battle identity binding and pause/restore safety. Current critical-alert policy deliberately suppresses lost targets; it does not announce the mission-level significance of a first loss. Add that meaning in the presentation layer, without fabricating attackers or lost time. Avoid overwriting a permitted-loss message in the same frame with an unrelated critical message. A critical remaining post should be identified as the last signal, not sound like an optional second asset.
- **Salvage:** current UI disables its button, but `Game.sell()` and the click handler themselves have no protection check. Guard the campaign salvage dispatch against the current mission's original IDs, not only the last frame's UI list. Preserve generic engine/legacy semantics. This gives a supported-action ban without a new saved field; if engine-level enforcement is required instead, that is additional scenario-aware rule/admission work, not already supplied by the monitor.
- **Restore:** accept an active checkpoint with exactly one original gone; reject one with both gone or an ended timer/core. A replacement must not revive a signal or earn the both-saved medal. Recreate monitor/alert instances on restore/retry. Existing restored loss reporting correctly says the original was already missing and its loss time is unknown; do not turn restore time into destruction time.
- **Compatibility:** modern battle/history codecs delegate exact identity and mission outcome to campaign APIs, so the new identity can reuse their format. Legacy history must not suddenly accept this mission without explicit identity. Advance the profile compatibility barrier beyond v0.22's protocol 13, or share the next release's already-planned increment, so older tabs cannot normalize away the new record. Keep backup keys, old campaign formats, prior descriptors and earned stars intact.

## Gate before implementation is called successful

Require north-only and south-only ordinary-cost clears with meaningfully different positions/spending, at least two force compositions without a mandatory unit, and a both-retained optional challenge. Test idle/economy-only, broad coverage, concentrated assault, screened siege, lodge/ranged and air-heavy play; record when each post falls, spending, core HP, stalls and first contact. If one post is always the obvious safe choice, change the pressure or cut the encounter rather than pretending the choice works.

Regression checks must cover both original losses independently, simultaneous last loss/core kill, one-HP victory, early core victory with one survivor, replacement rejection, exact deadline/2x tick stopping, salvage dispatch, optional medal identity, allowed-loss save/restore/restart, stale-profile/backup handling, mobile cards and announcements, progression with one star, and unchanged historical protect-all outcomes. No such gameplay validation has been performed for this assessment.

Source anchors: `docs/CAMPAIGN_TEN_CHAPTER_PLAN.md:57–67`; `dist/campaign.js:230–285, 344–396, 444–508, 516–610`; `dist/protected-objectives.js`; `dist/objective-alerts.js`; `dist/campaign-presentation.js:28–47`; `dist/scouting.js:108–135`; `dist/app.js:768–809, 1217–1280, 1403–1460, 2540–2551`; `dist/battle-codec.js:44–115`; `dist/history-codec.js:21–69`; `dist/profile-session.js:2`; `dist/engine.js:14–35, 83–113`; `dist/rulesets.js:17–38, 68–87`. Existing `last-light` (`campaign.js:152–163`) already has siege north/flyers south but requires both towers: the new mission must earn its place through the permitted-sacrifice decision, not merely that familiar matchup.
