# Latest feedback in the next flight candidate

This local copy starts from uploaded PR #2 commit `598925cbfea60acc734513d05dc14eeafe80a57d`. It adds the separately reviewed portrait-income and first-paid-barracks changes without altering that uploaded candidate or its completed gate.

Three overlaps were reconciled explicitly: app teaching controls keep both the first-build hold and capability-aware flight lesson, mobile test contexts retain both sets of dependencies, and browser preflight runs the union of checks. The flight engine, rules, campaign identities, profile protocol and visual modules remain unchanged. Source review found no blocking lost change; 54 focused checks passed.

The combined local aggregate passed 1,169 tests with one optional desktop-tooling skip, zero failures. Syntax, runtime inventory and all fixture preflights passed. Discovery lists 1,604 browser instances in 35 files; discovery uses the available 1.57 adapter and is not a browser pass. Exact cloud 1.65 execution remains required.

The isolated user-feedback patch has native evidence in INCOME_FIRST_BUILD_NATIVE_QA.md. Its income, actual paid auto-start, normal pause and save/reload passed in responsive viewports, but it is not a native test of this exact combined app. Its attempted off-road invalid click snapped legally, so that rejection branch is not claimed as native-tested. Physical devices and synthetic safe areas remain open.

Hold this copy until the current flight gate is categorized. Incorporate any real findings in one next candidate, then capture with a new exact manifest. Do not merge or publish from this local validation alone.

## Additional feedback and review repairs in progress

The user subsequently asked Hide hints to remove the entire banner instead of replacing it with hidden-status text. The local implementation now collapses that row, clears its live region and retains compact Show plus any necessary teaching Start/Resume controls. The existing per-attempt hint default and save format are unchanged. Short portrait retains its safe side navigation while reclaiming the banner height. See hidden-hints-behavior.md and the independent native report when complete.

The earlier 1,169 aggregate is a historical checkpoint before this addition, not validation of the current worktree. The first-build/income/flight-transition focused set has subsequently passed 22 cases; the hint-specific and existing coaching set passed 56. Final combined aggregate and browser execution remain required.

Initial exact uploaded flight review also found an inspector-reopening setup error, an enabled-before-focus race, minor short-screen clipping and overlapping flight signals. See FLIGHT_GATE_TRIAGE.md. Transition test repairs keep all subsequent exact state, cost, RNG and save assertions and retain the 100% visibility requirement. Runtime visual/layout repairs are being reviewed separately. No result here overrides the completed old-candidate full cloud gate or authorizes a release.

The combined local checkpoint after hint collapse, two compact-label repairs, flight-label separation and retained browser-contract repairs passed **1,194 Node tests**, with **one optional desktop-tooling skip** and no failures. All runtime syntax, 49-file inventory and browser fixture preflights passed. Browser discovery lists **1,624 cases in 36 files**, using the local 1.57 adapter only; this is not browser execution. Exact runtime hashes and limits are in FLIGHT_FEEDBACK_REPAIR_LOCAL_VALIDATION.json. The completed old-candidate gate is now accounted for in FLIGHT_FULL_GATE_RECONCILIATION.md. Final layout review and a new exact-source gate are still required before release.

The independent native hint review is complete in `docs/hidden-hints-native-qa.md`. It verified full banner collapse and recovered 44/88/88/64px at the four requested viewports, reachable Show/focus, paid first-build auto-start, manual Resume and Pause/Options. Two clipped compact labels were corrected and rechecked using actual text bounds. The isolated preview later crashed with Chromium Error 9 during the separate final storage-verification click. The immediately preceding comparison and earlier complete hashes were unchanged, but no post-crash hash was available. Preview/tab/fixture cleanup completed. This limitation is retained; it is not a clean final-session or physical-device certification.

## Consolidated capture checkpoint

After the complete 62-failure report was reconciled, the final source passed **1,221 Node tests**, with **one optional desktop-tooling skip**, plus syntax, runtime inventory and all browser fixture checks. Discovery lists **1,628 cases in 37 files**, not executed locally. The unchanged engine, rules, campaign, controller and profile hashes are recorded in FLIGHT_FEEDBACK_FINAL_LOCAL_VALIDATION.json.

The final independent native pass verified the paid North control at 320×430, initial Pause/Restart at 320×568, ordinary paid Wings flight transit, and separated NEXT/warning/transit labels on portrait and landscape. The closer-label geometry is explicitly authored and frozen; it is not presented as a live match. The all-key shared profile hash matched, the review tab closed, and no crash occurred in this bounded pass. See FLIGHT_REPAIR_NATIVE_QA.md. The earlier hint-review crash remains recorded above.

Capture the exact source into the existing PR #2 and run the full two-worker gate before a release decision. No old failure has been erased, and no pending browser execution is counted as passed.
