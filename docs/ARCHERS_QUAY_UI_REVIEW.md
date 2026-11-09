# The Archer’s Quay: bounded desktop UI review

Completed 2026-11-09 UTC. **PASS for the exercised isolated desktop flows below; not a release, full-chapter, human-difficulty, or production-persistence certification.** No blocking application issue was observed. This candidate adds only Chapter 8’s first mission. The requirement for at least five missions in each of Chapters 8, 9 and 10 remains unfinished.

## Tested bytes and isolation

- Candidate: v0.30.0 / profile protocol 21, 28 main missions / 84 optional stars. Chapter 7 remains three missions.
- Author checkout: `/workspace/scratch/d86b57250ea4/ironroot-build-archers-quay`; runtime directory `dist/`.
- Preview checkout: `/workspace/scratch/d86b57250ea4/ironroot-archers-quay-preview`; static directory `dist/`.
- SHA256 of `JSON.stringify` of each filename-sorted, 58-entry `{filename: SHA256(raw file bytes)}` map was independently checked before browser use and again after cleanup:
  - Source: `ab769819b9f8695cd460265a58035962a9ee039e3a3e194164dd5d125c72fb1b`.
  - Preview: `27161949441b28bafbe98efa80b5a54206cabed2ac694c4a9e14daa717e0fb95`.
- Only two runtime files differ; all other 56 are byte-identical:
  - Source `app.js`: `019374518ea2f0c80c0f6942bb9da3bd192c66bb7cd38de935e49f89b315fd12`.
  - Preview `app.js`: `59b064d25fcd753575466e169b948ad1ca7278cc23481dfb80d5f43aca742969`.
  - Source `index.html`: `161b2471c424842d8c597e69cc3ac3df5e4d3a73cfdb70c0a243bbfe6d97d174`.
  - Preview `index.html`: `96fc6cb880881fc72c4dfbeecda556835e5c5a54b8a96b2ec31eb5368f9bb0d7`.
- The differences provide namespaced temporary sessionStorage, fixture navigation/disclosure and disabled service-worker registration. They never fall back to production localStorage. The full source file map and fixture receipts are in `qa/archers-quay/native-fixtures.json`.
- Earlier aggregate values `9d78609da9e43d60688494e49940eb469ef4db9b6ec8f3d7df804b18000424bf` and `7f9f8c420b8603b6f83a5b0c5793fe483862fcd78b357024bbc2afc1836d06c9` hashed JSON-serialized Buffer objects rather than raw bytes. The author corrected metadata only. Independent raw-byte calculation confirmed unchanged runtime assets before testing; this was not a runtime-change epoch.
- Used the supported managed workflow: `sites-preview start /workspace/scratch/d86b57250ea4/ironroot-archers-quay-preview`, exact returned URL `http://127.0.0.1:4173/`. No separate server or tunnel.
- Native desktop Chromium, existing desktop size, 1180 × 757 captured page viewport. CUA accessibility controls, screenshots and visible canvas clicks only; no injected game state or browser storage edits. No software installation, profile clearing, device emulation, production save/settings edits or Library upload.
- Only owned QA tab 6 was opened and closed. Final tab inventory retained preexisting tabs 1 and 4; production tab 4 at `https://ironroot.stevets.ai/` was never selected or operated. `sites-preview stop` and subsequent status both confirmed stopped.

## Fixture provenance

All earlier prerequisite victories are **synthetic setup**, not browser-earned or real production history. Briefing/unlocked Archer fixtures provide 29 synthetic prerequisite records. Active checkpoints were produced by the ordinary paid engine, with natural active state rather than edited terminal flags. The browser earned only the actions/continuations explicitly described below.

`qa/archers-quay/native-fixtures.json` and preview `archers-quay-native-fixtures.json` are identical, SHA256 `b3a6110aaba26ec954ccfdc6ca7c621e397f6bcc8dfd0c3f8c0ba2b4b5ee8f16`.

| Fixture | Origin and serialized battle SHA256 |
| --- | --- |
| `locked` | Empty campaign profile, no earned prerequisites. |
| `briefing` | Synthetic prerequisites, no saved battle. Used to launch the actual fresh browser attempt. |
| `fresh-main` | Exact authored tick-zero checkpoint, gold 1100/100 and citadels 6000/6000; `3f6582de0847b67db664d2913f74752550548b3c632ba46e55cead973fed07c8`. Inspected briefing/Scout; its Resume button was not used. |
| `paid-opening-main` | Policy `northground`, seed 8101, 25.00000000000022s, gold 304.5/75.5, citadels 6000/6000; `23abd9f6ee18fe6e002642a7e58643513f176eb59bc6dc7f469915f0ef2d7c95`. |
| `terminal-near-main` | Same policy/seed, 97.79999999999659s, citadels 4592.56/990; `0084bfbbf100b63c1bfa023aaa6c38e902a45a06c2811809b55f314eafe8543e`. |
| `terminal-near-air` | Policy `supportedair`, seed 8101, 98.04999999999657s, citadels 4038/960; `77edd0903f1d951bbcaa3b5b816341492c5a836a1c4f34b59097b17e44234fe2`. This is a mixed-army fixture, not evidence of an effective distinct air strategy. |
| `legacy-reed` | Synthetic profile20 prerequisites plus canonical-equivalent v0.29 ordinary paid Reed checkpoint at 10.000000000000007s; battle `c488dd7cc91258d2463289570eae7c9b401540434e8883d1b3fb3266837f2d03`. |

