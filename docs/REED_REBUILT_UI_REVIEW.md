# Through the Reed Beds: bounded native UI review

Review date: 2026-11-09 UTC. Outcome: PASS for the exercised desktop scope, with the inherited navigation behavior and unrun boundaries below. This is not a full human playthrough or production-save migration certification.

## Exact reviewed build and isolation

- Source: `ironroot-rebuild-reed/dist`, v0.29.0 / profile protocol 20.
- Runtime: 58 files, 1,171,830 bytes.
- SHA256 of JSON.stringify(sorted runtime file-hash map): `071c399eaa1e83f56d4503048c4974e65cd5939c71284c468403d84d1d03cc1d`.
- Runtime inventory: `qa/reed-beds/runtime.json`. Independently recomputed before QA and after restoration; all hashes match.
- Preview wrapper map SHA256: `46ff2b4fce4bd458be28728c565d12029f252ee43a98065c7644ead3eb3c8f01`. Only app.js and index.html differ from runtime, for disclosed QA bootstrap/navigation and per-fixture sessionStorage. All other runtime files are byte-identical.
- Preview storage is `ironroot.reed-beds.native.<fixture>.*`, initialized once per fixture per tab. Service-worker registration is explicitly disabled. No page-state injection, health/resource/time editing, production profile access, or production-tab interaction was used.
- Managed preview: `sites-preview start /workspace/scratch/d86b57250ea4/ironroot-reed-preview` returned exactly `http://127.0.0.1:4173/`. This was the only preview. Native Chromium, owned tab 5, 1180×757 page screenshots. Native browser/accessibility actions were used, with one locator click for the observed Skirmishes button.
- A briefly prepared navigation guard was restored before finalization. No changed-guard build was used for the completed flow evidence. Original source/preview hashes were freshly reverified, then restored legacy navigation was reloaded and rechecked.

## Fixture provenance

The wrapper disclosure and `ironroot-reed-preview/reed-beds-native-fixtures.json` identify synthetic prerequisites and ordinary paid-engine checkpoints, not browser-earned prior wins.

- `?fixture=briefing`: synthetic one-star prior progress unlocks Reed. Used for fresh selection, Begin, real paid action, save/reload and restart.
- `?fixture=terminal-near-main`: ordinary paid route checkpoint at 64.30 seconds, South original destroyed, North 141/1400 HP, Middle 650/650 HP. Expected natural target win at 65.70 seconds.
- `?fixture=terminal-near-core`: ordinary paid route checkpoint at 136.65 seconds, only South original destroyed. Expected natural core win at 138.65 seconds.
- `?fixture=legacy-road`: isolated synthetic old-profile compatibility. Source manifest `qa/reed-beds/legacy-road-profile.json` records canonical v0.28 commit `6b6cf964097a815b214933c7e74bb3f23b72d5d5`, tree `50c098a436ddee2e36d629a2e7d36e6887ae6b25`, marker 19, paid 190-gold Extra Arrow at time zero and 100 ordinary ticks to 4.99999999999999 seconds. The encoded battle SHA256 independently recomputed as `3896098bc9a0bb5ccb09e9003b441a763a15aeaa7ef17ae97105d420ecb80534`, matching the manifest. It remains Road / twin-span / frontier-campaign-road-we-know revision 1.
- The separate fresh-main tick-zero and paid-opening-main 25-second routes were supplied but not separately exercised. Fresh authored launch and a real paid UI checkpoint were exercised instead.

## Passed native flows

