# Campaign full-roster balance review

## Verdict

No blocking roster-loss, impossible-mission, save/restore, or newly unique cheap universal-strategy defect was found in the **16 revision-2 continuations**. All 16 have a demonstrated ordinary paid route from genuinely earned campaign progress. This is a bounded simulation review, **not a claim that the campaign is optimally balanced or a human completion-rate estimate**.

The campaign is permissive about composition and early citadel victories. Rootwardens are useful, but the review does not support blaming that permissiveness on the new tank: simple warrior purchases are often faster and cheaper. No runtime or unit tuning was performed.

## Reproduce and scope

```sh
node tests/campaign-roster-balance.mjs > docs/CAMPAIGN_ROSTER_BALANCE_RESULTS.json
```

**Final run: 515 full battle simulations.** New-campaign and onboarding samples include **2,095 exact battle-envelope restore checkpoints**; the matched legacy restored samples are additional. The run completed successfully, and `node --check tests/campaign-roster-balance.mjs` also passed.

The JSON contains the input runtime SHA-256 hashes, per-mission results, paid action logs, starting authored formations, spending, citadel health, objectives, snapshots, seeds, and restore checks. The harness checks that its runtime inputs did not change during the run.

- Earn the three opening victories using the existing onboarding reference policy, a 10-second opening delay, one successful paid action every five seconds, and battle-envelope restores. The actual rosters are 2 → 5 → 8 buildings.
- Continue through all 16 missions using `getCampaignLaunchMission`, `createProgressionCampaignMission`, and `recordCampaignResult`. There are no synthetic completion records or added resources/units.
- Check the full eight-building roster and the unchanged 800-HP, 8-damage Rootwarden in every new continuation. Initial authored formations are retained; every later player build, upgrade, and volley is paid and audited. Volley kill bounties are accounted separately from the 75-gold charge.
- Compare the existing reference policy at each authored seed, 57, and 999 against revision 1. The entire final combat state, RNG seed, IDs, tick, accumulator, and AI timer must match, not just victory labels.
- Repeat those reference routes with new barracks purchases replaced by Warden lodges. Keep the same ranged, siege, economy, and protection decisions. Four mission policies buy no new barracks, so those cases are neutral controls rather than demonstrations of tank strength.
- Compare ordinary barracks-only purchases, lodge-only purchases, and generic warrior+archer versus Rootwarden+archer purchases at all three seeds. Include screened ranged/siege, unsupported archers, uncovered-road, mine-first, idle, and paced controls.
- Paced controls wait ten seconds and allow one successful action every three seconds. Baseline mission-specific references may perform several affordable opening actions in one decision. Their success is not a novice reaction-time test.
- Restored samples use the actual battle envelope and campaign scenario admission, with exact serialization equality after each checkpoint.

“Only” in a route label refers to **new purchases**, not deletion of the authored army. For example, a lodge-only run can still have its starting barracks, archers, and watchtowers. No route has hidden free support.

## Compatibility and attainability

All **48/48 existing-reference cases** win and have exact final combat-state equality with the corresponding revision-1 run. The earned full roster therefore does not invalidate the established solutions. This is stronger evidence than merely creating, ticking, or serializing each mission.

All **48/48 reference-with-Warden-substitution cases** also win. Three-seed coverage is useful for detecting gross sensitivity, not statistical evidence of player success rates. All 19 progression records in the final JSON were earned from actual wins, with the eighth building still available at the end.

The new campaign rules remove forced late decay, but the original mission deadlines end these battles at or before 300 seconds. That late-game ruleset difference does not change the tested reference results.

## Composition and practical tradeoffs

The broad single-type purchase routes are strong in both rosters:

- Lodge-only purchases: **46/48** clears. The authored-seed Last Light loses a protected signal tower; Ironroot at seed 57 loses the citadel.
- Ordinary barracks-only purchases: **45/48** clears. River Charter fails at two seeds; Far Beacon fails at one.
- Generic warrior+archer and Rootwarden+archer purchases: **45/48 each**. Both fail River Charter at all three seeds.
- On all **14 authored-seed missions where both single-type purchase routes win**, warriors finish faster. They cost less in 13 and the same in Open Horizon. This directly contradicts a uniquely faster, cheaper, universally winning tank route in this sample.
- With the ten-second delay and one action every three seconds, lodge-only falls to **12/16**, while barracks-only clears **14/16**. Rootwarden bulk does not remove opening-tempo risk.

