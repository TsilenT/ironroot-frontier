# Movement feedback and projectile timing

Reviewed against main `e719cff14f29f225c4c71e77af10c8ca31bdc11f`, released v0.40.2. This v0.40.3 source candidate changes presentation; it does not publish a build. Volley and spells are outside this pass.

## Findings

Ranged damage is immediate. `Game._fire()` sets the attack timer and queues damage for resolution in the same fixed simulation step. The cosmetic arrow/orb/stone starts at the shooter with a 0.28-second lifetime. Its later position updates carry no damage and do not affect the target. HP, hit reaction, splash, death, kill gold and potentially victory can therefore appear before the projectile arrives. Fog battles already use immediate hit effects instead of these travelling cosmetics.

A paid two-archery encounter at seed731 reproduced both issues. At 32.20 seconds an archer moved 2.9 world units with a full second of attack cooldown still remaining. At 20.05 seconds a newly launched archer projectile was still at its source with its full 0.28-second lifetime while a victim's HP and hit reaction had already changed. These are scripted observations, not human balance judgments; detailed receipts are external.

Most troop art used `cooldown <= 0` as its walk signal. A unit moving during positive cooldown therefore slid with still legs/head. Conversely, a stationary ready unit could receive a walk pose. The previous Rootwarden implementation already used observed position changes instead.

## Focused change

The renderer now keeps a shared, bounded per-unit movement sample. It derives locomotion from displacement between observed simulation instants. Repeated draws at the same instant preserve the sample; stationary intervals stop gait advancement. Warrior/archer legs and head bob, and wizard head bob, use this signal. Their gait phase advances with distance, normalized by the role's walking speed, so a pause or stop no longer advances their walk cycle. Rootwarden keeps its existing contact/recoil priority and animation artwork with the shared movement signal.

First observation and backward simulation time establish an idle baseline. Removed or unseen units lose their samples. Battle/reset and fog-observation reset paths clear the cache. The fog renderer uses only the observation facade; it does not obtain hidden positions. Essential attack/hit timers, reduced-motion behavior, ground markers, shadows, health bars, coordinate transforms and hit geometry retain their existing contracts.

The cache contains numeric samples keyed by currently observed unit IDs, bounded by the engine's 140-unit cap. It is not saved. There are no new engine fields, random draws, combat events, timers, profile migrations or simulation rules. Original art and historical renderer fixtures remain pinned; test helpers reverse only the explicitly declared presentation hunks to the independently recorded v0.40.2 source hashes.

## Projectile tradeoffs

A true impact-time damage system requires a separate combat design change. Delaying damage would allow a target to move, attack or die while a shot travels. It changes simultaneous kills, target selection, overkill, splash origin/timing, kill income and terminal outcomes. Persistent pending shots would need validated target/impact/damage data and a versioned save contract. Deterministic fixed-step processing is possible, but would not preserve current balance or existing exact outcomes.

A presentation-only alternative is to depict ranged attacks as an immediate strike/trace with a short after-image. That could align the picture with current hitscan rules, but would change the accepted bow, magic and siege visual language. Delaying HP or death displays instead would conceal authoritative state and make input/targeting feedback misleading. Forecasting a projectile before the engine decides to attack would introduce guessed actions and cancellation cases.

This pass implements the safe movement repair. A later projectile pass should explicitly choose between instant-strike presentation and a new impact-time combat ruleset, then cover moving targets, target death, splash, buildings, fog, saves and simultaneous resolution under that chosen contract.

## Verification scope

The new Node checks use actual paid commands and native fixed steps, compare complete serialized engine state with and without rendering, inspect emitted canvas commands during positive-cooldown movement, and cover stationary/redraw/reduced-motion behavior, reset/rewind and fog facades. A native Chromium test imports the literal v0.40.2 renderer through a test-only intercepted URL for a paired before/after canvas comparison. It also confirms repeat paused draws stay pixel-stable and a control simulation stays exact. UI startup/pause/resume and existing fog input checks run separately.

The full Node run passed 3,525 tests with zero failures and one optional tooling skip. All 46 focused renderer/fog/source checks passed, including the strengthened combat-recovery case. All eight new Chromium cases passed across desktop, portrait, narrow portrait and landscape. JavaScript parsing, complete browser static/fixture validation, runtime/offline inventory and whitespace checks passed. Engine, rulesets, battle codec, profile protocol and audio source have no changes.

An additional existing `skirmish-fog-scroll.spec.mjs` run passed eight cases and timed out in twelve disabled-label cases (three incompatibility reasons across four viewports). Playwright's locator waits for the disabled control label to become enabled before delivering the click/tap. The incompatible-map phone case also times out on an untouched v0.40.2 runtime at the same main commit, served from an isolated baseline checkout. Those existing cases remain unchanged; they are a recorded limitation of this browser run, not successful gesture evidence.

Generated receipts, test logs, traces, result JSON and paired screenshots belong outside the repository at `/tmp/ironroot-movement-review/`. Browser fixture evidence does not establish physical-device performance, controller comfort, or human readability.
