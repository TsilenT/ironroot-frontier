# Chapter 6 closure: bounded UI acceptance

## Fixture provenance and isolation

`qa/chapter-six-closure/prepare-native.mjs` builds developer-only fixtures outside the source checkout. All historical prerequisite records are synthetic. The `completed` profile's full completion records are also synthetic and establish only menu presentation, not earned completion. Shared Crossing, Lanterns and Borrowed Ground fixtures support current briefing/replay/restart checks.

The two River fixtures are real ordinary-price engine routes from the authored seed 6501. They use the existing `qa/river-between/paid-policies.mjs` policies and production engine APIs; no time, HP, gold, income, objective or winner edits occur. Every purchase on both sides is measured, and both ledgers reconcile within 0.000001 gold. Checkpoints are saved immediately before the terminal update, admitted by the production codec, restored exactly, and continued with the normal 0.05-second objective update. Restored terminal state must equal the original paid-run terminal state.

- `compound`: crossings-first route, saved at 130.00 seconds, ordinary compound victory at 130.05 seconds with enemy citadel alive.
- `core`: infantry-routes route, saved at 187.70 seconds, ordinary enemy-citadel victory at 187.75 seconds. Assertions require the original North Command Post to remain standing both at checkpoint and at victory.

The isolated preview uses only per-fixture namespaced `sessionStorage`, has no real-profile fallback, and disables service-worker installation. The only modified preview runtime files are `app.js` (storage wrapper and service-worker guard) and `index.html` (fixture links and disclosure). Every other runtime file must be byte-identical. Source and preview hashes plus paid-run receipts are emitted outside the source checkout. No fixture or screenshot is shipped in `dist`.

Reproduce metadata without creating a preview:

`node qa/chapter-six-closure/prepare-native.mjs`

Prepare the isolated managed-preview sibling:

`node qa/chapter-six-closure/prepare-native.mjs /workspace/shared/ironroot-river-closure/chapter-six-preview --write-preview`

## Native desktop acceptance

Completed on 2026-11-08 using the supported Sites managed preview at its exact returned `http://127.0.0.1:4173/` address and the native CUA browser. Observed viewport: 1180×757. No alternate browser-control or emulation route was used.

### Current briefings, replay and restart

- Fresh Shared Crossing displayed **Secure the convoy route**, with no “preview” label, and **Unlocks One Signal Is Enough**. An ordinary 133-gold mine upgrade visibly produced Level 2 and raised total income from 7.5 to 8.75 gold/sec. Confirmed Restart returned to the same current subtitle and reward, rather than historical presentation.
- Lanterns on the Water was selected as a completed mission from synthetic prior records. Its replay briefing displayed **Unlocks Borrowed Ground**. Replay began normally; Pause → Restart mission → confirm returned to a briefing retaining that reward.
- Borrowed Ground followed the same completed-mission replay and confirmed Restart path. Both briefings displayed **Unlocks A River Between Us**.

### Normal completion from ordinary paid checkpoints

- Resuming the 130.00-second compound checkpoint reached Mission Complete through the normal app update, displayed at 02:10. The result read: “With the original North Command Post destroyed and 60 seconds of secure passage banked across two crossings, the River Compact can keep its own roads supplied.” It describes banked time without asserting current crossing ownership. The battle report marked both objectives met, showed 60.0/60 seconds and 3/2 clear crossings, and retained both citadels at 6,000 HP.
- Resuming the 187.70-second core checkpoint reached Mission Complete through the normal app update, displayed at 03:07. The result read: “With the enemy citadel fallen, the River Compact has broken the toll commander’s hold on the river.” It made no claim that the post was destroyed. The report showed **Enemy citadel destroyed**, own core 4,214 HP, enemy core 0, and the original North Command Post objective **Not met · 0/1 targets destroyed**. Expanded marked-structure outcomes explicitly showed the enemy road-1 Watchtower **Standing**. The supply goal was independently met at 60.0/60 seconds, with 2/2 crossings clear.
- The reports disclosed that recording began on Resume at 02:10 and 03:07 respectively. Earlier paid-engine play is not represented as native browser play or fully recorded browser history.

### Chapter ending and next actions

- Both result screens kept **Skirmishes** as the primary action and **Replay mission** as an optional secondary action. Replay remained available even on the three-star compound result.
- Clicking the compound result’s primary action selected Skirmish setup and showed **Begin Skirmish**.
- Returning to Campaign and opening Chapter 6 after that normal completion showed **5/5 missions complete · 7/15 stars** and the full current epilogue: “From the lantern-lit banks to the borrowed yard, the river towns now share the watch over crossings and signal fires, so the next convoy need not depend on Rowan’s company to reach the far bank.” This menu used synthetic records for the first four chapter missions and the just-completed normal River result. The separately prepared wholly synthetic `completed` profile was not needed for native acceptance.
- Clicking optional Replay on the core result returned to the current **Completes The River Compact** briefing. Beginning that replay showed 00:00, 0/60 secured, 0/2 clear, original North Command Post standing, both citadels at 100%, and the fresh 1,050 treasury plus ordinary elapsed income.

The result copy, buttons and chapter epilogue were readable in the observed desktop viewport. Native CUA completion was summarized once, and `sites-preview stop` confirmed shutdown. All 58 source-runtime file hashes still matched the preflight snapshot after native acceptance.

## External evidence and reviewed source identity

Evidence is outside source under `../local-evidence/chapter-six-ui/`:

- `compound-result-desktop.jpg`
- `core-result-desktop.jpg`
- `core-post-standing-desktop.jpg`
- `completed-chapter-desktop.jpg`

Fixture metadata and paid receipts: `../chapter-six-native-fixtures.json`.

Reviewed source-runtime aggregate SHA-256: `da17e2f510965be65402829d57645edfc40e8b5a3c47867b3779bdd8327008bc`.

- `dist/app.js`: `d0bf1de50e87a9765dbfa60c04133fd2e0f5e9aa5ecbb415ef0d9a9a95f54d2b`
- `dist/campaign.js`: `9dfc220515e38d27ee53f5e484aeccbd7addae63b62029c1a35fc17e2d4fa01e`
- `dist/campaign-presentation.js`: `9d8d112eeed62a54766cc9c64ffcda0195ec85fffc5645a96bdba7bcd60064c6`

## Scope limits

The native checks are presentation checks plus normal continuation from paid-engine checkpoints. They are not complete from-zero browser wins, physical-phone/touch/controller tests, production-profile persistence tests or a balance matrix. Synthetic prior progression and the prepared synthetic completed-menu profile do not establish browser-earned campaign completion. Both terminal native runs still had the requisite clear crossings when they ended; no native lost-crossing boundary or full campaign matrix is claimed. Short-screen wrapping, physical touch/controller behavior, deployed-site operation and console-clean status were not established by this pass.
