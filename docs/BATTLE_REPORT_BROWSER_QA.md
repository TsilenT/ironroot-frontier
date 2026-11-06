# Ironroot 0.11 Battle Report browser gates

## Status and execution boundary

Candidate: `/workspace/shared/ironroot-v011`, version **0.11.0**.

**Automated Playwright execution remains pending in a separately authorized cloud runner.** This harness work launched no browser or HTTP server locally. No external source transfer, commit, hosting change, dependency change, or publication was performed. Fixture checks and discovery do not establish browser, accessibility, gameplay, performance, or balance success.

Completed locally:

- `npm --prefix qa/browser run check`: all syntax checks and fixture validators passed, including 10 new synthetic report positions, read-only journal/export checks and exact frozen-0.10 compatibility hashes.
- Test discovery using the already installed **Playwright 1.57.0**, discovery only: **648 instances / 162 logical cases / 11 spec files**, across all four existing profiles: phone, narrow-phone, landscape and desktop.
- The new `battle-report.spec.mjs` contributes **96 instances / 24 logical cases**, with **no new skips**.
- All **248 files** listed in `BASELINE_0_10.json` were checked against the original `/workspace/shared/ironroot-v010` and remained identical.
- The original held-gesture regression block, from `resultGestureOverlap` through the end of `campaign.spec.mjs`, remains byte-identical and has no skips.

The package and lockfile retain **@playwright/test 1.65.0**. The older installed package was used only through a temporary import shim for discovery, removed immediately afterward. No dependencies or browsers were installed. Discovery source locations may be affected by the inherited transform cache; file/case/project names and counts are authoritative for this evidence, and the actual runner must generate its own report.

Evidence:

- `qa/browser/evidence/0.11-fixture-validation.txt`
- `qa/browser/evidence/0.11-discovery-playwright-1.57.txt`
- `qa/browser/evidence/0.11-harness-integrity.json`

There remain **3 intentional inherited runtime skips**, from the 390px coordinate-specific selection-panel test on the other three profiles. A clean full execution would be **645 passed / 3 skipped / 0 failed**, not 648 passed. Currently **0 automated Playwright instances have been executed for 0.11 by this harness**. Separate native UI observations are documented in `BATTLE_REPORT_UI_QA.md`; they are not a Playwright run and do not count toward the totals above.

## New browser coverage

All cases are configured for all four existing Chromium profiles. No test directly accesses a private live game global or invokes private application handlers.

### Actual observed lifecycle

A fresh Holdfast trial starts through the real title controls, builds and upgrades an archery range through native controls, pauses to inspect the genuine save, resumes, and selects the public 2× speed control. Live animation frames, combat and the authored 140-second deadline determine the terminal result. No clock fast-forward, injected victory or simulation-time mutation is used in this case.

The test allows 90 seconds for the result, within a 110-second case timeout. It verifies a full-from-start report, more than three observations, authored initial composition, the real additional building placement, preserved cumulative counters and a genuine native JSON download. It accepts either legitimate terminal result. This is lifecycle coverage, not human-play strategy or balance evidence.

### Explicit synthetic persisted outcome matrix

Ten separate cases restore engine-valid **synthetic** positions through normal saved-game UI:

1. Campaign primary objective success at exactly 0:00, with no engine winner and a single observation.
2. Campaign alternate enemy-citadel success while primary targets remain alive.
3. Campaign deadline failure.
4. Expanded-map campaign protected-target failure.
5. Trial primary target success at a floating-point time just below 40 seconds. Main UI and report show the same whole second, while JSON retains the exact simulation time.
6. Trial alternate enemy-citadel success.
7. Trial deadline failure.
8. Skirmish victory.
9. Skirmish defeat.
10. Skirmish draw.

Skirmish fixtures retain `winner: null` and conclude on the actual next engine tick, rather than inserting an already-ended, non-resumable save. All fixtures are restored and independently evaluated by the existing public engine/objective APIs before browser use. Synthetic fixtures are never described as human-played wins or proof of balance.

Native downloaded JSON is parsed and checked for exact format/version, context/map, primary/alternate/draw outcome, first/final snapshots, actual observation times, monotonic retained samples, 256-point limit and sampling metadata. Full-match engine counters deliberately differ from current living composition. Every matrix case verifies the original counters, honest resumed coverage in both UI and JSON, no invented pre-resume timeline and unchanged profile bytes after download. The file is rejected by both save and backup parsers and contains no engine save, profile, settings, history or replay payload.

### Result navigation, native input and layout

