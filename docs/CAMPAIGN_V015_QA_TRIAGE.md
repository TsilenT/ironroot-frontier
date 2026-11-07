# v0.15 combined campaign gate and follow-up

## Original tested candidate

PR #8 head `9342331450b4e631b70fe96b8238ffb6fb207cdf` was tested without source changes. The full Chromium matrix completed in 40m41s: **1,050 passed, 113 failed, 33 intentional profile-specific skips**, with zero flaky results. Root validation passed **973 tests with one optional dependency skip**. The failure reports and 113 traces remain in the cloud review task; this document does not claim they passed after repair.

Successful original coverage includes progression 24/24, campaign navigation 28/28, restart identity 24/24, responsive viewport 64/64, profile migration 64/64, and historical/offline/production upgrade suites 32/32. The full ordinary-speed paid third mission and two-star replay passed on desktop and landscape. Eight separately retained portrait runs using native minimap navigation passed, including the full paid route/replay at 390px and 320px. Original failed runs were not replaced.

## Diagnosed test preconditions

| Failures | Cause | Repair contract |
| --- | --- | --- |
| 76 | Shared synthetic current-profile fixture still used profile protocol 3, while startup correctly migrated it to 4. | Pin the current fixture to 4. Validate exact marker, epoch and five domain bytes, with zero startup writes. Retain historical protocol migration fixtures and tests unchanged. Battle save version 3 is unrelated and remains unchanged. |
| 16 | Full-roster Field Guide cases ran against the fresh two-unit campaign. | Explicitly select legacy Field trials for the original five-unit arithmetic/portrait/layout checks. Add independent fresh two-unit scope coverage. |
| 8 | Portrait coaching helper clicked forward sites outside the viewport, e.g. x441 on a 390px screen. | Use native minimap navigation. Observe the actual trusted activation coordinate, calculate the clamped camera, and require the subsequent point to be on the canvas and hit-testable. Keep every paid-state, roster, result and persistence assertion. |
| 8 | Stale-tab import and fresh restart setup clicked the inert Pause control beneath the intentional teaching dialog. | Explicitly choose Start in those non-teaching scenarios, preserving all import, ownership and identity assertions. Teaching tests continue to exercise the hold separately. |
| 4 | New campaign launch clicked the removed/hidden introduction-skip route. | Explicitly select returning-player Emberwatch revision 2 and retain Classic versus remembered Long March checks. Add a separate historical revision-1 resume case. |
| 1 | The desktop right-click test sent Escape, which reached the app and opened Pause, then clicked its inert HUD control. | Observe whether the trusted Escape reaches the document or is consumed by the native menu; assert the appropriate paused state before inspecting unchanged building count. |

These repairs do not remove downstream assertions that the original cases failed to reach. They require a new browser execution before approval.

## New user feedback included in the same follow-up

The user requested ending placement after a successful build, with Shift-repeat for desktop input, and persistent mobile tutorial guidance. Work is isolated from the tested PR head. Default one-shot placement, failed-placement correction, teaching visibility and viewport budgets must be reviewed together before updating the PR.

The original candidate already showed the opening teaching modal and froze time, troops, gold and saves on both portrait profiles. Cloud review found that at 320×568 the “Start battle now” button was below the initial dialog view. Separately, source review confirms the ongoing guidance and Resume control live inside the mobile command drawer, which hides after selecting a building. Both accessibility and visibility points are included in the new review.

## Limits

No original gate is relabeled as green. No new runtime change is certified by the old passing results. Chromium emulation and responsive native-browser checks are not physical phone/PWA, Safari, Firefox, controller-hardware or desktop-package certification. Merge and publication remain gated on the revised source.

## Combined source review checkpoint

The follow-up now includes paid one-shot building, explicit mouse+Shift repeat, persistent mobile teaching outside Build, pinned initial teaching actions, resumed hints without a new pause, and an optional fullscreen entry on the mission/title screen. Fullscreen is requested only by explicit activation; installed app view and unsupported/denied requests retain an honest windowed fallback. Essential gold and health remain visible. Browser and OS bars are not promised hidden.

An independent read-only review found no actionable source defect in these pieces and executed 58 focused Node tests successfully. The reviewed runtime hashes are recorded in `qa/campaign-v015-followup/feedback-source-review.sha256`. Back navigation was not yet included in that checkpoint, so final combined review and browser execution remain required.

The managed native preview passed paid one-shot planning at 320×568 and 740×320 with visible guidance and frozen time. A subsequent renderer error 9 stopped the remaining matrix. Those results predate the resumed-hint and fullscreen additions and are not a final-source pass; see `BUILD_TEACHING_NATIVE_QA.md`. An intermediate full Node run also ended one whole combat-feedback test child without assertion detail. Its eight cases passed independently; the interrupted aggregate is retained rather than treated as green. A new complete aggregate will be recorded after Back integration.

## Browser Back integration and adversarial findings

A finite namespaced History API stack now gives Story, Chapter, Mission, nested menus and the retained battle their actual parents. Back dismisses a visible inspector/drawer/dialog first; unobstructed combat pauses and checkpoints. Forward can reopen safe menus but cannot resume, restart or restore an old attempt. Recovery/profile fences, unsafe viewport holds and newer-tab save ownership keep their existing vetoes. Root Back is allowed to leave the page; there is no endless guard stack.

Independent review reproduced two issues before final freeze: a report opened from the title could leave both return screens hidden, and repeated Back → Forward → Resume grew duplicate pause entries. Both are fixed. The reviewer reran the production-handler reproductions: title is visible after leaving the old report; five cycles keep history length at four, then Back pauses and the following Back reaches title. All 35 focused navigation cases passed. The merged Back/teaching/build/fullscreen handler check subsequently passed 86 cases.

These are Node/source checks. `qa/browser/back-navigation.spec.mjs` contains 25 prepared real History API cases across four profiles. Native browser execution, actual Android hardware/gesture Back, installed PWA lifecycle and fullscreen/OS control interaction remain outstanding on this final combined source. See `BACK_NAVIGATION.md` for the finite exit and failed-storage limits.

## Final local source freeze

The final merged source passed **1,044 Node tests, zero failures, one existing optional desktop-tooling skip** (1,045 discovered), using four concurrent test files and the TAP reporter. Runtime syntax, the 46-file offline inventory and the complete browser fixture/static preflight passed. Independent final integration review reran **93 focused cases** successfully and found no source integration blocker. Final source hashes and logs live under `qa/campaign-v015-followup/`.

This is approval to freeze and upload the revised PR for cloud browser QA, not merge or deploy. The original failed browser gate and the earlier interrupted local aggregate remain recorded. None of the new prepared native-browser cases is relabeled as executed.
