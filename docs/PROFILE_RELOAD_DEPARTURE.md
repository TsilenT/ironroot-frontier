# Profile reload and retained menu ancestry

## Evidence and scope

This is a defensive repair to the unreleased PR2 source based on
`d0f43c26748ff6e92d2cb96a5af7b364c9f404fe`. It does not establish the cause of the
single native-browser failure from that source's full cloud gate: 1,590 passed,
1 failed, 49 skipped. In that failure, a narrow-phone stale Challenges tab's
empty-profile Reload request ended with `ERR_ABORTED`. The downstream welcome,
no-saved-battle and five-domain-equality assertions were **not run**. Four
instrumented repeats passed; no competing traversal was captured, and the
unload trace was incomplete. Native causality remains unresolved.

A later controlled cloud diagnostic on the exact old source held only the
Reload response for 250 ms in two cases and 750 ms in two more. All four
captured native `history.go(-1)` from `syncMenuHistory`/`menu-history.js`
112–209 ms after Reload, followed by `ERR_ABORTED`, same-document navigation
and popstate. No held response completed and post-reload assertions remained
unrun. This confirms the conditional
slow-response interaction in a native browser. It does not prove that the
original uncontrolled failure had that cause, and is not a browser pass for
this repair.

A separate deterministic source check demonstrated a concrete gap:

1. A retained Campaign or Challenges battle is paused in profile recovery.
2. `reloadProfile()` changes `started` to false before calling `location.reload()`.
3. A menu synchronization after that handler but before `pagehide` reads a
   shorter real `menuNavigationTrail()`.
4. The real `menu-history.js` can request `history.go(-1)` to reconcile it.

Both direct/captured synchronization and the real
`syncProfileSafety()` → `showRecoverySettings()` → result-modal class mutation →
`syncDialogs()` → queued `syncMenuHistory()` chain can reach that interval.
Capture synchronization before the reload handler and synchronization after
`pagehide` are negative controls. The old `syncViewportSafety()` returns when
`started` is false; that false branch is not evidence for the late callback.

## Small repair

`reloadProfile()` keeps the retained `started` and `progressDirty` flags. The
battle remains paused, and the old profile facade still fences writes to a
replacement profile. The reload request therefore does not artificially remove
the retained battle from menu ancestry. Actual `pagehide` continues to own the
existing departure guard. No timeout, permanent history shutdown, new history
entry, controller API or profile schema is introduced.

The existing `reloadRequired` profile gate is established synchronously from
the status already checked by `reloadProfile()`. This is necessary because
successful import finalization clears the old gate. Even an import with exactly
the same battle bytes belongs to a new profile: its battle save session can
still report `current`, while its profile facade correctly reports read-only.
Cancel/Done or explicit Resume immediately after a no-document reload must not
resume that old battle before the next periodic profile check.

An explicit reload retains the existing `beforeunload` allowance. If the native
reload call throws synchronously, that allowance is cleared before propagating
the error. A persisted `pageshow` also clears it before the existing paused
cached-return reconciliation. The ordinary beforeunload handler and its profile,
recovery and pending-save checks are otherwise unchanged. A native request that
returns without creating a new document remains paused, keeps its recovery and
export controls, permits another Reload, and does not disable finite Back.
There is no portable browser failure promise for `location.reload()`; a silent
abort is not reported as a detected error.

This prevents the demonstrated reload-induced ancestry shrink. It does not
cancel an already-requested native traversal, suppress a deliberate subsequent
Back/action, or promise that unrelated later UI changes cannot initiate
navigation during a slow reload.

## Regression checks

`tests/profile-reload-departure.test.mjs` executes extracted production app
functions with the real engine, profile session, battle/history/preferences
persistence, import/finalization and menu-history implementations. Only DOM,
History API scheduling, native reload and rendering boundaries are fixtures.
Its observer deliberately queues even no-op class operations, stressing
reachability rather than claiming native mutation timing or coalescing.

The 16 focused checks cover:

- Campaign and Challenges late direct/captured/observer synchronization, exact
  retained game bytes and unchanged five profile domains after empty import.
- Own import finalization, delayed/no-document requests, repeated Reload,
  visibility/nonpersisted pageshow, explicit unload, pagehide and persistence
  retries through the real write fences.
- Already-requested menu traversal with its internal deferred reconciliation.
- Capture-before-handler and pagehide-before-late-sync negative controls.
- Restoring, failed, invalid and pending-finalization reload vetoes.
- Ready-profile recovery, dirty progress, retained export, synchronous reload
  failure, retry and cached return.
- Identical-battle import followed immediately by Cancel/Done/Resume without a
  periodic profile refresh, including a denied write through the old facade.
- Ordinary Back/Forward, finite exit without new synthetic entries, and paused
  cached-document restoration.

The old literal `tests/web.test.mjs` expectation that Reload clears `started`
and `progressDirty` was replaced with an explicit guarded-reload/paused-retention
contract. Its behavior is verified by the new tests, not just a looser regex.
No browser assertion or downstream check was removed or weakened.

Local commands:

```sh
node --test tests/profile-reload-departure.test.mjs
node --test tests/profile-reload-departure.test.mjs tests/menu-navigation-app.test.mjs tests/profile-session.test.mjs tests/web.test.mjs
node scripts/check.mjs
node scripts/verify-runtime.mjs
```

The primary regression can also run unchanged against an older app source:

```sh
PROFILE_RELOAD_APP_SOURCE=/path/to/frozen/dist/app.js \
  node --test --test-name-pattern='late post-reload sync' tests/profile-reload-departure.test.mjs
```

Against the frozen `d0f43c2` app, both primary checks fail at the assertion that
Reload must not request `history.go` before `pagehide` (one traversal observed,
zero expected). They pass on this repair. The two capture/pagehide controls pass
on the old source as well. Syntax and runtime inventory checks pass locally.
These source checks do **not** certify native navigation, a fresh document,
welcome/no-save rendering, physical phones, PWA behavior or non-Chromium engines.
The final combined source still requires its unchanged native-browser gate.
