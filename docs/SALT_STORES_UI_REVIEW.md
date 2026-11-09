# Salt in the Stores v0.31: bounded native desktop UI review

## Result and scope

PASS for the required isolated desktop flows exercised below. No blocking UI defect was observed in this pass. This is a native cloud Chromium review of the frozen Salt candidate, not production certification, a human novice study, a whole-campaign playthrough, or release approval. A separate guided fresh battle won with two stars and only 596/6,000 citadel HP; it must not be described as the three-star fixture result or as novice accessibility evidence.

Reviewed on 2026-11-09 at the existing desktop size. All ten screenshots are 1180 × 757 browser-viewport JPEGs. The managed preview was started with `sites-preview start /workspace/scratch/d86b57250ea4/ironroot-salt-stores-preview` and used the exact returned URL, `http://127.0.0.1:4173/`. Browser tab 7 was the only QA tab created. Production tab 4 at `https://ironroot.stevets.ai/` was never bound, navigated, reloaded, or otherwise interacted with. No production save, settings, storage, service worker, or cache was cleared.

The author confirmed this report path was reserved for the reviewer's sole write. This Markdown report is the only source-tree file written by this reviewer. No runtime/source edits, remote writes, publication, or Library uploads were performed.

## Frozen identity and fixture provenance

Independently computed before browser work, again during work, and after browser work:
- Source dist: 58 files; raw-byte sorted-file-map SHA256 `fccd85ea1a88a5627f30d3f9fc4cb479f2f04b9d930c321c64505097e8282ef5`.
- Preview dist: 58 files; raw-byte sorted-file-map SHA256 `a7bf1cf0c7ee1e4aad71d4250814ed747f7a0e11337e2dcaa1b1ab7f8e7a86f0`.
- Only `app.js` and `index.html` differ; the other 56 assets are byte-identical. Maps did not move during this review.

Map method: enumerate and sort relative dist file names, SHA256 each file's raw bytes, create the ordered name-to-hash object, then SHA256 its UTF-8 `JSON.stringify` representation. Used `scripts/verify-runtime.mjs`'s runtime inventory, not text-normalized asset hashes.

Fixture metadata is identical in source `qa/salt-stores/native-fixtures.json` and preview `salt-stores-native-fixtures.json`: raw-file SHA256 `cc72b2dd1f6bbf1d5c6480ea36aa217005f99970f3a58c7c81596004c5e2e86a`. Validation-plan SHA256 recorded there is `4175ae15ba68bacfd92e700fc3f33c00e07e2b6c6389906727aea54cd35f0a47`.

The reviewed fixture preparation code discloses a namespaced sessionStorage-only adapter (`ironroot.salt-stores.native.<fixture>.`), no fallback to the real localStorage, disabled service-worker registration, and visible QA navigation/disclosure. Prior completion records are SYNTHETIC. The active checkpoints come from ordinary paid-engine play and are not browser-earned full battles. The fixture builder creates 30 synthetic prior records; this does not add playable main missions or prove those prior victories. Current available main content remains 29 missions / 87 stars. Salt is Chapter 8's second mission after a one-star Archer prerequisite; Chapters 8–10 are not complete.

Fixtures inspected:
- `locked`: empty synthetic campaign profile.
- `briefing`: synthetic prerequisite records, Salt selected and unlocked.
- `fresh-raid`: initially authored tick zero, and subsequently a confirmed fresh UI restart. No automated player policy follows Resume.
- `paid-opening-raid`: legal north-raid seed 8202 checkpoint at 25 seconds, both cores 6,000.
- `terminal-near-raid`: natural checkpoint at 136.25 seconds, own/enemy cores 6,000/996.24. Metadata terminal time is 137.35 seconds.
- `terminal-near-direct`: natural checkpoint at 191.10 seconds, own/enemy cores 5,796/976.8. Metadata terminal time is 193.85 seconds; original outer mines each 380 HP.
- `legacy-archer`: historical frozen v0.30/profile-21 paid Archer checkpoint at 25 seconds, synthetic earlier records, no Salt progress. Historical base commit `0e5123f9e4574c362de0b83d2bf7a727dbefee4c`; checkpoint SHA256 `23abd9f6ee18fe6e002642a7e58643513f176eb59bc6dc7f469915f0ef2d7c95`. `legacy-archer-profile.json` raw-file SHA256 is `254875f2426855cb3cb2db291c80b15f2d8bdb8548829cb0be4dba5b2bf0f20d`.

## Required native flows

### Prerequisite, briefing, Scout, and mechanics

PASS. In the empty locked fixture, Story → Chapter 8 → Salt displayed “Complete The Archer’s Quay to unlock” and a disabled “MISSION LOCKED” launch. In the briefing fixture, Salt was selected, ready, and launch was enabled.

