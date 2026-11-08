> Current development status: Shared Crossing, One Signal Is Enough and Lanterns on the Water are released as Chapter 6’s first three encounters in live v0.24.1 (22 main-path missions / 66 optional stars). Borrowed Ground is the next local prototype, using a twelve-site campaign yard to test keeping, upgrading or replacing inherited defenses against an adaptive opponent. The Last Ascent remains isolated and is not admitted to campaign progression or established as the final difficulty. Remaining encounters below are proposals.

# Campaign expansion: Chapters 6–10

Status: evolving campaign plan, 8 November 2026. The status above distinguishes delivered content, current implementation and unimplemented ideas; the source audit below records the starting point for the original planning pass.

## Original source audit and planning provenance

The source inspected is the recovered fog candidate whose runtime matches merged main `772d7d90897b8ad27d48ede574dc62aaacbd77ad`, tree `589e8c06f0564e595540d24503b9cf17e3fc7bed`. Fog has merged as an optional experimental Skirmish rule; that does not make campaign fog available. Public deployment is separate.

There are 19 main-path missions: three opening lessons followed by 16 missions in five numbered chapters. Two older optional introductory missions retain separate records. Chapter counts are 3, 3, 3, 3, and 4. Current fresh campaign attempts use revision 5, with the earned roster, automatic flyer movement, and citadel choices. Stars are optional mastery rewards, not progression requirements.

The earlier completed planning pass mapped those systems and proposed Shared Crossing, One Signal Is Enough, and Wake the Reserve. Its standalone local document was lost during the environment reset. This is a new, source-checked expansion of those concepts, not a claim that the missing document or its original bytes were recovered.

Steve's latest direction is to make Chapter 10 a hard, uphill, nail-biting conclusion, use fog in selected missions, and let chapters grow beyond three or four missions where story or variety justifies it. His earlier direction allows strategic stalemates and values interesting, understandable choices even when they are not optimal competitive purchases.

## The shape of the campaign

Preserve the existing chapters, earned progress, and the defeat of Vey. Do not bring him back merely to justify more combat. The next arc follows the settlements' effort to keep the reopened roads free when a coalition of holdout garrisons closes the upland supply route. Rowan, Sera, Iona, and Bram have different practical priorities within that effort: keeping people supplied, learning what is ahead, protecting the shared crossings, and breaking fortified positions.

These are working sizes, not content quotas. Steve explicitly allows 10–15 missions in a chapter where teaching, story, strategic variants and payoffs earn that space; there is no target to pad toward. Cut an encounter if it plays like another with different names. Additional side stories can sit inside a chapter without becoming mandatory filler or permanent stat rewards.

Future missions default to adaptive opponents: the intended direction is 90% or more, not static factories presented as intelligent enemies. Released One Signal and Lanterns use ordinary economy-respecting adaptive AI. Borrowed Ground follows that approach. Shared Crossing’s released fixed setup remains an explicit exception, not silently relabeled. Mission-specific AI can have disclosed priorities or reserves, but must spend real resources and respect information. Crossing/converging/diverging roads, five-road or lane-free maps, special campaign units and campaign spells are separate experimental hooks; none is implied implemented by this plan and no single mission needs to contain all of them.