Rootwardens can still meaningfully help a supported plan. In Heart of the Furnace, swapping the reference's new barracks for lodges cuts the authored-seed result from **163.25s / 3,175 gold** to **107.65s / 2,335 gold**. On Three Roads the same substitution instead takes **147.65s instead of 93.95s**, spends more, and finishes with **3,667 rather than 5,200 HP**. On Ironroot it takes **160.35s instead of 119.4s** and costs **3,605 rather than 2,810 gold**. High health is helpful; low damage, higher price, placement, and timing still matter.

## Per-mission measured results

The table uses each mission’s authored seed, normal paid decisions every second, and the complete starting authored formation. Times are simulated seconds. “Warden swap” keeps the existing mission-specific policy; “lodges only” and “barracks only” constrain new purchases. All reference rows also win at seeds 57 and 999 with exact legacy parity.

| Mission | Deadline | Reference | Warden swap | Lodges only | Barracks only |
|---|---:|---:|---:|---:|---:|
| emberwatch | 180s | 37.2s | 43.75s | 54.15s | 32s |
| three-roads | 210s | 93.95s | 147.65s | 151s | 71.9s |
| winter-stores | 150s | 150s | 150s | 143.15s | 72.1s |
| wings-of-ash | 210s | 71.75s | 71.75s | 168s | 114.1s |
| stonegate | 240s | 73.15s | 76.6s | 95.5s | 69.6s |
| long-vigil | 150s | 150s | 150s | 122.95s | 87.95s |
| cold-forge | 240s | 98.5s | 119.55s | 102.75s | 72.75s |
| black-ledger | 270s | 120.2s | 117.25s | 102.85s | 53.4s |
| furnace-heart | 270s | 163.25s | 107.65s | 120.75s | 70.4s |
| crown-foothold | 180s | 180s | 180s | 113.2s | 68.75s |
| last-light | 180s | 180s | 180s | Fail 108.75s | 84.7s |
| ironroot | 300s | 119.4s | 160.35s | 141.8s | 106.8s |
| open-horizon | 240s | 87.1s | 91.8s | 126.15s | 126.1s |
| river-charter | 210s | 114.85s | 114.85s | 129.1s | Fail 107.25s |
| far-beacon | 280s | 111.15s | 113.25s | 121.4s | 106.5s |
| common-ground | 300s | 105.95s | 100.35s | 120.05s | 81.55s |

The 16 authored reference continuations total **1,856.45 simulated seconds (30.94 minutes)** without menus, reading time, pauses, or retries. The three paced onboarding runs add **288.35 seconds (4.81 minutes)**. These are route timings, not a predicted human campaign length.

## Counterplay probes

### Towers and siege

Stonegate's reference clears in **73.15s**, compared with **95.5s** for lodge-only and **129.45s** for unsupported archer purchases. Open Horizon's fortified, air-supported formation takes **87.1s** with its reference, **126.15s** with lodge-only, and **146.7s** with archer-only purchases. Siege is a practical tool, not a mandatory puzzle key: ordinary warriors also clear Stonegate, and multiple approaches remain valid.

### Air

Wings of Ash's anti-air reference clears in **71.75s with 4,200 HP**. Lodge-only purchases still race the enemy citadel successfully, but need **168s** and leave **1,177.13 HP**. Their inability to shoot flyers is real even though a ground race can win. A successful alternative is not a bug. Last Light's authored-seed lodge-only route loses a protected tower at **108.75s**, while the supported reference wins at **180s**.

### Splash and fragile support

Heart of the Furnace has the original level-2 foundry and sanctum. Unsupported archer purchases cross the required health floor and fail at **113.75s**. A one-screen-per-road Rootwarden/archer/siege route clears at **88.9s with all 5,200 HP**. The ordinary warrior route also succeeds. This shows practical protection/composition differences without pretending that tanks must lose to every splash formation.

