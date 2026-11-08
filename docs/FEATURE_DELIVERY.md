# Feature delivery and branch disposition

As of 8 November 2026 (UTC). A passing simulation or a branch is not a shipped feature.

## Live v0.20.2

Released source merge: `0cdd1f5f3ff35c538c36b6cfe30848b2cfb632e7` ([PR #19](https://github.com/TsilenT/ironroot-frontier/pull/19)). Public commit: `f2ad682fa35aec7c5f1cbbea9b2d10b94d931399`. The browser build is at https://ironroot.stevets.ai/. All 54 published runtime files match that source; the public repository adds only deployment metadata. The cache is `ironroot-v0.20.2` and the profile protocol is 11.

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

### Follow-ups now shipped

- **Battle keyboard controls (PRs #11–12, v0.17.1–0.17.2):** twelve shortcuts can be changed, cleared or restored in Options. Build slots follow the active roster; optional Guided Practice keeps its default keys and storage isolation. The follow-up fixes remapping-button contrast.
- **Ashen Crossroads (PR #13, v0.18.0):** an optional Field Trial with a two-of-three-position objective, outside the campaign. See [ASHEN_CROSSROADS.md](ASHEN_CROSSROADS.md).
- **Restart and finale navigation (PR #15, v0.18.1):** mission/trial Restart and failed Retry return to the briefing for explicit Begin. Skirmish Restart remains immediate; finale routes preserve progress. See [RESTART_BRIEFING.md](RESTART_BRIEFING.md).
- **Persistent bridge income (PR #16, v0.19.0):** an experimental Skirmish option, off by default. Ground troops capture; ownership lingers after they leave, while opponents contest income. See [BRIDGE_CONTROL.md](BRIDGE_CONTROL.md).
- **Citadel choices (PRs #17–18, v0.20.0–0.20.1):** eligible Campaign, Field Trial and Skirmish attempts offer one 190-gold Extra Arrow or Regeneration choice. PR #18 removed the original 90-second wait. Regeneration still has an eight-second damage-recovery delay and does not heal instantly. Guided Practice is excluded. See [CITADEL_CHOICES.md](CITADEL_CHOICES.md) and [CITADEL_IMMEDIATE_PURCHASE.md](CITADEL_IMMEDIATE_PURCHASE.md).
- **First-barracks Volley guard (PR #19, v0.20.2):** Volley cannot replace the required barracks order during forced teaching. A successful paid placement restores ordinary Volley. This narrow guard does not include the held compact-toolbar PR #14. See [TUTORIAL_SPELL_GUARD.md](TUTORIAL_SPELL_GUARD.md).

The v0.20.2 source gate recorded 1,523 Node passes and one optional tooling skip, 195 focused checks and an independent 19-case review. Head CI, merged CI and Pages deployment passed. Live desktop checks covered the forced first-barracks guard, invalid/paid placement, an actual Volley cast, save/reload and retained progress/settings/history. This is not a new full browser-matrix pass.

Live smoke was desktop. Earlier portrait checks were emulated source QA, not physical-phone evidence. These results do not certify physical phones, installed PWAs, hardware controllers, non-Chromium browsers or the desktop package.

### Historical v0.16.0 evidence

The historical v0.16 release used source merge `2094b5fb71755ddd37677ae65d5b3d1438487366` and public commit `e19de4357ac70ff8760e8acd5882216ac3e50df5`, with 49 runtime files and tested tree `ec5bd8832d89cee83bc8c8bfbd19cb577f2692dc`. It introduced manual flight orders, warning/countdown presentation and read-only route summaries; v0.17 replaces that interface with automatic nearby-enemy behavior.

That released source passed **1,280 Node tests / one optional skip** and **1,611 Chromium cases / zero failures / 49 intentional exclusions**. The focused reload gate included the original failure and delayed-response recovery cases. Its merged tree was byte-identical to the tested source; merged CI and deployment passed. Desktop live smoke covered old-save migration, Back/save/reload and first-barracks automatic start. Portrait income and Hide/Show hints had emulated source QA. These historical counts are not validation counts for the current release.

## PRs closed by consolidation

- PR #1 combat feedback and objective warnings shipped in an earlier release.
- PRs #3 and #4 desktop controls and phone sizing shipped in v0.14.1.
- PRs #5–7 pause/options, campaign navigation and teaching were adapted together in PR #8, preserving their ancestry, and shipped in v0.15.
- PR #2 now contains the reviewed production flight implementation and shipped in v0.16, together with income, first-build teaching, hidden-hint and recovery fixes. The older automatic-crossing prototype was not substituted for the production engine.
- Redundant branch names can be removed after ancestry/dependency checks; their reachable commits remain available.

## Merged follow-up history

Automatic flyers and PR #9 prose shipped in v0.17. The writing-only head `477d529f28da56873ed6461da7a1277c08d349bf` previously passed 1,298 Node and 511 focused browser checks with 13 intentional exclusions; those remain historical stage results, not a separate deployment. [AUTOMATIC_AIR_INTEGRATION.md](AUTOMATIC_AIR_INTEGRATION.md) retains earlier candidate evidence, including its then-pending checks.

PR #10 merged at `3548031a3e8d8e04c7b81784d6c0fe174b1522fe`. Its opt-in deterministic tests do not change runtime behavior and did not create a game release.

The former keyboard candidate is merged and shipped, as listed above. Full keyboard-only battlefield placement, gamepad remapping and Steam certification remain outside that increment.

## Explicitly unmerged or deferred

- **Longer music:** the 64-bar experiment has technical PCM checks but no completed listening assessment. Review is underway; it is not selected for release yet.
- **Optional fog:** a local prototype/integration is under review, intended as a default-off Skirmish option. It is not shipped; mobile, performance and fairness acceptance remain open.
- **AI expansion and balance:** earlier selected economy/rush patches are incorporated. Recent support/reserve/ranged-first/tower experiments were rejected without a production change. Broad AI replacement is not selected; a better synthetic result against one opening would not establish overall difficulty or fun.
- **Compact mobile Volley ([PR #14](https://github.com/TsilenT/ironroot-frontier/pull/14)):** the only open feature PR at this audit, still draft at `cc51c38dacc7f6bfb42d3cf891c09d9997903267`. Its exact CI is green, but two recorded strict pre-Resume history-length failures remain unresolved and later assertions were not reached. It is based on v0.18.1 and must be reconciled with current main and revalidated before release. The shipped tutorial guard is separate.
- **Citadel research:** the +600-HP reinforcement experiment was not selected. The separate shot/regen/arrows research informed the shipped Extra Arrow/Regeneration choices, but its QA-only branch is retained as evidence, not a pending runtime merge. A Stronger Shot alternative was not selected.
- **Manual and fixed lane routing:** manual controls were removed in shipped v0.17, following the player’s clarified intent. Fixed-gateway and forced-return prototypes are not selected.
- **Native desktop/Steam readiness:** packaging, device/input coverage, accessibility and store/business requirements remain open. The game is not advertised as Steam-ready.
- **Network PvP:** not implemented.

## Branch cleanup

On 8 November, the eight fully merged branches for PRs #9, #11, #12, #15, #16, #17, #18 and #19 were removed after verifying zero unique commits and no active dependency. Their commits and PR history remain reachable from main.

Earlier non-ancestor AI, copy, onboarding and browser-harness branches contain selected/adapted work or superseded QA evidence; their branch presence does not mean those features are still waiting to ship. They were preserved, along with the music and citadel research branches and PR #14. No unmerged work was deleted.

Historical candidate reports remain as evidence of failed and passed stages. This file and README describe current disposition rather than overwriting those records.
