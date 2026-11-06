# v0.13 protected-objective toast gate

## Evidence

The exact second candidate `cfc7c87242473aad0c4b9ac0515c1aabf1b27eb2` finished the unchanged full Chromium matrix with **829 passed, 12 failed, 3 intentional skips**, and no flaky cases. All twelve failures were the same later assertion in three protected missions across four profiles. Selection and salvage passed; the subsequent saved-state checks did not run.

The assertion required feedback below the objective HUD. Passive browser measurements and screenshots instead showed the intended bottom objective dock with feedback safely inside the battlefield. Reported River Charter vertical bounds were:

- Phone: toast 345.75–376.75; field 72–470; objective 471–554.
- Landscape: toast 244.19–275.19; field 48–330; objective 331–390.
- Desktop: toast 178–220; field 78–495.42; objective 496.42–554.

These are browser-reported vertical measurements, not invented horizontal boxes or a claim of complete physical-device validation.

## Narrow repair

The test now requires an active, fully visible toast, positive finite rectangles, full containment inside both the visible viewport and battlefield, and at least seven CSS pixels of separation from the objective HUD and visible protected/navigation controls. Ancestor padding/client clipping and effective opacity are checked. Fractional border-adjusted bounds cap rounded client dimensions; unsupported transformed clipping frames are refused rather than assumed safe. The direction of the gap is not prescribed. Each passing case attaches its measured geometry.

The protected-salvage restrictions, actual paid-state changes, original-target survival, saved-state checks and campaign-progress invariants remain unchanged. No game runtime, test timeout, browser case count or skip was changed.

Pure geometry tests reject hidden/fading feedback, offscreen/clipped rectangles, sub-seven-pixel gaps, overlap, invalid bounds and missing data. Their supplied horizontal rectangles do not claim to be cloud measurements. Actual DOM/native visibility still requires the focused and full browser reruns.

## Gate

Final root suite: **825 passed, zero failed, one existing optional desktop-dependency skip**. All seven geometry tests and eight separate harness contracts pass. Runtime syntax/inventory, browser fixture checks and strict production-upgrade preflight pass. Independent read-only review found no blocking issue after verifying fractional bounds, inner overflow clipping, rounded client dimensions and unsupported-transform refusal. All forty-one game runtime files remain byte-identical to candidate2. The repaired twelve cases and entire 844-instance matrix remain unrun on this candidate. Nothing has been published.
