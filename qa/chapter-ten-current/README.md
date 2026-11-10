# Current-source colossus laboratory (private, non-release)

Baseline: reviewed but unreleased v0.39 source `34dadf2fa9df44c08e681fbe362b9aa092d0d9a3`,
tree `c266840dd6528a4089145ad404709ab6b13b1cb1`. This does not promote PR50,
Cut the Bowstrings, or their dependencies into main. The old PR34 Hard-AI
supply-road lab (`cf5b71c`) was not a boss encounter. Its 162 observations are
historical, not current-runtime validation. No old evidence is imported here.

Reuse: `colossus.mjs` is byte-identical to PR42's playable encounter at
`2c50ec7dc3114cc9dcb745cf1014e6d201b4eca4`. Its generator's exact engine,
registered ruleset, autonomous-air and citadel hooks are ported onto this baseline.
The source runtime is never modified: generation copies it into a new external
folder. Rendering/HTML, the obsolete phase oracle, custom UI/session envelope,
archives, screenshots and generated result files are deliberately absent.

The preferred registered identity is `frontier-qa-colossus-aftermath`.
`frontier-qa-colossus-core-race` remains a historical alternate contract for
regression checks. Registration is real inside the generated engine, so ordinary
autonomous air remains active. These identities are rejected by production battle
admission; this lab is not campaign, history or backup support.

At enemy-core HP <=600, including a lethal hit, deploy one 10,000-HP body and
clear hostile troops within 310px of that core. Remote troops/buildings survive.
Own-core death takes priority. The 210px physical body emerges damageably for
3s, then marches down the middle at 26px/s without stopping to fight. Nearby
attacks deal 140 every 2.4s; own-core contact deals 1200, with ordinary structure
escalation. One enemy slot is reserved before deployment. No repeat pulse,
healing, invulnerability, health clamp, or hidden replacement reserve exists.
Aftermath requires both boss and enemy core destroyed; the core falls normally,
stops shooting/buying when dead, and existing factories continue spawning.

`scenario.mjs` retains PR42's clearly synthetic staged mechanics fixture, and
its `staged:false` ordinary opening (750/100 treasury, 7.5/7.5 initial income,
normal adaptive AI). Always pass `staged:false` for paid encounter probes.
The disclosed colossus is an authored asset, not ordinary enemy spending.

Run source checks without any browser:

    node --test qa/chapter-ten-current/mechanics.test.mjs
    node qa/chapter-ten-current/prepare-lab.mjs /tmp/new-ch10-lab

[The five-mission design source](ARC.md) is proposed content only. No production
catalog, profiles, public roster, version/cache, campaign admission or ending is
changed. No PR, ready transition, merge or publication is authorized here.
Browser/rendering work remains explicitly blocked pending resolution of PR42's
prior URL-policy denial. Do not launch a browser or substitute a rendering route.

## Wounded foothold source slice

`foothold.mjs` implements the first lead-up outside all production catalogs.
It uses the exact registered `frontier-campaign-citadel-open` parent on Classic:
all eight buildings, ordinary autonomous air, paid citadel choices, clear view,
Hard AI, and unmodified native stats, production, income and kill bounties.
The colossus and its generator are not involved.

Player opening: 3600/6000 HP, 900 treasury, 1225 invested, 7.5 gold/second.
Enemy opening: 6000 HP, 200 treasury, 2225 invested, 12.5 gold/second.
Thus established enemy investment is much larger, but total money is 2425 versus
2125, not twice as much. Three forward enemy barracks are the marked original
North/Middle/South Breach Posts. Rear middle siege and outer towers/ranged support
make the choice of which two to attack consequential. The rear camp has basic
coverage and enough flexible gold to choose its opening. No active army is
preplaced; authored factories spawn at normal engine timings.

Goal: break any two original posts, or the enemy core, by 10:00 while your own
core survives. A 1-HP primary victory is valid. Own-core loss or simultaneous
core draw takes precedence; goals on the final native deadline tick count, late
goals do not. No protection floor or prescribed purchase. Ordinary 5:00
escalation remains: production x1.65, troop structure damage x1.75, citadel shots
32 to 18. There is no timed base drain, reserve grant or boss.

Use `advanceFoothold` for tick-bounded progression: the native Game alone does
not know this external breach objective. It stops after the decisive goal/loss
or deadline tick. `evaluateFoothold` is read-only. Terminal snapshots can be
inspected/restored privately, without awards or campaign effects. The raw Game
API remains a development interface, not a production battle controller.

`serializeFoothold` creates a separately named private envelope carrying the
opening seed and native engine snapshot. `restoreFoothold` checks that envelope,
registered parent/map/AI identity, clock, and original target bindings derived
from the authored factory. It is not an authenticated action history or a
production save. Raw new-format engine snapshots and the private envelope fail
production backup admission; neither carries a fictional campaign identity.
`restartFoothold` rebuilds the exact opening and original target IDs from the
opening seed, without carrying damage, treasury, targets destroyed or RNG state.
No UI, session storage, history or production persistence integration is claimed.

Private opening revision 2 contains one pacing correction: the enemy middle
foundry starts at home distance 410 instead of 970. It buys time through native
siege travel, without changing investment, treasury, income, HP, damage or spawn
timers. Revision 1 and both bounded route implementations remain in normal Git
history; revision-1 private envelopes explicitly reject in revision 2. No seed
search or further numerical tuning is part of this slice.

    node --test qa/chapter-ten-current/foothold.test.mjs
    node qa/chapter-ten-current/foothold-probe.mjs

The stdout-only probe's default fixed recipe uses outer infantry/ranged,
middle coverage and outer siege, at most one successful paid command per two
seconds. Its optional `adaptive` argument uses native Hard side-0 AI every five
seconds, with its ordinary multi-action budget; it has no human-speed claim.
Keep generated traces outside the repository. Neither recipe receives resources
after initial authoring beyond ordinary income and kill bounties.

The supply raid, fog approach and crossing remain design proposals in ARC.md;
this first scenario has not been admitted to campaign progression. The fifth
unreleased Chapter 9 mission is still only this lab's reviewed pending baseline.