Expanded Exact rules, Scout, and Commander’s hint. Visible text correctly stated:
- Classic 3,200 × 900, three roads, 24 sites per side, full eight-building roster, 1,100 player starting gold, and both citadels 6,000 HP.
- Player level-2 middle Barracks/Archery, level-2 outer towers, rear middle level-1 mine.
- Enemy three actual level-1 mines, outer Barracks and defended middle production/tower.
- Normal adaptive paid enemy begins with 100 gold. Player income 7.5/sec; enemy 12.5/sec; ordinary income 5 plus 2.5 per level-one mine.
- Destroy the enemy core by 10:00, own core survives, 1 HP sufficient; no required mine or route. Stars at ≤4:00 and ≥4,500 own HP.
- Troops choose targets automatically. Outer towers do not send raiders; an outer raid needs paid production. Mine loss reduces future paid spending, not existing factories' wage-free cooldown spawning. Replacement mines are possible ordinary decisions, not guaranteed.
- Ordinary 5:00 escalation and no fog, reserve wave, forced drain, or free reinforcement.

Scout's accessible starting-deployment description and road-by-road lists agreed with that composition. Goal, hint, dialogue, and result copy consistently permitted direct siege and said more of the Siege Coast remains. No campaign-complete or future-mission admission was presented. The synthetic fully earned profile did show a “Next mission: First Watch” label after the last available main mission; that optional-intro wrap was not activated here.

### Fresh purchase, save/reload/Resume, interrupted restart

PASS. Resumed tick zero through the visible button. Used the ordinary build card and a visible green middle slot to buy a 140-gold Barracks. Saved at displayed 00:20, returned to title, reloaded, and saw “RESUME MISSION · SALT IN THE STORES · 00:20.” Resume retained the purchased building. Clicking it displayed Level 1, 700/700 HP, and 9.0s/wave.

Paused at 00:27. Restart → Cancel restored the pause menu at 00:27. Reopened Restart and used browser Back; it again restored the pause menu at 00:27, with no unintended fresh battle. Reopened and confirmed Restart: returned to Salt briefing, no unfinished Resume offered. Begin launched a new battle at 00:00, 1,100 starting gold plus elapsed income, full cores, and no army. Paused immediately at displayed 00:00.

### Natural terminal continuations, Replay, Campaign, Skirmish

PASS. For both terminal fixtures, clicked Resume and gave no player battle command afterward.
- Raid: natural MISSION COMPLETE, displayed 02:17, ★★★. The visible battle report gave 6,000/6,000 own HP and enemy 0. It correctly disclosed that chart recording began at Resume at 2:16, rather than claiming a browser recording of the preceding battle.
- Direct: natural MISSION COMPLETE, displayed 03:13, ★★★, own 5,694/6,000 HP and enemy 0 in the report. Inspect Battlefield visibly retained the north and south original enemy mines, both with full bars, while the middle was broken. This supports the optional-mine route in native UI.

Important precision limit: the ordinary enemy-building click did not expose numeric structure HP. Native evidence establishes those mines were standing with full bars; the exact 380 HP value and subsecond terminal times come from the independently identified fixture/engine provenance, not hidden browser-state access.

Replay returned to completed Salt briefing with a REPLAY MISSION button; launching it reset to 00:00. Campaign missions returned to Salt with ★★★. Last battle report reopened the result. SKIRMISHES returned to ordinary Skirmish configuration; Begin actually launched SOLO SKIRMISH / THE OUTRIDER at 00:00 and the pause menu said Skirmish / Classic. No Salt objective leaked into that battle.

### Historical Archer checkpoint under the current runtime

PASS for the synthetic old-profile behavioral path. Resumed the historical Archer 25-second checkpoint in the current candidate. It remained The Archer’s Quay, with both cores full and normal 7.5/sec income.

While paused, Citadel upgrades showed 310 gold. Chose Extra Arrow for 190 gold, then saved and returned to title. Reload retained the 00:25 Resume. Resume showed approximately 121 gold after elapsed income and the Extra Arrow choice. Pausing and reopening Citadel upgrades confirmed “Extra Arrow chosen,” the alternative disabled, and full cores. Saved again at 00:26 and navigated to Salt, which remained locked on unfinished Archer. The migration did not grant Salt credit.

The profile-21 → current-22 provenance is supplied by the historical fixture/current runtime, while this native pass validates successful Resume, paid choice, save/reload retention, and no spurious Salt credit. It is not a real production-profile migration or serialization-version inspection.

## Separate guided fresh UI attempt

Completed one GUIDED run with synthetic prerequisite unlocks. This is distinct from both terminal fixtures and from the earlier disposable save/restart test. It began from the confirmed fresh UI restart's saved displayed 00:00. No policy runner, hidden state/API, forced terminal result, mine attack order, or developer tool was used.

