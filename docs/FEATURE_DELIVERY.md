# Feature delivery and branch disposition

As of 7 November 2026. A passing simulation or a branch is not a shipped feature.

## Live v0.17.0

Source merge: `342d8b594091d323f2c0e92d9a170de0fcbdc2b9`. Public commit: `b2d3cbb550b929a8813c0a251fb6792bfcc4d59f`. The browser build is at https://ironroot.stevets.ai/.

- Campaign starts with three required teaching battles: one, two, then three roads. Victories grow the usable building roster from two to five to eight, with no unlock-bypass toggle.
- The Rootwarden joins the second teaching battle and remains available in later new campaign attempts. Old saves and restarts keep their original rules and roster.
- Campaign-first navigation presents a focused briefing, with Story and Chapter routes, visible plain objectives, expandable rules/scouting and optional star replays.
- The first fresh Roadside Watch stays paused until a real paid barracks placement starts combat. Later optional lessons retain explicit planning controls; hiding hints does not start them.
- Income remains visible beside gold on portrait layouts. Hide removes the whole hint banner and returns its space to the field, leaving Show and any required teaching Resume control.
- Successful construction finishes the build order and closes the mobile drawer. Mouse Shift repeats while affordable; failed placement spends nothing and keeps the order.
- Gryphons automatically approach nearby enemies on their road or an adjacent road. Successive encounters can carry them across roads; nearby archers and towers can counter them. Fresh campaign, skirmish, trials and practice use this behavior. Manual routing controls, gateways, crossing countdowns and forced returns are removed.
- PR #9's dialogue, coaching and practice prose is shipped with the automatic-flyer integration.
- Unified pause/options/restart and finite browser Back/Forward navigation preserve save ownership. Back closes a menu level or pauses/checkpoints combat; Forward never auto-resumes, and root navigation can leave normally.
- Visible-viewport sizing, middle-mouse pan, scoped right-click cancellation, optional fullscreen, combat poses, protected-building health/warnings, offline play, backups and local reports remain available.

Live smoke was desktop. Portrait checks were emulated source QA, not physical-phone evidence. These results do not certify physical phones, installed PWAs, hardware controllers, non-Chromium browsers or the desktop package.

### Historical v0.16.0 evidence

The preceding release used source merge `2094b5fb71755ddd37677ae65d5b3d1438487366` and public commit `e19de4357ac70ff8760e8acd5882216ac3e50df5`, with 49 runtime files and tested tree `ec5bd8832d89cee83bc8c8bfbd19cb577f2692dc`. It introduced manual flight orders, warning/countdown presentation and read-only route summaries; v0.17 replaces that interface with automatic nearby-enemy behavior.

That released source passed **1,280 Node tests / one optional skip** and **1,611 Chromium cases / zero failures / 49 intentional exclusions**. The focused reload gate included the original failure and delayed-response recovery cases. Its merged tree was byte-identical to the tested source; merged CI and deployment passed. Desktop live smoke covered old-save migration, Back/save/reload and first-barracks automatic start. Portrait income and Hide/Show hints had emulated source QA. These historical counts are not validation counts for the current keyboard candidate.

## PRs closed by consolidation

- PR #1 combat feedback and objective warnings shipped in an earlier release.
- PRs #3 and #4 desktop controls and phone sizing shipped in v0.14.1.
- PRs #5–7 pause/options, campaign navigation and teaching were adapted together in PR #8, preserving their ancestry, and shipped in v0.15.
- PR #2 now contains the reviewed production flight implementation and shipped in v0.16, together with income, first-build teaching, hidden-hint and recovery fixes. The older automatic-crossing prototype was not substituted for the production engine.
- Redundant branch names can be removed after ancestry/dependency checks; their reachable commits remain available.

## Merged follow-up and current candidate

Automatic flyers and PR #9 prose shipped in v0.17. The writing-only head `477d529f28da56873ed6461da7a1277c08d349bf` previously passed 1,298 Node and 511 focused browser checks with 13 intentional exclusions; those remain historical stage results, not a separate deployment. [AUTOMATIC_AIR_INTEGRATION.md](AUTOMATIC_AIR_INTEGRATION.md) retains earlier candidate evidence, including its then-pending checks.

PR #10 merged at `3548031a3e8d8e04c7b81784d6c0fe174b1522fe`. Its opt-in deterministic tests do not change runtime behavior and did not create a game release.

The **v0.17.1 Battle keyboard controls candidate is unmerged and not deployed**. It adds bounded shortcut remapping, clearing and defaults in existing Options, safer native/browser input handling and validated backup persistence. Profile protocol 7 prevents older clients reconstructing only six preference fields from erasing the new map. Build shortcuts retain roster-slot semantics and earned unlocks; optional guided practice retains defaults and storage isolation. Full keyboard-only battlefield placement, gamepad remapping and Steam certification are outside this increment.

## Explicitly unmerged or deferred

- **Longer music:** 64-bar experiment has technical PCM checks but no actual listening assessment. Not selected for release yet.
- **AI expansion and balance:** earlier selected economy/rush patches are incorporated. Recent support/reserve/ranged-first/tower experiments were rejected without a production change. Broad AI replacement is not selected; a better synthetic result against one opening would not establish overall difficulty or fun.
- **Optional two-of-three objective routes:** prototype only, not part of the current campaign.
- **Manual and fixed lane routing:** manual controls were removed in shipped v0.17, following the player’s clarified intent. Fixed-gateway and forced-return prototypes are not selected.
- **Native desktop/Steam readiness:** packaging, device/input coverage, accessibility and store/business requirements remain open. The game is not advertised as Steam-ready.
- **Network PvP:** not implemented.

Historical candidate reports remain as evidence of failed and passed stages. This file and README describe current disposition rather than overwriting those records.
