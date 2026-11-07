# Restart briefing and campaign exit

This draft starts at private `main` commit `b88119fdd2cc288633e58bfaf0baffa302ee76de` (v0.18.0). It is isolated on `codex/restart-briefing`. It changes navigation only; combat, costs, AI, teaching rules, save formats and profile protocol are unchanged. No release version/cache change is included. Do not deploy these assets under the existing cache identity.

## Player behavior

- Campaign pause → Restart → confirm now retires that attempt and opens the same mission briefing. Chapter, Story, goals, scouting and the available roster match that attempt. Begin/Replay Mission is an explicit new launch. Required openings, optional legacy introductions, ordinary story missions and earned-roster replays use the same path.
- Failed campaign result → Retry Mission uses that same briefing-first path. Failed Field Trial → Retry Field Trial and confirmed Field Trial restart also return to the selected trial briefing. Trials already have authored briefings and a separate Start Field Trial button, so this is the consistent behavior. Trial records are preserved.
- Cancel, Escape, controller B and browser Back from the confirmation return to the paused attempt. Ordinary Skirmish restart still immediately starts a fresh battle after confirmation. Guided practice is unchanged.
- A successful **Common Ground**, the last mission in the current progression catalog, offers **Skirmishes** as its primary action. This opens Skirmish setup without starting a match. An optional **Replay mission** action remains available even at three stars. Earlier Ironroot still continues to Open Horizon; other Continue and optional replay routes retain their context. A fully completed profile reloads into Skirmish setup; selecting Campaign opens Common Ground for replay. Missing bonus stars do not block this transition.

## Retirement and persistence

The confirmed authored restart validates a fresh candidate, then removes only the owned battle checkpoint through the existing profile storage facade and verifies the removal. The candidate is page-local while the briefing is open; there is no saved or active attempt and no old Resume choice. Explicit Begin verifies ownership, saves the fresh candidate, and starts it. All persistent campaign stars, unlocks, best times, settings, trial records and result history are retained.

Input is interrupted at the transition. `started` is false on the briefing, so simulation and autosave cannot advance the abandoned attempt. Existing history attempt guards prevent Back/Forward from restoring or starting it. A removal storage event releases the old tab's claim even if a newly saved opening already has identical bytes when the event arrives. Starting or resuming explicitly remains the way to claim a battle.

Removal/write/readback failures retain the current dialog and show a warning. A failed verification does not claim that restart succeeded. If removal occurred but its readback was unavailable, the retained page remains paused and its old claim is stale after storage returns. Profile and viewport holds retain their existing behavior. As before, localStorage has no atomic cross-tab compare-and-swap; the existing optimistic checks, verified readback and native storage events are the safety boundary, not a new distributed lock protocol.

The page-local briefing candidate does not survive reload. Reload cannot revive the discarded attempt and chooses the normal profile entry point. Existing old-battle compatibility factories remain unchanged.

## Validation

The complete root suite passed: **1,433 passed, one existing skip, zero failures** (`qa/restart-briefing/root-final.log`). After the final ownership change, **103 focused persistence/profile/history checks passed** (`ownership-final.log`). Source syntax, runtime inventory, browser fixture/preflight checks and `git diff --check` passed. The runtime remains 51 files; exact hashes are in `runtime-final.json`.

Browser evidence uses local Chromium with Playwright 1.65.0. Desktop is 1180×757, narrow touch is 320×568, and touch landscape is 844×390. Navigation, history, keyboard, touch and controller holds use real time. The standard Gamepad API is synthetic. The small imminent-result fixtures are declared synthetic living combatants or existing admitted deadline checkpoints; production fixed-step combat/objectives decide the result. They are not human-played campaign or balance evidence.

The final navigation matrix passed **63/63**, and **16/16** selected narrow-phone downstream regressions passed. The earlier desktop identity and pause regression groups passed **23/23**. Two final desktop/landscape held-Enter checks also passed. Suite counts and screenshots are recorded in the accompanying validation JSON. Tests cover real paid opening construction; cancel and confirm; the same briefing and explicit fresh treasury/time; idle briefing beyond an autosave interval; result Retry; intro and roster identity; Continue and replay; the current final mission and obsolete finale; completed-profile reload; finite Back/Forward; focus; storage removal/write/readback faults; stale tabs; identical-byte retirement; and profile recovery holds.

Retained first-run evidence is in `qa/restart-briefing/browser-first-artifacts` and `browser-desktop-artifacts`, including screenshots, error contexts and JSON. Traces remain in the executor but are excluded from Git due to size. The first root pass exposed 64 source-harness failures because extracted app fragments lacked the new briefing functions. The fixture now executes those real functions and retains downstream assertions. The first browser pass had three test-fixture assumptions: a three-star result incorrectly expected the optional bonus-star replay; a readback-failed removal expected focus on a now-disabled Restart control; and a stale-tab test tried to restart from the tab that had already lost ownership. The next pass caught a legacy-only fixture helper encoding current revision-four finale data. These were repaired with valid fixtures and the same downstream navigation assertions, without weakening the production codec.

## Integration boundary

PR #14 remains untouched at `dc33357b4c51cc9ad421afd20c885356261e6a4a`. This draft changes separate app behavior, but both branches touch `dist/app.js`, `dist/index.html`, `qa/browser/package.json`, `qa/browser/ashen-crossroads.spec.mjs`, `qa/browser/mobile-coaching-visibility.spec.mjs`, and `tests/mobile-startup-fixture.mjs`. Preserve PR #14's Volley controls, geometry assertions, `getAttribute` fixture support, and browser preflight additions when combining them. This draft adds the explicit briefing Begin step to existing restart tests. No merge, rebase onto PR #14, deployment or public publication was performed. The coordinator owns integration checks and the release/cache sequence.

Physical devices/controllers, non-Chromium engines, a deployed build and the combined mobile Volley branch are outside this draft's measured evidence.
