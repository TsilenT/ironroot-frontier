# Borrowed Ground

## Frozen encounter

Chapter 6’s fourth mission is `borrowed-ground@1`, after Lanterns on the Water. It binds only to `borrowed-yard@1` and `frontier-campaign-borrowed-ground@1`. The yard keeps the ordinary 3200 × 900 battlefield and three roads at y 260/450/640, with four marked construction plots per road at home distances 410/690/970/1250. Both sides have the same twelve plots and cap.

Destroy the **two original** North/South Roadblocks at x 1950 on the outer roads, or the enemy citadel, by the disclosed **10:00** deadline. Replacements do not undo destruction credit. Your citadel must survive; **1 HP is valid**. Starting friendly buildings can be upgraded, destroyed or salvaged without mission failure. Neither salvage nor a particular unit or purchase is required. Optional medals are a ≤4:00 clear and 4,500 surviving citadel HP.

The enemy uses the existing normal adaptive AI, not a fixed production script. All later construction, upgrades, volleys and optional citadel purchases use ordinary prices, actual income and kill bounties. Both sides retain the full earned eight-building roster, automatic flyers and ordinary salvage. Fog and bridge income are off. At 5:00, existing escalation gives production ×1.65, troop structure damage ×1.75 and citadel shot damage 32→18. There is no forced citadel drain, health floor, hidden reinforcement or speed/damage buff.

## Why a separate yard

Classic’s engine permits arbitrary legal coordinates inside its territory rectangle, but the ordinary pointer/controller interface snaps to its 24 marked sites. A nine-building camp still leaves fifteen ordinary sites free. Merely describing that formation as cramped would not create the intended choice. Filling most of Classic’s cap would instead grant a large, cumbersome starting army.

Borrowed Yard makes the constraint explicit: the town lends twelve marked plots rather than its entire riverbank. It is a new immutable campaign map, not a quiet reduction of Classic’s capacity. There are no fake rubble collisions, plot unlocks or free building moves. The ordinary non-Classic marked-site admission, renderer snapping and site display already support the restriction.

The chosen columns are a subset of the AI’s ordinary candidate positions. Column 410 supports its constructor and rear mine search; columns 690/970/1250 support ordinary front-production recognition and construction. No AI algorithm was changed. The map stays outside the public Skirmish catalog, and engine/codec guards bind it to this exact campaign identity.

## One authored formation

All buildings begin at ordinary level 1 and full health. Positions below are player-world coordinates; the enemy formation is reflected from the same twelve home-distance plots.

- Player: towers N/M/S1250; barracks N/M/S970; archery N/S690; mine M410. Nine occupied plots, three free rear plots (N410, M690, S410). Starting investment 1,620 gold; cash 420; real income 7.5 gold/sec.
- Enemy: target towers N/S1950; barracks N/S2230 and M1950; archery M2230; foundry N2510; mine M2790. Eight occupied plots. Starting investment 1,495 gold; cash 160; real income 7.5 gold/sec.

Keeping all nine inherited assets leaves three additions before the cap. A mine therefore competes with combat support for an actual plot. Replacing an outer tower creates a forward producer but gives up that tower’s defenses. A full-health level 1 tower refunds 110 gold; a new barracks costs 140. The ordinary refund is `floor(invested × 0.5 × currentHP / maxHP)`, including paid upgrades. All building types occupy one plot and use the same separation requirement.

Forward placement changes actual reinforcement travel. For example, a warrior producer at 1250 instead of 410 shortens the same unobstructed journey by 840 world units, about 13.1 seconds at ordinary warrior speed. The prototype’s forward barracks are also 280 units ahead of its retained 970 barracks. These are geometry/speed comparisons, not guaranteed arrival times during combat.

## Bounded paid evidence

The final formation was not retuned after testing. Final evidence uses **four policies × three seeds** (6401, 719, 51017), plus idle on 6401. Policies issue **at most one ordinary command every five simulated seconds**, counting salvage and volleys as commands. Decisions use current own state and the visible fog-free battlefield; they do not read seed-dependent forecasts or measured outcomes. Independent instrumentation integrates actual mine income and kill bounties and records every successful transaction for both sides.