| Chapter | Working size | Distinct player problem | Difficulty rhythm / fog |
| --- | --- | --- | --- |
| Opening: The Road to Emberwatch | 3 existing lessons | Learn placement, support and the expanding roster on one, two, then three roads | Paused teaching; no fog |
| 1: Embers of the Vale | 3 existing | Establish a company and fund/protect the villages | Foundation; no change proposed |
| 2: The High Pass | 3 existing | Answer air and towers while holding a signal station | First specialist counters; no change proposed |
| 3: The Furnace March | 3 existing | Attack siege works and a working enemy economy | Multiple viable routes; no change proposed |
| 4: The Last Crown | 3 existing | Prepare for and defeat Vey's combined army | First climax, not retroactively the tutorial |
| 5: The Open Frontier | 4 existing | Longer roads, two-road constraints and competing protected objectives | A new operational scale after the first ending |
| 6: The River Compact | 5 proposed | Control routes and decide what can be given up | Introduce one new decision at a time; one supported first fog mission |
| 7: The Unlit Roads | 4 proposed | Spend on information and act on incomplete information | Two fog missions, separated by visible recovery/assault missions |
| 8: The Siege Coast | 5 proposed | Invest in a sustained siege without starving the other roads | Mostly open visibility; one reconnaissance encounter |
| 9: The Broken Line | 4 proposed | Recover from losses and change plans when a disclosed reserve enters | One fog flank encounter; tougher but not every start desperate |
| 10: The Last Ascent | 6 proposed | Win from clear material/positional disadvantages | Hardest chapter; one fog approach, clear-view finale |

That working shape adds 24 encounters, for 43 main-path encounters including the opening. It is not a promise to implement all 24. Branching pairs can let the player choose the order of two battles before a capstone; every mission should still start from a readable authored setup rather than carrying damage or depleted treasury from a previous attempt. No campaign roguelike or irreversible attrition is proposed.

## Chapter 6: The River Compact

The council has opened the river, but the settlements cannot keep all three roads supplied by defending their own doorstep. This chapter turns control, scouting, and deliberate sacrifice into useful choices. It should feel new after Common Ground, not be five more protect-the-building missions.

### 6.1 Shared Crossing

**Briefing:** Iona needs two crossings held long enough to move supplies through; you can change which pair you hold as the fighting shifts.

**Player objective:** Hold any two of three bridges for a cumulative period. Losing control pauses progress instead of wiping it out. Destroying the enemy citadel remains an alternate win.

**Decision:** A concentrated army may take one road easily but cannot complete the route objective alone. The third road gives a choice of where to commit, and forces already advancing automatically make cheap reinforcements on the threatened road valuable.

**Prototype values:** Start with a 60-second cumulative goal only as a test setting. Keep existing bridge semantics: ground troops take two uncontested seconds to capture, flyers deny but cannot capture, and ownership lingers when empty. Both owned bridges must be uncontested to advance the goal. Do not silently change the user's lingering-ownership idea into a presence-only rule. Capturing and then keeping two quiet bridges is a valid success, not an exploit to punish.

**Scope:** Campaign control objective, saved progress counter, explicit campaign admission and compact objective display are new. Ownership and income must be separable so this first mission can teach control without adding an undisclosed income bonus. Existing Skirmish bridge rules must remain unchanged.

**Reason to build first:** This tests a genuinely different victory condition with a small, observable decision loop. If it merely records the army that already wins every road, redesign or cut it rather than manufacturing difficulty with more enemy income.

### 6.2 One Signal Is Enough

**Briefing:** Two signal posts cover the evacuation road, but either can guide the last column home; Rowan would rather lose a post than the whole company.

**Player objective:** Keep at least one of two named starting posts alive until the column is clear, or destroy the enemy citadel while one remains. Losing the first post is permitted and updates the objective; losing the last fails.

**Decision:** The north post faces siege that can be reached with a ground assault; the south faces flyers and has more safe room behind it. Defending both earns an optional distinction, but preserving either must be a worthwhile route. The two solutions need different spending and battlefield positions, not simply different click coordinates.

**Scope:** A minimum-survivors objective and clear loss/remaining UI are new. Protected posts remain unsalvageable in the first prototype, so letting an exposed post fall is a strategic sacrifice, not a refund exploit. The current protect-all semantics cannot be reused unchanged.

**Risk:** This is only worth keeping if it enables a real sacrifice decision. If testing finds one post trivially safer every time, change the starting pressures or do not add the mission.

### 6.3 Lanterns on the Water — first campaign fog

