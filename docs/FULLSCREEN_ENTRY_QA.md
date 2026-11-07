# Optional fullscreen entry

Unreleased v0.15 integration, 2026-11-07 UTC. No version, deployment, repository,
manifest display mode, browser permission, or security setting was changed.

## Behavior

- The title/mission footer exposes **Enter fullscreen** beside the existing
  links. It remains secondary to Begin Mission, with a 44px minimum target and
  a short visible status. Gold/health and the in-battle layout are unchanged.
- Title and Options use the same existing fullscreen handler. Labels, pressed
  state, pending guards and status stay synchronized. Requests target HTML so
  title, pause and other sibling dialogs remain visible.
- Only explicit button activation requests fullscreen, synchronously in that
  gesture. Standard requests prefer `navigationUI: 'hide'`; this is a browser
  preference, not a guarantee of hiding essential browser or OS controls.
  Start, resume, return, loading and viewport changes never opt the player in.
- Unsupported/policy-disabled entry is disabled with a windowed fallback. A
  rejected request preserves play and allows retry. Exit failure keeps the
  truthful active state and explains the browser exit control.
- Installed standalone/fullscreen display mode and iOS standalone report that
  app view is already active. Extra fullscreen stays optional if supported and
  is never requested automatically. System controls can remain visible.
- Standard and WebKit native change/error events are retained. Pending requests
  keep keyboard focus rather than natively disabling the focused button. The
  existing modal/input-scope and gesture reset logic remain in place.

## Executed checks

Node v24.22.1:

- `node --test tests/fullscreen-entry.test.mjs`: **15 passed**, 0 failed.
  These run the real production fullscreen handlers and real startup against
  parsed production HTML with simulated platform APIs, not copied handlers.
- `npm test`: **1,001 passed, 0 failed, 1 skipped** (1,002 total). The skip is the
  existing optional uninstalled desktop dependency check.
- `npm run check`: all game JavaScript modules parse.
- `node scripts/verify-runtime.mjs`: 45 source runtime files verified.
- `cd qa/browser && npm run check`: browser syntax and fixture aggregate passed.
- Discovery only with preinstalled Playwright **1.57.0** and a temporary local
  adapter link: **11 cases / 44 profile instances** in fullscreen-entry.spec.mjs.
  The link is not a source change or dependency to ship. The pinned 1.65.0
  package/lockfile versions were not changed.

The focused Node cases cover standard/WebKit entry/exit, synchronous invocation,
pending duplicates, focus retention, thrown/rejected/event failures, unsupported
and disabled APIs, denied exit, display-mode changes, native exit, standalone
state and no automatic entry during real startup/pause/viewport changes.

## Prepared browser gate, not executed

No Chromium launch, browser socket workaround, shared browser profile, server,
security-setting change or browser installation was attempted for this work.
Local shell Chromium socket startup is restricted. Discovery and simulated API
checks are not a browser pass or visual-layout evidence.

In the authorized cloud browser environment, use the pinned package and run:

```sh
cd qa/browser
npm ci
npm test -- fullscreen-entry.spec.mjs desktop-input.spec.mjs campaign-navigation.spec.mjs pause-menu.spec.mjs
```

The new cases require real click/tap/keyboard activation for native fullscreen
entry/exit, cross-surface state, dialog focus, no implicit startup/resume,
explicit denied/unsupported fallbacks, simulated installed-PWA states and
320×568, 844×390 and 390×650 viewport transitions. A saved-campaign case
measures more than 120px of actually visible briefing and fully reachable
Begin/Resume/fullscreen controls at 320×568 and 844×390, with fullscreen off
and on, records screenshots, then resumes through the real UI. The existing desktop-input
suite retains pause-menu fullscreen, native exit and save/resume regressions.
Repeat affected browser checks on the final combined source after merging the
independent Android Back work. Actual Android Chrome address/tab controls,
physical-device Back/fullscreen interaction, installed PWA behavior, safe areas
and OS chrome still need device testing. Browser and OS controls are not
promised hidden.
