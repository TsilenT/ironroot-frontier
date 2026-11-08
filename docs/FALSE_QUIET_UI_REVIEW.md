# False Quiet: independent bounded UI acceptance

## Method and isolation

Native CUA browser on 2026-11-08, using the supported Sites managed preview at its exact returned `http://127.0.0.1:4173/` address. Observed desktop viewport: 1180×757. No alternate browser route, deployed-site change, runtime state injection, real-profile mutation, mobile emulation or touch test was used.

`qa/false-quiet/prepare-native.mjs` creates the external sibling preview. Synthetic prerequisite records unlock Chapter 7; they are not browser-earned campaign completion. Zero-time A/B fixtures are authored saved battles. Paid checkpoints come from the production engine's `scout-adapt-5s` policy, with ordinary purchase prices, one action per five seconds and reconciled ledgers. Terminal-near A is at 88.55 seconds; B is at 136.90 seconds. No health, gold, winner or time edits manufacture victory. The preview uses per-fixture namespaced sessionStorage only, never falls back to the user's profile, and disables service-worker installation. Its app.js/index.html differ only for isolation and fixture navigation/disclosure; all other runtime files match source.

## Acceptance status

**Passed within the scope below on the final fixed source.** A preliminary run exposed a startup `.theme` error during preview regeneration. The owner corrected the incomplete chapter list by importing the canonical `CURRENT_CAMPAIGN_CHAPTERS`. Acceptance was restarted in a new browser tab after the preview became stable. Only the fixed-source checks below establish acceptance.

- Chapter 7 displays **The Unlit Roads**, **False Quiet**, **Mission 1 of 1**, and **Completes the current Unlit Roads route**. The scout report charts Middle Road Fort as a Watchtower on the middle road at x2230, explicitly leaves current HP/level/upgrades/defenders unknown, and does not disclose either selected enemy production layout. It explains that Resume, Restart and result Replay retain the selection while a new Campaign attempt selects anew.
- Both `fresh-a` and `fresh-b` Resume buttons displayed 00:00 and entered actual gameplay with the authored treasury plus ordinary elapsed income, own citadel100%, unknown enemy citadel HP, and **Charted · HP unknown** for the fort. No factory information appeared at zero time.
- On A, Pause → Restart mission → confirm returned to the current briefing. Begin Mission then entered a fresh00:00 battle normally. This exercises both Resume and Begin after the chapter-registration correction.
- On B, an ordinary270-gold Siege foundry was selected and placed in a legal middle-road slot. The app displayed **Siege foundry raised. First troops in a moment.**, the building appeared, placement mode exited, and treasury read808 at00:10 after purchase plus elapsed income. No funds or game state were injected.
- The paid A checkpoint continued normally to **Mission Complete** at01:29 with two stars. The report explicitly identified `frontier-campaign-false-quiet-a`, **Met Destroy the original Middle Road Fort 1/1 targets destroyed**, own citadel3,465HP and enemy citadel6,000HP. It disclosed recording only from1:28 to1:29.
- Paid B continued normally to **Mission Complete** at02:18 with two stars. Its report identified `frontier-campaign-false-quiet-b`, fort1/1 destroyed, own citadel183HP and enemy citadel5,176HP. It disclosed recording only from2:16 to2:18. These are fort wins, not enemy-core wins.
- Both result screens said **Fog battle ended. The field and report now reveal full information.** The report heading repeated **Fog · post-battle full information**. Full enemy data was therefore explicitly labeled as post-battle disclosure rather than live scouting.
- A result Replay returned to the correct completed-mission briefing; pressing Replay Mission began a fresh00:00 battle with the fort intact/HP unknown and enemy citadel hidden. No visible factory information was added by Replay.
- B's primary **Skirmishes** action opened Skirmish setup with **Begin Skirmish**. Returning to Campaign → Chapter7 showed **1/1 missions complete · 2/3 stars** and “The middle fort is open. Sera follows the newly charted road toward the coast.” No unimplemented next mission was offered.
- The observed result buttons, report coverage warning, battlefield HUD and chapter ending were readable at1180×757. Longer briefing/report content scrolls inside its panel while actions remain available.

The final tab's last30 captured error entries were browser-extension metadata errors. No application error appeared in that inspected window; this is not a blanket console-clean claim. Native completion was summarized once. `sites-preview stop` confirmed shutdown. All58 source runtime hashes still matched the final fixture snapshot.

## Evidence and source identity

Final screenshots outside the source checkout: `../local-evidence/false-quiet-ui/`:

- `final-fresh-a.jpg`: fresh A gameplay and hidden fort HP.
- `final-paid-foundry-b.jpg`: ordinary paid placement in B.
- `final-result-a.jpg`, `final-result-b.jpg`: fort victories and continuation controls.
- `final-report-coverage-b.jpg`: readable resumed-recording disclosure.
- `final-chapter-complete.jpg`: current Chapter7 ending and completion count.

Fixture receipts and per-file hashes: `../preview/false-quiet-native-fixtures.json`.

- Source-runtime aggregate SHA-256: `203db672de722053d4fe0e04c658371585e438a715e1ac640d2f26e9bb5f328e`.
- Preview-runtime aggregate SHA-256: `a872a7f5996c9db625b3896a626f002604024c4f69ef97fdec709b184a5e96ad`.
- `dist/app.js`: `9dadb68892756d5159cbfd6127067c49c0a6af77a180156549823c69bc07d941`.
- `dist/campaign.js`: `a779edd2254fb1f86a344d46e4c44023b104191adb20240b6f9e945d9dacb3a1`.
- `dist/campaign-presentation.js`: `bf32e2c94071158bc2b0be180166cac97593554236c7029877de3875c4aba53a`.

## Scope limits

This is presentation and normal-continuation acceptance, not a complete from-zero browser win or campaign balance matrix. Hidden layout identity is deliberately unavailable in the UI: browser checks establish the Resume/Restart/Replay flows and fog behavior, while variant equality must be established by production codec/engine regression tests. No core-win or defeat checkpoint was provided for this native pass. Physical phone, touch, controller, short-height layout, real-profile persistence and deployed operation remain untested.