**Briefing:** Sera knows where the old customs houses stand, but the patrols between them have stopped answering signals.

**Player objective:** Destroy two known customs posts or the enemy citadel, with an ordinary defensive opening and no short surprise deadline.

**Decision:** Forward production scouts through its naturally spawning army; gryphons see farther but can be drawn toward nearby enemies and met by archers. A measured probe can reveal which road is worth a siege investment, while a forceful blind push remains possible.

**Scope:** Begin on the existing Classic geometry. The chart can disclose fixed landmark locations, but not their current HP, upgrades, live defenders, or replacement buildings. Enemy AI uses the same observation boundary. Do not add fog to an old mission as a silent difficulty change.

**Teaching:** One brief explanation of known terrain versus current sight, an immediately legible first contact, and a reminder that remembered buildings are not live intelligence. The mission should not require exploration of an invisible pixel or a hidden enemy building to know what the goal means.

### 6.4 Borrowed Ground

**Briefing:** The river town offers its cramped fortified yard as a camp, but the defenses built to protect its warehouses leave poor positions for a new army.

**Player objective:** Break the two roadblocks beyond the town or destroy the enemy citadel. Starting defenses are useful assets, not protected instant-failure objectives.

**Decision:** Keep the towers and existing producers for safety, upgrade what fits, or salvage some of that investment to make room for a better supported advance. A mine consumes space as well as money; a forward producer shortens the reinforcement journey but takes more risk. At least two of those approaches should remain plausible.

**Scope:** Prefer an authored formation using normal legal sites, costs and salvage rules. Do not invent impassable rubble or free-moving buildings. If the ordinary formation does not create an interesting space choice, this mission needs a deliberately versioned map or should be dropped instead of being described as cramped when it is not.

**Risk:** If the starting defenses are so valuable that selling them is always a mistake, or so useless that clearing them is automatic, the encounter has no real choice.

### 6.5 A River Between Us

**Briefing:** The last toll commander attacks one crossing while holding the other roads with guns and archers. The council needs a route that stays open after the army leaves.

**Player objective:** Clear the command post and secure any two crossings. An enemy-citadel win remains an alternative, without a mandatory perfect defense.

**Decision:** Timing a siege-supported push against maintaining a second route combines the chapter's new control idea with familiar counters. No fog here: the capstone asks for execution, not another layer of hidden information.

**Scope:** Reuse the control objective and ordinary destruction; do not also combine reserve phases and fog in the first version. The reserve concept is deliberately deferred to Chapter 9 rather than loading another new system into Chapter 6.

## Chapters 7–9: distinct preparation for the finale

### 7: The Unlit Roads — information is a resource

- **False Quiet (fog):** A known central fort looks like the shortest route, but the defender's production mix must be observed. Test two authored starting production layouts, disclosed as variable and persisted for save/restart, rather than an AI that reads the player's hidden queue. No routed patrol-unit system is implied.
- **The Road We Know (clear):** Use the newly charted approach in an open assault with no additional information mechanic, providing a relief beat and showing why reconnaissance mattered in the story.
- **Broken Lanterns (fog):** Two friendly forward positions provide ordinary sight. Their survival is useful, not an instant-fail requirement; losing one makes that road uncertain and forces a choice between replacing vision through troops or committing elsewhere.
- **Through the Reed Beds (clear capstone):** Competing lane pressures encourage two different army compositions and punish spending everything on a single visible strongpoint. This is a budget/position problem, not fog for its own sake.

### 8: The Siege Coast — make room for an army that can finish