Ordinary UI paid choices:
1. Middle Barracks at world x1250, Foundry x1110, Sanctum x690, placed around displayed 00:24–00:25.
2. Middle Archery x550 and Foundry x270, around 00:26–00:27.
3. Rear North mine x270 around 00:27, raising displayed income to 10/sec; rear South mine x270 at 01:14, raising it to 12.5/sec.
4. Upgraded both new foundries to Level 2 for 189 each around 01:24–01:26. Details changed from 650 HP / 17.0s wave to 910 HP / 13.9s wave.
5. No further spending, volleys, citadel choice, salvage, or attack orders. Used ordinary pause while deciding and 1× → 1.5× → 2× user-visible speed controls.

Observed a natural win at displayed 03:26, ★★☆. Report: own core 596/6,000, enemy 0; 12 total player placements including starting buildings, 40 living units, 8 standing buildings, and 145 enemies defeated. Final gold was about 1,705 and income had fallen to 7.5/sec. Both outer enemy mines were visibly standing. The health bonus correctly failed while the time bonus passed.

The briefing's concentration choice was understandable and executable through ordinary controls, but this single instructed attempt left a narrow safety margin and idle gold. It does not establish blind novice accessibility, robust outcomes across seeds, or an optimized three-star plan. It did not justify or trigger gameplay tuning.

## Desktop layout and limits

At this desktop viewport, mission/result/pause controls remained usable. Long briefing, Scout, report, and citadel content used their internal scroll areas; the fixed launch/result actions remained reachable. The command deck visibly offered horizontal scrolling, with the last building card partly offscreen initially. No phone viewport, emulation, DevTools, or retry of the previously denied mobile experiment was attempted.

Not run or not established:
- Physical phone/tablet, touch, accessibility certification, other browsers, fullscreen, or responsive widths beyond the current desktop.
- Service-worker install/update/offline behavior or production storage/cache lifecycle.
- Actual user-profile migration, real prerequisite victories, or all-29-mission/campaign completion.
- Independent re-execution of the 54-run engine balance matrix, held-outs, or the separate source/verifier acceptance gate.
- Native numeric enemy-mine HP or subsecond timers; see provenance distinction above.
- Full blind/unguided human difficulty testing, long-play soak, and every defeat/deadline edge.

Cleanup: closed only QA tab 7. A subsequent tab inventory contained only existing new tab 1 and untouched production tab 4. Ran `sites-preview stop`; `sites-preview status` confirmed stopped. Both runtime maps still matched after testing. No release/publish step was taken.

## Screenshot evidence

Saved outside source at `/workspace/scratch/d86b57250ea4/ironroot-salt-ui-evidence/`. No binary evidence was copied into source or Library. Each file was decoded from the native browser screenshot response, then checked as a valid 1180 × 757 JPEG.

| File | What it shows | Raw-file SHA256 |
|---|---|---|
| 01-locked-salt.jpg | Locked Salt and disabled launch | 24b5f783af0e160230cae74a58af674c765436b73fe980497c3359e3bed079aa |
| 02-scout-details.jpg | Expanded road-by-road Scout lists and automatic-targeting hint | 757aca050d27f19706e7876b4f5f20cbf4baf48e3dc95b7d6585dc4d1adc6fe2 |
| 03-goal-partial-route.jpg | Optional mine raid, continuing factories, and more Siege Coast copy | fb01e1ca9a64538357982c4ec0565719ccfedd7cd9d4bd0bdbd2f75692529a12 |
| 04-paid-barracks-resumed.jpg | Fresh paid middle Barracks retained after save/reload | 4bb6384f031f1cc7fcff3dea866555c43d76e15d2cf0875fc6aa7663aaa834fd |
| 05-raid-natural-victory.jpg | Natural raid checkpoint result, three stars, 02:17 | cc7eec7b5b960f2dd4c4a00993f18419af7c5418ba2b5eb0be93fd750f9376b2 |
| 06-direct-natural-victory.jpg | Natural direct checkpoint result, three stars, 03:13 | 3b00fee934a103daae0aa8c954b548b62590e442766020eb071b6c67a4780213 |
| 07-direct-outer-mines-alive.jpg | Direct terminal inspection, both outer enemy mines standing/full bars | e28339c6764fefbce1128e68db9cb76d010ca844dd6f4471ea4e16ec778416a3 |
| 08-legacy-paid-choice-retained.jpg | Historical Archer Extra Arrow choice retained after reload | dd88d0871b88836087076baef40deedc50cff8eda9a524a2f17727e88b83f73c |
| 09-guided-middle-production.jpg | Separate guided run's concentrated middle army at 01:28 | b7a87d33339ac94a80a5552b64a24d5551b9fd17a04fbf8fb740dcd4adea3c9f |
| 10-guided-fresh-victory.jpg | Separate guided-from-fresh win, two stars, 03:26 | 9030e97917ea3433b4793808436f0dfc236d272c99ab19032ce203537aaaa50b |
