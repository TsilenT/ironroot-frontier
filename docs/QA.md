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
