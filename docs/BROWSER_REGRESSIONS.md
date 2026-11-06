# Browser regression harness

## Current 0.9 candidate: prepared, browser execution pending

The current harness is version **0.9.0**. It contains **90 logical cases across
four Chromium profiles, 360 discovered instances**, with the same **three
intentional coordinate-specific skips**. No new skip or expected failure was
added. The per-file counts are:

- regression: 21 cases / 84 instances
- campaign: 10 / 40
- accessibility and backup: 17 / 68
- field reference: 4 / 16
- offline shell: 1 / 4
- physical maps: 33 / 132
- local fonts and complete notices: 2 / 8
- real 0.7-to-0.9 and 0.8-to-0.9 service-worker updates: 2 / 8

Local verification on Node 24.22.1 passed `npm run check`, including the public
engine/backup map fixtures, all 17 production 0.7 runtime files and all 18 frozen
0.8 runtime files. The 0.7 files and package metadata were independently matched
to GitHub blob hashes at the exact production private commit before copying.
Discovery-only inspection with the preinstalled Playwright **1.57.0** found the
360 instances above. That inspection used no browser and started no server.
The isolated package still pins **1.65.0**; the cloud runner must install that
package and repeat `npm run list` and the actual browser suite against the final
candidate. A listing, syntax check or fixture pass is not a browser pass.

Everything below that reports an older pass count is historical and scoped to
that earlier candidate. No 0.9 browser result is claimed here. Runtime, desktop
code and the separately frozen 0.7/0.8 review candidates were not changed by this
harness work.

## Provenance and status

Adapted from private source repository TsilenT/ironroot-frontier, branch
`test/mobile-browser-regressions`, commit
`b06258fe1266299f855204f1eca3271a2057f6fc` (baseline `db685c6`).
Original files were retrieved through the authorized GitHub connector.

Original reported run: 48 passed, 9 failed, 3 skipped on Chromium 155 /
Playwright 1.65.0. **Those are historical baseline results, not current results.**
The authorized cloud worker subsequently reported **81 passed, 0 failed,
3 skipped** after correcting two stale Field Guide access tests on branch
`test/field-guide-pause-harness`, commit
`aef4155c15399825aef54e674f780bf45a03cbf2`, based on `a502451`.
That commit's test-only diff was verified through GitHub and integrated locally:
the guide is opened from pause, and dismissing it must return to pause before
resuming. This is a reported cloud-worker result, not a local browser run or a
claim that the newer v0.6 campaign integration has passed the matrix.

Local v0.6 source review confirmed the existing save helper already unwraps outer
save versions 1 and 2. A narrow additional adaptation checks the new invalid-save
contract: retain the original bytes with a visible load warning, then replace
them only when the player starts a new battle. Both old invalid fixtures remain.
These v0.6 assertions have passed syntax checks but await browser execution.
No browser run was performed in the managed local environment, where browser
actions require CUA. Run this suite only in a cloud coding environment authorized
to launch Playwright. The managed preview on port 4173 is not used by this harness.

## Isolated, reproducible tool package

