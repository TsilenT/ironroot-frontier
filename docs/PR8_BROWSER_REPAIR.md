# PR8 full-gate repair

This local repair starts from revised PR8 head `9aebcfd2dd3a2f5ff442f31860489366ce644ca0`. The frozen source and separate flight integration remain untouched. It is a corrective update to the same PR, not a new feature branch or public release.

## Exact failed gate

The completed cloud run on that head recorded **1,330 passed, 32 failed and 46 intentional profile exclusions**, with no flaky cases. It used a documented QA-server correction while leaving runtime and assertions unchanged. The four runtime failure groups were 12 short protected-phone cases, 12 teaching text-containment cases, four title Options focus cases and four practice return-history cases. Downstream assertions in those tests must still execute on the repaired head.

## Fixes

1. **Options Back focus.** The real dialog handoff restored the Options opener, but the history handler then rebuilt the same campaign page and focused its heading. Dismissing a layer over an unchanged title page now preserves that page and its opener. Actual Story/Chapter/Mission navigation still focuses its heading. No battle is resumed or reconstructed.
2. **Teaching text ink containment.** A phone probe measured a 15px line box whose text ink started 1px above its scrolling owner. A 1px vertical inset fixes that clipping without reducing font size or loosening native character-containment assertions.
3. **Short protected portrait.** The additional teaching rail left only 182px of battlefield at 320×430. The unchanged 212px safety guard correctly refused to resume. Short coached portrait now puts the existing navigation controls in a 104px side rail, leaving a 216×278px field, full-width teaching and full-width protected names/HP. Targets stay at least44px. At 320×400 the248px field and rail also fit; at320×370 the rail collides with teaching controls and remains safely paused. Full-size, landscape, uncoached and genuinely unsafe layouts retain their contracts.
4. **Practice document history.** Returning from the separate optional practice page previously inserted synthetic Story/Chapter entries ahead of the real prior document. A same-origin, exact sibling practice referrer now suppresses only that initial artificial ancestry. The current mission selection stays visible; one Back returns to practice, and subsequent Options/battle menus still have their finite parents. Direct game loads retain campaign ancestry. No storage, URL flag, save or practice mutation is introduced. Missing referrers retain normal finite navigation, and new-tab behavior remains browser-dependent.
5. **QA server missing-file crash.** Missing `/favicon.ico` caused success headers to be sent before a failing read, then a second404 write crashed the server. The server now reads before committing200headers. Routes/path safeguards remain unchanged. This is test hosting, not production behavior.

## Regression integrity

- The production-focus test fails before repair with `campaignMissionTitle` rather than `welcomeSettings`. Source tests execute actual routing and focus-handoff bodies with explicit DOM/layout fixtures.
- A negative control removing the initial-history boundary fix fails four new history cases; three unrelated direct-load/classification cases still pass. New cases retain storage bytes and do not replace the old repeated practice browser test.
- Existing real-browser scenarios and assertions are byte-unchanged. Two source-derived Node fixtures had encoded the faulty short-height allocation. They now explicitly require safe430/400geometry and retain pause/frozen-game/explicit-recovery assertions at genuinely unsafe370geometry. The212px minimum and collision checks are unchanged.
- New browser companions cover short safe-area and resize geometry, complete text, actual center hits, drawer and toast bounds, running time, and practice Back/Forward/Options/reload boundaries. They are prepared cases, not locally executed browser evidence.
- Independent source reviews cover title focus/holds, server paths, practice return and short-layout cascade. See their separate reports for exact scope and limitations.
- An overlapping aggregate run reported a file-level combat-feedback worker failure without an assertion; it is retained as a failed/incomplete run, not a pass. That unchanged file passed8/8 alone, and an independent aggregate also passed. The final serially coordinated aggregate is recorded separately.

## Boundaries and final checks

Only `dist/app.js`, `dist/menu-history.js` and `dist/styles.css` change production behavior. Engine, roster, authored scenarios, save schema, profile protocol, audio and cache identity are unchanged. Version0.15 is still unreleased. The final source manifest and `qa/pr8-browser-repair/root-final.tap` record exact aggregate counts/hashes.

The earlier local native renderer repeatedly crashed during an unrelated flight review. No browser-security workaround or new native browser launch was used for this repair. The exact repaired-head cloud gate must rerun all four failure groups and their previously unreached downstream assertions, then the full matrix, before merge/release. Physical devices, installed PWA, OS Back and non-Chromium remain unverified.

## Final local aggregate

The coordinated final source run passes **1,069 tests, zero failures, one existing optional desktop-tooling skip** (1,070 discovered). Runtime syntax, the46-file runtime inventory, and complete browser syntax/fixture/harness preflight pass. All29 existing browser spec files are byte-identical to the failed cloud head; two new companion files add coverage. These checks are local source evidence, not a repaired browser-gate pass.