- Initial result focus remains on Continue/Retry while report details and download stay collapsed/hidden.
- Keyboard Enter and Space use native disclosure behavior, including nested sample details. Space does not pause the battlefield underneath.
- Tab remains trapped in the result and does not visit a download button inside closed details. Existing result focus regressions now include the added summary in the real tab order without dropping the Inspect or trap assertions.
- Simulated standard Gamepad API input exercises actual application focus/navigation, native summary activation and access to Continue and Inspect. No application controller handlers are replaced.
- At **320×568** and **844×390**, `#resultBody` is the single vertical scroller. Report content has natural height, no inner maximum height and no nested vertical scroll region; sample tables can still scroll horizontally. All three fixed-footer actions remain fully visible and genuinely hit-testable at the result body's top and bottom, without letting Playwright scroll the actions into view to hide a defect. Their rectangles remain fixed. The metric tables' You/Enemy labels must occupy one unbroken line and fit their cells. Screenshots of both scroll extremes are attached during actual execution.
- Opening the main report aligns its summary at the top of the result body without changing the selected keyboard focus or scrolling the outer page. Opening nested sample details preserves its own summary focus and the current result-body scroll position rather than incorrectly realigning the main report.
- The plain **Battle totals** heading and its full-match counters appear before recording coverage. The existing coverage, limitations and full-precision JSON assertions remain strict. The report's displayed seconds use the same near-integer tolerance as the main result UI.
- Reopening the same completed result three times returns identical downloaded report data, preserves stars/history/profile bytes and records **zero native localStorage write attempts**. Reopen correctly focuses the open report summary rather than rerunning result awards.
- Starting another battle clears old report access. Reload clears the ephemeral report, while history and backups remain ordinary unchanged formats without a report payload.

### Failure behavior and truthful downloads

The app starts a local download on the explicit download button; it does not show an additional confirmation. The success-path message says only **“Report download started. Check your browser’s downloads to keep it.”** It does not assert delivery or that a file was saved.

- Chromium's native denied-download path is exercised with page-scoped CDP download denial. The native download must report failure, while the page may still truthfully say “started”; it must never claim saved, completed, successful or delivered. Native Save As cancellation is not observable by page JavaScript, so the harness does not demand an invented cancellation acknowledgment.
- A narrowly scoped throwing `URL.createObjectURL` adapter verifies the unavailable-download path: no native file, no “started” or success message, unchanged storage and available primary result action.
- Separate module-response faults at journal initialization and later sampling verify that detailed-report failure leaves the genuine result title, time, existing kills/buildings totals, awards and history intact. Only the observer entry point is faulted. Normal outcome code remains real.

### Offline and actual old-save continuation

- A real current service worker is installed. The context goes offline, reload comes from the worker, and `battle-report.js`, `report-view.js` and `report-view.css` must load from it. A resumed synthetic result renders and downloads while offline.
- The real frozen **0.10 QA runtime** starts a Twin Span game through its own UI, builds a range, saves and exits. The current 0.11 UI then resumes that actual old save with unchanged schema, map, layout and counters. Only after that continuation check is the saved position explicitly transformed into a synthetic near-terminal position to finish quickly and verify partial report coverage.
- `fixtures/0.10.0-qa-baseline-dist/` contains **26 exact runtime files**, checked against the frozen original and pinned in `fixtures/0.10.0-qa-baseline-sha256.json`. This is a QA baseline, **not a production/released 0.10 artifact**. The fixed QA-only same-origin route is `/__qa_legacy/0.10.0/`; it is not a production route.

## Retained gates and provenance

The production 0.7 fixture, frozen 0.8 fixture and frozen 0.9 QA-baseline fixture/manifests remain unchanged. Their provenance distinctions are preserved. Both existing service-worker transition tests now target 0.11, still hash every installed current shell resource offline, preserve Classic progress and exercise new-map play/save/resume and bundled fonts. The fixture validator explicitly requires all three new report resources in the current cache.

The earlier `CAMPAIGN_EXPANSION_BROWSER_QA.md` and 0.10 evidence remain historical records. Current release counts and pending browser status are given here.

## Authorized runner handoff

1. Use the complete final candidate only after transfer/execution is authorized. Verify the pinned browser package reports **1.65.0**.
2. Run `npm --prefix qa/browser run check`, then `npm --prefix qa/browser run list`. Expected: **648 instances / 162 logical cases / 11 files**, including 96 Battle Report instances.
3. Run the full `npm --prefix qa/browser test` under all four existing profiles. Do not weaken failing input, layout, storage or download assertions to match counts. Budget for the real-time Holdfast lifecycle; it intentionally does not mock the game clock.
4. Retain the HTML report, terminal/JSON totals, failure traces/screenshots, report layout screenshots and existing held-gesture annotations. Report actual passed/failed/skipped/unrun stages separately.
5. Re-run affected checks after any further runtime, presentation, data or harness edits. A green local fixture/discovery check is not a browser pass or publication approval.