- **The Long Haul:** On Long March, a siege force assembled safely at the rear takes longer to reach the defenses. Forward production shortens the reinforcement journey but exposes the investment, making placement and timing matter without adding manual troop orders.
- **The Archer's Quay:** Air can bypass ground screens but a strong archer position covers the approach. The correct answer need not be air; infantry with protected ranged or siege should offer another route.
- **Salt in the Stores:** Destroying real mines reduces an active opponent's future spending. A core race is still legal, but slow attrition should visibly change what the enemy can afford.
- **Harbor Lights (fog):** Scout the defense before paying for slow siege; no hidden objective HP or omniscient warning arrows.
- **Bram's Breach:** Open-view capstone with layered tower/support positions, enough attack travel time to notice a wrong composition, and pressure on an undefended road. Do not add literal movable siege control or terrain-height bonuses.

### 9: The Broken Line — recovery and adaptation

- **The Camp We Kept:** Start with a damaged but viable camp and choose between an immediate counterattack and rebuilding economic support. A citadel purchase can feel sensible without being mandatory or restoring free HP.
- **Two Messages (fog):** Choose which observed threat to answer while the other may have changed since last sight. Avoid false alerts generated from hidden state.
- **Wake the Reserve:** The garrison has a disclosed finite treasury reserved for the loss of an outer command post. Prepare support before pushing that lane, or open it early and absorb the response. This introduces one saved scenario phase rather than a free reinforcement wave. State explicitly whether dormant ordinary income accumulates. Existing factories must keep spawning normally unless a separate, clearly explained mechanic is authored; `ai:false` is not dormancy. Do not end the battle on the same target whose loss is meant to trigger the counterattack.
- **Leave No Road Closed:** Open-view recovery capstone in which sacrificing an exposed asset and replacing the army is allowed. Winning with damage taken is a success, not a failed health-floor objective.

## Chapter 10: The Last Ascent

The uphill feeling comes from the player arriving below an entrenched, supplied army, not from an unannounced difficulty multiplier. The chapter should be genuinely harder than Chapter 9, with a readable opening disadvantage, multiple ways to reduce it, and enough time to recognize a mistake and attempt a recovery. There is no new required unit or spell in the final chapter.

### 10.1 Below the Ramparts

An established forward siege line threatens the approach while the player begins from a smaller rear camp. Authored factories begin spawning normally; this does not require preplaced active siege units. Destroy any two of three exposed outposts to establish the ascent, or win outright at the citadel. Taking the weakest road is encouraged, but covering the road containing enemy siege costs something. All three starting threats are visible, and the initial defense must admit at least two materially different openings.

### 10.2 The Last Granary

The opposing commander has functioning rear mines and enough established production to exploit them. The player can raid the economy with supported mobile pressure or build a slower siege line, accepting more incoming waves while it reaches the rear. Destroying mines must genuinely reduce money for new purchases; do not replace their income with a script when the player succeeds. Existing factories continue producing without unit wages, and baseline income remains, so the mission must not promise that cutting the purse stops every current wave.

### 10.3 No Fires Tonight — fog approach

The fort locations are on Sera's chart, but troops and later construction are not. Narrow information makes a strong archer road potentially useful against air from two neighboring approaches, without tuning that matchup to a compulsory ratio. The player starts with enough defensive coverage to observe a contact before the base is doomed. No unseen teleporting army, arbitrary fog-only damage bonus, or hidden time limit.

### 10.4 Against the Gate

A deep fortification line needs a force that can both survive and damage structures. Siege with a screen, a supported infantry mass, and opportunistic air should be tested as possibilities rather than a prescribed solution. The opposing side roads remain active, making the choice of where to spend reinforcements meaningful. Breaking a tower changes the actual line of fire; a decorative gate does not pretend to unlock building territory that the engine does not support.

### 10.5 The Countermarch

Destroying the outer command post releases the enemy's declared reserve spending. The challenge is keeping enough living production and income to absorb that response while finishing the attack. The reserve has a finite budget and uses normal prices, spawn intervals, and travel; it does not refill whenever the player gets ahead. The opening and reserve stage each have a clear briefing/HUD cue. A damaged citadel or sacrificed outlying building is acceptable.

### 10.6 The Last Ascent — final battle

