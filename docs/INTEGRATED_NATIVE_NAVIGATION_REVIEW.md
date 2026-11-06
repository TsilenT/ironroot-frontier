# Integrated campaign/navigation native review

Date: 6 November 2026 UTC. Reviewed the frozen private preview copy, not production.

## Result

**The bounded combined native gate passes. No blocking defect was observed in the sampled flows.** Campaign-first entry, the one/two-road introduction, paid shared construction, honest optional stars, actual Replay/Continue actions, mobile protected objectives, classic/new save continuation, the Rootwarden roster, field-trial failure/retry, and profile restoration all behaved as expected.

This is not a full campaign, balance, physical-device, accessibility, cross-browser, or release certification. The exact limits are listed below.

## Reviewed bytes and method

- Preview: `http://127.0.0.1:4173/`, served from `/workspace/shared/ironroot-integration-preview/dist` by the managed local preview.
- Freeze: 41 runtime files, 788,320 bytes. `source-freeze.json` pins every file.
- `app.js`: `e5a8b10e3dbf8ee2113957c599f389013211ae2291761b1f79b943c56fbea178`
- `battle-codec.js`: `c32c04cea84844b46ca6ffffd534fe89cb45a8b28308eae06ad3cc1fde35f522`
- Native Chromium pointer/keyboard actions through CUA, with screenshots and accessibility observations. No game-state evaluation or modification, free resources, forced outcomes, injected unlocks, custom server/browser launch, backup file chooser, original-source edits, commit, or publication.
- The temporary preview-only `__qa_profile.html` provided visible all-key profile capture/restore controls and fixed-size iframe viewports. Its viewport selector alone used the documented UI select API after the child dialog reclaimed native selector focus. Game actions remained normal pointer/keyboard actions.
- Viewports sampled: desktop 1000×680, 320×480, 390×650, 844×390; 568×300 for the undersize hold. These are CSS iframe dimensions, not physical touch, device emulation, browser zoom, visualViewport, or native safe-area evidence.
- Screenshots are named `01-...png` through `28-...png` in this directory. The report contains no raw saved-profile values.

## Campaign entry and first-use impression

The retained profile opened on Campaign and recommended Chapter 2 rather than requiring an introduction replay. Its 3/16 missions and 9/48 stars remained separate from the optional introduction's 0/2 missions and 0/6 stars. Chapter 1 retained its three three-star records. Winter Stores was legitimately available; no progression was injected.

A disposable fresh profile opened on The First Roads, with First Watch ready, Forked Road locked, and the main campaign still 0/16 and 0/48. The introduction did not add to the legacy totals. The visible Go straight to the campaign action later selected unlocked Emberwatch immediately. After both introductions were completed, a full reload recommended Emberwatch while retaining 2/2 introduction missions and 4/6 stars.

At 320×480 the title's briefing is in a scrollable region. I scrolled to read Rowan's visible “Put a barracks on the road. The warriors will take it from there.” On the untouched battle screen, the single gold-outlined Build button was an obvious next action. I opened it without a missed action. The same normal drawer then highlighted Barracks and said to choose a green site. The hidden coaching text itself was **not a blocker** in this sample. This is an informed reviewer's first-use impression, not a naive-player usability study. The short title viewport does require scrolling to see the briefing; no permanent battlefield overlay is recommended from this observation.

Evidence: `01-retained-campaign.png`, `08-first-watch-mobile-briefing.png`, `09-first-watch-untouched-320.png`, `10-first-watch-shared-drawer.png`, `13-continue-recommends-forked-road.png`.

## Real introduction results, replay, and continuation

### First Watch at 320×480

