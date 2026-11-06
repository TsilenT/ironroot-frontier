# Objective-danger alerts: browser regression coverage

## Status

Prepared on 6 November 2026 in the private integration workspace. The new files
pass JavaScript syntax checks and the dependency-free fixture validator.
**The Playwright cases have not been browser-executed by this worker. Cloud
browser execution remains pending.** No browser or server was started, no native
visual-review session was used, and no source was uploaded or published.

The existing Playwright configuration discovers six cases under all four
projects: `phone` (390×650), `narrow-phone` (320×568), `landscape` (844×390), and
`desktop` (1180×757). This is 24 planned case/project combinations, not 24 passes.
Touch profiles use synthetic Chromium touch, not physical devices.

## Coverage

1. A valid restored Winter Stores checkpoint has the original **North gold
   mine** at **95/380 HP (25%)**. Resume must expose exactly one matching polite,
   atomic `role="status"` text, the named critical target and correct visible HP.
   The battlefield keeps focus. Native DOM mutation observation verifies one
   nonempty critical write across 45 subsequent animation frames, rather than
   merely comparing text that could have been rewritten every frame. The
   existing warning schedules exactly three native 392 Hz triangle voices at
   offsets 0, 0.24 and 0.48 seconds.
2. A valid 115/380 HP original is attacked by a synthetic enemy whose saved
   cooldown expires after four active simulation seconds. Real Pause and Field
   guide controls hold the save, live status and warning quiet. Closing the
   guide retains the existing pause. Explicit Resume lets normal combat reduce
   HP to 94/380 (25%) and emit the one named alert. This tests paused/help
   simulation and delivery together; the pure policy tests separately cover a
   danger episode already queued before a delivery gate.
3. A valid 1 HP original loses to an in-range enemy on the next real combat
   tick. The failure names the original and observed loss time, disables
   its target button, clears the resumable save and writes one history result.
   DOM/audio observations reject critical cues after the result becomes visible,
   and remain unchanged through 45 more frames. A current-danger cue before that
   first combat tick is allowed; a historical/post-result danger cue is not.
   The displayed centisecond loss time must match this browser's actual retained
   result time and lie in the initial 0–0.1-second interval. It is not copied from
   the standalone fixture's 0.05-second oracle.
4. Master mute preserves named critical text but schedules no warning voices.
5. SFX disabled preserves named critical text but schedules no warning voices.
   Both preference cases first unlock a **real, running Web Audio context**
   through shown controls, so autoplay silence cannot satisfy the assertion.
   The shown settings and their saved values must remain authoritative.
6. Version-3 First Watch and Forked Road Resume labels name the mission without
   `SUDDEN DEATH` or `OPEN-ENDED`. Version-3 timed and open-ended Rootwarden
   skirmishes still show their exact corresponding rule. Inspecting each title
   leaves its saved checkpoint and other profile data unchanged.

## Test integrity and profile safety

- Fixtures are explicitly synthetic persistence setups, not claims of played
  campaign progress or balance. They pass the shared battle decoder. A separate
  dependency-free oracle restores and advances ordinary combat, checks the
  delayed damage/loss, and verifies the stable critical checkpoint remains active
  for seven simulated seconds.
- All fixture preparation happens outside the browser before Resume. Browser
  actions use the existing one-time seed/reload helper and actual visible
  controls. There are no engine writes during play, fake clocks, module
  interception, forced clicks, app-only testing hooks, or modified runtime files.
- The status probe observes native DOM mutations and animation frames. The audio
  probe passes through native AudioParam, gain and oscillator operations, retains
  real audio nodes, and changes neither inputs nor returned values. It does not
  replace GameAudio or AudioContext. Music is disabled through existing saved
  preferences to disambiguate the warning signature.
- Audio evidence means **real Web Audio scheduling**, not human listening,
  speaker audibility, loudness quality or assistive-technology output. Native
  screen-reader announcement and listening checks remain separate manual gates.
- Browser tests use Playwright's isolated context for each case, never a live
  personal browser profile. They compare campaign, settings, history, trials,
  profile epoch and an unrelated storage value around applicable flows. Only
  expected battle saves and the single earned failure-history entry may change.
- Existing browser helpers, Playwright configuration, package scripts, runtime,
  persistence policy and paid-action assertions were not edited or weakened.

## Files and commands

- `qa/browser/objective-alerts.spec.mjs`
- `qa/browser/objective-alert-fixtures.mjs`
- `qa/browser/objective-alert-browser-helpers.mjs`
- `qa/browser/validate-objective-alert-fixtures.mjs`

Dependency-free checks, from the repository root:

```sh
node --check qa/browser/objective-alerts.spec.mjs
node --check qa/browser/objective-alert-fixtures.mjs
node --check qa/browser/objective-alert-browser-helpers.mjs
node --check qa/browser/validate-objective-alert-fixtures.mjs
node qa/browser/validate-objective-alert-fixtures.mjs
```

After the owner authorizes the isolated browser runner and its existing pinned
dependencies are available:

```sh
cd qa/browser
npm test -- objective-alerts.spec.mjs
```

The existing config starts its own non-reused localhost test server. Do not run
it against the separate visual worker's server or session. Keep any failure
trace/screenshots and report actual results by project; syntax and fixture
validation do not establish the UI, audio or full browser-matrix pass.
