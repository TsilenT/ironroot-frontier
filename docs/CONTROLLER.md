# Controller input

## Scope and status

The controller layer is a dependency-free ES module designed for browser Gamepad
API polling and deterministic tests. It owns input state only, not DOM elements,
game rules, rendering, storage, or animation frames. App integration and real
hardware validation are separate from module unit tests.

The module in `dist/controller.js` is now integrated by `dist/app.js` in the
experimental 0.7 candidate. The app shares battlefield activation with touch,
shows a virtual cursor, and routes controller input through menus and HUD focus.
The public 0.6 release did not include this feature. Deterministic module tests
are separate from adapter/browser review and real-device validation. Physical
hardware is not available in this environment, and controller-only playability,
Steam Input compatibility, and Steam Deck support are not certified.

The adapter audit reproduced an unaffordable-card cycling stall and a hidden
cursor takeover purchase. Both now pass the same synthetic callback checks:
cycling advances to an affordable different card, and the first takeover A
leaves gold and buildings unchanged. The adapter also clamps before actions,
uses an explicit gamepad focus class, handles Back after inspecting an ended
battle, and resets HUD mode at title/new-battle transitions. These are code and
synthetic checks. Actual browser navigation and physical-device validation
remain separate release gates.

## Standard mapping

Names below use Xbox labels and standard Gamepad API button positions. Other
controllers can show different labels. Nonstandard mappings require an explicit
configuration rather than silently assuming Xbox positions.

| Input | Battlefield | Menus / HUD focus |
| --- | --- | --- |
| A / bottom face | Confirm at the visible virtual cursor | Activate the focused control |
| B / right face | Cancel build, rally, or selection | Back / close the topmost dialog |
| X / left face | Enter HUD focus | Return to battlefield, where appropriate |
| Y / top face | Arm rally strike; A still required to cast | No battlefield action |
| LB / RB | Previous / next affordable building card | Previous / next available control |
| Left stick | Move virtual cursor | Directional focus navigation |
| D-pad | Enter / navigate HUD focus | Directional focus navigation |
| Right stick | Pan camera | No camera movement behind menus |
| LT | Slower, precise cursor movement | Unassigned |
| View | Return camera to home | Unassigned |
| Start | Pause | Resume only when the pause panel is topmost |
| Left-stick press | Toggle frontline follow | Unassigned |

Rally is also an ordinary focusable card, so all seven building cards and rally
are available through D-pad navigation. Selection arms a command only. A separate
A press places a building or casts the strike. Holding A must never repeatedly
buy, upgrade, salvage, or accept dialogs.

## Public API

`GamepadInput` accepts injected `getGamepads`, `onAction`, `onMove`, and
`onConnection` functions, plus configurable mapping and timing. If no provider is
supplied it lazily checks `globalThis.navigator?.getGamepads` when polled. Import
and construction work without browser globals. The class does not register
listeners, schedule frames, mutate DOM, or start browser APIs at module scope.

Call `update(nowMs, context)` once per app frame. Context is `gameplay`, `menu`,
or `disabled`. The returned frame contains connection information, semantic
action events, normalized cursor/camera vectors, precision state, and bounded
delta time in seconds. Unsupported devices are listed separately in `unsupported`. The same information is available to callbacks. `reset()` clears
held state and requires released controls before accepting another press.

Default semantic actions are `confirm`, `cancel`, `focus`, `rally`,
`previousCard`, `nextCard`, `home`, `pause`, `frontline`, `up`, `down`, `left`,
and `right`. Mapping is data-defined and supports multiple buttons per action.
Only directional and card-selection actions repeat. Other actions use press
edges. An event includes its action, phase (`press` or `repeat`), and timestamp.

Pure helpers provide radial deadzone processing, cursor movement/clamping,
linear wrapping focus navigation, and spatial navigation from caller-provided
rectangles. Helpers receive plain objects and never read or focus DOM nodes.

## Safety and interrupted input

- Missing API, denied provider access, no controllers, sparse gamepad arrays,
  malformed samples, and disconnection return an idle frame without throwing.
- Stick vectors use a radial deadzone and unit-circle clamping. Diagonal movement
  cannot move faster. Cursor movement uses real delta time with a maximum step.
- Button and menu-stick thresholds use hysteresis to suppress noisy repeated
  presses at a threshold. Menu stick navigation uses one dominant direction.
- Connect, reconnect, context change, reset, clock reversal, and reactivation
  suppress already-held controls until they return to neutral. A button held
  while closing a dialog cannot activate the newly exposed surface.
- Repeat uses an initial delay and interval. A long suspended frame can emit
  at most one repeat per action, never a backlog of synthetic purchases/clicks.
- The first supported controller stays selected until disconnected. A second
  controller cannot interleave commands with the first. Replacement controllers
  are rearmed after their controls return to neutral.