Legacy source record `qa/archers-quay/legacy-reed-profile.json`, SHA256 `fd4d05eb55fec068261b896f934b5fe40e1201ac4fa7f8eeeafeb196de0a705b`, identifies base commit `853cde8c74d77f68be92329db17d8a6dc6e00aae` and equivalent source commit `544514e69260f18843df167663fd87f9428a3814`. Generator raw-byte hashes:

- `profile-session.js`: `b3fbb144c23d977f94c2a1938f08e14c9c90fcbd0d1c113fbb3474f20e6f3804`.
- `campaign.js`: `f7ca6747229778f7583c4a3ab78efd3c90a4ce6ab13465327457a1ed1f819bea`.
- `battle-codec.js`: `f76b548735cd4afa22841e4790e8a34e6e101da268fa84dd380db208d5e2a1f6`.
- `engine.js`: `021907afe0ed02af2e0f78fab05bf854b5c7ea6e4d8e2587f2fe91f839992f0b`.

## Observed flows

1. **Locked selection.** From empty `locked` profile, Story → Chapter 8 → The Archer’s Quay showed Locked, “Complete Through the Reed Beds to unlock,” and disabled “MISSION LOCKED.” No launch occurred.
2. **Unlocked briefing, rules and Scout.** `briefing` selected Chapter 8 / The Siege Coast / Archer. Goal correctly required enemy citadel destruction before 10:00 and own citadel survival, with no mandatory workshop or route. Exact rules showed all eight buildings, 1100 player/100 enemy starting gold, 6000 HP, real mines and 7.5 gold/sec, ordinary paid adaptive enemy, and normal 5:00 escalation (production ×1.65, structure damage ×1.75, citadel shots 32→18). Bonus stars were ≤5:00 and ≥4500 HP. Scout showed player three barracks + three archery ranges + one mine across all three roads, versus enemy outer foundries and middle archery production, with no protected/required building targets. Copy accurately described marching archers intercepting nearby flyers across an adjacent road when in range, without permanent all-road coverage. No promise of an effective air assault was presented.
3. **Fresh launch and browser-earned purchase.** Begin Mission from `briefing` started at displayed 00:00, about 1100 gold, both citadels 100%, and no citadel choice. Paused at displayed 00:03. Citadel menu displayed 1124 gold. Bought Extra Arrow for 190; it became chosen, Regeneration disabled, and Back returned to pause with the choice retained.
4. **Save → reload → Resume.** Saved that fresh attempt at 00:03, reloaded the page, then resumed the titled Archer checkpoint at 00:03. UI showed Extra Arrow retained and 936 gold after the short resumed income interval, not a reset to 1100. Later paused at 00:08 with the choice intact.
5. **Repeated/interrupted Restart.** Restart → Cancel preserved 00:08 and Extra Arrow. Reopened Restart; browser Back dismissed only the confirmation and returned to the same paused attempt. Opened again and confirmed Restart, which returned to Archer briefing and removed the Resume button. The briefing remained unlocked.
6. **Natural main terminal continuation.** Resumed `terminal-near-main` at displayed 01:37 and allowed normal simulation to finish, without purchases, state edits or forced result. Result displayed 01:39, three stars, both optional criteria checked, and truthful “first quay”/“more of the coast still lies ahead” copy. Battle report showed enemy citadel 0 and own 4554.48 HP; retained charts explicitly covered only resume 1:37→1:39, not earlier play. This matches the fixture’s natural 99.90s outcome; UI displays whole seconds.
7. **Replay is fresh.** Result Replay returned to Archer briefing with its earned three-star result. Launch then started 00:00, approximately 1100 gold, both citadels 100%, and an unbought citadel choice, rather than reloading the near-terminal state. Saved/returned from the brief replay attempt at 00:07.
8. **Optional medal difference and navigation.** Resumed `terminal-near-air` at displayed 01:38 and allowed normal simulation to finish at displayed 01:40 (fixture natural 100.25s). Result showed two stars, speed checked, 4500-HP criterion unearned. Report showed own 3798.64 HP, enemy 0. Campaign missions returned to Archer with the two-star record. Reopening Last battle report worked. Skirmishes continuation opened ordinary Skirmish configuration with opponent choices, Classic, Open endgame, bridge income off and fog off. No unavailable next coastal mission or full campaign completion was asserted.
9. **Synthetic legacy compatibility.** `legacy-reed` initially offered Through the Reed Beds Resume 00:10. Current runtime resumed it with Reed’s three original named positions and ordinary economy. At 00:13 bought Regeneration for 190 from displayed 793 gold. Saved, reloaded and resumed at 00:13, showing 606 gold after short resumed income and the same Regeneration waiting state. Pausing later at 00:20 retained the choice. This exercises a synthetic profile20-origin checkpoint through profile21 runtime save/reload; it does not certify a real production migration or old-writer fencing.
10. **Paid opening and visible canvas.** Resumed ordinary `paid-opening-main` at 00:25, chose Barracks, and clicked a visible legal middle-road build slot. UI confirmed “Barracks raised” at 00:35. Re-selecting it at 00:39 showed level 1, 645/700 HP, upgrade 98 and salvage 64. A later screenshot visibly showed its continuing combat damage at 00:47. This was an actual additional browser-paid 140-gold placement, not a fixture-provided purchase. Saved at 01:10 and reloaded; Resume retained 01:10. That final checkpoint was not resumed, and building survival at 01:10 was not asserted.