### Uncovered roads

A center-only Rootwarden/archer/siege purchase route wins **9/16** and fails seven, including protected-objective losses in Winter Stores, Last Light, River Charter, and Common Ground, and health/base losses in Long Vigil, Cold Forge, and Far Beacon. The same central rush can legitimately work elsewhere. There is no need to prohibit those alternative victories to retain flank consequences.

### Stalls and deadlines

The archer-only Ironroot route reaches the **70-unit cap**, spends **4,121 gold**, loses **433 troops**, and still expires at **300s** with the enemy citadel at **3,697.35 HP**. The player's citadel remains intact. Stonegate's idle defense also survives but fails at its **240s** deadline with no marked targets destroyed. These are poor-plan/noncompletion outcomes, not endless campaign locks or evidence that the missions are impossible. Every idle route fails; none earns free progression.

## Pacing and economy

The seed-999 paced reference clears **13/16**. Its failures are Cold Forge, Far Beacon, and Common Ground. The otherwise identical Warden substitution clears **15/16**: Cold Forge and Common Ground recover, while Far Beacon still crosses its 2,000-HP minimum. Far Beacon deserves particular human attention because both deliberate reference variants fail after a delayed opening, even though other ordinary paid compositions clear it. Do not present these scripted rates as player difficulty ratings.

Mine-first checks deliberately use the same rear mine sites required later by the reference, avoiding an artificial fourth-mine/script deadlock. Their paired same-seed, same-cadence results are listed below. Buying economy first is sometimes safe and sometimes costs a protected structure or health margin; it is not a universally correct opening.


| Mission | Same-cadence reference | Mines first |
|---|---:|---:|
| emberwatch | Win 48.25s | Win 93.7s |
| three-roads | Win 97.9s | Win 181s |
| winter-stores | Win 150s | Win 150s |
| wings-of-ash | Win 76.1s | Fail 206.35s |
| stonegate | Win 87.35s | Win 117.25s |
| long-vigil | Win 150s | Fail 80.55s |
| cold-forge | Fail 106.25s | Fail 76.3s |
| black-ledger | Win 162.85s | Win 162.85s |
| furnace-heart | Win 186.2s | Win 186.2s |
| crown-foothold | Win 180s | Win 180s |
| last-light | Win 180s | Win 180s |
| ironroot | Win 163.7s | Win 163.7s |
| open-horizon | Win 117.1s | Win 119.5s |
| river-charter | Win 121.9s | Fail 59.25s |
| far-beacon | Fail 165.8s | Fail 154.7s |
| common-ground | Win 191.25s | Win 149.2s |

The paired control clears **14/16**, versus **11/16** after buying mines first. Greed newly loses Wings of Ash, Long Vigil, and River Charter. It is not universally harmful: Common Ground improves from **191.25s to 149.2s**. In several missions the reference already opens with the same mines, so those rows correctly remain unchanged.

Early enemy-citadel victories can bypass waiting for income/hold deadlines, while still respecting protected-building and minimum-HP conditions. This was already an advertised alternative in the original missions. For example, Winter Stores, Long Vigil, and Crown Foothold are finished earlier by both simple warrior and Rootwarden pushes. This review does not recommend removing those legitimate victories merely to force one intended solution.

## Recommendations and limits

1. **Do not retune the original Rootwarden from these aggregate counts.** The paired costs and times show real tradeoffs, and equally simple old-unit routes are highly effective.
2. Keep the new roster continuation and legacy scenario identity checks. Actual earned progression and envelope restores are covered here.
3. Human playtesting should emphasize the delayed openings in Cold Forge, Far Beacon, Common Ground, and the protected northern/southern threats of River Charter. The scripted evidence is strong enough to rule out obvious unplayability, not to guarantee forgiving first attempts.
4. If future design calls for more compulsory counterplay, treat that as an explicit content/difficulty change. It is not a correction justified solely by an alternate tank victory, a pure-warrior rush, or a poor composition stalling.

No browser/UI/mobile review, multiplayer review, or comprehensive regression-suite claim is made by this document. Those remain separate evidence. This worker modified only its review harness and these review artifacts.
