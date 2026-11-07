# Production flight-order kernel

This is a selective port of the flight-order idea into the current engine, not the old QA/lab engine. Production engine and battle-envelope schemas stay at 3. Lab schema 4 is rejected.

## Versioned rules and interface

- New immutable revisions: `frontier-flight-open@1`, `frontier-flight-timed@1`, `frontier-campaign-flight@1`.
- The existing six ruleset objects, Rootwarden stats, eight-building roster, prices, long-session limits, escalation and open/timed behavior remain intact. The campaign flight identity is full roster and campaign-only. The three-element `CAMPAIGN_RULESET_IDS` roster ladder is unchanged.
- `new Game()` stays legacy. `DEFAULT_SKIRMISH_RULESET_ID` is flight-open for explicitly new app skirmishes.
- `Game.setFlightPlan(aerieId, toLane, side = 0)` accepts an owned, living aerie and its own or one adjacent road. It returns `{ok:true,building,reason}` or `{ok:false,reason,code?}`. It rejects terminal/safety-limited battles, wrong rules, invalid owners/producers/destinations. Commands do not spend gold, advance time or draw RNG.
- New aeries have required integer `flightPlan`, initially their own road. Each gryphon launch snapshots a non-Hold order as `{from,to,phase,remaining}` in optional `airRoute`. Upgrade, sale, loss and replanning cannot retask launched gryphons. Hold creates no route.
- Engine re-exports `supportsFlightOrders(ruleset)`, `flightGateHome(map,ruleset)` and `flightGateX(map,ruleset,side)` from the pure helper. Disabled rules yield null gates. The capability check requires a registered immutable ruleset object, not caller-supplied capability flags.

## Geometry and combat

The immutable policy is `movement.policy = 'flight-orders-v1'` and `flightOrders = {gateCenterOffset:200,warningSeconds:2,adjacentOnly:true,maxCrossings:1}`. Gate home distance is map width / 2 minus 200: 1400 for Classic/Twin Span, 1800 for Long March. Gryphon speed comes from its bound unit definition, currently 84.

Committed approach movement goes to the source-road gate, clamped exactly to its x/y without overshoot. It can engage ordinary in-range targets before arriving. On arrival it waits forty fixed simulation ticks (2 seconds), then moves vertically at ordinary speed. Logical lane changes only on arrival, and the route remains `done` so it cannot cross again. It does not attack during warning/transit or the landing tick. Combat resumes on the next tick.

Structures retain their existing pre-route targeting snapshot. All routes then advance together before unit targeting. Air-capable units may acquire a transiting gryphon from either connected road, but attack damage still requires their ordinary physical range. Ground-only units, including Rootwardens, never acquire air. Towers and Volley keep ordinary range/radius rules. A synthetic near-gateway tower test proves kernel targetability only: it is not evidence that enemy towers can legally be built at that gateway. Legal towers can counter the approaching/arriving raid within their normal range.

## AI and validation

Only new identities project already launched, unfinished route destinations into the existing lane threat score and air-counter selection. Projected units contribute the same per-unit threat weight as ordinary nearby units. The AI never reads an opponent producer's future `flightPlan`; its own future aeries stay Hold. Existing aiTimer cadence, paid construction, action budgets, sites, upgrades, spells, gold and cooldowns are unchanged. No new persisted or transient AI memory is introduced.

Strict shape admission conditionally allows required plans only on new-rules aeries and optional routes only on new-rules gryphons. It checks exact route keys, adjacency, phase, timer, logical lane, source-road approach, exact warning/transit gate, bounded transit position and suppressed routing attack state. A completed route may move and chase normally, so its later position is not constrained to its historical landing point. Producer survival is not required. Raw historical v1/v2 restore continues retaining unused old JSON fields without interpreting them, while the playable-battle boundary continues rejecting them. Explicit old v3 identities reject all new fields.

## Evidence

`tests/flight-order-engine.test.mjs` covers all three maps, both sides and every adjacent route, plus commands, all phases/partial accumulator saves, invalid shapes, producer changes/loss, 70-unit cap, terminal/counter/time safety, normal-range counters and committed-destination AI. It includes 960 restored continuation comparisons over 20 routes.

`tests/flight-order-legacy-parity.test.mjs` uses independently SHA-256-pinned copies of the immediate predecessor's engine/rules in `tests/fixtures/flight-baseline-v015/`. Its 90 cohorts cover all six old identities, five maps and three difficulties, paid commands, full state/RNG JSON and cross-restoration. Additional cohorts prove Hold parity against old full-roster open/timed rules, raw v1/v2 unused fields, escalation/decay and safety boundaries. Those fixtures are executable historical evidence and are not imported by production.

Run:

```
node --test tests/flight-order-engine.test.mjs tests/flight-order-legacy-parity.test.mjs
node --test tests/engine.test.mjs tests/versioned-engine-codec.test.mjs
node --test tests/legacy-runtime-parity.test.mjs tests/map-parity.test.mjs
```

These kernel tests do not substitute for campaign balancing, the production tactical matrix, the complete combined suite or browser/mobile QA.
