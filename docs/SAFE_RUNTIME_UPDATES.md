# Safe runtime update discovery (0.40.7 candidate)

The existing cache-first shell can leave a returning player viewing an old document after a new worker activates. Publication, worker activation and the running document's version are separate states. This change makes a newer active release discoverable without automatic navigation or combat interruption.

## Player experience

- A quiet **Update ready** panel appears at the title and in the pause menu after a newer active worker identifies itself.
- During live combat the notice stays in those menus. Discovery does not pause, save or reload the battle.
- At the title the action is **Update game**; an unfinished paused battle offers **Save & update**. The action retains keyboard/controller focus while checking.
- Updating reloads the page and returns to the usual title/Resume flow. A failed save leaves the current page and battle intact with an explanation and retry action.

## Safety boundary

`runtime-update.js` asks the controlling worker for its release identity over a private MessageChannel. It listens for controller changes and performs throttled checks on load, foreground/focus return and page restoration. Offline checks and legacy workers that do not understand the query fail quietly. Same/older/malformed release identities never prompt an update. No discovery callback navigates or writes profile data.

An explicit action rechecks the active worker asynchronously, then calls the synchronous `prepareRuntimeReload()` immediately before requesting navigation. That guard blocks running battles, recovery/import holds, unavailable or replaced profiles, stale battle ownership, pending campaign/trial progress, unsaved history, dirty preferences and unverified checkpoints. A paused active battle is saved through the existing validated write path. Profile and battle ownership are checked again after saving. Existing `beforeunload` protection remains enabled; the action never sets `allowProfileReload`.

Page departure invalidates pending actions, so an asynchronous reply cannot later reload a departed/restored document. Repeated clicks cannot enqueue multiple simultaneous actions. The UI does not claim installation success before a new document loads. Worker installation, cache freshness, automatic worker takeover and offline behavior are unchanged; the only worker addition is the bounded version reply.

## First-release limit

An already-running 0.40.6 (or older) document cannot acquire a new notification handler without loading new code. This patch does not force that document to reload or navigate an active battle. Such sessions still need one save-preserving reload after the new shell installs. Once this UI has been loaded, subsequent active releases can be discovered and applied with the explicit action. A universal immediate retrofit would require forcibly navigating old clients whose unsaved state the worker cannot inspect, so it is deliberately not attempted.

## Verification and release identity

Node checks cover numeric release comparison, private-port replies/timeouts, silent discovery, explicit actions, save failure/retry, lifecycle cancellation, duplicate clicks, throttled/offline checks and the actual app guard. The guard uses a real current-ruleset game and validated save session to verify quota failure preserves checkpoint bytes.

Skirmish launch and Resume remain visible with an update ready in all four browser viewport profiles; existing menu regression assertions remain intact.

The browser harness serves the current app/worker code under consecutive **synthetic release identities**, using isolated loopback paths and warm HTTP caching. It exercises real worker installation/takeover, explicit title and pause actions, a paid building, exact paused checkpoint retention, failed writes and pending preferences. It does not label relabelled current code as historical production. Generated screenshots, traces and logs remain outside the repository.

Additional desktop browser cases verify that an already-installed update reloads fully offline from the worker with the exact checkpoint intact, and that a stale tab cannot overwrite another tab's newer checkpoint. The stale tab can return to title and update without changing the newer checkpoint or any other saved domain.

The release-transition loopback check used the exact 0.40.6 shell from main commit `1f5bd376127c57e5735f4466ca50cbebdd5f81c1` and this 0.40.7 candidate. The new worker activated without navigating the old document; all 70 precached candidate files matched their source hashes. A normal reload then loaded 0.40.7 from the worker with all five saved profile domains byte-for-byte unchanged, protocol 32 retained and no page errors. This confirms the first-release boundary above; it is not evidence about live-domain propagation.

Root/desktop metadata, visible version, document runtime identity and offline cache advance together to 0.40.7. The runtime has 71 files, including the new cached update client. Profile protocol remains 32 and battle formats/rules are unchanged. Historical runtime literals stay intact; tests reverse only the declared message handler/cache entry and exclude the new presentation client from the original 64-file oracle.

This document describes the reviewed implementation and its validation, not physical-device/Steam certification. No production profile, cache or storage was cleared during development.