Start with a battered but defensible camp below an entrenched enemy whose existing mines, defenses, and supported production explain its advantage. The player has enough money for a deliberate opening, not enough to buy every answer. Visible forward works supply the pressure; dismantling them or the real income behind them makes the battle easier through ordinary mechanics.

**Win:** Destroy the enemy citadel while yours survives. Do not add a minimum-HP requirement that rejects a nail-biting victory at 1 HP. Do not require all side objectives if a clever core attack works.

**Competing approaches to validate:** Contain two roads while investing in a siege breakthrough; cut economy before committing the final assault; or accept substantial citadel damage for a concentrated supported race. These are test hypotheses, not promised winning recipes. Rootwardens can buy protection time, warriors can provide cheaper distributed pressure, and citadel choices are available without a mandatory purchase or arbitrary delay.

**Tension:** Actual attacks, actual losses, limited opening resources, and the cost of replacing production. Never clamp either citadel to manufacture a close finish, grant secret reinforcements after success, weaken the player when ahead, or punish an unexpectedly effective strategy solely because it wins convincingly.

**Pacing:** Aim first for a satisfying battle rather than a mandatory duration. A longer, open-ended finale is plausible, but the current five-minute escalation must be deliberately retained with a visible warning or explicitly replaced in the new scenario ruleset. An unlimited-duration finale would additionally need explicit campaign deadline, HUD and progress-validation changes; selecting the open-ended combat ruleset alone does not remove a mission deadline. No forced base drain is proposed. A strategy can stall; the UI should make the remaining enemy production and known objectives understandable without revealing hidden information.

**Stars:** Victory alone completes the campaign and offers Skirmish as the primary next step, with Replay retained. Optional stars should encourage another approach or additional achievement rather than require a near-death finish, a particular unit, or three-star completion to see the ending.

## Fog is selective and must respect information

The proposed distribution is one of five Chapter 6 missions, two of four Chapter 7, one of five Chapter 8, one of four Chapter 9, and one of six Chapter 10: six of the 24 proposed encounters. These are placements to test, not a percentage target. Keep the final battle clear unless actual play shows fog improves it.

- Known terrain and disclosed landmark locations are allowed; current hidden HP, upgrades, movement, spending and destruction are not silently revealed by scouting, target counters, alerts, audio, minimap, or camera-follow helpers.
- Authoritative victory evaluation can use true state, but an ongoing target display must distinguish a confirmed result from a last-seen record. If a mission uses explicit radio-confirmed objective messages, that exception must be intentional and stated, not a leak disguised as flavor.
- Friendly protected assets can report their own health and losses. Enemy building memories stay stale until observed again; give them a last-seen label and time.
- The AI uses the same visibility boundary for tactical decisions. An authored initial deployment or announced phase budget is allowed when disclosed; omniscient reactive counters are not.
- Initial scout reports in fog missions must show only the intelligence the briefing grants, not the current all-building roster. The simplest first mission should use known fixed landmarks on Classic with no bridge-income combination.
- Normal chapters stay unchanged. Add explicit new scenario/ruleset identities and preserve earned stars. Do not treat currently unverified mobile/offline/performance coverage as completed merely because the experimental Skirmish mode merged.

## Implementation order and review gates

1. **Shared Crossing vertical slice**, not a whole chapter dump: one new campaign objective, no fog, ordinary costs and units, explicit persistent ownership. This answers whether control adds a useful decision before committing an arc to it.
2. **One Signal Is Enough, released:** only if both defended-post strategies are viable and the permitted loss is clearly communicated. Reuse ordinary protected-asset alerts, but update minimum-survivor semantics everywhere. Use adaptive enemy spending rather than the initial fixed-garrison sketch.
3. **Lanterns on the Water, released:** one explicit campaign-fog ruleset and mission on Classic, with scouting/objective/HUD isolation and AI symmetry checked. Keep the rest of the campaign unchanged.
4. Author the remaining Chapter 6 encounters after these slices establish which ideas work. Keep the reserve system for Chapter 9, where its trigger must give a real preparation decision rather than adding one more unfamiliar rule to Chapter 6.
5. **Prototype a Chapter 10 finale early**, before filling Chapters 7–9, to establish a concrete difficulty destination. Then build intermediate missions that teach and combine the decisions needed there. This avoids writing a lot of content whose difficulty leads nowhere.

