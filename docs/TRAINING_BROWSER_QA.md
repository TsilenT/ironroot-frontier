# Ironroot 0.12 Guided practice browser gates

## Status and execution boundary

Candidate: `/workspace/shared/ironroot-v012`, version **0.12.0**.

**Automated Playwright execution is NOT RUN and the targeted browser gate remains HOLD until the separately authorized runner executes it.** This work launched no browser or HTTP server, changed no hosting, transferred no source externally, made no commit, and installed no dependency or browser. Syntax checks, fixture checks and test discovery do not establish browser success, accessibility, gameplay, balance or performance.

Completed locally:

- `npm --prefix qa/browser run check`: syntax checks and every fixture validator passed. The new synthetic five-domain profile includes an engine-valid active Twin Span battle. The training HTML/import graph uses the real engine and renderer, has no persistence/profile/reward-module dependency, and all four training resources are in the current precache.
- Discovery only using the already installed **Playwright 1.57.0**: **720 instances / 180 logical cases / 12 spec files**, across phone, narrow-phone, landscape and desktop.
- New `training.spec.mjs`: **72 instances / 18 logical cases**, with **zero new skips**.
- The package and lockfile remain pinned to **@playwright/test 1.65.0**. A temporary import shim exposed the already installed older package solely for `test --list` and was removed afterward. No version downgrade or install occurred.
- Frozen fixtures and manifests, the original 0.10/0.11 trees, and the inherited held-gesture regression are checked in `qa/browser/evidence/0.12-harness-integrity.json`. The held block's SHA-256 remains `da0d728fd540cb9d12376c6a8794a5e3a4adb62d2f177a7123510b459018bba1`.

There are still **3 intentional inherited runtime skips**, from the 390px coordinate-specific selection-panel test on the other three profiles. A clean full run would therefore be **717 passed / 3 skipped / 0 failed**, not 720 passed. These are expected totals, not results. **0 of the 720 automated browser instances have been executed for 0.12 by this harness.**

Evidence:

- `qa/browser/evidence/0.12-fixture-validation.txt`
- `qa/browser/evidence/0.12-discovery-playwright-1.57.txt`
- `qa/browser/evidence/0.12-harness-integrity.json`

Discovery source locations may reflect the installed runner's transform cache. File/case/project identities and the discovered count are authoritative for this discovery evidence; the authorized runner must produce its own execution report.

## New cases and evidence boundaries

### Exact profile isolation

The entry case uses the real title link `#welcomeTraining`, verifies the separate `training.html` document, returns via its ordinary link, and compares exact bytes of campaign, trials, preferences, history and saved battle. It also preserves the profile marker and a session-storage sentinel. After the byte checks, the normal game resumes the retained battle and verifies its map, buildings and time continuity.

The fixture is explicitly **synthetic persisted profile data**, not a played win or lesson result. Each domain has intentional whitespace, so parse-and-reserialize mutations fail byte equality. Seeding happens once, never in an init script that could silently repair changed bytes on return/reload.

Every natural lesson case also retains all profile bytes. Native `Storage.prototype.setItem`, `removeItem` and `clear` calls are observed without replacing storage. A page-to-test binding retains attempted writes across navigation. Direct first-visit cases separately start with empty storage and with both storage getters throwing from before the first training module runs. They require zero mutation attempts, zero blocked-backend access, no profile claim, and no storage keys created on reload.

### Five real-time, ordinary-UI lesson flows

Each lesson is a distinct case under every profile. The tests choose the lesson, choose its build card, explicitly use the labeled site button, verify the actual paused gold cost and prompt progression, then start the normal observation. The mine case explicitly selects the owned mine and pays the displayed 133-gold upgrade.

- First barracks: 280 starting gold, 140-gold barracks, automatic warrior-production completion.
- Shields and arrows: 350 starting gold, 175-gold range, warrior-screen and supporting-archer observation feedback.
- Mine and upgrade: 330 starting gold, 190-gold mine, two seconds at 7.5 gold/s, 133-gold level-2 upgrade, then two seconds at 8.75 gold/s.
- Siege: 540 starting gold, 270-gold foundry, actual normal-speed observation to the marked-tower completion.
- Anti-air: 350 starting gold, 175-gold range, normal observation to the tracked-gryphon completion.

The checks require instruction-time freeze, explicit Start observation, active status, completion freeze, nonblank actual canvas rendering, correct success feedback and genuine elapsed wall time. Displayed simulation-time ranges are 1–3, 8–11, 4–6, 31–35 and 14–17 seconds respectively. The real siege observation is intentionally about 32 seconds; there is no near-complete fixture to shorten it.

**No runtime or engine prototype is modified in these natural cases.** There is no live-session hook, seeded lesson result, forced victory, clock patch, `fastForward`, speed-up control or direct simulation update. Read-only DOM status attributes, visible gold/time/feedback and actual canvas pixels provide browser evidence. They do not independently attribute each projectile or kill in the browser. The independent Node causality/parity tests provide that separate evidence; consult the training module/audit documentation and their actual results. Natural browser results cannot be claimed until this suite runs.

