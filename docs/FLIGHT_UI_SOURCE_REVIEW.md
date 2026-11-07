# Flight UI source review

Reviewed 2026-11-07 in the separate v0.16 integration checkout. This is a source,
VM/DOM-contract and Canvas2D-contract review, not a native-browser accessibility
sign-off. The frozen revised v0.15 PR #8 checkout was not changed. This reviewer
changed only this report; the integration owner made the runtime and regression
test repairs described below.

## Outcome

Two actionable presentation defects were found, reproduced and repaired during
review. Both repairs were independently checked. No unresolved source blocker
was confirmed in the reviewed scope. Native layout, screen-reader behavior,
physical input and final combined release validation remain separate gates.

### P2, repaired: grouped Pause countdown reported the last crossing

Before repair, `flightRouteRows()` accumulated `Math.max` and rounded to whole
seconds, while `buildFlightSignals()` selected the earliest warning. Two
gryphons sharing one route could therefore have a battlefield countdown of
0.3 seconds while Pause said that crossing started in 2 seconds.

This was reproduced without injecting resources, unit positions, timers or
routes:

```js
import { Game } from './dist/engine.js';
import { flightRouteRows } from './dist/flight-orders-view.js';
import { buildFlightSignals, flightSignalLabel } from './dist/flight-visuals.js';

const game = new Game({ rulesetId: 'frontier-flight-open', ai: false, seed: 1717 });
while (game.state.gold[0] < 500) game.update(.05);
for (const x of [1250, 1110]) {
  const built = game.build('aerie', x, 450);
  if (!built.ok) throw Error(built.reason);
  game.setFlightPlan(built.building.id, 0);
}
for (let i = 0; i < 1000; i++) {
  game.update(.05);
  const row = flightRouteRows(game).find(r => r.phase === 'warning' && r.count === 2);
  if (!row) continue;
  console.log(row, buildFlightSignals(game).routes.map(flightSignalLabel));
  break;
}
```

The two paid purchases occur at simulation time 16.00; the first grouped warning
appears at 20.15. Its actual timers are approximately 0.30 and 1.95 seconds.
`Game.restore(game.serialize()).serialize()` exactly matches the original
snapshot. The observed pre-repair ledger was `Crossing starts in 2 seconds.`
against canvas `↑ 0.3s×2`.

The final code at `dist/flight-orders-view.js:47-57` takes the minimum and says
`Next crossing starts in 0.3 seconds.` Both presentations use
`flightWarningTime()` at `dist/flight-orders-view.js:3-5`; the canvas calls it at
`dist/flight-visuals.js:105-109`. The word **Next** avoids suggesting that every
member of the group crosses simultaneously. Regression coverage at
`tests/flight-orders-view.test.mjs:101-126` includes the legal reproduction,
restore equality, and rounding boundaries:

- `1.0000000000000002` becomes `1.0`.
- `0.30000000000000004` becomes `0.3`.
- `0.00001` remains positive as `0.1`.

### P2 latent, repaired: a paused observation consumed an unheard warning

Before repair, `updateFlightStatus()` put warning unit IDs into
`seenFlightWarnings` before checking pause, teaching hold, visibility and the
six-second announcement throttle. A warning first observed during a hold was
permanently treated as announced even when it still had time remaining after
resuming. This suppressed both the polite live-region message and warning sound.

Reproduction used a real paid side-1 aerie at `(1950, 450)` in the same new
flight rules, seed 1717, AI disabled, with a legal lane-0 order. Start the app
harness before the warning; advance the engine in 0.05-second steps until the
first warning appears at time 2.50 with 1.95 seconds remaining. Call `pause(true)`
before the next HUD observation, then `updateHUD()`, explicit Resume and another
`updateHUD()`. Before repair, the live-region text and warning-sound log both
remained empty, while the same route still had 1.95 seconds remaining.

This is latent in ordinary current enemy behavior: current enemy producers
remain on Hold, so the reproduction does not claim that normal AI already
plans raids. It is nevertheless an admitted flight state and a real interruption
bug in the implemented enemy warning path.

The final code at `dist/app.js:2146-2154` marks IDs seen only inside an actual
eligible announcement. A throttled, paused, teaching-held or hidden observation
does not consume a warning; only units still in warning phase are considered
when feedback becomes eligible. The three real-engine tests at
`tests/flight-orders-view.test.mjs:130-144` cover pause, teaching and hidden
observation, one announcement after release, no duplicate sound, and unchanged
engine serialization. Independently verified after repair.

## Other reviewed contracts

- **Order intent:** the three native controls re-resolve the current owned,
  living aerie and legal adjacent destination at activation. The handler calls
  profile safety before the interaction gate. Orders affect only producer
  `flightPlan`; existing airborne route snapshots, resources, clock and RNG
  remain unchanged in the real-handler test.
