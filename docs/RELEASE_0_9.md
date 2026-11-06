# Release candidate 0.9: Roads less traveled

Local development candidate. Public release remains gated on the Long March Hard AI issue and exact-commit cloud browser verification. Native UI review is complete within the stated coverage. This document does not imply deployment.

## Implemented

- Three independently selectable skirmish maps: Classic, Long March and Twin Span. Difficulty remains a separate choice.
- Long March expands the world to 4000 units with three roads and the same 24 sites per side. The longer neutral crossing changes reinforcement travel without altering troop or income rules.
- Twin Span has two roads and exactly 16 legal sites/buildings per side. It concentrates the fronts and makes land investment more constrained.
- Classic simulation behavior and version-1 save shape are preserved, including historical off-grid structures, random sequence and adjacent floating-point AI boundary behavior.
- New maps use engine save version 2 with an exact known map/revision. Campaigns and trials remain Classic and reject nonclassic map envelopes. Existing stars and objectives are not migrated or reset.
- Rendering, minimap, camera, build snapping, AI coordinates, world bounds, Resume/history labels and portable backups follow the active map. Switching a map preserves theme but replaces the cached terrain.
- Five locally bundled, verified WOFF2 faces replace the remote font import. Full unabridged OFL notices are shipped and readable inside Preferences. Fonts add 128,336 bytes; the full standalone notice adds 10,269 bytes.

## Measured verification

The combined local suite passed **361 tests**, with no failures or skipped/TODO tests when optional desktop build dependencies were installed. Runtime syntax and existing browser-harness fixture checks also passed. An isolated source checkout intentionally skips the optional installed-desktop-tool compatibility test.

The engine's 68 dedicated gates include exact Classic whole-state comparison against frozen 0.8, all authored factories/deadlines, 560 legal building/site/side combinations, strict map saves, simultaneous different-map instances and complete new-map smoke runs. Twenty-four smoke games ended in 101.9–267.1 seconds with legal saves and exact economy ledgers. This is not a balance certification.

Thirteen renderer tests compare Classic terrain, frames, minimaps and portraits against frozen operation hashes. The current map alone retains base/themed terrain; old backing stores are released. This bounds known canvas allocation but is not a physical-device memory/performance measurement.

Sixteen map-backup cases plus 82 existing backup/persistence/profile cases passed. Seven old export/canonical-output byte-shape goldens remain exact. New-map mid-combat round trips, malformed geometry, authored-map mismatches, quota rollback and stale-tab profile protection are covered.

Three actual Resume-handler tests validate saved map labels/admission, refuse corrupted or authored nonclassic payloads without deleting bytes, and preserve the original campaign path. Three font tests verify exact official-source hashes, real WOFF2 headers, local CSS/cache references and complete accessible notice text.

Native review passed desktop, 390 × 650, 320 × 568 and 844 × 390 layouts. Long March and Twin Span selection, legal placement, occupied rejection without relocation, panning, minimap reach, save/reload/Resume, same-theme map switching and returning to Classic campaign terrain were checked. Map captions, narrow codex stats, live build-tray overflow cues, readable phase labels and full font-notice scrolling passed targeted retests. The initial pass sampled ordinary openings. A later complete Long March Hard match at 1×, using seven paid center-road barracks and no Rally, ended in defeat at 1:59: the concentrated center broke through, but ignored flanks won the race. Three barracks were placed by 0:18 rather than instantly. This one delayed, native-UI-mediated execution does not invalidate the scripted finding or establish human difficulty. No full Twin Span or physical-device test is claimed. See MAPS_FONTS_UI_QA.md.

The independent scripted balance audit completed 9,216 candidate games and 576 legacy replays with no observed save, ledger or geometry invariant errors. It performed 55,590 restore checks; all 576 Classic replay hashes matched the frozen baseline. It also found a material Long March Hard weakness: center-only forward barracks rush won 256/256 runs across consecutive and spread seed cohorts, whereas the south equivalent won 0/256. The isolated counter-response investigation is complete. Every prototype was rejected: the strongest rush counter weakened early economy pressure and pushed every tested AI mirror into overtime, while narrower fallbacks did not fix delayed rushes. The recommendation is to retain the validated baseline and record the fast opening as an advanced-play weakness, not to make Hard unbeatable by one script. No AI prototype has been integrated. See LONG_MARCH_AI_DIAGNOSIS.md. Normal scripted wins and successful mine repayment routes are diagnostic evidence, not certification of difficulty or the strategic value of every investment. See MAP_BALANCE_REVIEW.md.

The expanded cloud browser harness discovers 360 instances across four profiles, including three existing intentional skips. It includes real frozen-0.7-to-0.9 and frozen-0.8-to-0.9 service-worker updates, local fonts/notices offline, new-map saves/backups/controller paths and corrupted-data recovery. Syntax and fixture-hash checks passed locally; the full browser matrix still needs the exact private candidate commit in the authorized cloud environment.

## Limits and release gates

- New maps are straight-road geometry. They do not add obstruction, collisions, pathfinding bottlenecks, line of sight, terrain speed/damage effects or flying shortcuts.
- Campaign map adaptation, more mission content and new units require separate authored balance work.
- Long March Hard requires a reviewed AI correction or an explicit limited-release decision before public exposure. The current center-lane result is a real weakness, not a completed balance gate.
- Exact-commit cloud browser tests, including the real offline update and full backup/controller map flows, remain pending. Native functional UI review passed, but complete new-map play remains limited to one UI-mediated Long March match.
- Physical controllers, iOS/Android devices, Safari/Firefox, subjective audio listening and packaged desktop gameplay remain unverified.
- Desktop JSON export remains explicitly unsupported; no download or security permissions were weakened.
- No PvP, backend, account service, Steamworks integration, signing/notarization or storefront certification is claimed. The working title needs review before store branding.
