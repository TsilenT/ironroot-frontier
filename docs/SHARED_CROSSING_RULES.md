# Shared Crossing prototype rules and evidence

## Scope and identity

- Chapter 6: **The River Compact**; first mission **Shared Crossing**, unlocked after Common Ground.
- Scenario `campaign/shared-crossing@1`; immutable campaign-only ruleset `frontier-campaign-shared-crossing@1`; battlefield `classic@1`. No historical mission revision is changed.
- Original 16-mission/5-chapter catalogs, old descriptors and legacy overview remain intact. Current progression gains the separate chapter/mission; progress schema and historical star/best-time records remain version 1.
- No fog, reserves, manual unit orders, new unit statistics, map changes, Skirmish bridge rewards, or old save-field widening.

## Deterministic control contract

- All three bridge zones use the existing inclusive 210 × 130 geometry at each road’s river crossing. Living troops are sampled by actual position after simultaneous movement/damage, once per simulation tick.
- Ground captures in two continuous uncontested simulated seconds. Enemy presence interrupts capture; flyers deny but cannot capture. Empty ownership persists. Enemy takeover uses the same two seconds, and aborting takeover restores the previous owner’s eligibility immediately.
- Any two player-owned bridges with no opposing living troop accrue one shared clock. A third bridge provides an alternative pair, not a multiplier. Losing the required count pauses the accumulated total, never resets it.
- Newly captured bridges contribute only the part of the tick after capture. The second-earliest eligibility start among the available bridges determines the overlapping eligible interval, including differing sub-tick capture boundaries.
- Only the player has the supply-route victory objective. The fixed enemy troops deny that objective and threaten the player citadel; capture mechanics, not victory conditions, are symmetric.
- Control is engine-owned state, not rendering or evaluator state. Evaluating, reading status, saving, and restoring do not advance it. A pause supplies no simulation time.
- Enemy citadel destruction is an alternate win. Player citadel destruction or simultaneous citadel destruction fails. Core destruction on the same engine tick takes precedence and does not add control time. Reaching the control target on the exact deadline wins; an incomplete target on the deadline fails. No later update or evaluation adds progress.
- Bridges add no income and have no capture bounty. Ordinary base income, paid mines/upgrades, and the existing 2-gold troop-kill reward remain unchanged.

## Additive state and API

- `state.campaignControl = { bridges: [{ owner, capturing, progress }, ...], heldSeconds }` exists only under the new ruleset. Its fields and bridge entries are validated strictly. Only this new identity also requires simulated time to match its 0.05-second tick index, rejecting off-grid saves before they can step past the deadline.
- The published `state.bridgeControl = { bridges, earned }` schema and income-only `supportsBridgeControl` predicate are unchanged. Campaign fields under old identities, or income fields under the new identity, are rejected.
- `supportsCampaignControl(ruleset)` recognizes the new rule. `campaignControlStatus(game)` returns `{ seconds, target, count, required, complete, advancing }`. Count means player-owned/uncontested, including empty-owned zones. Advancing also excludes terminal states.
- `bridgeStatus(game)` supports both modes but returns zero income for campaign bridges. `bridgeSummary(game)` describes campaign ownership/capture/contestation without earnings language. `CAMPAIGN_CONTROL_RULES_TEXT` provides player-facing rules.
- The new objective type is `control`. Campaign evaluation reads the exact heldSeconds counter and returns ordinary objective/medal/result fields without mutating anything.

## Provisional authored setup

These are test values, not a fairness or final-balance claim: 60 cumulative seconds, 4:30 deadline, normal difficulty, 1,100 starting player gold, 6,000 HP on both citadels. The deadline is before the existing five-minute escalation.

The player starts with one middle-road mine (190 gold investment), but no free ground force or pre-owned bridge. Every tested escort and supporting building is bought normally. The enemy has a fixed 1,369-gold starting force: three level-2 barracks (3 × [140 + 98]), a northern archery range (175), middle sanctum (230), and southern aerie (250). It does not construct, upgrade, buy citadel choices, or use volleys. Enemy starting gold is zero. All placements and levels are disclosed in the briefing.

## Paid-policy simulation