- One visible road; no starting player buildings; 420 starting gold and +5/sec.
- The regular Barracks card displayed 140 gold. Three real barracks were placed on legal sites, without archery or other purchases. First placement occurred after the initial reading/selection period; the observed selection screen was at 00:22 and the completed opening was paused at 00:39.
- Normal card selection closed the drawer and exposed placement sites; Cancel returned to Build. The game produced and moved troops normally.
- Save & return, helper reload, and Resume restored First Watch at 00:39. The displayed gold moved from 198 before exit to 199 after the brief resumed interval. The three paid buildings were retained. Resuming exposed the full seven-building legacy roster while continuing to suggest archery.
- The ordinary warrior-only route won at **01:31**, with **three buildings raised and exactly two stars**. A living barracks was checked; a living archery range was explicitly unearned. There was no fake learning/completion credit.
- Continue Campaign had initial result focus and opened the campaign menu with Forked Road selected and unlocked. Replay for more stars was available as a separate optional action.

### Forked Road at 390×650

- Two clearly separated roads; 610 starting gold; zero player buildings. The default drawer offered barracks, archery, tower and mine. All buildings immediately exposed the full seven-building legacy roster.
- Four normal paid barracks were built, two on each road, during the observed 00:18–00:26 opening. No mine, tower, archery, upgrade, or free resource was used.
- The ordinary route won at **01:21** with **four buildings raised and exactly two stars**. Production on each road was checked; the 7.5 gold/sec star was explicitly unearned. Winning without a mine remained valid.
- I **activated Replay for more stars**. It restarted **Forked Road at 00:00, 610 gold, 0/2 targets, full citadel health**. I paused and safely returned to the title rather than playing a second complete replay.
- The title still showed both two-star records: **2/2 introduction missions, 4/6 stars**, with the main campaign still **0/16 missions, 0/48 stars**. Replay did not erase the best record.

Both native runs used the game's ordinary speed control at 1.5× for part of play. These times are simulation-time result displays, not wall-clock novice performance measurements. The separate paid reference routes of 58.1/97.9 seconds and 30-second reading-delay tolerance remain automated evidence; this review does not replace them.

Evidence: `11-first-watch-paid-opening.png`, `12-first-watch-two-star-result.png`, `13-continue-recommends-forked-road.png`, `14-forked-road-two-star-result.png`, `15-replay-retains-intro-stars.png`.

## Protected objectives, ordinary mobile layout, and dialogs

Winter Stores launched correctly at 320×480. Header health/mission, battlefield, objective summary, named original-mine controls, Build, navigation and minimap occupied separate regions. Both original mine models and their badges were visible. Build opened the same drawer with readable prices and the full legacy roster. A normal 140-gold Barracks purchase was placed on a northern legal site. Cancel worked normally.

North/South focus controls and Front navigation returned to the originals. At 844×390 the field expanded into the landscape arrangement with an unobscured right navigation rail and lower objective dock. A focus screenshot shows both original mine models and the paid barracks. No stale inspection drawer or duplicated HP region was seen after resizing.

Preferences opened over the paused battle at 320×480. Shift+Tab from its initial Close focus wrapped to the final Close preferences action. Escape returned focus to the pause screen's Preferences control and did not silently resume the battle. Field guide open/close also returned to the paused battle. No preference was changed.

Changing the running protected battle to 568×300 showed Battle paused for screen size and disabled Resume, with Save & return reachable. A three-second held click on disabled Resume did not restart combat. Growing back to 320×480 changed the panel to Battle ready to resume while keeping it paused. Save & return preserved the **00:37** checkpoint; reload and Resume returned at 00:37, without wall-clock catch-up or a false size hold. The original north mine remained at 100%, south at 56% in the sampled restored state.

Evidence: `02-protected-320-drawer.png` through `07-classic-restored.png`.

## Rootwarden, explicit endgame rules, and saves

Skirmish remained an optional menu click. Its default Open endgame text explained the 5:00 escalation and absence of clock-only citadel health loss. Selecting Timed endgame changed the explanation to health decay at 7:00. Both showed that saved battles retain their original rules.

A new timed skirmish was started at desktop size. The normal bar scrolled to **Warden lodge, 210 gold**. A legal paid placement produced a normal building whose inspection panel showed **Level 1 · Rootwarden production**, 650/650 building health, 12.0 seconds/wave, Upgrade 147 and Salvage 105. These are building values, not the unit's 800 HP.