Tests should include paid concentrated pressure, screened siege, Rootwarden/ranged, broad low-cost coverage, safe economy, air-heavy and adaptive responses. Record losses, stalls, damage, first contact, spending and objective progress, not only wins. Use fixed regression seeds plus held-out layouts/seeds where randomization is part of the mission; do not claim a synthetic win rate predicts human difficulty. Validate a plausible novice route and at least two distinct experienced routes in the final candidate, then perform ordinary interactive playtests for understanding and pacing. Test pause/restart-to-briefing, save/restore of objective phase/counters, earned progression, optional replay, and final-to-Skirmish navigation.

## Source-checked constraints to resolve, not hand-wave

- `dist/campaign.js:12–17, 176–225`: current five chapters and Chapter 5's existing objective combinations.
- `dist/campaign-onboarding.js:18–94`: three modern opening missions; `campaign.js:311–337` selects current revision 5.
- `dist/engine.js:45`, `dist/fog.js:103–106`, `dist/battle-codec.js:67–71`: fog currently admits only Classic open-ended Skirmish without bridge income. Campaign fog needs explicit engine, codec and scenario support, not a Boolean on a mission object.
- `dist/scouting.js:100–170`: existing scouting prints the full starting deployment. It needs a disclosed-intelligence path for fog missions.
- `dist/campaign.js:428–479`: objective targets use live original structure IDs; protect currently means all survive. Enemy-core victory bypasses advancing objectives but does not override failed protection or HP requirements. Unknown objective types currently fall through to a survival calculation, so new types need explicit validation/handlers.
- `dist/campaign.js:439–440`: campaign income is base plus live mines; it does not include bridge income. Avoid combining them accidentally.
- `dist/bridge-control.js:1–35`: persistent ownership, ground capture, air denial, 0.5 gold/sec total-map Skirmish payout. Campaign control needs explicit economy treatment and saved counter state.
- `dist/engine.js:136–143, 163, 179`: at five minutes production accelerates ×1.65, troop damage to structures ×1.75, and citadel shots change from 32 to 18. Open-ended does not mean unchanged combat pacing. `app.js:2349–2352` replaces the ordinary overtime label with the campaign title, so a longer mission needs readable escalation status.
- `dist/engine.js:140–143, 198`, `dist/campaign.js:402–407`: AI disabled does not pause factory spawns or income; changing `game.ai` midbattle also conflicts with saved scenario identity. Reserve phases require proper scenario state rather than a hidden flag flip.
- `dist/campaign.js:495–499`: progress validates finite mission completion times and prerequisites. New lengths and branch transitions must preserve existing records. A genuinely unlimited mission also needs a supported deadline representation and result-time validation; it is not an existing authored option.
- `dist/challenges.js:65–85`: the existing Ashen Crossroads trial already supports any two of three destruction targets. Port its validated idea to a campaign objective instead of assuming campaign already has that feature.

The original design pass changed no runtime files or profiles. Subsequent implementation is tracked separately in the status at the top; proposals below the delivered/current slice are not a shipping commitment.

## Independent design review

A separate read-only reviewer inspected the current source and proposed encounter decisions. Its key corrections are reflected here: reserve machinery moves to Chapter 9; Chapter 6 concentrates on control, permitted sacrifice and one first fog encounter; mines finance new purchases rather than unit wages; the finale accepts badly damaged victories; current campaign fog, objective leaks and the five-minute escalation are explicit integration work. The reviewer did not run simulations or play these proposed missions.