Run `node tests/shared-crossing-balance.mjs`. Seeds: 6101, 123, 719, 51017. One paid build/upgrade attempt every two simulated seconds. Seed 719 saves/restores through the actual battle codec every ten seconds. Other mechanical tests compare full serialized final states with and without repeated restore. No grants, troop positioning, HP edits, timer manipulation, or free orders appear in this policy simulation.

Every tick asserts the gold ledger: starting gold + sampled ordinary income + ordinary kill rewards − successful paid action costs. The script emits actions, ownership/control traces, duration, spending, ordinary income, kills, contested time, paused time, citadel HP, outcome and whether the win was control or core. Contested time means any bridge had opposing presence; it is not solely objective-paused time.

| Policy | Wins / 4 | Control / core wins | End-time range | Spending range | Ordinary-income range | Contested-time range |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| northMiddle | 4 | 0 / 4 | 109.25–131.90 s | 2253.00–2634.00 | 1195.00–1483.75 | 21.25–87.35 s |
| northSouth | 4 | 0 / 4 | 95.50–96.85 s | 2088.00–2088.00 | 951.00–964.50 | 30.55–30.55 s |
| middleSouth | 4 | 4 / 0 | 96.10–96.35 s | 2100.00–2100.00 | 991.25–994.37 | 26.70–27.00 s |
| northMiddleWardens | 4 | 4 / 0 | 93.75–108.70 s | 2030.00–2205.00 | 931.87–1118.75 | 23.35–38.30 s |
| wardenSupport | 4 | 4 / 0 | 97.70–98.70 s | 1920.00–1920.00 | 888.00–898.00 | 27.30–28.30 s |
| groundSplashFirst | 0 | 0 / 0 | 123.90–170.70 s | 2170.00–3014.00 | 1208.25–1843.88 | 23.95–29.10 s |
| concentratedRush | 0 | 0 / 0 | 75.45–77.05 s | 1854.00–1854.00 | 739.50–755.50 | 34.00–40.50 s |
| airOnly | 0 | 0 / 0 | 101.85–105.60 s | 1690.00–1690.00 | 701.00–732.12 | 4.75–4.80 s |
| idle | 0 | 0 / 0 | 63.85–64.95 s | 0.00–0.00 | 415.25–420.75 | 0.00–0.00 s |

Overall: **36 runs, 20 wins (12 control / 8 core), 16 losses**.

All three road pairs have a paid control-victory route: north/middle with wardens, archery and sanctum; north/south with wardens and archers; middle/south with warriors, foundry and archers. Warriors are also viable without wardens; some successful routes end by destroying the enemy citadel first. The optional third road is not purchased by the two-road policies.

These deterministic policies are evidence, not a complete strategy search or human playtest. The north/south warden route can finish with only 57.6 citadel HP on seed 719, and other mixes fail. Ground-splash-first, concentrated one-road rush, air-only, and idle policies intentionally remain losing examples in this sample. Air-only never earns control time.

The first 700-gold setup lost all 28 initial policy samples, so starting gold was increased to 1,100 and supporting production was funded before extra mines. No combat statistics or capture rules were weakened to make a strategy pass.

## Validation

- `node --test tests/shared-crossing-control.test.mjs`: capture boundaries, all pairs/three bridges, air denial, symmetry, aborted takeover, empty ownership, pause/no-time behavior, exact resumed state, terminal-step behavior, pure evaluation, exact deadline/core precedence, strict identity/schema boundaries and paid restore determinism.
- Existing bridge tests preserve all Skirmish payout behavior and exact mode-off trajectory hashes. Campaign expansion tests preserve old descriptor/simulation snapshots and Chapter 5 data.
- The focused bridge/campaign/fog/codec regression run passed 189/194 before expected additive catalog test updates: current mission/progress counts, the old progress catalog hash (historical subset still exactly matches), current revision exceptions for the new mission, and the registry list’s additional identity. No mechanical regression was identified by those five catalog failures.
- Final combined focused run after off-grid clock hardening: 85/85 passed, including Shared Crossing control/profile/UI, existing bridge, Chapter 5, restart, and fog-core suites.
- No final balance claim, browser-playability claim, or release/merge claim is made here.