- `disabled` is for hidden windows and focus loss. The app still polls or calls
  `reset()` on resume. Input must not continue behind an inactive window.

## App adapter requirements

1. Instantiate one input instance and poll it before rendering. Determine the
   topmost active scope in this order: preferences, field guide, battle result,
   title, pause panel, explicit HUD focus, then battlefield. Disabled input wins
   when the document is hidden or the window is not active.
2. Use a context key for each menu/screen, not only the word `menu`. The module
   will accept `{ mode: 'menu', key: 'preferences' }` so held input is rearmed
   when switching directly from one menu to another. `disabled` and unknown modes
   emit no input.
3. Keep one virtual cursor in canvas-local CSS pixels. Initialize it visibly
   near the build frontier, clamp it inside the canvas, and convert it with
   `renderer.screenToWorld`. Draw a visible ring/crosshair even without a build
   selection. On resize, clamp again. Pointer input can temporarily hide the
   ring, but gamepad motion should restore it.
4. Refactor the current pointer-up build/cast/select code into one shared
   `activateBattlePoint(worldPoint)` function and call it from both pointer-up
   and controller confirm. Do not dispatch synthetic pointer events or bypass
   affordability, protected objective, pause, or territory rules.
5. Movement only updates the cursor preview. A fresh confirm event must call
   the shared battlefield activation function once. Set `follow = false` on
   cursor-directed camera movement and preserve existing camera bounds.
6. Build a focus list from visible, enabled controls inside the active scope.
   Include all seven build cards, rally, selection-panel actions, and HUD tools.
   Do not focus hidden/disabled controls or controls behind a modal. Keep a
   visible focus outline and scroll the focused card into view on narrow screens.
7. The app should call native `.focus()` / `.click()` on the chosen control.
   Existing handlers remain the authority for purchases and UI changes. For
   range/select controls, directional input adjusts the value with the same
   input/change handlers as keyboard input, rather than trapping focus there.
8. Cancel closes only the topmost menu and restores the previous focus. Cancel
   on title should not start or exit anything. Pause must not dismiss a result,
   bypass a mission lock, or close preferences and accidentally resume combat.
9. Reset after an action changes a focus scope during the same frame. This also
   prevents simultaneous confirm/cancel from applying to two different screens.
10. Show connection/mapping help without stealing focus. Pause an active match
    if its active gamepad disconnects, but allow keyboard/mouse recovery. An
    unsupported controller should receive a useful message, not false support.

Gamepad buttons do not reliably count as browser user activation for Web Audio.
The input adapter must not claim gamepad-only sound unlock works until verified
in the shipping browser/desktop wrapper.

## Verification plan

Unit coverage: import without browser globals; no API / denied API / sparse
lists; standard-map filtering and configurable bindings; sticky controller
ownership; neutral rearm on connect/context/reset; exact one-shot edges;
direction/card repeat timing; long-frame burst prevention; numeric/object
buttons and analog hysteresis; deadzones, drift and diagonal normalization;
menu stick direction and D-pad priority; disabled input and clock discontinuity;
cursor bounds/frame-rate behavior; linear wrapping/skipping; spatial focus
navigation; and callback/frame consistency.

Browser adapter QA: title modes, campaign chapter/mission selection, launch,
seven cards and rally, valid/invalid placement, upgrades and protected salvage,
pause/resume, settings including sliders, field guide, result/retry/continue,
cancel/back, resized canvas and narrow card scrolling, pointer-to-controller
switching, lost window focus, and held confirm during modal transitions.

Hardware validation remains required with at least one Xbox-style standard pad,
a PlayStation-style pad, Steam Deck/Steam Input, USB unplug/reconnect, Bluetooth
drop/reconnect, two connected controllers, and each intended browser/wrapper.
Record browser/OS/device/mapping, connection behavior, glyph correctness, audio
unlock behavior, and whether a full campaign mission can be finished without
mouse or keyboard. Synthetic unit fixtures are not hardware validation or Steam
Deck certification.


## Integration example

The following shows module wiring, not a replacement for the scope-specific app
adapter above. `onAction` gets `{ action, phase, time }`. `onConnection` gets
`{ connected, gamepad: { index, id, mapping } }`. `onMove` receives the completed
frame, also returned by `update`. No callback is required.

```js
import {
  GamepadInput,
  moveCursor,
  nextFocusIndex,
  spatialFocusIndex,
} from './controller.js';

let cursor = { x: 320, y: 220 };
const controller = new GamepadInput({
  onAction(event) {
    // Route to current scope; never send a menu action to the battlefield.
    const changedScope = routeControllerAction(event.action, event.phase);
    if (changedScope) controller.reset();
  },
  onConnection({ connected }) {
    if (!connected && battleIsActive()) pauseBattle();
  },
});

function pollController(now) {
  const frame = controller.update(now, currentControllerScope());
  cursor = moveCursor(cursor, frame.cursor, frame.dt, canvasCssSize(), {
    precision: frame.precision,
    padding: 12,
  });
  // Draw a visible cursor and update its world-space placement preview.
  // Camera input is a normalized vector, not an accumulated displacement.
  // Use camera.x * frame.dt * desired pixels/second with the proper pan sign.
}
```