- **Held input and dialogs:** document capture guards preserve pointer/key
  generation across modal changes; Enter, NumpadEnter and Space also retain the
  original target. The flight handler additionally requires a matching armed
  flight control for nonzero-detail pointer clicks. Blur, cancellation and
  viewport interruption clear its arm. Zero-detail native/assistive activation
  and controller `.click()` retain their separate guarded paths. Controller
  confirm is one-shot, and scope changes/reset suppress held buttons until a
  fresh press. The tests are event-contract evidence, not physical input tests.
- **History and holds:** Back/Forward operates on retained UI routes and does
  not restore, retask or resume a simulation. Back from teaching returns to
  frozen planning; Forward is not an implicit Resume. Viewport, stale-checkpoint,
  profile recovery, safety-limit and failed-save holds retain priority. A stale
  tab cannot reclaim or overwrite the newer checkpoint through history/save.
- **Read-only observation:** route rows, world signals and minimap derive from
  launched units. Only the selected owned aerie contributes a future preview;
  an enemy `flightPlan` getter that throws is never read. Frozen-input tests
  reject RNG consumption and mutation. Renderer integration is under the
  existing world/minimap transforms and restores canvas state.
- **Capability and identity:** old identities expose neither orders nor flight
  routes, and copied capability-looking rules cannot enable them. Fresh
  unfinished Wings of Ash/Stonegate attempts get the optional lesson; restored,
  completed and old-revision attempts do not gain that teaching hold. New
  profile startup requests protocol 5 before profile-domain readers; the frozen
  protocol-4 fixture refuses the new marker, including explicit recovery.
- **Accessible source structure:** controls are native buttons with visible
  names, `aria-pressed` and 44px minimum size. Disabled/hidden adjacent choices
  follow the current interaction state. Pause's Air routes is native
  `details/summary`, includes no order action, and can be read without advancing
  the game. Text, arrow direction and team shapes supplement color. Essential
  signals survive reduced-motion and low-effects settings.

The source writes `flightOrderCurrent.textContent` at each selected-aerie HUD
refresh even when unchanged. Native screen-reader review should explicitly
check for repetitive status announcements; this review did not assert that
such repetition occurs in a particular browser/AT combination.

## Capacity probe

A synthetic engine-admitted snapshot at the legal cap of 70 units per side
(140 total) covered all eight directed side/road routes. It restored exactly,
produced eight route groups and four corridor banners, and retained byte-for-byte
serialization with a throwing simulation-RNG stub. One complete world draw
recorded 630 mock-canvas calls; minimap recorded 297. Both context stacks returned
to depth zero.

After 1,000 warmups, 10,000 bundles of world signal projection, minimap signal
projection and text-ledger projection averaged approximately **0.093 ms per
bundle** in this Node environment. This establishes bounded aggregation at the
legal unit cap, not browser rasterization speed, mobile frame rate, natural
battle frequency or crowded-label legibility.

## Verification

The final focused run passed **171 tests, zero failures, zero skips**:

```sh
node --test --test-concurrency=4 \
  tests/flight-orders-view.test.mjs tests/flight-visuals.test.mjs \
  tests/flight-campaign-teaching.test.mjs tests/flight-profile-protocol.test.mjs \
  tests/input-scope.test.mjs tests/controller.test.mjs \
  tests/menu-history.test.mjs tests/menu-navigation-app.test.mjs \
  tests/campaign-teaching-integration.test.mjs tests/app-ruleset-integration.test.mjs
```

Reviewed post-repair source SHA-256 values:

```text
d701f69ae860e4a8af5dddb7b013eb244c0578a5d999c1c71c33c7db6cedd824  dist/app.js
8024be77be159d9c81260c4e9d45a9363a92673cd866741db5a50d31976857e8  dist/flight-orders-view.js
880521372f56cd8c687bd037e7b5cfeefef96b1db1115c3ae58f36f489ac142f  dist/flight-visuals.js
9ad1826eacf8f1d298d34aba8e404a94f9a2e548d7390e4974229219c5be6319  dist/render.js
8fb61de1cd216f342daa4a114d5c6b6fb20ad2ceb6cdd38d79c246e51564cc1f  dist/index.html
5845665dd8cc639fc29a6753644b84de9e8a2464650e0d68812e929f2e634441  dist/styles.css
f5e50130fe10d33d0f3c8d911e465413dcb969243d12b62e27d62eb954180f19  dist/profile-session.js
```

No browser, external service, publication or frozen-checkout action was taken.
No aggregate result from another checkout was treated as evidence for this
review. Exact final combined-suite, browser, physical mobile/PWA, non-Chromium,
physical controller, screen-reader and subjective audio checks are not certified
by this report.
