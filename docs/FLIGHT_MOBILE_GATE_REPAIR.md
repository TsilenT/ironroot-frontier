# Mobile safety and flight layer repair

Base: exact PR #2 head `46d324b94754fe88ed9d324456f284af0aa4537d`.

The complete two-worker gate passed 1,568 cases, failed 11 and intentionally skipped 49, with no timeouts. Focused checks passed 169, failed four and skipped three. Flight passed all 124 cases, production-v0.15 upgrades all 16, hidden hints all 20 and strict Pause layout all four. These successes do not replace the failed cases or their blocked downstream assertions.

The unchanged original report is retained in `qa/cloud-46d324b/Ironroot-PR2-46d324b-QA-report.json`. The extracted failure ledger and native evidence are in `qa/mobile-safety-repair/retained-failures.json`.

## Confirmed defects

- A 320×568 screen with top 12px/bottom 21px safe-area padding has only 535 usable vertical pixels. Selecting the tall layout from outer height leaves a 195px field, causing an avoidable safety pause that covers otherwise complete income text.
- The safety prompt is logically active above ordinary Pause, but its old z-index paints it underneath the inert Pause panel.
- At 320×370, pausing hides the hint card and automatic grid placement shifts the action controls. The paused layout can appear safe even though Resume restores a 44×24px Hide/minimap collision. The cloud native probe confirmed the resulting Resume/re-pause loop. The unsafe assertion must remain.
- Building pennants partly paint over direction arrows in crowded committed flight banners. Their rectangles were separated, but the painter order was not.

Three other failures occur before the legacy alternative-composition test opens the compact Build drawer. Repair that setup through the real UI, preserving every subsequent roster, paid-placement, hint, clock, Options and composition assertion.

## Scope and preservation

This repair is isolated from the frozen uploaded source and the separate writing branch. No writing changes are integrated while its PR action remains blocked. Keep the existing 212px field and 44px control requirements, full hint hiding, first paid barracks auto-start, input interruption, safe-area/zoom handling, saved-state identity and manual Resume semantics. No engine, balance, campaign formation, flight timing or profile protocol change is intended.

Keep the original 320×370 blocked state and 320×400 explicit recovery checks, supplementing them with stable repeated HUD measurements and sustained play after recovery. The exact revised candidate needs native review and its own full cloud gate before a merge or release decision.

## Local implementation checks

The combined repair passes 1,251 Node tests with zero failures and one optional desktop-tooling skip. All runtime modules parse, the 49-file runtime inventory passes, and all browser fixture preflights pass. Browser discovery lists 1,640 cases in 37 files using the local discovery adapter only; these are not browser execution results. Existing changed browser specs retain all skip/fixme/deadline declarations and all 177 original assertion fragments.

The actual-app geometry tests cover padding-only changes, inset startup and desktop-to-mobile entry, stable repeated checks, manual holds, the exact short-screen block/recovery, and negative old-source mutations. Painter-order tests execute Renderer.draw and demonstrate that 16 congested label cases fail against the previous runtime and pass after the two-pass layer repair. Paths remain beneath actors, full labels paint above pennants, and objective/protected overlays retain their final priority.

Native review and the next exact-source cloud gate are tracked separately; no local result alone authorizes publication. The independent writing branch remains outside this snapshot.

## Bounded native review

Native Chromium confirmed that dynamic safe-area padding at 320×568 selects the compact layout without a resize nudge, leaves a 200×383 field and keeps income and controls visible. The 320×370 case remains genuinely blocked with an exact held save; 320×400 recovery stays paused until one explicit Resume, then runs from 00:03 to 00:26 without re-pausing. The safety prompt is visibly above the inert ordinary Pause panel.

Declared crowded-flight checkpoints at 390×650 and 844×390 show all full-size direction/countdown labels above actor pennants. These are geometry/layer evidence, not gameplay balance claims. Details, source hashes and cleanup verification belong to MOBILE_SAFETY_REPAIR_NATIVE_QA.md. Physical devices and the exact revised cloud matrix remain outside this local pass.
