# Browser Back and game menus

Unreleased v0.15 integration candidate. This changes same-document menu navigation, not the save format, scenario rules, URL, fullscreen policy or release version.

## Finite policy

- Campaign keeps the current mission as its initial screen, with Story → Chapter → Mission as its Back ancestry. At Story (or a top-level Skirmish/Field trials screen), another Back can leave the webpage normally.
- A running battle has a paused boundary. Back closes its top nested menu first; from unobstructed play it pauses and checkpoints the retained battle. The next Back uses the existing Save & return path. It never starts a replacement game.
- Teaching Back closes the reading dialog into frozen planning. Closing Options opened from planning also keeps that teaching hold. Only the player's explicit Start/Resume starts combat.
- Options, guide, restart confirmation, import preview, results, report, owned-building inspector and mobile build drawer have real parents. Back from a cancelled import preview cannot be undone by resurrecting its pending file on Forward: choose the file again to preview it.
- Forward may reopen safe menus for the same retained attempt. It never starts, restarts or resumes combat. A marker belonging to a previous attempt cannot reconstruct that game. A result remains a result.
- A failed save retains the exact in-memory game and its warning. A stale battle checkpoint is never reclaimed. Recovery/restoring/profile-fence dialogs and unsafe viewport holds retain their existing vetoes. No new unload override was added.

`menu-history.js` serializes only a namespaced version, document token and entry ID. Route descriptions stay in a per-document registry. Navigation must match a known entry and the native current state; unknown or old-document payloads are never interpreted as game state. Existing object-valued host fields in `history.state` are preserved. Primitive or array-valued foreign state, or a denied History API, disables this enhancement without replacing that foreign data.

UI Close/Resume controls traverse back to their existing parent, rather than stacking duplicate close entries. If another UI action occurs while that traversal is pending, it is reconciled after traversal without undoing the newer action. Browser Back itself never creates another guard entry. Navigation does not change the URL or install a redirect.

A reload does not append a second ancestry. Old markers use the live UI only to dismiss a layer or pause. A document restored from the back/forward cache stays paused; its existing marker is reconciled, not extended. Background/departing-page pauses do not call history.go while the browser is navigating elsewhere.

Every history transition retires held pointer, keyboard and controller input before changing the active layer. Existing dialog focus/inert handling remains in charge. Fresh input remains available immediately.

## Honest platform limits

This is a finite History API policy, not an Android operating-system Back interceptor. Browser UI, browser gestures and installed apps differ. Browsers may skip synthetic entries before user interaction, ignore unload prompts, evict a cached page, close a standalone window, or consume Back to dismiss their own keyboard/fullscreen UI first. Multi-step history jumps can skip intermediate menus; the app still uses the retained battle's pause/save checks when it receives a same-document navigation.

On repeated Back after a failed save, the finite internal entries eventually run out. Existing browser save-failure/unload safeguards still apply, but are not guaranteed by every platform. Keep a failed-save page open, free storage or export the retained session. There is no endless pushState loop to pretend that leaving is impossible.

Phone viewport emulation and a mocked standalone display-mode signal do not certify a physical Android device or an installed PWA. Fullscreen remains optional and follows the browser's normal permission/support rules.

## Verification

- `tests/menu-history.test.mjs`: asynchronous Back/Forward, initial ancestry, Close, fast consecutive actions, changed chapter, namespaced state preservation, forged/stale state, reload, unavailable History API, cached-return reconciliation and repeated Back.
- `tests/menu-navigation-app.test.mjs`: real app function bodies, actual engine/save-session/profile-session code, and a deliberately small DOM/history fixture. Includes teaching, nesting, result reports, quota failure, old saves, stale ownership, all mandatory profile gates, viewport holds, held input, previous attempts and page lifecycle. This is not native rendering/focus evidence.
- `qa/browser/back-navigation.spec.mjs`: prepared native-browser cases using real history.back(), history.forward(), history.go(), navigation, storage, dialogs and controls. Includes direct loads/reloads, Back/Forward, nesting, teaching, held input, quota and ownership, mandatory restoring/failed/invalid/newer-profile holds, unsafe viewport, rapid traversal, result reports, native fullscreen exit, cached-document return and standalone display-mode limitations.

The local Node suite, browser fixture/static checks, runtime syntax and offline inventory are required. Native browser execution remains a separate gate; local Chromium launch is blocked by the execution environment and was not bypassed. Browser tests here are prepared, not claimed as passed. The final combined source must run them in its authorized browser runner.

Physical follow-up: on Android browser and installed PWA, start a battle, open each nested menu, press hardware/gesture Back repeatedly, use Forward where available, switch apps and return, reload, and repeat after a recoverable save failure. Verify fullscreen exit and the on-screen keyboard independently. Record browser/OS version and installed versus tab mode.