`DEFAULT_MAPPING` is deeply frozen. Constructor overrides are copied and merge
with defaults. Use a button index, an array of indices, or `null` / `[]` to
disable an action. Stick overrides use two distinct axis indices or `null`.
Invalid indices fail at construction with a descriptive error. Custom button
action names are supported. Bindings do not modify the caller's mapping object.

```js
const custom = new GamepadInput({
  allowUnmapped: true, // Explicit opt-in for a verified nonstandard device.
  mapping: {
    buttons: { confirm: [0, 7], focus: null },
    sticks: { cursor: [0, 1], camera: [2, 3] },
  },
  deadzone: 0.2,
  repeatDelay: 350,    // Milliseconds until first repeat.
  repeatInterval: 110, // Milliseconds between repeats; minimum 16.
});
```

The default repeat list is up/down/left/right and previousCard/nextCard.
`repeatActions` can override it, but purchases, confirm, salvage and pause should
remain one-shot. Default analog-button engage/release thresholds are 0.55/0.4.
Default menu-stick engage/release thresholds are 0.55/0.35 after deadzone
rescaling. Input delta time is capped at 0.05 seconds. The cursor helper also
caps delta time, uses 640 CSS pixels/second, and scales precision movement by
0.3. These values are configurable.

`nextFocusIndex(items, current, delta, { wrap })` returns the next available
index. Items marked `hidden: true`, `disabled: true` or `focusable: false` are
skipped. No available item returns -1. The default wraps. A disabled current
item continues from its previous position.

`spatialFocusIndex(items, current, direction)` accepts `up`, `down`, `left` or
`right` and never wraps. Each item supplies `{ x, y, width, height }`, directly
or under `rect`, in one shared coordinate system. It favors aligned neighbors.
When no neighbor exists it returns the current index; missing current focus
chooses the first available rectangle. Restrict the input list to the active
scope before calling either helper.

The module deliberately does not vibrate controllers, use persistence, claim
Steam Input support, acquire exclusive device access, or create trusted browser
user-activation events. Hardware glyphs and device remapping UI remain adapter
and product work.


## Adapter audit regression cases

The initial adapter review used unmodified extracted app functions with a stub
DOM and the real simulation in a temporary Node VM. This established callback
behavior, not actual browser focus behavior or physical-controller support.

- With 200 gold and Archery armed, repeated RB presses must move past the
  unaffordable Foundry to an affordable different card. Search must wrap at most
  once. When only the current card is affordable, retain it without toggling
  it off. When none is affordable, leave selection unchanged. X/HUD navigation
  still exposes every card and its cost.
- Select a building or rally with pointer input, then press controller A with
  the controller cursor hidden. The first takeover must reveal/reposition the
  cursor without purchasing or casting at an unseen stale position. A fresh
  subsequent press may activate the visible, clamped cursor.
- Shrink or rotate the viewport, including while menus are open. Clamp the
  virtual cursor before any confirm, not only afterward during movement.
- Enter HUD focus, pause, save/exit, and launch another battle. Preserve the
  existing `start()` reset of HUD mode and cursor placement and the explicit
  HUD reset in `showTitle()`.
- Use mouse/touch, then enter controller HUD focus. A visible outline must follow
  the focused card/button/summary/checkbox even when the browser's native
  `:focus-visible` keyboard heuristic does not activate for programmatic focus.
- Result → Inspect battlefield → B must return to the title.
- Pause, preferences, guide, result and backup dialogs must stop held input from
  acting on a newly exposed screen. Confirm/cancel in the same sampled frame
  must not perform an additional action after the scope changes.
- Disconnect in live battle and in HUD focus. The active battle must pause;
  reconnection must require neutral before accepting held inputs. Keyboard and
  touch recovery must remain possible.

`nextAffordableIndex(cards, currentIndex, direction, gold)` is implemented and
unit-tested. It returns an index or -1 after one bounded, wrapping search,
excludes the current card, and accepts only finite nonnegative costs and a
finite nonnegative budget. A missing or invalid current index starts from the
first/last card according to direction. Invalid costs are skipped. An exact
budget is affordable. The input array is never modified.

For building selection, pass `Object.values(BUILDINGS)` and the corresponding
index from `Object.keys(BUILDINGS)`. Call `selectBuild` only when the result is
nonnegative. A -1 result means keep the existing selection unchanged, which
prevents the existing toggle-style selection handler from clearing the sole
affordable card. HUD focus navigation still exposes all cards and prices.