## Layout and evidence

At the available desktop viewport, title, sticky launch/resume actions, briefing, rules, Scout diagram/rosters, citadel choice, pause and result screens were readable and usable. Long content intentionally scrolls inside the modal while primary actions remain accessible. The building deck horizontally scrolls for all eight buildings. The ordinary battle field and bought middle barracks were visibly inspected. This is one desktop size, not responsive-device coverage. Fixture links are visibly developer-only disclosure and are not production presentation.

Eight unchanged JPEG screenshots, all 1180 × 757, are outside the source tree in `/workspace/scratch/d86b57250ea4/ironroot-archers-ui-evidence/`:

| Filename | Visible evidence | SHA256 |
| --- | --- | --- |
| `01-locked.jpg` | Archer locked and launch disabled | `25c6ccddcd1e9f24b5d2483e91b42fd1d9d3a23f4c6eb0c17704810ff35cf7c7` |
| `02-scout.jpg` | Exact escalation/bonus copy and expanded Scout heading | `6fc8b663b148f8ca87f465a4b151f86208bdd3ef6393d25ee929145fc027384f` |
| `03-scout-map.jpg` | Scout’s readable two-column starting rosters; despite filename, diagram is above this scrolled view | `70d517d829abd37bd92c3dfdd154f95c743404b2e5987fe8158d2bd05859e3ed` |
| `04-paid-extra-arrow.jpg` | Actual browser-earned Extra Arrow choice and disabled alternative | `48bf2215d525bc450797f6e82b8097ec6f108be75929506d59e1ffff640a6b57` |
| `05-natural-core-victory.jpg` | Natural three-star result, partial-coast copy and continuation actions | `9f4eb0abe611659c02d60f31ee678a7b5af9348bab87c3ca6477f6b9571fbbf1` |
| `06-mixed-two-star.jpg` | Natural two-star result with HP medal unearned | `e529d6e7603646f4d1c4b9fb6463a7578521f0de685d1fd64c67020015fb1905` |
| `07-legacy-retained-choice.jpg` | Legacy Reed after save/reload/resume, Regeneration retained | `8b2c8ea102e4aa1fda4ec98e1ad74cf26aaae231c3d227e2252259995927f1c8` |
| `08-scout-diagram.jpg` | All three roads and both starting formations | `a56364790f419b3ad0c4bbaa89b81f8c34237a3a2d680ec3e1a55e63e36adb22` |

The paid-barracks screenshot was displayed during QA but its first file-save command exceeded the executor argument-length limit and did not execute. No persistent paid-barracks screenshot is claimed. The eight files above were separately verified by filesystem SHA256. An initial attempt to save screenshots directly from the separate CUA runtime found the workspace path absent; screenshots were instead transferred from the tool’s returned bytes. Neither evidence-saving issue changed application/source bytes.

## Explicit limits and disposition

- No from-zero human mission victory, novice difficulty certification, or broad browser/OS matrix. Prior checkpoint actions and synthetic prerequisites were not browser-earned. Source review, paid-run matrices and independent replay checks are separate evidence, not native successes by this reviewer.
- No full defeat/timeout flow, 1-HP boundary, every star boundary, live 5:00 escalation, full-duration fresh run, sustained performance, audio listening assessment, every build/upgrade/spell, all keyboard bindings, or every navigation/history combination. Tested Back was the interrupted Restart dialog; Forward was not exercised.
- No physical phone, touch or device emulation, PWA installation, offline or service-worker update behavior. Device emulation was out of scope and was not retried or bypassed.
- No production localStorage, settings, live earned progress, real-player migration, backup import/export, simultaneous old/new-tab writer conflict, protocol-byte inspection in browser, cross-tab synchronization, or persistent storage across closing the isolated tab. Native legacy evidence is only the isolated fixture compatibility flow described above.
- No useful distinct air-strategy claim. The air-labeled checkpoint’s terminal UI was checked, but the rejected 500-gold two-aerie strategy was not rehabilitated by its mixed-army victory.
- No full Chapter 8 or ten-chapter campaign completion. “Mission 1 of 1” and “current Siege Coast route” describe the current small catalog only; the result correctly says more coast remains. Chapters 8, 9 and 10 must each still reach the requested five missions.
- No source/runtime changes, deployment, release approval, production inspection or software installation by this reviewer. Only this review document was written in the author checkout after author coordination. The managed preview is stopped and the owned QA tab is closed; no cleanup caveat remains.