### Rejected actions and interruption

- An unavailable keyboard choice, Cancel, Escape, an off-site tap and a greater-than-eight-pixel canvas drag cannot spend practice gold. A subsequent correct independent action still works.
- Explicit pause freezes the observation. Manual and lifecycle pauses must describe the observation as paused and ask for resume, without a contradictory running message; each explicit resume must restore running feedback without stale paused text. The keyboard Space path checks the same feedback. Controlled blur/focus and hidden/visible events exercise the installed lifecycle handlers and require explicit resume. These lifecycle events are **synthetic adapters**, not evidence of native OS backgrounding. Simulation and the eventual lesson completion remain real-time.
- Native keyboard input chooses and places a building, activates Continue using Enter/Space, pauses/resumes with Space, reaches the lesson/site/navigation controls with Tab, and preserves the intended step-heading focus after transitions.
- Restart, lesson jumps, skipping all lessons, reload, browser Back/Forward and three interrupted round trips cannot award or mutate retained profile data. Review text must distinguish skipped/not-attempted lessons from completed ones.
- The shared browser fixture rejects uncaught page errors; the training extension also rejects browser console errors throughout these flows.

### Old gestures and fresh recovery

Two cases span real observation completion into `step-complete` and `lesson-complete`. They use native mouse or native CDP touch input, not dispatched click events.

The flowing footer can move when success feedback grows. Desktop mouse therefore begins on the actual Restart button, then releases at that same button's verified new center. Touch stays stationary on the stable Return link throughout the real transition; movement is not used to manufacture a browser-cancelled tap. Each release is checked against the actual live hit target. The stale gesture cannot retry or leave the newer step. Each case runs both with a compatibility-click observation delay and with **no delay before the first independent Retry**, so a blanket next-click shield cannot count as success.

A held Space begins and ends on the same unchanged Restart DOM button across a lesson-generation change. A newly selected build card makes a stray retry observable. The stale release must preserve that choice; the first fresh retry must still work. These tests supplement rather than replace the inherited historical held-touch regression, whose bytes are unchanged.

### Layout and offline route

Separate **320×568** and **844×390** cases require no horizontal overflow, nonzero battlefield/minimap geometry and all initial primary controls reachable by ordinary document scrolling and focus. Post-scroll/focus controls must be completely in the viewport and genuinely hit-testable; click/tap autoscroll is not used as proof. The build card and selected site's primary action are checked too. At 320px, ordinary build-card selection must leave the complete battlefield and selected card simultaneously in view and genuinely hit-testable; reaching and focusing the explicit site action must leave that action and the battlefield usable together too. The real UI’s scheduled sticky-position correction is allowed to settle before geometry is checked. These checks use current bounds, do not scroll during the assertion, and do not assume old map coordinates. These are reachable-control tests, not a claim that every action fits above the fold. Screenshots are attached when the suite actually runs.

The offline case explicitly installs the real current service worker in a fresh context, goes offline, and navigates directly to `training.html` with a query string. The document and all four training resources plus engine/renderer must come from the worker. The training title, lesson picker and absence of normal-game controls guard against accidentally returning `index.html`. Practice action/reload and Return to the normal game work offline while exact retained profile bytes remain unchanged.

## Retained gates and provenance

All prior test cases remain. Existing Battle Report assertions for truthful coverage, counters, scope, focus, one scroller, labels, exact displayed time and truthful downloads were not weakened. Their target-version wording now says 0.12. The frozen 0.10 UI-save continuation likewise targets the new candidate; its frozen QA baseline is not relabeled as production.

Service-worker update gates now target 0.12 and retain exact current-resource hashes, both original prior-version routes, offline fonts, Classic save preservation and new-map continuation. The current cache validator intentionally requires `training.html`, `training-app.js`, `training.css` and `training.js`, in addition to the existing report resources and fonts.

Earlier 0.10 and 0.11 evidence/documents remain historical records. They are not current browser execution results.

## Authorized runner handoff

1. Hold the targeted gate until transfer and browser/server execution are authorized. Use the final candidate, not an earlier work-in-progress copy. Verify the installed package is the pinned **1.65.0**.
2. Run `npm --prefix qa/browser run check` and `npm --prefix qa/browser run list`. Expect **720 instances / 180 logical cases / 12 files**, with **72 Guided practice instances** and no new skips.
3. Run the targeted training suite under all four profiles, then the full suite. For example, from `qa/browser`, `npx playwright test training.spec.mjs`, then `npm test`. Do not weaken gesture hit targets, real-time completion, byte equality, layout, focus or download assertions to fit counts.
4. Budget for the genuine normal-time training observations and the inherited native 2× Holdfast lifecycle. Retain HTML results, terminal/JSON totals, traces, screenshots and gesture/adapter annotations. Count passed, failed, skipped and not-run stages separately.
5. Repeat affected checks after any runtime or harness change. A syntax/fixture/discovery pass is not browser approval, release approval or publication permission.