Only `qa/browser/` and this document are added. Root dependencies, build scripts,
workflows and production `dist/` are unchanged. The separate package pins
`@playwright/test`, `playwright` and `playwright-core` to 1.65.0 through its
package manifest / lockfile. Node **20 or newer** is required (the original
document's Node 18 statement conflicted with the actual dependency engines).

In an authorized cloud coding environment, from the repository root:

```sh
cd qa/browser
npm ci
npx playwright install chromium
npm run check
npm run list
npm test
# Or, if this environment explicitly permits using its existing Chromium:
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm test
# Focused regressions:
npm test -- --project=phone --grep 'keeps its details'
npm test -- --grep 'failed save|Space activates|malformed history'
```

The server binds only 127.0.0.1:4187 and normally serves this checkout's dist directory.
It does not reuse an existing server. Use the commands above from qa/browser.
The private update-test routes additionally serve one of two explicitly allowed
immutable fixtures under qa/browser/fixtures/0.7.0-dist or 0.8.0-dist, then the
current dist, separately per test session.
These routes belong only to the QA server, not production or public hosting.
Reports, failure screenshots and traces go under qa/browser/playwright-report
and qa/browser/test-results, both ignored. Record commit, Node, Playwright,
browser version and actual pass/fail/skip counts alongside any reported run.

## Retained and adapted coverage

All original 15 test cases remain, with four viewport profiles: 390×650 touch,
320×568 touch, 844×390 touch landscape and 1180×757 desktop. Touch cases include
hardware-keyboard checks. Three intentional skips restrict the coordinate-specific
click-through regression to the 390px phone; no known product failures are marked
expected or skipped.

The source suite's placement, drag rejection, occupied slot, upgrade, salvage,
viewport resize, pause/help timing, save round trip, invalid save, focus,
near-end victory/defeat/draw, failed save, native Space and click-through checks
still apply. The adaptation changes these obsolete assumptions:

- Saved game assertions unwrap the current ironroot-save envelope. Legacy raw
  engine saves are still exercised by near-end fixtures; round trips exercise
  the new envelope through real UI writes.
- Welcome focus wraps from Preferences to the Skirmish mode tab, rather than
  from Field guide to Easy difficulty.
- A denied save must keep the battle open and paused, not navigate to title.
  SecurityError coverage now opens actual preferences, rather than only toggling
  the toolbar audio button.
- Paused keyboard building selection is tested without trying to click through
  an overlay. The new Settings toolbar control is included in viewport checks.
- Failed-save coverage now asserts battle retention as well as a warning.
  A separate case confirms the previous durable snapshot remains unchanged
  and that saving works after storage is restored.
- Four malformed-history fixtures (broken JSON, null, object, invalid array
  entries) reach a real engine-driven victory, assert exactly one history row
  and open the recent-history preferences view.
- Preferences reload persistence and native Space on a checkbox are covered.

The original/adapted, campaign, controller/backup, field-reference and offline
files retain 53 logical cases (212 profile instances). The new map, font and
update files add 37 cases (148 instances), bringing current discovery to 360,
including three intentional skips. This is not a pass claim. The historical
81-pass run covers only the previous 84-instance matrix.

## v0.6 campaign critical flows (prepared, not browser-executed)

Run in an authorized cloud coding environment:

```sh
cd qa/browser
npm ci
npx playwright install chromium
npm run check
npm test -- campaign.spec.mjs
# Then run the complete combined suite:
npm test
```

`campaign.spec.mjs` adds nine tests on all four profiles, with no new skips or
expected-failure annotations:

- Locked Three Roads has a disabled launch action and prerequisite explanation;
  selecting Emberwatch enables launch. Enter on the locked selection stays on
  the title screen without creating a save.
- Keyboard activation of chapter and mission choices retains focus on the
  replacement choice after the list rerenders.
- A campaign started through the UI builds an Archery range, saves with outer
  version 2, reloads, resumes Emberwatch and preserves construction and time.
- A victory fixture produces three stars and exactly one history entry. Continue
  selects/unlocks Three Roads, which can then launch through the UI.
- A timeout-failure fixture initially focuses Retry, keeps progress empty, traps
  result focus, and starts a fresh instance of the same mission on Enter.
- A protected mine exposes a disabled salvage action and explanation; an ordinary
  barracks remains salvageable. Both protected mines remain in the saved state.
- Campaign briefing controls and Begin Mission remain reachable after narrow,
  landscape and portrait viewport changes; the fully visible launch button works.

Fixture provenance is explicit: `campaign-fixtures.mjs` creates missions using
the public campaign factory and serializes them with the public engine contract.
Victory removes the marked Emberwatch target at time 10 with an intact citadel;
failure sets its clock to the deadline with the target alive; protected selection
loads Winter Stores with synthetic valid completion records for its prerequisites.
These fixtures seed only browser storage. They do not call private application
functions, force a result DOM or set an engine winner. The real application
evaluates the objectives and performs result, history and progress transitions.

Locked/focus/responsive tests use fresh UI-started campaigns. The save/resume
test builds through actual pointer input and does not seed storage. Synthetic
outcome fixtures validate transitions, not player skill, combat balance or
earned campaign progression.

`npm run check` checks all harness module syntax and runs
`validate-campaign-fixtures.mjs`. Its three fixtures passed Game.restore,
campaign-outcome assertions, prerequisite checks and progress normalization
locally. Browser assertions remain unrun here. Two independent-review defects now have
explicit regressions, described below; cloud failures must be investigated, not
automatically skipped. Campaign audio, all twelve missions, every branch, progression-write
failure and complete campaign accessibility still need separate coverage.

## Independent-review defects: retained regression assertions

Two additional campaign-file tests encode desired behavior and were expected to
fail against the reviewed pre-fix implementation. They are not skipped or marked
`test.fail`. The later parent-reported 36/36 campaign cloud pass includes these
checks; the exact v0.6 result is recorded below. Local execution here remains
syntax-checked, browser-unrun.

- **Stale multi-tab save ownership.** Page A starts and pauses Emberwatch through
  the UI. Page B, in the same browser context and origin, starts and pauses a new
  Hard skirmish. Closing A explicitly runs beforeunload and must preserve B's
  exact durable save bytes and skirmish identity. The test permits accepting a
  leave-page warning but never authorizes overwriting the newer save. Both pages
  are checked for uncaught errors. This uses real pages and UI-created saves,
  not seeded storage or a manually dispatched lifecycle event. It specifically
  covers unload; visibility-only lifecycle handling still needs separate review.
- **Collapsed landscape campaign scroll area.** A UI-started campaign is saved
  back to title so Resume occupies its real layout space. At 844×390, the
  campaign content's client height and viewport-visible height must both exceed
  120 CSS pixels. This catches the independently observed approximately 10px
  content strip rather than merely checking that Begin Mission is reachable.

Focused cloud command:
```sh
cd qa/browser
npm test -- campaign.spec.mjs --grep 'stale paused|120px'
```

## Targeted mobile click-through reproduction

On a fresh 390×650 touch viewport, start a skirmish, choose Go to base, build an
Archery range at world (550,450), cancel placement and tap that same location.
The details panel must remain open after the compatibility click settles.
Close it deliberately, then tap the building again; it must reopen.

Coordinates are derived from the actual canvas rectangle rather than guessed:
s = max(0.32, canvas.height / 900); half = canvas.width / (2*s);
camera = half >= 1600 ? 1600 : max(half,450);
tapX = canvas.left + canvas.width/2 + (550-camera)*s;
tapY = canvas.top + canvas.height/2.
These are CSS pixel dimensions, not the DPR-scaled canvas backing store.
The current zoom starts at 1. This recipe intentionally avoids interacting
with zoom controls before computing the point.

On the historical baseline, pointerup targeted #battle and opened the panel;
the following compatibility click hit the newly exposed #closeSelection.
The source review does not prove whether the current implementation is fixed.
The retained assertion and deliberate close/reopen check must be rerun on the
final product code, using actual touch input rather than only dispatching a
synthetic click.

## Limits

Chromium emulation is not Safari, Firefox, real iOS/Android, physical rotation,
safe-area or browser-bar testing. These tests do not establish audio quality,
touch ergonomics, controller usability, balance, complete accessibility, every
offline upgrade path, memory stability or long-match frame rates. Campaign and field-trial mission content is not exhaustively covered by this
suite; the 81-pass historical cloud result predates the local v0.6 integration. Near-end fixtures
test actual engine-triggered UI transitions, not human-played full matches.
Screenshots, CUA reviews, unit tests and balance simulations remain separate gates.

## v0.7 controller and backup regressions (browser execution pending)

The v0.6 snapshot was captured before adding accessibility-backup.spec.mjs.
The integration contract confirms standard controller mappings, center-of-canvas
initial cursor, RB selecting Barracks from no selection, and the planned backup
controls. Export/file-validation errors use #backupStatus; confirmed restore
errors use #backupImportStatus inside the topmost preview modal. Successful
replacement stops the session and reloads. Syntax checks and backup-fixture
validation have passed. No browser run
has been performed, and none of these checks counts as a product pass.

Ten tests add 40 profile instances:
- Standard-controller held confirm activates the focused Start button once,
  does not select/build behind the dismissed menu, pauses, and resumes safely.
- Shoulder buttons change the selected construction card; left-stick steering,
  precision mode and confirm place an Archery range through the virtual cursor.
- Disconnect removes the cursor and leaves pointer controls usable, while the
  preferences status and guide communicate controller availability/help.
- Export creates a downloadable JSON file validated by the production parser;
  excluding the battle leaves progress intact and excludes only that domain.
- Invalid JSON is refused without modifying any existing storage domain.
- Import preview/cancel leaves all five game domains and unrelated data intact.
- Explicit replacement reloads, restores the replacement battle/preferences/
  progress, removes absent trial/history records and preserves unrelated data.
- A raw Storage read denial makes export fail visibly rather than downloading
  empty progress.
- A raw Storage read denial during confirmed import leaves existing data intact.
- A one-time quota failure at the preferences write, after earlier writes, rolls
  back the previous raw bytes and does not reload.

Backup fixtures come from createBackup/parseBackup with valid Game.serialize
data. Original and replacement fixtures differ in every game storage domain.
Only this test game's localStorage and the five documented keys are touched;
an unrelated sentinel checks that import does not clear all origin storage.

Controller tests replace navigator.getGamepads with a deterministic standard
pad provider before app initialization. Buttons and axes are the inputs; tests
never access private app state or call gameplay callbacks. Virtual cursor
movement uses its rendered geometry and the normal left-stick input. These are
integration tests of input routing, not physical-controller pairing, browser
permission policy, firmware mappings, haptics or console/Steam certification.

Run in an authorized cloud coding environment:

```sh
cd qa/browser
node --check accessibility-backup.spec.mjs
npm test -- accessibility-backup.spec.mjs
# Then rerun the complete matrix:
npm test
```

Physical-controller tests and real download/import usability reviews remain
separate gates. No skip/expected-failure marker conceals integration failures.

### v0.7 markup alignment before cloud execution

Backup tests open the actual “Save backups” details summary before operating
its controls. The controller-disconnect test sends View/Home (button 8) after
pointer Start, because connection alone does not activate the virtual cursor
and pointer input intentionally returns control to the mouse. Guide help uses
#controllerHelp; preferences controller details use #controllerSettings.

The isolated harness package is version 0.7.0, with matching lockfile root/package
versions. Its aggregate syntax check includes accessibility-backup.spec.mjs.
Production dependencies and production files are unchanged by these adaptations.
These changes have passed local syntax/fixture checks, not browser execution.

## Exact v0.6 cloud result and dirty-save harness correction

The parent reported the exact v0.6 cloud matrix as **113 passed, 4 failed,
3 skipped** (120 instances). All four failures were the same stale harness
assumption in “failed save retains the previous durable snapshot and can
recover”: it injected write failure while the battle remained paused with an
unchanged, already-durable snapshot. Production now intentionally treats that
identical save as a no-op, so no write should be attempted or reported failed.

The current regression now pauses and reads the prior durable bytes, resumes
for 350 ms (below the five-second autosave interval), injects a quota failure,
and pauses again to attempt a dirty save. Save & return must then retain the
paused battle and the prior bytes. Restoring writes allows exit and resume.
The change strengthens the intended failed-write test without penalizing the
deliberate identical-save optimization.

The parent additionally reported **12/12 corrected recovery checks passed**
and **36/36 campaign checks passed** in cloud. These are scoped results, not a
claim that the entire corrected 120-instance matrix was rerun, and not results
for the newer 160-instance v0.7 controller/backup matrix. Local work here only
patched the test and performed syntax/fixture checks; no local browser run
was performed.

## Initial v0.7 candidate cloud result and controller synchronization

The parent reported the older v0.7 candidate matrix as **155 passed, 2 failed,
3 skipped** (160 instances). Backup checks passed **28/28**. The two failures
were intermittent controller tests: a press could arrive before the app had
sampled released buttons after pointer input reset the controller context.

The harness now explicitly clears buttons/axes and waits for three observed
navigator.getGamepads polls before each new press, then waits for the pressed
input to be sampled and for released controls to be sampled afterward. Fixed
durations control button hold length only; sleeps alone no longer establish
a released-input baseline.

The cloud worker reported **36/36 repeated controller checks passed** with
neutral-poll synchronization. This is focused evidence, not a full corrected
160-instance rerun. The local helper change passed syntax checks; no browser
was run locally. New audited scenarios for bumper cycling, first-confirm
cursor activation, file-read races, incomplete rollback and stale-profile
imports are being prepared separately pending production fixes/contracts.

## Activated audited regressions after profile-recovery integration

Seven additional controller/backup cases are now active (28 profile instances).
The combined expected matrix is 188 instances, including the existing three
coordinate-specific skips. This is a discovery expectation, not a browser pass.

- Low-gold shoulder cycling reaches an affordable mine beyond unaffordable
  foundry/watchtower cards, and cycles backward without constructing anything.
- First A after pointer construction selection reveals the virtual cursor
  without spending gold or constructing at an unseen position.
- Controlled File.text promises resolve out of order; the earlier file cannot
  overwrite the newer preview or the data confirmed for import.
- Dismissing settings during a pending read prevents a late preview reopening.
- A settings-write failure plus blocked campaign rollback produces a persistent
  recovery hold. Cancel returns to settings; close/done/reload remain disabled
  and Escape cannot resume. Retained-session export preserves in-memory progress,
  trials, settings and battle independently of partial stored data. After storage
  repair, takeover restore requires checking the explicit other-tabs-closed
  consent before replacing and reloading.
- Separate active campaign and field-trial tabs are held after another tab imports
  an empty profile. Old medals/preferences cannot return through preference input
  or the explicit reload/beforeunload path. The newer saved battle remains absent.

The marker barrier is exercised through normal UI operations; tests do not write
or invent marker tokens. Existing quota rollback still targets the settings key
after earlier domain writes, permitting the actual marker transition/finalization.
Read-denial feedback accepts the new profile-marker refusal message.

All added JavaScript syntax and existing campaign fixtures pass local checks.
The new browser assertions remain unrun here. Exact marker-finalization retry
and every storage-recovery/resume variant are not exhaustively covered.

## v0.8 field reference (prepared; cloud execution pending)

Four new cases in field-reference.spec.mjs add 16 profile instances. Before the
separate offline gate below, this brought expected discovery to 204 instances,
including the three existing intentional skips. This count is not a test-pass claim.

- Fresh guide starts with the roster disclosure collapsed. Native Space opens
  and closes the roster, all five unit cards, both structure cards and economy.
  Every card checks displayed stats/mechanics against the read-only codex module.
  Independent text assertions pin key counters: warrior 45% arrow reduction
  (9.35 damage), archer +50% anti-air (25.5), siege 3× structures (90), wizard
  65% splash (15.6), and gryphon 60% structure damage (10.2).
- Mine economics explicitly distinguish level 2 (133 gold / 1.25 marginal gold/s
  = 106.4 seconds) from level 3 (199 / 1.25 = 159.2 seconds). Economy baseline,
  caveats, upgrades and overtime copy must all appear.
- Opening and using the reference from a paused battle preserves exact durable
  save bytes and displayed time. Space operates disclosures without resuming;
  building/rally hotkeys do not act behind the guide. Summary focus and dialog
  Tab wrapping are checked, followed by native Space on Resume.
- At 320×568 and 844×390, every expanded card stays horizontally contained,
  has no internal horizontal overflow, and its summary is scroll-reachable.
  Ready to command remains reachable and returns to title.
- All five portrait canvases must have painted nontransparent pixels, varied
  pixel colors and distinct image data. This catches empty/identical canvases,
  not subjective art quality or a wrong-but-distinct silhouette.

Every case fails on uncaught page errors. There are no product-state hooks:
tests use UI input, read-only geometry/pixels and persisted-save observations.
All four cases run on each existing Chromium profile, including hardware-keyboard
checks under touch emulation. Physical-device usability and visual review remain
separate gates.

The isolated harness metadata is 0.8.0, with matching lockfile root/package
versions and unchanged dependency pins. npm run check includes the new spec's
syntax and validate-codex-fixtures.mjs, which verifies roster identities and
the marginal mine-payback assumptions without a browser.

Cloud commands:
```sh
cd qa/browser
npm ci
npm run check
npm test -- field-reference.spec.mjs
npm test
```

Local syntax and fixture checks passed. Browser execution is pending, and the
runtime remains under integration until the parent declares its stable candidate.

## Actual service-worker offline-shell gate (prepared)

The original offline-shell.spec.mjs added one case on each Chromium profile,
taking the then-current discovery to 208 instances with three existing skips.
The case is retained and extended for 0.9 below. Each case receives a fresh
browser context. Because the app deliberately skips worker registration on local
preview origins, the test explicitly registers the real /service-worker.js on
the harness's trustworthy loopback origin and waits for activation and control.

The browser context then goes offline. Reload must return a service-worker
response, and app.js, engine.js and codex.js must also be worker-served. The test
starts a real battle, pauses, opens the roster/mine reference, saves to title,
reloads again offline, and resumes the same construction/time state. Page errors
fail the case. This is actual worker/cache execution, not request-route mocking
or a test-built replacement cache. Context disposal isolates registrations/cache
from every other test; the finally block restores network state.

Cloud command:
```sh
cd qa/browser
npm test -- offline-shell.spec.mjs
```

Only syntax has been checked locally. Offline installed-PWA launch, eviction,
device storage policy and external-font fallback appearance remain unverified.
The previously planned separate server/version update flow is now implemented
as the 0.9 gate below, but has not been browser-executed locally.

## Same-gesture result-transition gate (prepared; observation unconfirmed)

One campaign-file case adds four profile instances: expected combined discovery
is now 212 instances, including three existing skips. The motivating play-review
observation was ambiguous and is not recorded as a confirmed click-through bug.

A separate same-viewport page first reaches a genuine mission deadline and
measures its actual result-button coordinates. The test then resumes a valid
mission three seconds before its deadline. It verifies that one measured
coordinate currently belongs to the battlefield or a gameplay control, sends
mouse-down on desktop or a Chromium CDP touchStart on touch profiles, and waits
for the normal objective deadline to display the result. Read-only hit testing
must show the result action now occupying that same coordinate before release.
The original held gesture is then released; result remains visible, no title,
retry or continuation occurs, and no new battle save appears.

No DOM-dispatched click, forced result callback or private app state is used.
Calibration and test pages use validated public serialized fixtures; result
history correctly includes both genuine failures. Test annotations record the
input type, initial target, coordinate and overlaid action. If a viewport has
no real actionable overlap or layout changes between calibration and release,
the test fails with an explicit setup assertion rather than pretending to
exercise the transition. This tests the underlying input hazard, not necessarily
the exact minimap coordinate of the ambiguous observation.

Cloud command:
```sh
cd qa/browser
npm test -- campaign.spec.mjs --grep 'gesture held across'
```

Syntax/fixture checks pass locally. The new browser case is unrun here; no runtime
changes or local browser automation were performed.

## 0.9 physical map browser gates

`maps.spec.mjs` adds 33 cases, all on all four profiles:

- Native map disclosure opens/closes with Space, retains focus, exposes three
  choices, and stays scroll-reachable at 320×568 and 844×390. Map selection and
  difficulty remain independent.
- Every map starts through the UI, saves, reloads, resumes with the right name,
  and switches to the next map without retaining old geometry. Classic remains
  engine-save v1 without map fields; new maps use engine-save v2 with their
  exact ID/revision inside the unchanged outer save envelope.
- Every map accepts one actual pointer/touch purchase on a legal site, rejects
  another tap on that occupied site, and rejects purchases during a real drag.
  Saved building coordinates, counts and exact income-adjusted expenditure are
  the oracle. Visible slot draw calls enumerate 24 or 16 actual sites.
- Both minimap ends, a 73% click, Home, Front and an oversized whole-world
  viewport must map to the selected world width. Long March's enemy citadel
  projects from x=3890, not the old x=3090. All real minimap roads match the
  selected lane rows. Far-right screenshots are retained for review.
- Twin Span renders only two minimap rows and sixteen placement slots. A tap
  in the old center-lane gap snaps to the real south road; engine saves contain
  neither a y=450 construction row nor a third lane index.
- Campaign and trial starts remain Classic after a Long March battle, and
  returning to skirmish retains the chosen nonclassic map.
- Real engine-triggered new-map victories record and display the correct map
  in history, clear the battle save and permit a fresh game on that map.
- Ten invalid stored-battle cases cover unknown identity, missing identity,
  future revision, incorrect Long March base coordinates, invalid Twin Span
  lane/site coordinates, and both new maps masquerading as each authored mode.
  Resume is refused, export cannot download a misleading replacement, and all
  five data domains plus an unrelated sentinel retain their exact bytes through
  settings/reload. Only explicitly starting a new battle replaces the save.
- Both new maps export through the real download flow, preview their map names,
  import over a different battle, reload, re-export unchanged data and resume
  their original buildings. Four incoming authored-map backups are rejected
  before a preview/confirmation can change storage.
- On both new maps, standard Gamepad API input drives the real controller cursor
  to the same legal sites used by pointer input. Repeated occupied-site confirm
  does not search for a neighbor or spend gold. This tests input routing, not
  physical controller feel or ergonomics.

`map-fixtures.mjs` uses `new Game`, public `build`, `serialize`, `Game.restore`,
`createBackup` and `parseBackup`. The validator separately proves all three
map geometries/save shapes/backup round trips, three engine-triggered victory
fixtures, six engine-invalid payloads and four authored-mode rejections. A
fixture is never reinserted by an init script on subsequent reload/import.
Synthetic near-end wins do not represent human play or balance evidence.

The canvas observer wraps native Canvas2D calls and immediately delegates to
those same native methods. It retains only the latest frame's minimap paths,
viewport, placement slots, terrain dimensions and text calls. It does not
replace a context, modify renderer/game state, inject a winner, fake a purchase
or expose a production test hook. This verifies real browser draw/input routing
but is not a pixel-perfect visual judgment. Screenshots still need review.

## 0.9 local fonts and notices

`fonts.spec.mjs` adds two cases per profile. It requires all five same-origin
font responses to be successful `font/woff2` responses containing WOFF2 magic,
loads Barlow at 500/600/700/800 and DM Sans at 400/500/600/700, and checks returned
FontFace objects are loaded. Chromium's actual platform-font inspection must
report custom Barlow and DM faces painting the menu text. A CSS family string
or truthy `document.fonts.check` alone is not accepted as proof. Actual battle
canvas calls use DM Sans labels; menu and battle screenshots are attached.

Complete in-game notice text must match the shipped FONTS-NOTICES.txt after
only HTML/line-ending normalization, including both full OFL texts. At narrow
and landscape sizes the focusable notice wraps without horizontal overflow,
scrolls to both ends by keyboard, and closes through its native disclosure.
Screenshots are retained. Notices/settings cannot create or alter a battle save.

The existing offline-shell case now starts Long March while offline, then
saves, reloads and resumes that engine-v2 map. All five fonts must load through
the actual worker, the notice asset is fetched as a subresource through the
worker, and the in-game text is compared with it. Font services are no longer
needed. This does not claim first-ever offline web access or packaged-native
first-launch rendering.

## Real production 0.7 and frozen 0.8 to current 0.9 worker updates

`service-worker-update.spec.mjs` parameterizes the identical flow over two
explicitly allowed prior releases, adding two cases per profile:

- Production **0.7.0**: 17 runtime files under
  `qa/browser/fixtures/0.7.0-dist`. Before copying from the frozen candidate2
  snapshot, every runtime file and package.json matched its Git blob hash and
  byte count from private commit
  `758452bfb3a415af66b70f5dbcaddfc132164c19`, fetched through the authorized
  GitHub connector. Its dist tree is
  `9ccd1f677fce24616ed95d56dc9ccbde42d736f4`. Package and service-worker versions
  both identify 0.7.0. `0.7.0-sha256.json` pins these source identifiers, all Git
  blob hashes and SHA-256 hashes. The verified `0.7.0-package.json` is retained
  outside the served fixture directory for repeatable metadata checks.
- Frozen **0.8.0**: the existing, unchanged 18-file fixture under
  `qa/browser/fixtures/0.8.0-dist`, pinned by `0.8.0-sha256.json`.

Both are private QA fixtures, not production assets.
`validate-update-fixtures.mjs` verifies exact directory contents, all 35 runtime
hashes, the production commit/package metadata, exact old worker versions and
each complete precache manifest before a cloud run. It also serializes a real
Classic building fixture with each frozen engine and verifies that the current
engine restores its buildings/time as Classic. Do not regenerate either
frozen fixture from current runtime files or publish these fixture directories.
The 0.7 case covers the real production-to-candidate path even if release skips
0.8; the separate 0.8 case is retained.

The existing loopback-only QA server creates a random per-test path on POST
`/__qa_update/sessions?from=0.7.0` or `?from=0.8.0`. Missing, duplicate or unknown
versions are refused. The version selects an explicit allowlisted directory,
never a filesystem path constructed from request text. Its own POST `advance`
switches only that path from its chosen old release to current dist; DELETE
cleans it up. Unregistered paths are refused.
Each test has a fresh browser context, so worker registrations, caches, storage
and control events cannot cross tests. There is no global build-version switch,
public endpoint or production server change. No new local server was started
during harness preparation.

The test performs these real operations:

1. Load the selected exact old release, seed valid prior campaign/trial/settings records, register its
   unchanged worker and verify the old cache's complete asset hashes. The only
   intercepted requests are the old release's external Google font services, which are
   aborted so this fixture needs no third-party network dependency.
2. Start a Classic battle and build through the actual old UI, then save to
   title. Capture exact durable bytes for all five profile domains.
3. Advance that session's server assets. Call the real registration's `update`,
   await `controllerchange` and the new activated cache, and verify the open old
   document has not changed profile data.
4. Take the context offline. Reload into 0.9 through the worker. Fetch every new
   precache asset through the worker and compare SHA-256 to this exact current
   checkout, detecting missing or stale modules, CSS, fonts and notices rather
   than trusting a version label. The old cache must have been removed.
5. Resume the original Classic construction/time state, then start, save,
   reload and resume Twin Span while still offline. The prior campaign stars,
   trials, preferences and history bytes remain unchanged. Actual local fonts
   load and the full embedded notice matches the cached notice asset.

The runtime directories must stay immutable for the cloud run. Run this against
exactly the final candidate, record its revision and publish no pass before the
browser completes. A failure suggesting mixed modules or an update race must be
reported with its trace and hashes before proposing runtime changes.

Focused cloud commands, followed by the complete matrix:

```sh
cd qa/browser
npm ci
npx playwright install chromium
npm run check
npm run list
npm test -- maps.spec.mjs fonts.spec.mjs offline-shell.spec.mjs
npm test -- service-worker-update.spec.mjs
npm test
```

### Remaining release gates

All added browser assertions and the update server flow await the authorized
cloud run with pinned Playwright 1.65.0. No local browser assertion has passed
merely because the harness parsed or its fixtures validated. New-map touch and
controller feel, legibility at real device scale, visual road artwork, prolonged
max-unit performance, terrain allocation and match balance require separate
play/review gates. Bot simulations and synthetic victories are not human play.

The update cases cover installed 0.7-to-0.9 and 0.8-to-0.9 paths with an old
title tab open. They do not cover an active mid-combat old tab continuing after a worker change,
many old tabs, failed/interrupted installation, partial network responses,
cache eviction, missing disk quota, interrupted OS process, installed-PWA launch,
other prior versions, rollback to an older release, physical Safari/Android
policies or a native package. Those remain distinct gates, not implicit passes.
