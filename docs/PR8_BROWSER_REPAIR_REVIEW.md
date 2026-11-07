> Historical scoped review: this report covers the initial Options-focus, teaching-ink and QA-server repair only. The later complete batch also changes practice history and short-screen layout; see PRACTICE_HISTORY_REVIEW.md, SHORT_COACH_GEOMETRY_REVIEW.md and the final validation manifest for those checks. Recorded hashes/counts below describe the earlier review point.

# PR8 browser repair review

## Verdict

**No blocking code findings in this bounded repair.** The title dismissal fix preserves the existing safety gates and delegates focus to the production dialog handoff. The compact text change does not enlarge the reserved rail. The QA server fix delays successful headers until the file read succeeds.

This is a source/Node review, **not a native-browser pass or release approval**. The exact repaired-source cloud gate remains required, including the previously unreached Forward assertions and native text containment across all four browser profiles. No browser, listener, publication or runtime edit was performed for this review.

## Scope and findings

Compared the repair directory with the frozen `ironroot-placement-teaching-next` directory supplied as PR8 head `9aebcfd2dd3a2f5ff442f31860489366ce644ca0`. The directories are snapshots, not Git checkouts; remote identity was supplied by the parent rather than independently queried here.

- **Navigation (`dist/app.js:3605–3616`):** The shortcut requires an unstarted game, a visible title, a distinct active layer, the same mode and the same relevant campaign page/selection. It cannot intercept active-battle save/return, stale-attempt handling or real Mission → Chapter → Story changes. Input retirement and `closeNavigationLayers()` still execute first. `hideSettings()` continues to veto recovery/profile dismissal, and the real `syncDialogs()` still owns inert state, opener restoration and safety precedence. No new resume, import, checkpoint write or game reconstruction is added.
- **Repeated navigation:** Existing history code is unchanged. Supplemental queued Back → Forward → Back probes preserve the actual Options opener, game bytes, stored data and history length in all three modes. Multi-level jumps from mission Options to Chapter or Story still focus the correct heading. Title-level recovery/profile holds also remain visible and disabled through Back/Forward.
- **Compact coach (`dist/styles.css:3913–3920`):** Global border-box sizing keeps the added 1px vertical padding inside the existing 100%-height scroller. Reserved 88/64/44px teaching rails, grid allocation, 44px controls, font sizes and line heights are unchanged. The source-derived negative control reproduces the reported top clip, and the inset contains the modeled three-line range, including short portrait. Native wrapping, glyph measurements and scroll-to-bottom containment still require the cloud gate; the modeled test does not establish those results.
- **QA server (`qa/browser/server.mjs:56–57`):** A missing or rejected read can now return one 404 before success headers exist. The handler's routes, path resolution/containment check, update-session operations and method branches are byte-for-byte unchanged. Differential probes confirmed identical successful-file behavior for 26 normal, fixture, update-session, method and traversal-shaped requests. This repair does not tighten existing root-route method policy or change Node's native HEAD behavior.
- **Assertions:** Existing browser scenarios and assertions are unchanged in the directory comparison. The added focus regression uses the actual `syncDialogs()` function with explicit fixture geometry/default-focus substitutes. That is materially stronger source coverage, but still not native focus evidence.

## Validation performed

- Independently ran `node --test` on `menu-navigation-app`, `menu-history`, `mobile-coach-text-inset`, `qa-server-response`, `campaign-teaching-integration` and `phone-browser-evidence`: **86 passed, 0 failed, 0 skipped**.
- Independently ran QA-server syntax validation: passed.
- Ran **11 supplemental in-memory probes** using the real-focus application harness: title recovery/profile holds in three modes, queued Back/Forward in three modes, and two campaign multi-level jumps. All passed. These probes changed no repository file.
- Ran **26 differential QA-handler probes** against frozen and repaired handler source, with identical results. The dedicated missing-file/delayed-failure regressions also passed above.
- Recomputed `inspectRuntime('dist')` and matched the complete recorded final runtime inventory/hashes exactly. Inspected the existing full-suite result: **1,057 passed, 1 optional skip**, and the recorded syntax/browser-preflight results. The full suite and aggregate browser preflight were not independently rerun for this review.
- Read the captured before-repair focus failure: campaign Options returned to `campaignMissionTitle` instead of `welcomeSettings`. No native run was launched to work around the reported renderer failure.

## Files reviewed

Changed implementation/tests: `dist/app.js`, `dist/styles.css`, `qa/browser/server.mjs`, `tests/menu-navigation-app.test.mjs`, `tests/mobile-coach-text-inset.test.mjs`, `tests/qa-server-response.test.mjs`.

Supporting source/contracts: `dist/menu-history.js`, `tests/menu-history-fixture.mjs`, `tests/mobile-layout-fixture.mjs`, `qa/browser/back-navigation.spec.mjs`, `qa/browser/mobile-coaching-visibility.spec.mjs`, `scripts/check.mjs`, `scripts/verify-runtime.mjs`, root and browser `package.json` files.

Context/evidence: `README.md`, `WORK_BASE.json`, `docs/BACK_NAVIGATION.md`, `docs/PR8_BROWSER_REPAIR.md`, `docs/PR8_TEXT_AND_QA_SERVER_REPAIR.md`, and `qa/pr8-browser-repair/{focus-before.tap,focus-after.tap,root-final.tap,browser-preflight-final.log,syntax-final.log,runtime-final.json}`.

Reviewed production/host SHA-256 identities:

- `dist/app.js`: `d454238ffb93541b6d8fbb687f3e624b9887ba5d5c053f3a56509c174138b979`
- `dist/styles.css`: `2db642b25579b1f4029114d20abbee26151fc7d8edbe5639944c2d41f8207103`
- `qa/browser/server.mjs`: `08537c6baec849194d7f5f693bc2f6c4999e724173c846cde28e00dfa71d2d8e`
