# Player flight orders: a tactical decision prototype

Review branch: `explore/progressive-lanes-and-air-crossings`. This continues the
fixed-route exploration at `7e76e79`; it is a QA-only prototype. No production
runtime, campaign progression, profile protocol, package dependency or deployment
configuration is changed. The main builder retains ownership of those systems.

## Decision and closure

Keep this as a **draft for gameplay review**. The command trial now creates
measurable choices: raid an exposed supply road, retain air support for a
threatened ground screen, avoid a visible anti-air trap, or alternate future waves
to contest two roads. Paid destination counters can defeat those raids.

The implementation, evidence and negative cases are ready for review. Production
integration and human playtesting are separate decisions; this branch does not
enable the mechanic in ordinary battles or authorize merge/publication.

## Play it

From the repository root:

```sh
python3 -m http.server 8765 --bind 127.0.0.1
# Open http://127.0.0.1:8765/qa/flight-command/
```

Choose a situation and an enemy response, then **Reset scene**. Select an aerie
and compare its **Hold**, **North** and **South** cards. On two roads, only Hold
and the adjacent road appear. Use Launch / Resume, pause to inspect, or 4× speed.
Each of the two aeries has its own plan; the evaluator's static strategies set
both aeries to the same destination. The UI also allows manually splitting them.

Suggested review sequence:

1. **Open supply / No new response:** hold, then reset and raid a side mine.
   Watch target damage and the source ground screen rather than only victory.
2. **Open supply / Destination archers or tower:** repeat the raid. The opponent
   observes launches and spends real gold on legal sites; see its spending meter.
3. **Screen under pressure / No new response:** compare holding with sending
   both aeries away. The supply raid can succeed while the citadel falls.
4. **Tempting mine / three roads:** compare the visibly defended northern target
   with the exposed southern one. Try alternating later waves, or split aeries.
5. Change an aerie's plan after launch. The Airborne table retains the committed
   destination; subsequent launches use the new plan.

Authored starting structures are explicitly free. Both remaining treasuries are
420 gold, with ordinary income. New construction, upgrades and strikes pay normal
prices. These free formations have unequal values and are tactical situations,
not a controlled skirmish-difficulty or campaign-onboarding sample.

## Bounded command contract

Only the new identities `command-two-roads` and `command-three-roads` enable
`Game.setFlightPlan(aerieId, destinationLane, side)`. Production maps and the five
old fixed-route lab maps retain their existing behavior and identities.

- A living owned aerie can **hold its own road or choose one adjacent road**.
  Orders are free, consume no RNG, and affect future launches. They cannot retask
  an existing unit, reach an enemy aerie or skip across two roads.
- A launch snapshots its order. Upgrading, replanning, selling or losing the
  producer cannot alter that airborne route. No order cancel, recall, teleport,
  repeated crossing, adaptive destination or hidden damage/speed bonus exists.
- Holding uses ordinary combat movement. A shifted flight commits to its launch
  road until the gateway, rather than chasing targets off that road. It may still
  stop to attack an in-range eligible target. This pursuit commitment is an
  additional tactical cost, not merely a timing-label change.
- At 1,400 home-distance, a routed gryphon gives a **two-second / 40-step warning**.
  It then moves vertically at normal speed 84. Nominal warning plus transit costs
  4.30 seconds on three roads or 4.65 on two; spawn jitter, combat and step rounding
  affect actual arrival. Physical x stays fixed during the warning and transfer.
- The gryphon cannot attack during warning/transit. It stays flying and vulnerable.
  Its logical lane changes at landing, and its completed route prevents another
  transfer. Existing per-side 70-unit and map-site limits remain enforced.
- Route movement resolves together before unit combat; towers retain the original
  structure-first snapshot. The simulation remains a seeded 0.05-second fixed step.

## Telegraphs, counters and mobile controls

The UI exposes the future order on each aerie, a route arrow and destination from
launch, the gateway countdown, transit state, and a persistent textual list of
living flights. Comparing cards shows visible target health, archers, towers and
the nominal transfer delay before the player commits.

Archers can acquire a flyer in transit from either connected road within normal
Euclidean range 205; their normal anti-air multiplier is 1.5. Towers use physical
range 240, including cross-road coverage. Rally costs 75, has radius 170 and a
25-second cooldown. Ground-only attackers still cannot hit flyers. Landing
restores ordinary logical-lane targeting. No counter receives a free range bonus.

The five defender scripts are **none**, **destination archery**, **destination
tower**, **origin archery** and **rally**. They inspect only currently launched
units, at one-second decision intervals; they never read unlaunched aerie plans
or future RNG. Visible intent often permits a response before the gate warning.
Their buildings use normal paid APIs, owned sites, space limits and available
gold. Archery/tower limits are live structures, so destroyed counters can be
rebuilt. Rally requires a visible cluster of at least two flyers.

Spending meters and evaluator action ledgers record **gross purchase prices**.
Kill bounties remain actual receipts and can reduce the net treasury change;
they do not reduce the price of a 75-gold rally. A regression and browser scenario
verify two rallies costing 150 even when the second returns two kill bounties.

Native order buttons, aerie/site selectors and paid build controls are usable
without canvas aiming. The decision cards stack at 390px and exceed 44px touch
targets. Pausing allows deliberate reading and commands. Actual touch taps and
mouse/keyboard paths were checked in Chromium; no physical-device or controller
certification is implied. Large battlefields scroll inside their own panel.

## Tactical evidence, including failure

`qa/flight-command/evaluation-summary.md` is the readable table; `evaluation.json`
retains all **720 branches**, four spread seeds, both physical sides, three
situations, two/three roads, five defender responses, and four three-road plans
or two two-road plans. Each branch runs to 110 seconds or a terminal citadel
outcome. Static and alternate plans share the same starting setup/seed/side as
their hold control. Alternate changes future orders every 15 seconds.