1. Chapter selection and briefing: Chapter 7 initially showed 2/3 missions and three entries, with Reed as mission 3 of 3. Goal/facts say any two of three ORIGINAL positions, third may stand, enemy citadel alternative, own citadel survives even at 1 HP, replacements do not restore credit, all roads visible. Exact rules explain Classic, three roads, ordinary paid adaptive AI, eight buildings, no fog/reserve/free reinforcement, and optional stars.
2. Scout: accessible map description and deployment list identify North Reed Watch (level-2 Watchtower), Middle Iron Works (Siege foundry), and South Ember Hall (Arcane sanctum), with correct roads and any-two/core wording.
3. Fresh Begin and live HUD: paused at 00:00, then resumed. HUD showed NORMAL · ANY 2 OF 3, 0/3 original positions · need 2, named target health 1400/1400, 650/650 and 520/520. Battlefield was clear-view with all three roads.
4. Real paid action: Citadel upgrades showed 1100 gold and 190 cost. Chose Extra Arrow through the normal button while paused. UI disabled further choices and reported Extra Arrow chosen; live HUD then showed 911 gold after ordinary income resumed, consistent with the 190-gold spend.
5. Actual checkpoint persistence: advanced the fresh paid attempt to UI 00:20, Pause → Save & return to title → reload → Resume. It retained 00:20 and Extra Arrow, rather than resetting to fixture start. Pause/repeated interruption remained stable.
6. Restart: Cancel and browser Back each returned to Pause at the same 00:20 with the paid choice. Confirm returned to Reed briefing and removed the unfinished Resume entry.
7. Partial original credit: near-main Resume showed South destroyed, disabled South focus, 1/3 original positions · need 2, North 141/1400 and Middle 650/650. Pause/resume preserved that state; North then took ordinary further damage.
8. Natural two-target victory: with no further purchases or state edits, the resumed paid battle won at UI 01:05 (fixture expected 65.70s). Result listed North and South original destroyed, Middle standing · not needed, correct two-position passage text, and ★★★ with both optional bonuses checked. Inspect battlefield confirmed Middle still 650/650, own citadel 100%, enemy citadel 98%.
9. Current completion: Chapter 7 then showed 3/3 missions, 5/9 stars (two synthetic earlier one-star entries plus Reed's three), and the coast/next-chapter-still-ahead text. Story progress showed 24/27 missions and 26/81 stars. No Chapter 10 ending appeared.
10. Replay and return: result Replay mission returned to Reed briefing; launching it made a clean 00:00 attempt. Campaign missions returned to Reed's campaign page. Last battle report reopened the result with explicit limited recording coverage.
11. Natural core alternative: resumed near-core with North/Middle full, South destroyed and own citadel 38%. With no further purchases or edits, won at UI 02:18 (fixture expected 138.65s). Result said enemy citadel falls, North/Middle standing · not needed, South original destroyed. ★★☆ correctly checked the time bonus and left the 4500-HP bonus unmet.
12. Skirmish navigation: the terminal SKIRMISHES button opened ordinary Skirmish setup. Browser Back followed the existing fixture URL history to the previous fixture page; it did not launch a battle or lose a real profile.
13. Isolated legacy compatibility: the v0.28 save opened as The Road We Know at UI 00:05, with paid Extra Arrow retained and normal Road objective/battle identity. Advanced naturally to 00:10, Save → reload → Resume retained 00:10 and Extra Arrow. Restart returned to Road briefing, which says Unlocks Through the Reed Beds and offers Next mission: Through the Reed Beds.
14. Bounded prerequisite lock: in this unfinished-Road legacy fixture, Next opened Reed as Locked, said Complete The Road We Know to unlock, and disabled MISSION LOCKED launch. This is actual native missing-Road coverage, not an inference from unlocked fixtures. Reload/recheck after restoration reproduced it.

## Inherited behavior, failures and limits

- No new functional failure was found in exercised scope.
- In the legacy fixture only, Reed's catalog Next can browse optional archived First Watch when old lesson records make those lessons visible. Independent baseline comparison classified this as inherited archived-lesson ordering. It is not automatic continuation, Chapter 8 admission or another main Chapter 7 mission. The final restored build deliberately retains it; normal main-only fixtures show No next mission.
- Road's real pre-upgrade production live session was unavailable. Synthetic marker-19 compatibility does NOT certify migration of that unavailable real save.
- Not run: from-zero victory, full paid route played by a human, loss/deadline flow, own-citadel-at-1-HP terminal, replacement-target credit through native UI, every prerequisite combination, old Road terminal/replay result, full legacy lessons, physical phone/mobile emulation/PWA/offline, broad browser matrix, long-duration soak, multi-tab profile contention, real-profile or cross-session persistence.
- Ordinary engine/source tests and independent source review are separate evidence. This report makes no native claims for the unrun boundaries.

## Internal screenshot evidence

Screenshots are raw native JPEG captures, kept outside the source overlay at `/workspace/scratch/d86b57250ea4/reed-ui-evidence/`. They were not uploaded to Space. Each was validated as 1180×757 JPEG.

- `01-three-target-scout.jpg` · SHA256 `1214a7bef3fed8de6f0d4f8f074197f1cd3b61876c5851f8953497057fae5301`
- `02-paid-extra-arrow.jpg` · SHA256 `207390aa745427a0d18edd4112bcca8a9bb0229fc617a60d39c91c8097809cc2`
- `03-partial-target-hud.jpg` · SHA256 `9a4e73e1eb20f9411ac8c7e2bf4e630e4d2d53d3bcb6660d6e8b1f97663a2490`
- `04-two-target-victory.jpg` · SHA256 `2e09a0dc4904acdbdbe5334195f7bbdb3a8b9bef0c0ca7cc7e32f20c474a21d6`
- `06-chapter-seven-complete.jpg` · SHA256 `8ff5c4b690bfa87b34cf17380a5362c68e74f629a94cda79c4de814c628fc9d4`
- `08-core-victory.jpg` · SHA256 `bab06d9421611ee33200df8531a975c2b35429b7a53441b2d44b88d2c6969ad2`
- `12-legacy-resumed-checkpoint.jpg` · SHA256 `0f2a2cdc705ade5b57a9dc7e84494c725ad15fd3a8764e6e6716f134dac97399`
- `14-legacy-reed-prerequisite-lock.jpg` · SHA256 `30aed8c62a5b40485a8735bdcc5de56b07433afe3499f95062a1c011d4375fd4`

Cleanup: owned QA tab closed; managed preview stopped. Production tabs and profile were not touched.
