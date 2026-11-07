# Feature delivery and branch disposition

As of 7 November 2026. A passing simulation or a branch is not a shipped feature.

## Live v0.16.0

Source merge: `2094b5fb71755ddd37677ae65d5b3d1438487366`. Public commit: `e19de4357ac70ff8760e8acd5882216ac3e50df5`. The exact 49-file browser build is at https://ironroot.stevets.ai/.

- Campaign starts with three required teaching battles: one, two, then three roads. Victories grow the usable building roster from two to five to eight, with no unlock-bypass toggle.
- The Rootwarden joins the second teaching battle and remains available in later new campaign attempts. Old saves and restarts keep their original rules and roster.
- Campaign-first navigation presents a focused briefing, with Story and Chapter routes, visible plain objectives, expandable rules/scouting and optional star replays.
- The first fresh Roadside Watch stays paused until a real paid barracks placement starts combat. Later optional lessons retain explicit planning controls; hiding hints does not start them.
- Income remains visible beside gold on portrait layouts. Hide removes the whole hint banner and returns its space to the field, leaving Show and any required teaching Resume control.
- Successful construction finishes the build order and closes the mobile drawer. Mouse Shift repeats while affordable; failed placement spends nothing and keeps the order.
- Owned gryphon aeries can direct future launches to one adjacent road in fresh skirmishes and new High Pass-and-later campaign attempts. Flights warn for two seconds, cannot attack while crossing, and remain vulnerable to anti-air fire. Existing airborne routes do not change.
- Flight arrows, countdowns, minimap markers, accessible aerie controls and a read-only Pause summary expose those orders. Old saved attempts and restarts retain their original no-crossing identity.
- Unified pause/options/restart and finite browser Back/Forward navigation preserve save ownership. Back closes a menu level or pauses/checkpoints combat; Forward never auto-resumes, and root navigation can leave normally.
- Visible-viewport sizing, middle-mouse pan, scoped right-click cancellation, optional fullscreen, combat poses, protected-building health/warnings, offline play, backups and local reports remain available.

The exact released source passed **1,280 Node tests / one optional skip** and **1,611 Chromium cases / zero failures / 49 intentional exclusions**. The focused reload gate included the original failure and delayed-response recovery cases. The merged tree is byte-identical to the tested source; merged CI and deployment passed. Live smoke covered old-save migration, Back/save/reload, first-barracks automatic start, portrait income and Hide/Show hints. These results do not certify physical phones, installed PWAs, hardware controllers, non-Chromium browsers or the desktop package.

## PRs closed by consolidation

- PR #1 combat feedback and objective warnings shipped in an earlier release.
- PRs #3 and #4 desktop controls and phone sizing shipped in v0.14.1.
- PRs #5–7 pause/options, campaign navigation and teaching were adapted together in PR #8, preserving their ancestry, and shipped in v0.15.
- PR #2 now contains the reviewed production flight implementation and shipped in v0.16, together with income, first-build teaching, hidden-hint and recovery fixes. The older automatic-crossing prototype was not substituted for the production engine.
- Redundant branch names can be removed after ancestry/dependency checks; their reachable commits remain available.

## Active integration: PR #9 player copy

The writing branch at `c359d325080fd07261f5fa92a73cac7ae2680e61` is being reconciled with released v0.16. It varies campaign dialogue, coaching, practice feedback and guide prose without changing mechanics or making every instruction longer. Complete mobile prompts and first-build instructions are part of the review. The branch's earlier tests are historical evidence, not a pass for this integrated candidate. PR #9 stays draft until the combined changes are checked.

## Explicitly unmerged or deferred

- **Longer music:** 64-bar experiment has technical PCM checks but no actual listening assessment. Not selected for release yet.
- **AI expansion and balance:** experiments remain unmerged. Current AI reacts to committed flight destinations but does not issue flight orders or buy Warden lodges. Concentrated barracks remain strong in synthetic benchmarks; better results against one opening would not establish overall difficulty or fun.
- **Optional two-of-three objective routes:** prototype only, not part of the current campaign.
- **Fixed automatic lane crossings:** first prototype not selected; player-directed orders are the shipped replacement.
- **Native desktop/Steam readiness:** packaging, device/input coverage, accessibility and store/business requirements remain open. The game is not advertised as Steam-ready.
- **Network PvP:** not implemented.

Historical candidate reports remain as evidence of failed and passed stages. This file and README describe current disposition rather than overwriting those records.
