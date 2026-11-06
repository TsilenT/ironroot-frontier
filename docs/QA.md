# Validation record

This is a living development record, not a claim of release readiness.

## Automated engine checks

`npm test` currently exercises economy/placement, production, ranged and counter damage, caps, ownership, upgrades/refunds, spells, AI spending, deterministic updates, victory, invalid inputs, economy limits, siege/tower interaction, round-trip persistence, corrupted save rejection, transient bounds, simultaneous combat, wizard ground splash, air immunity, anti-air, flying structure damage, actual core convergence and defensive fire.

## Independent balance review

A separate reviewer ran hundreds of complete deterministic matches with scripted policies. It found a dominant forward-barracks opening against all initial difficulty levels. AI opening and threat response were revised, then rerun. Hard stopped folding to that policy. The expanded wizard/flying roster is under further adaptive-policy review. Early match lengths were too short for meaningful economy investments; citadel HP/defensive fire were added and are being evaluated.

Synthetic policies are diagnostic probes, not human playtest results or a competitive-balance certification.

## Browser review

Managed preview verified in Chromium at `http://127.0.0.1:4173/`. Welcome, all seven build cards, gameplay entry, HUD and pause interactions render. Original battlefield art and responsive controls are undergoing a separate live UI/game-feel review, including narrow and landscape iframe fixtures. Temporary QA fixtures must not ship.

## Open release concerns

- Validate final economy pacing and AI roster usage with new units.
- Finish narrow/landscape and lifecycle reviews, then retest fixes.
- Validate maximum-cap rendering on representative low-powered mobile hardware; cloud desktop performance alone is insufficient.
- Full accessibility, broader human playtests, controller and storefront packaging remain future work.


## Iteration 0.4

Added five authored field trials with distinct destruction, anti-air, siege, economic deadline and survival objectives. Their normal Game state is serialized separately from a validated challenge ID in the UI envelope. Completion and best times stay on the browser/device.

The combined suite now has 48 tests: 33 core simulation, 11 challenge and 4 static web/accessibility/offline-shell contracts. The challenge suite includes 20 successful seeded strategy runs, five idle failures and four deliberately inappropriate compositions.

Independent UI review found a cross-mode selection bug: starting a challenge overwrote the selected skirmish difficulty while its displayed radio-like selection stayed unchanged. Fixed by keeping selected skirmish difficulty independent of the active trial. Further challenge lifecycle review is underway.

Core fairness was strengthened after an independent mirrored-army test exposed sequential movement bias. All movement and damage now commit simultaneously. After the fix, mirrored armies produced 49/51 results over 100 seeded runs, and matched-timing native AI produced 61/59 over 120. These are screening results, not proof of complete competitive fairness.

At the 140-troop cap over 2,400 ticks, the simulation benchmark measured mean 0.465 ms/tick, p95 1.877 ms and p99 3.224 ms on the cloud executor. Retained heap after GC increased about 0.69 MB. Fifty full sessions and 116 restore checkpoints preserved valid numbers and unique IDs. Rendering/device performance is a separate unverified gate.

## Iteration 0.5

Added adaptive original music and distinct synthesized cues, independently controlled music/effects/volume, bounded VFX, reduced-motion/quality settings, and readable battle history. Independent Chromium review covered persisted settings, focus containment, native Space on controls, pause restoration, visible magic/siege/Rally effects, and 320×568 and 844×390 layouts. See `SETTINGS_VFX_UI_QA.md` and `AUDIO.md` for exact coverage. Audio PCM/clipping was measured; no subjective listening or real iOS claim is made.

An independent cloud review reproduced storage-write loss, malformed-history crashes, native-Space interception and siege bonus leakage into troop splash. Each was fixed and regression-tested. A synthetic-touch issue that immediately closed newly opened building details was fixed using deferred panel display and explicit close activation. Cloud browser validation of source a502451 with two test-only field-guide access corrections reported 81 passed, 0 failed, 3 skipped. This is a tested v0.5 baseline, not an automatic pass for later source.

Selectively integrated cloud AI spending/counter improvements while preserving newer combat fixes. Nine AI regressions pass. In fresh screening matches normal improved against the earlier AI, but still lost to a forward-infantry rush policy; balance is not solved.

## Iteration 0.6

Integrated a 12-mission, four-chapter campaign with branched unlocks, 36 optional stars, protected objectives, exact deadline evaluation, original dialogue and appearance-only terrain themes. The wider campaign sweep recorded 288/288 successful reference/mastery clears and 143/144 three-star mastery runs across 12 seeds; all authored-seed three-star routes pass. These policies prove content feasibility, not player difficulty or enjoyment.

Outer battle envelopes now use version 2 and retain campaign identity outside engine state, while supporting earlier engine and version-1 saves. Invalid saved bytes are retained with a visible warning rather than silently deleted. Objective steps stop at completion/deadline even at 2× battle speed. The current automated suite has 109 passing tests, with all runtime JavaScript syntax checks passing.

Independent actual-browser campaign review is in progress. Initial locked-mission gating, launch/HUD, save/reload/resume, Emberwatch victory, three-star persistence and Continue unlock have passed. A result-dialog initial-focus defect was found and is queued for correction. Final release status must be updated after the review and cloud regression rerun, not inferred from these initial passes.

The campaign browser review additionally found two concrete issues before release: short-landscape campaign briefings had only 10 px of usable scroll height when Resume was shown, and an old paused tab could overwrite a newer tab's save during visibility/beforeunload handling. These are tracked as required fixes, alongside the result-focus timing edge case. A paused test tab was closed to isolate continued review.

Required fixes were implemented: short-landscape campaign content now reserves a usable viewport (review measured 244 px); result dialogs prevent backdrop blur and repair late input focus; battle writes use optimistic ownership checks so stale tabs cannot overwrite or delete a newer save; repeated identical paused saves do not rewrite storage; campaign progress merges the latest valid record before writes. Browser retest verified old-tab Resume redirects to title and closing it preserves the newer Stonegate save. This reduces observed cross-tab conflicts, not a claim that localStorage offers atomic multi-tab transactions.

The reviewer also completed Winter Stores through normal paid UI actions, earned three stars, verified branching High Pass unlocks and visually checked the snowy/rocky chapter treatment. See `CAMPAIGN_UI_QA.md` for exact scenarios and remaining limits. The final suite has 186 passing tests, 0 skipped/TODO. This includes private, unintegrated controller/backup foundations intended for the next release; no controller hardware or backup UI support is claimed for 0.6.

## Iteration 0.7 candidate

Controller and portable-backup UI were integrated, then independently audited before public release. Audits reproduced and fixed unaffordable bumper dead ends, spending before the takeover cursor appeared, async file-preview races, incomplete-rollback session loss, stale-tab reintroduction of intentionally replaced records, and lost dirty-progress warnings when storage was unreadable. A guarded profile session now distinguishes ready/restoring/failed markers and preserves recovery state. See `BACKUPS.md`, `CONTROLLER.md` and `BACKUP_CONTROLLER_UI_QA.md` for exact behavior and coverage.

Final local candidate: 229 tests passed, no skips/TODO, syntax green. Responsive normal UI and real export passed; manual import was interrupted by a browser chooser timeout and is not counted as verified. The expanded 188-instance cloud browser matrix is pending on the corrected candidate. Public remains 0.6 until that gate is reviewed.