- **Keep ordinary mass:** all three wins. Rear barracks/archery followed by upgrades, with every inherited building retained. Original-roadblock wins at 289.60/290.55 seconds and an enemy-citadel win at 155.40. Player spending 1,752–3,009; no refunds. No siege, wizard, flyer, Rootwarden or citadel purchase was needed.
- **Selective salvage:** all three original-roadblock wins at 179.15–213.35 seconds. Sell only the two outer towers, replace them with forward barracks, then build rear siege/wizard support and upgrade. Refund 220; player spending 2,162–2,463. Seven original assets remained in two runs; five remained in the other after ordinary combat losses. Salvage was a different deployment, not a compulsory objective.
- **Keep rear siege support:** two enemy-citadel wins at 280.25/401.00 seconds; one loss at 303.35. All inherited assets survived the winning runs. Player spending 3,008–4,488 in the wins. Keeping the camp does not guarantee victory.
- **Greedy three-mine salvage:** all three losses, 225.15–358.10 seconds despite 3,808–6,915 gold of player spending. Filling the scarce rear plots with mines instead of additional combat support did not succeed under this policy. This does not prove every economic route loses.
- **Idle:** lost at 177.30 seconds with no player spending. The enemy spent 1,535 in eleven ordinary commands.

Every measured win retained 6,000 citadel HP. Those outcomes were accepted rather than modified to manufacture a near-loss. Enemy commands varied with the opposing deployment and included building counters, upgrades, volleys and an optional citadel choice. Across the twelve active runs, the enemy made 11–30 paid commands. Both ledgers reconciled within 1e-6 gold; the rounded report prints zero error.

An earlier quick feasibility pass used one-second purchasing and is not the final balance evidence. Its measurements are not blended into the five-second results above. All raw run logs remain outside the source repository.

## Identity, persistence and validation

The new mission appends one encounter and three optional stars, giving 23 main-path missions/69 stars. Existing descriptors retain their identities and rewards; current launch navigation alone points Lanterns to Borrowed Ground. The map/rules pairing, original-roadblock IDs, keep/sell choices and paid upgrades survive active checkpoints. Restart restores the authored camp under the same immutable identity.

`tests/borrowed-mission.test.mjs` passed 10 checks: exact identity and earned roster, setup parity and honest briefing, ordinary optional salvage, original-ID target semantics, either win at 1 HP, own-loss precedence, exact 600-second deadline and rejection at 600.05, restart/one-star progression, paid keep/core and salvage/roadblock routes through actual profile-admitted restores, and full production/QA transaction parity. A combined campaign, expansion, restart and Borrowed regression passed 45 checks with no failures. These focused tests are separate from aggregate and browser verification.

Reproduce the final matrix with `node qa/borrowed-ground/simulate.mjs`. `--production=true` uses the actual campaign factory; `--out=/path/outside/source.jsonl` retains transaction and trace rows. Idle is explicit: `--policies=idle --seeds=6401`. No script writes a player profile.

`node qa/borrowed-ground/prepare-native.mjs` regenerates concise fixture metadata only. `--write-preview` explicitly creates the separate preview. Synthetic prerequisite records unlock the mission; ordinary paid actions generate rebuilt 15.05s and near-finish 192s checkpoints. The restored finish reaches the natural original-roadblock victory at 194.45s with zero additional player commands. No HP/objective injection is used. Preview storage is per-fixture namespaced `sessionStorage`, with no real-profile fallback and service-worker registration disabled. Only its app/index wrappers differ from runtime source.

## Limits

Three seeds and simple scripted policies establish feasible paid alternatives, not human win rates or overall difficulty. Successful no-salvage and selective-salvage routes do not prove equal strength or exhaustive strategic balance. The full-health wins are valid, but they do not demonstrate dramatic pressure. Finite disclosed deadlines permit a strategic stall inside the attempt without promising unlimited duration. These engine checks do not certify mobile usability, physical devices, native rendering, audio, offline/PWA behavior or performance. Native acceptance and aggregate results belong in the separate review/validation record; this mission remains a local candidate until explicitly published.