There are **2,640 restored/uninterrupted next-step comparisons** at observed route
phases and the 60-second checkpoint, with entity/site/gold limits checked too.
The player evaluator buys no live reinforcements; the defender's responses are
paid. These are authored counterfactuals, not optimal strategies or human tests.

Representative means across four seeds and both sides:

| Situation and choice | Off-road mine damage | Own citadel HP | Original screen HP | Consequence |
| --- | ---: | ---: | ---: | --- |
| Open supply, hold, no response | 0 | 6,000 | 700 | Retains the original front |
| Open supply, one side raid, no response | 380 | 6,000 | 700 | Takes an exposed mine |
| Open supply, alternate, no response | 760 | 6,000 | 700 | Takes both exposed mines |
| Pressed road, hold, no response | 0 | 6,000 | 117.32 | Air support preserves the citadel |
| Pressed road, three-road side raid, no response | 380 | 0 | 0 | A successful raid loses the battle |
| Baited supply, northern raid, no response | 0 | 5,959.54 | 700 | Prepared anti-air denies the mine |
| Baited supply, southern raid, no response | 380 | 5,714.40 | 700 | Softer target, different base-pressure cost |

For a northern raid on the three-road open-supply situation:

| Defender choice | Side-mine damage | Gross defender spending | Own citadel HP | Observed flyer survivors |
| --- | ---: | ---: | ---: | ---: |
| No new response | 380 | 0 | 6,000 | 7.75 |
| Destination archery | 0 | 350 | 5,630.25 | 2 |
| Destination tower | 0 | 220 | 6,000 | 3 |
| Origin archery | 380 | 1,356.25 | 6,000 | 4 |
| Rally | 380 | 365.625 | 6,000 | 4.625 |

Destination archery stops the tested side raids. Alternation requires it to fund
700 gold of counters across two roads rather than 350 for one raid, yet still
does no side-mine damage. This is a cost imposed relative to a single raid, not
a universally better strategy: holding can force even more archer rebuilding.
Defender archers also create offensive ground pressure, so differences in base
health should not be attributed exclusively to missing flyer support.

Original-road ground incursions in the pressed situation rise from a mean
104.912 to 854.675 unit-seconds for three-road side raids (875.325 on two roads).
That metric integrates observed enemy ground units within 1,400 home-distance
on the launch road; it is not an estimate of inflicted damage or player intent.

Reports preserve target damage, source-screen and citadel health, first damage
times, response spending/timing, phase survival, initial investment and negative
paired deltas. Unit casualties and phase histograms are **observed**: post-step
sampling can miss a unit born and killed inside one fixed step. Full combat
attribution and replay verification are not claimed.

## Compatibility and integration boundaries

The production engine, saves, campaign IDs/deadlines/prerequisites/stars, profile
protocol and offline shell are untouched. The lab has no storage, reward or
service-worker integration. The main campaign builder owns any later introduction
or progression design.

Command snapshots use lab-only v4 + `ruleset:'lane-command-1'` and the exact command
map identity/revision. Future aerie plans and committed flight phases validate
ownership-independent geometry, adjacent destinations, timers and limits. Old
production v1/v2 and fixed-lab v3 semantics remain unchanged; tests compare exact
v3 states/RNG/save continuation with the SHA-pinned previous lab engine. Current
production v3 ruleset snapshots are not inputs to this experimental lab format.
Production and the previous lab reject command snapshots; backup rejection occurs
before storage access. This is not a reservation of a future production v4 schema.

The QA simulation remains a pinned fork of the legacy combat model at `24eddda`,
sharing the production compatibility roster/helpers. The newer main branch now
has explicit rulesets and new intro content. This draft does not port that model
or register orders there. Production adoption needs a separately reviewed ruleset,
map/save/backup/UI/AI contract and older-tab write fencing. Preserve existing
mission semantics; use new IDs or an explicit progress migration. Historical
fixed-route results remain attached to `7e76e79`; new command evidence includes
current source hashes and must not be combined into a single balance cohort.

## Reproduction

Validation on this branch: **659 passed, one existing skip**, including 11 new
flight-command tests and 13 existing lane-lab tests. Parse/runtime checks pass.
An isolated overlay of the QA files on main commit
`b8b2e6d1b200b9550803f5cb16b8d96ccc28f222` also passes **906 tests with one skip**.
That check used a detached temporary worktree and did not merge either branch or
edit main's production/campaign files. One older lab assertion now checks that
production rejects the experimental snapshot, allowing its version-specific error
wording to differ between the older and newer production schemas.

```sh
npm test
npm run check
npm run check:release
node --test tests/flight-command.test.mjs tests/lane-lab.test.mjs
node qa/flight-command/evaluation.mjs 4 --output qa/flight-command/evaluation.json
# With a root HTTP server and an installed Playwright module:
LANE_LAB_PLAYWRIGHT=/path/to/playwright/index.mjs node qa/flight-command/browser-smoke.mjs
```

Browser evidence is in `qa/flight-command/browser-evidence/`. It covers 1280px
mouse/keyboard and 390px touch input, committed-flight preservation, later hold
waves, warning/transit/arrival, legal 175-gold response construction, native paid
placement, gross rally spending, reset behavior, no page overflow/errors/external
requests, and unchanged preexisting localStorage sentinels.

Remaining limits: scripted four-seed tactical sampling, the legacy QA fork,
no reactive attacker-purchase search, finite horizon, and no human, physical-device,
audio, performance or complete accessibility certification. Review whether the
extra pre-wave planning is enjoyable before treating these outcomes as a feature
recommendation. No merge or deployment is part of this work.
