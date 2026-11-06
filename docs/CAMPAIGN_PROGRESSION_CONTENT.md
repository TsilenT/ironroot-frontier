# Campaign opening: authored content and evidence

This is source work for the next release, not a claim that the live build has changed. The opening is now three real battles with engine-bound rosters. It replaces the new-player recommendation to play the old, optional `first-watch` and `forked-road` introductions. Those published scenarios and their records remain separate.

## The three battles

| Battle | Field and available buildings | Enemy formation | Goal and pacing |
| --- | --- | --- | --- |
| **Roadside Watch** (`roadside-watch`) | One road; barracks and archery range; empty camp; 420 gold | One level-1 barracks | Destroy the marked barracks or enemy citadel in 3:00. Learn normal construction and automatic troop production. Paid reference clears take 60.50–81.15 seconds. |
| **Shield at the Fork** (`shield-at-the-fork`) | Two roads; add Warden lodge, gold mine and watchtower; empty camp; 740 gold | North: level-1 barracks and archery range. South: level-1 barracks. | Destroy all three marked buildings or enemy citadel in 3:30. Give ranged troops a durable screen and decide how to cover the other road. Paid reference clears take 114.05–137.10 seconds. |
| **Open Three Roads** (`open-three-roads`) | Three roads; add siege foundry, arcane sanctum and gryphon aerie; all eight buildings available **before this battle begins**; empty camp; 1,100 gold | North: two level-1 aeries. Middle: level-1 watchtower and sanctum. South: level-1 barracks. | Destroy all five marked buildings or enemy citadel in 4:00. Choose counters, production and income without a mandatory build order. Paid reference clears take 112.90–126.65 seconds. |

Any victory advances the route. The full roster arrives after winning the second battle, not after grinding stars or repeating the third. A complete reference route takes roughly five to six minutes of simulated battle time, including a 10- or 30-second delay before the first action in each mission. These are automated routes, not a prediction of a person's first-play duration.

The enemy formations are fixed and declared in the briefing. They have ordinary spawning, combat and income but cannot place buildings, upgrade or cast Arrow volley. The player uses normal prices, income, site placement, production, upgrades, combat and the shared UI. There are no free construction events, invulnerable lesson units, scripted damage, secretly delayed waves, automatic wins, or checks requiring a particular build order.

## What the Rootwarden lesson proves

The lodge joins the roster for the second mission. A Rootwarden retains the existing 800 HP, 8 damage, 1.5-second attack interval, 12-second lodge spawn interval and 210-gold lodge price. It receives no new resistance or damage bonus.

The second mission's paid reference route puts a lodge ahead of an archery range on the northern road. The test observes enemy attacks landing on Rootwardens and friendly archers actually firing from behind them. An unsupported-archer policy fails this battle. A barracks-based mixed army also wins, without earning the optional lodge star. The lesson demonstrates a useful combination rather than declaring the tank mandatory.

The third mission exposes the limits of a tank screen:

- Northern gryphons damage Rootwardens; Rootwardens never attack those flyers.
- Central wizards hit Rootwardens and their splash reaches nearby troops. A front unit does not cancel area damage.
- A middle-only attack leaves the outer roads uncovered and takes substantial citadel damage.
- A tank-only policy still wins a slower citadel bypass. The test deliberately keeps that legal outcome: its northern targets survive, it loses more troops, and it takes over 30 seconds longer than the mixed reference. The content does not impose a forced counter or ban an unconventional victory.

## Optional stars and replay

Every victory earns the first star. The additional stars use live, save-stable evidence:

- Roadside Watch: finish with a barracks standing; finish with an archery range standing.
- Shield at the Fork: finish with a Warden lodge standing; finish with troop production on both roads.
- Open Three Roads: finish with at least 7.5 gold/sec; finish with at least 5,000 citadel HP.

The copy says precisely what is checked. Merely building and then losing a lodge does not earn its star. A citadel victory does not fabricate missing buildings or income. Tested one- and two-star wins advance normally; replay can improve a record without reducing its previous stars or best time. Earned rosters can be used on new replays, while an in-progress save keeps its original rules.

## Identity and integration contract

`dist/campaign-onboarding.js` exports `ONBOARDING_CHAPTER`, `ONBOARDING_MISSIONS` and `isOnboardingMission`. The new chapter is `opening-roads`; each new scenario starts at revision 1, with map and ruleset revision 1.

The default rulesets are `frontier-campaign-watch`, `frontier-campaign-fork` and `frontier-campaign-open`. Their actual building and unit definitions enforce the 2 → 5 → 8 progression. They are not shortened display lists with an “All buildings” escape. Authored descriptors stay mutable until campaign normalization derives modes and target lists, matching the existing campaign pipeline.

The rules/progression layer owns launch admission, earned replay rosters, versioned continuation missions and legacy save compatibility. Content keeps all original 16 mission IDs and both published optional-intro IDs distinct from these three new IDs. Later campaign starts use the versioned full-roster continuation; published revision-1 saves do not silently acquire new units.

## Verification

Commands:

```sh
node --test tests/onboarding-campaign.test.mjs
node tests/onboarding-campaign-balance.mjs
```

The focused test file covers:

1. Actual one/two/three-road geometry, paid empty-camp starts, locked engine construction and 2/5/8 roster identities.
2. Eighteen reference runs: three seeds per mission, both 10- and 30-second reading delays, one successful decision every five seconds, positive costs, nonnegative remaining gold and exact repeated engine restores. All eighteen finish with three stars in under 150 seconds. Minimum ending citadel HP is 5,937 / 5,224 / 5,661 respectively.
3. Barracks-only first-battle wins; no-Rootwarden second- and third-battle wins; no-mine wins; an actual one-star concentrated citadel victory with marked targets still alive.
4. Observed screen/support combat, air immunity to Rootwarden attacks, incoming air damage, and wizard splash damage.
5. Idle, mines-only and tower-only policies that fail or reach the mission deadline instead of automatically winning. Poor-play paths also round-trip their saves, including citadel-generated projectiles while towers are still locked.
6. Sequential paid progression, exact codec restoration while each lesson is in progress, target identity after restore, full roster by the third battle, earned-tool replay and low-star continuation.

The balance script prints source hashes, all eighteen reference results, alternative policies and poor-decision outcomes as JSON. It can be rerun without network access or browser dependencies. Reference policies live only in `tests/onboarding-campaign-policies.mjs`; no tutorial controller invokes them during real play.

### Limits

This is deterministic authored-content coverage, not human balance certification or an exhaustive strategy search. It does not establish touch ergonomics, first-time comprehension, accessibility, renderer correctness, browser storage behavior, or service-worker delivery. The root task owns those integration and browser checks. The tests do not assert that every novice strategy succeeds; stalled or losing strategies remain possible. No publication, PR, merge or deployment is part of this content work.
