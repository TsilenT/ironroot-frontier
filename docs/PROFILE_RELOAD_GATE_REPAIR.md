# Profile Reload gate repair

This is unreleased v0.16 work in the existing flight PR #2. Live remains v0.15. The baseline is exact `d0f43c26748ff6e92d2cb96a5af7b364c9f404fe`; neither it nor the public build was edited.

## Retained gate result

The baseline passed 1,251 Node tests with one optional desktop-tooling skip. Its full Chromium gate passed 1,590 cases, failed one, and intentionally skipped 49. The 44 focused mobile repairs, all 11 former failures, 124 flight cases, and 16 actual-v0.15 upgrades passed.

The remaining narrow-phone stale-challenges backup test completed a native Reload tap, then its document request failed with `net::ERR_ABORTED`. The new document and final welcome/no-saved-battle/five-domain equality assertions did not run. The last pre-tap storage read showed the expected empty replacement profile; there is no evidence of profile resurrection or data loss.

Four subsequent instrumented runs passed without a recorded competing traversal near Reload. Their unload-console capture was incomplete. Those passes do not overwrite the failed gate or prove its cause. The complete report is preserved separately; `qa/profile-reload-repair/retained-failure.json` retains the failed case, request details, source identity, and bounded-repeat analysis.

## Independently established defect

The old Reload handler changed `started` to false before the browser left. That shortened the retained menu trail. A later menu synchronization could then issue `history.go(-1)` while the document reload was pending. Source-derived tests using the real history module reproduce this sequence for campaign and field trials; the unchanged checks fail against the old app.

A separately scheduled cloud diagnostic also reproduced the sequence in all four cases when only the Reload response was held: two requested 250 ms and two requested 750 ms. Native `history.go(-1)` occurred 112–209 ms after Reload, before `ERR_ABORTED`, same-document navigation and popstate. All four holds were cancelled before release, so post-reload assertions remained unrun. This confirms the slow-response interaction under a scheduling intervention. It does not prove that the same sequence caused the original uncontrolled failure. Final diagnostic measurements and repaired-browser results must be recorded separately.

## Repair and safety boundary

The app keeps the retained attempt and dirty-progress state while paused until actual departure. The existing profile-replacement gate is established immediately, including when an imported checkpoint has identical battle bytes. Otherwise, Cancel followed by Done could briefly resume that old attempt before the periodic profile check.

No timer, new history latch, storage format, engine rule, layout, or input classification is added. Real pagehide still owns the departure marker. Explicit Reload can be tried again if the browser stays on the old document, and finite Back navigation remains usable. A synchronous native Reload exception and a persisted return clear the existing unload-warning exemption.

The old source-order assertion requiring premature `started = false` was replaced by a narrower explicit-reload/paused-profile contract and stronger behavioral checks. Existing browser cases, deadlines, and exclusions remain unchanged. New cases separately cover an ordinary response, a deliberately held response, and an intentional first-request abort with safe recovery.

## Validation limits

Local source and deterministic tests are not native network/unload proof. The new exact source must pass the original recovery case and its downstream assertions, the added diagnostics, and its required combined browser gate before merge or deployment. Physical phones, installed PWAs, hardware controllers, non-Chromium browsers, and subjective music quality remain unverified.
