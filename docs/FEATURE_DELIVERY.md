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

PR #2 now contains the production adaptation of player-directed crossings, with the prototype and released PR #8 ancestry retained. Its first uploaded v0.16 integration head was `598925cbfea60acc734513d05dc14eeafe80a57d`. Flight remains unshipped while the exact combined browser gate is repaired. This work includes:

- Owned-aerie Hold or adjacent-road orders for future launches only.
- Two-second gateway warnings, crossing at normal speed without attacks, and ordinary anti-air interception. Crossing abandons support on the original road and is not always beneficial.
- Battlefield/minimap signals, accessible inspector controls and a read-only Air routes view in Pause.
- New High Pass-and-later campaign attempts use an explicit revision 3; old active attempts/restarts keep their original no-crossing rules. Profile protocol 5 fences older current clients.
- AI reacts to committed launched destinations, not hidden orders. Enemy producers still use Hold; tactical enemy flight planning is not claimed.

The first combined flight gate passed 1,468 browser cases, failed 62 and intentionally excluded 46; actual-v0.15 upgrades passed all 16 cases. It exposed clipped controls, pause layout and overlapping flight labels, alongside stale test contracts and scheduler-sensitive input/oracles. Original failures and downstream checks are retained in FLIGHT_FULL_GATE_RECONCILIATION.md. The next source must pass its own exact gate. The subsequent exact `46d324b` gate passed 1,568, failed 11 and intentionally skipped 49, with zero timeouts; it confirmed the inset-income safety interruption and 370px Resume/re-pause loop. All 11 then passed in exact `d0f43c2`, along with all 124 flight and 16 actual-v0.15 upgrade cases; the complete gate still failed one narrow-phone profile Reload (`1,590 passed / 1 failed / 49 skipped`). Four instrumented repeats passed but did not erase that failure. The next local repair preserves the retained paused menu ancestry during Reload and immediately fences an imported profile, with additional slow-response and aborted-navigation checks. The original failure and all downstream assertions remain retained, and the new exact source still requires its own browser gate. Do not merge the old prototype engine or call flight shipped before review and release.

## Latest user feedback, in the next candidate only

The next flight candidate also carries readable inline portrait income, a direct first-build lesson that starts only after paying for its barracks, and complete hint-banner hiding with a compact Show control. Other lessons and saved attempts retain their existing rules. Bounded native review verified paid automatic start, full banner-space recovery and readable compact labels; its later preview crash is preserved as a limit in hidden-hints-native-qa.md. These fixes are not yet live and do not replace the exact combined cloud gate. The final local count and source hashes belong to the next capture manifest, not the earlier candidate reports.

## Explicitly unmerged or deferred

- **Longer music:** 64-bar experiment has technical PCM checks but no actual listening assessment. Not selected for release yet.
- **Specialist AI:** experiments remain unmerged. Better performance against one rush does not establish good overall difficulty or fun.
- **Optional two-of-three objective routes:** prototype only, not part of the current campaign.
- **Fixed automatic lane crossings:** first prototype not selected; player orders are the active replacement.
- **Native desktop/Steam readiness:** packaging, device/input coverage, accessibility and store/business requirements remain open. The game is not advertised as Steam-ready.
- **Network PvP:** not implemented.

Historical candidate reports remain as evidence of failed and passed stages. This file and README describe current disposition rather than overwriting those records.
