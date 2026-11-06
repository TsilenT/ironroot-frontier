# Critical original-objective warning policy

## Scope

`dist/objective-alerts.js` is a current-page presentation policy over immutable
`createProtectedObjectiveMonitor` snapshots. It does not read or change engine,
campaign, outcome, save, profile, RNG, camera, DOM or audio state. It has no timers,
storage, sound synthesis, new settings or persistence schema. The caller alone
delivers its message and the existing `warning` SFX.

The implementation and focused tests are new files on the isolated integration
workspace. This document does not certify app integration, native audio delivery,
screen-reader behavior, offline inclusion or a release. Those require the parent
integration and its final verification.

## Current integration evidence

The app now creates a policy for each protected monitor, observes it each fixed
step before objective evaluation, and flushes after audio/HUD updates. It uses the
existing named status region and mute/SFX/volume path without replacing action
toasts or moving focus. The module is in the offline shell. An independent
read-only review found no actionable defects; the three UI/policy/resume suites
passed 75/75. The final combined next-batch root suite passed 882 tests with one optional
desktop-dependency skip, and runtime/syntax checks passed. Browser regression
coverage is being prepared separately; native hearing and screen-reader behavior
remain unverified. This is local development evidence, not a release approval.

## Policy

- Critical means the monitor reports `critical` and exact positive HP divided by
  current maximum HP is at most 30%. Rounded percentages do not set the threshold.
- A target first observed critical queues one **current danger** cue. It makes no
  claim that damage just happened, who caused it, or whether rescue is possible.
  This applies to a restored critical original as well as any initial snapshot.
- After a noncritical observation, critical danger queues only when actual HP
  decreased. A safe upgrade, increased HP or maximum-HP-only denominator change
  cannot create an alert. No cause is inferred from the decrease.
- Deliver an original's critical episode once. Continued damage, redraws, camera
  movement, pause/resume and elapsed time do not reannounce it. It must recover
  **above 40%** to rearm. Exactly 40% and 30/31% jitter stay in the same episode.
- Queue observations from all fixed steps before delivery. One flush combines all
  still-critical pending originals, uses their latest HP and retains the original
  constructor ID order. Reordering snapshots cannot confuse original identities.
- Every genuine new batch supplies current named text. At most one batch requests
  sound in a six-second **wall-clock** quiet window, independent of simulation
  speed. A second batch in that window has `sound: null`. It is consumed, never
  delayed until cooldown expiration. There is no periodic critical siren.
- Deliveries are consumed even if existing mute/SFX/volume/browser-unlock controls
  prevent audible sound. Enabling audio later does not replay an old episode.
  Music on/off remains independent of the existing SFX controls.
- If an undelivered target becomes noncritical, drop its pending cue. If it was
  never announced, another actual HP decrease into critical may queue it again.
- Loss cancels pending danger and is terminal for that original. An already-lost
  original never warns. A replacement building, even at the same site, does not
  inherit the old original's warning state.

## API

```js
import { createObjectiveAlertPolicy } from './objective-alerts.js';

const initial = protectedMonitor.read();
const alerts = createObjectiveAlertPolicy({
  battleKey: protectedMonitor,
  targetIds: initial.map(target => target.originalId),
});
alerts.observe(initial, { battleKey: protectedMonitor });

// In the existing fixed-step observation path, not only the HUD redraw path:
const current = protectedMonitor.observe(game);
alerts.observe(current, { battleKey: protectedMonitor });

// After objective evaluation/result handling, with the final UI context:
const cue = alerts.flush({
  battleKey: protectedMonitor,
  active: battleCanDeliverWarnings,
  ended: battleHasEnded,
  stale: profileIsKnownStale,
  now: performance.now() / 1000,
});
if (cue) {
  protectedAlert.textContent = cue.message;
  if (cue.sound) sound(cue.sound);
}
```

The example flags must be supplied from the app's existing authoritative gates,
not guessed from the policy. `active` is false during pause, Help, Settings, other
blocking dialogs, hidden/background state, viewport/storage safety holds, title
or a noninteractive/stale battle. A compact build drawer alone does not imply
pause if the battle remains active. `ended` includes any completed/failed
objective outcome, winner, or result, even if the result modal is closed again.
`stale` is a known replaced/invalidated profile, not merely transient unavailable
storage. A temporary safety hold uses `active: false`; a terminal stale instance
needs a new battle and new policy, never an implicit reset.

