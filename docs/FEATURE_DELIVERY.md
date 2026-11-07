# Feature delivery and branch disposition

As of 7 November 2026. A passing simulation or a branch is not a shipped feature.

## Live v0.15.0

Source merge: `f26b88106bed3d4932f5bf086cf21d5da18b5923`. Public commit: `3728e479b747cd360c01f154b1af94ab93fa421f`. The 46-file browser build is at https://ironroot.stevets.ai/.

- Campaign starts with three required teaching battles: one, two, then three roads. The usable building roster grows from two to five to eight through victories. There is no unlock-bypass toggle in these new battles.
- The Rootwarden and Warden lodge join the second teaching battle and remain available in later new campaign attempts. Old saves and restarts retain their original rules and rosters.
- Campaign-first navigation presents the current mission, with Story and Chapter routes. Plain objectives stay visible; detailed rules and scouting expand on request. Stars are optional, and partial-star victories can be replayed.
- Optional paused coaching uses the real build bar and gold. Mobile instructions remain outside the closed Build drawer; hiding hints does not start combat.
- Successful construction finishes the build order and leaves the mobile drawer closed. Mouse Shift repeats while affordable; failed placement does not spend gold or clear the order.
- Unified pause/options/restart and finite browser Back/Forward navigation preserve save ownership. Back closes a menu level or pauses/checkpoints battle; Forward never auto-resumes. Root navigation can leave normally.
- Earlier phone sizing, middle-mouse camera drag, scoped right-click cancellation, optional fullscreen, combat poses and protected-building health/warnings are retained.
- Existing art, short procedural score, AI difficulties, three skirmish maps, field trials, backup/offline support and local reports remain available.
- Gryphons in this live release still **do not change roads**.

The exact source passed 1,072 Node tests with one optional tooling skip and 1,386 Chromium cases with zero failures and 46 intentional profile exclusions. All formerly blocked downstream checks executed. The merged tree is identical. Live smoke verified old stars/save migration, paid building, paused teaching and Back/save/reload. This does not certify physical phones, installed PWAs, hardware controllers, non-Chromium browsers or the desktop package.

## PRs closed by consolidation

- PR #1 combat feedback and objective warnings: merged and shipped in an earlier release.
- PRs #3 and #4 desktop controls and phone sizing: merged and shipped in v0.14.1.
- PRs #5, #6 and #7 pause/options, campaign navigation and teaching: adapted together in PR #8, with original ancestry retained. All four PRs are now merged, and their combined behavior shipped in v0.15.
- Merged branch names can be removed after ancestry/dependency checks. Removing a redundant name does not erase the reachable commits.

## Active next gameplay integration: flight

PR #2 contains the player-directed crossing prototype. It remains separate while its mechanics are adapted to the current production engine and reconciled with every released PR #8 repair. This local v0.16 work includes:

- Owned-aerie Hold or adjacent-road orders for future launches only.
- Two-second gateway warnings, crossing at normal speed without attacks, and ordinary anti-air interception. Crossing abandons support on the original road and is not always beneficial.
- Battlefield/minimap signals, accessible inspector controls and a read-only Air routes view in Pause.
- New High Pass-and-later campaign attempts use an explicit revision 3; old active attempts/restarts keep their original no-crossing rules. Profile protocol 5 fences older current clients.
- AI reacts to committed launched destinations, not hidden orders. Enemy producers still use Hold; tactical enemy flight planning is not claimed.

The earlier frozen flight work has extensive deterministic combat/save tests and retained adverse outcomes, but its native browser review was incomplete. The reconciled source needs its own exact combined gate. Do not merge the old prototype engine or call flight shipped before that review and release.

## Explicitly unmerged or deferred

- **Longer music:** 64-bar experiment has technical PCM checks but no actual listening assessment. Not selected for release yet.
- **Specialist AI:** experiments remain unmerged. Better performance against one rush does not establish good overall difficulty or fun.
- **Optional two-of-three objective routes:** prototype only, not part of the current campaign.
- **Fixed automatic lane crossings:** first prototype not selected; player orders are the active replacement.
- **Native desktop/Steam readiness:** packaging, device/input coverage, accessibility and store/business requirements remain open. The game is not advertised as Steam-ready.
- **Network PvP:** not implemented.

Historical candidate reports remain as evidence of failed and passed stages. This file and README describe current disposition rather than overwriting those records.