Resizing to 320×480 closed the desktop inspection safely and showed the shared mobile shell. The Build drawer scrolled to its final Aerie and Warden lodge cards with their prices fully readable. Selecting the lodge closed the drawer; Cancel and Pause worked. No second purchase occurred during that cancellation check.

The active field guide showed keyboard 1–8 and Rootwarden's **800 HP, 8 damage, 1.5-second cooldown**, high-health/low-damage role, lack of armor/arrow resistance and inability to hit flyers. It described a ranged-support alternative, not a guaranteed barracks counter.

After Save & return at **01:41**, I changed the future-game selector from Timed to Open. The saved slot still said **Resume Battle · Sudden Death · 01:41**. Resuming it kept the timed field-guide explanation. Another full reload still offered that timed save; restoring returned at **01:41, 739 gold, 65% citadel health**, without elapsed-time catch-up. Campaign-first entry was retained on reload.

This native skirmish was a UI/save sample, not a competitive strategy test or completed win/loss. It does not establish that one lodge can defend all roads or beat a barracks opening.

Evidence: `16-explicit-timed-rules.png` through `22-rootwarden-restored.png`.

## Field trial and actual failure/retry

Shieldbreaker was reached through the ordinary Field Trials menu and started at 320×480. The same drawer exposed the seven classic building cards, no Rootwarden. A normal paid barracks was selected and placed; tapping its model opened the shared inspection drawer with 700/700 health, 9.0 seconds/wave, Upgrade 98, Salvage 70 and Close. Prices/actions fit.

The minimally defended QA battle was subsequently left to end naturally using the normal speed control. It failed at **01:19** with “Shieldbreaker: Your citadel fell.” This was not treated as a balance verdict. I activated **Retry Field Trial**, which restarted Shieldbreaker at **00:00, 520 gold, 0/3 targets, full citadel health**. The restart was paused and safely exited.

Evidence: `23-field-trial-shared-drawer.png` through `26-trial-retry-reset.png`.

## Integrity and cleanup

Before the app loaded, the visible helper captured every localStorage key and the helper tab's sessionStorage. A private downloaded snapshot was saved separately in this restricted review directory. It contained five original local keys: campaign, history, profile marker, settings and trials; sessionStorage was empty. The original marker used **protocol 2**. There was **no pre-existing active battle**.

The sealed baseline was never replaced by a test state. After all play, the game iframe was unloaded; every local/session key was restored. Restore reported a full byte-for-byte match, and a separate Verify action confirmed it again.

Baseline digest: `53de9ba9b9461fcaa23bae01afa560a5efc6258d4c456f182f2f813aed9d6a63`.

Test tab 38 was closed. Existing tab 32 (`https://ironroot.stevets.ai/`) and tab 35 (old local art study) were neither operated nor changed. The sole helper file was removed. Final runtime inspection passed **41 files / 788,320 bytes**, and every hash matched the recorded freeze. See `cleanup-integrity.json`, `final-runtime-verification.json`, `27-original-storage-restored.png`, and `28-original-storage-byte-verified.png`.

The first attempt to invoke a verifier inside the runtime-only preview copy found no `scripts/` directory. The existing source verifier was then invoked with the preview `dist` as its explicit input and passed. No runtime edit was required.

## Limits and remaining gates

- The retained profile proved existing campaign progress and exact restoration, but had no old active save. Native classic save/resume used a newly started Winter Stores battle under that profile. Genuine released active-save migration, corruption handling, backup import/export, protocol fencing and long-session limits remain the separate automated compatibility gate.
- Actual two-star results and replay activation were tested. A one-star result and a three-star native result were not generated. Their generic result branches are not claimed as native passes here.
- Neither all 16 legacy missions nor a complete skirmish was played. Intro reference-policy balance, alternative tank composition and the full browser suite remain separate evidence.
- No physical touch/pen/controller, safe-area hardware, visualViewport zoom/offset, screen reader, non-Chromium, packaged desktop, or subjective audio test was performed.
- No native backup file-picker retry was attempted. No publication, push, or production change was made.