`observe` returns `true` when a valid batch is accepted and `false` when ignored
or closed. `flush` returns `null` or a deeply frozen result:

```js
{
  kind: 'critical-danger',
  targets: [{
    originalId, label, hp, maxHp, ratio, percent,
    reason: 'current-danger' // or 'health-decreased'
  }],
  message: 'Critical health: North gold mine (20% HP).',
  sound: 'warning' // or null for a new batch inside the quiet window
}
```

`reason` describes this page's observation, not damage attribution. Treat
`message` as plain text, never HTML. The existing stable named health controls
remain the visual warning; this cue need not create a toast or replace a paid
action confirmation. Replace the previous critical live-region announcement with
this batch message so the same transition is not announced twice. Existing loss
announcements and final loss details remain separate.

## Lifecycle and ordering requirements

1. Create one policy alongside each new protected monitor in
   `beginProtectedObjectives`, including retry and restore. Close/discard the old
   instance. A new game can reuse original numbers, but must not reuse its policy
   or opaque `battleKey`. No-protect battles may use no policy or an empty ID set.
2. Observe the initial snapshot immediately. Keep observing every existing
   fixed-step monitor update before UI delivery. A genuine transition already
   observed immediately before pause must remain queued.
3. `flush({ active: false })` does **not** consume that queue. Continue passing
   current snapshots when the monitor is refreshed, including an HP-changing
   action. On return to active play, flush once using the latest observed health.
   A loaded critical original then gives an honest current-danger cue once.
   An already-delivered critical original stays quiet across every resume.
4. Evaluate/handle the mission result before flushing warnings. A critical target
   can be lost or the mission can finish within the same multi-step frame. Flush
   with `ended: true` so no danger cue competes with the outcome sound. Terminal
   gates apply before `active`, including when a result/stale battle is paused.
5. `ended: true`, `stale: true`, or explicit `alerts.close()` permanently clear
   pending data. Call close/discard on title exit or any abandoned battle. Reopening
   an old result must not reactivate its warning policy.
6. A missing, duplicate, changed or malformed target set fails closed. No pending
   old-target warning survives. Calls with another or omitted `battleKey` also
   permanently close the instance and discard its queue. This guards the common
   stale-instance/retry error but does not replace the app's profile-safety gate.
7. Provide finite nonnegative monotonic wall-clock seconds on active flushes.
   Invalid time throws before consuming pending cues. A backwards timestamp cannot
   create an audible burst; it suppresses sound until a valid later window. Do not
   pass battle time, which advances faster at 2x and resets on retry.
8. Pass `cue.sound` through the existing `sound`/`GameAudio.play` path. Do not create
   or unlock an audio context here, bypass preferences, poll for successful play,
   or retain a failed sound for retry. Include this new runtime module in the
   parent-owned offline shell; choose version/cache changes only at release time.

## Focused validation

Run `node --test tests/objective-alerts.test.mjs`.

Coverage includes exact thresholds; full-health to critical; loaded critical;
500 repeated observations; simultaneous/multi-step batching; target reorder;
sound-only quiet-window suppression and no timer replay; independent targets;
hysteresis and recovery/re-entry; safe upgrades and denominator changes;
paused/Help/Settings/hidden/safety-held delivery; pause immediately after a real
transition; latest HP on resume; canceled recovered danger; muted/unavailable
audio consumption; lost/restored-missing/rebuilt originals; terminal result and
stale profile; explicit close; wrong/omitted identity; retry with repeated IDs;
malformed/changed target sets; input/output immutability; clock failures; actual
authored monitor/upgrade snapshots; the Common Ground full-citadel/critical-mine
case; and paired fixed-step engine/RNG/outcome parity at 1x/2x subdivisions.

The tests exercise policy decisions, not actual browser playback. Parent-owned
integration tests and native QA must prove the app calls observe/flush in the
required order, gates actual dialogs/background/profile/result paths, preserves
stable target focus, updates one live region, honors audio controls and loads the
module from the offline shell.
