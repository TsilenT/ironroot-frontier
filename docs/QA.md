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
