# Guided practice accuracy and isolation review

Date: 2026-11-06. Scope: isolated local Ironroot 0.12 candidate only.

## Verdict

The independent local audit passes **63 checks, 0 failures**. It completes all five prescribed lessons for six seeds through public, paid actions: **30 positive runs**, covering **7,142 paired fixed ticks**. Five additional complete lesson runs use irregular caller frame durations and compare **1,315 identical actual engine update calls** against an unobserved engine. Every comparison is exact serialized-state equality, including RNG, accumulator, IDs, economy, stats, health, cooldowns, effects and projectiles.

Final source-bound revalidation includes the authorized VFX identity reset, accurate pause feedback and portrait UI candidate. Every listed source file is checked unchanged from the beginning to the end of the audit. This document does not approve publication or a release; the separate native UI and final source-dist gates are not covered by this report.

The engine, main application, campaign, objectives, challenges, persistence, backups, profile session, renderer and input guard remain byte-identical to frozen 0.11. All 25 protected baseline runtime files are checked. Existing game CSS differs only by the two explicitly checked training-title-link rules. The 248-file frozen 0.10 and 304-file frozen 0.11 source manifests match before and after the audit.

No browser, server, network transfer, commit, ref change, hosting or publication was used. The actual UI controller is exercised with a stub DOM and no-op canvas, not a real browser. Native layout, focus, touch and real-profile preservation review belong to the separate native UI review.

## Reproduce and evidence

From the isolated 0.12 directory:

```sh
node qa/training-audit.mjs > qa/training-evidence/training-audit.json 2> qa/training-evidence/training-audit-progress.log
```

The JSON includes every named check, exact audited source hashes, each lesson's setup and allowed site, reference engine prices, every positive run's paid-action trace and initial/final serialized-state SHA-256, independently captured spawn/credited-damage events, lesson evidence, frozen-directory checks and labeled synthetic adversarial outcomes. The harness writes no files itself; shell redirection creates only QA evidence. Final evidence, harness and review checksums are recorded in `qa/training-evidence/SHA256SUMS`. Run `sha256sum -c qa/training-evidence/SHA256SUMS` from the project root to verify them.

The aggregate Node suite and syntax/preflight gates are recorded separately. Their evidence must be read separately; this accuracy audit does not substitute for them.

## Real lessons, real prices

All legal player actions use `Game.build` or `Game.upgrade`. Each normal lesson has sufficient disclosed starting gold. Costs are measured from treasury deltas at zero elapsed simulation time, not inferred from UI labels.

| Lesson | Actual paid action | Prescribed site | Measured observation time |
| --- | --- | --- | --- |
| First company | Barracks: 140 gold | 1110, 450 | 1.25 seconds |
| Shields and arrows | Archery range: 175 gold | 970, 450 | 8.50 seconds |
| Mine and upgrade | Mine: 190; same mine level 2: 133 | 410, 450 | 2.00 + 2.00 seconds |
| Tower siege | Foundry: 270 gold | 1250, 450 | 31.70 seconds |
| Air counter | Archery range: 175 gold | 970, 450 | 14.05–14.10 seconds |

Seeds: 0, 1, 7, 42, 12012 and 4,294,967,295. These are simulation times; reading and action selection are paused. The whole prescribed course needs approximately 59.5 seconds of simulation plus reading/actions. Times are not speedrun or human-difficulty claims.

All currently offered sites are covered: one highlighted site per build step. The audit also attempts every other currently engine-legal marked site in each lesson and verifies rejection: 23, 22, 23, 23 and 22 alternatives respectively. This is deliberately guided placement, not a claim of successful play from every unrestricted location.

The reference test independently exercises all seven building prices and both upgrade prices through the unchanged engine. Mine observation verifies the original paid mine ID, its level, real 7.5 then 8.75 gold/second income and actual treasury parity. The UI now derives its paused income display from living mines rather than the engine's last-tick cached value.

## Truth of observation

The training implementation observes only its own Game instance. It does not modify Game.prototype, shared definitions, engine files or numeric rules. The independent audit separately observes actual spawn events and the engine's FIFO damage queue; it checks positive HP removed, not just projectile coordinates, attack animation or aggregate kill counters.

- Production succeeds only on an actual warrior from the precise paid barracks. A preexisting or unrelated allied warrior is not enough.
- The shield lesson records actual enemy archer damage to a warrior and real damage from an archer produced by the paid range while a living friendly warrior is ahead in that lane. Evidence IDs, source building, damage and timestamps match the separate audit log.
- Siege requires a unit from the paid foundry to remove HP from the original full-health tower ID, then an actual death event for that same ID. The independent log accounts for all 1,000 tower HP. Ordinary siege takes no tower hits in these prescribed runs, consistent with unchanged targeting geometry.
- Air follows a particular gryphon from the authored enemy aerie, requires actual damage by an archer from the paid range, then that same gryphon's defeat. Unrelated casualties cannot complete it.
- Tower and air success wording reports damage followed by target defeat. It deliberately does not promise that the required attacker landed the final blow.
- Synthetic simultaneous damage queues prove that a shot emitted after an unrelated lethal queued hit gets no damage or success credit. Replacing the target with another entity of the same type/position does not transfer its identity.

Adversarial cases also include a wrong-producer archer, an unrelated casualty after a valid hit, an artificial kill-counter increase through a real unrelated death, target disappearance, a substituted mine and a spoofed cached income rate. These are intentionally injected test states, not claims that ordinary player inputs can access engine internals.

## Timing, gates and recovery

Incorrect types/sites, invalid coordinates and IDs, early Continue, early/duplicate upgrade, repeat build, unavailable gold, malformed elapsed time, active-observation commands and paused commands are rejected without spending, engine mutation or step advancement. Snapshot copies cannot mutate private control state.

Instructions and completed steps freeze engine time. Continue advances only a completed step or explicitly begins a watch. Pausing freezes the exact serialized engine, and completion stops subsequent updates. Blur/hidden-page behavior, explicit resume, replay, Exit and bfcache fresh-session reset are exercised through the actual controller with a stub DOM. Manual-pause feedback is checked not to claim running. The real VFX class resets exactly once for each new Game identity, including consecutive bfcache-created sessions that reuse attempt ID 1; same-game step changes and pause do not reset it. These control-flow checks do not claim visual rendering verification.

Training intentionally breaks a caller frame into at most 0.05-second engine calls so it can stop at the first observed success/failure. The irregular-frame comparison uses the **same actual inner calls**, with outer durations of 1/60, 0.1, 0.25, 0.007, 0.043, 0.15 and 2 seconds. It does not claim bit-for-bit accumulator equality with one unsplit outer frame, whose floating-point grouping may differ. The ordinary per-call cap and engine rules are unchanged.

Timeout at the stated simulation limit, defeat, draw and an unrelated early friendly citadel win produce failed attempts, not training success. Retry creates a fresh engine at the original seed, with new attempt identity and cleared observation state. Old retained Game references cannot affect the new attempt. Skip is explicitly skipped; finished review does not convert skipped/untried lessons to completed ones. Exit is permanent for that session.

Gold recovery runs real income **and real combat**, stops at affordability and never buys automatically. A defensive zero-treasury injection was tested for all five lessons. Production, economy/upgrade, siege and air recover and complete. The shield lesson's enemy can be destroyed while the player saves for support, so that attempt truthfully times out at 100 seconds; Retry restores a valid funded setup. Normal permitted actions cannot create this shortfall because wrong actions do not spend and initial grants cover required actions. The recovery path is not disguised invulnerability or a guaranteed win.

## Isolation and unchanged statistics

The UI import closure contains only training, engine, renderer, VFX and input guard modules. It cannot reach the main app, persistence, backup, campaign or profile modules. During actual UI controller boot, every paid lesson, replay, blur/pause, exit and bfcache reset, storage/cookie/network access traps record **zero accesses**.

This establishes source/controller isolation; it is not a browser-profile before/after measurement. The audit did not open or touch a user's browser save/history/profile. The separate native UI review must report any such real-profile preservation evidence.

Each positive fixed step is serialized and restored through the unchanged strict engine validator. Building/unit HP matches the ordinary type/level formulas; flight flags, production, movement, damage, counters and RNG match the unobserved control. All shared constants and Game prototype methods retain their initial values/references after every session. Retry and lesson changes restore pristine authored engines without state leakage.

The authored training setups are intentionally asymmetric and disclosed: fixed starting gold, selected free level-1 starting structures, normal 6,000-HP citadels, empty initial armies and no enemy AI. The setup removes the usual two starting barracks and resets initial counters before placing the disclosed structures. There are no hidden damage, HP, speed, range, cooldown, income, production-rate or protection modifiers. These scripted learning paths do **not** establish human balance, campaign difficulty, AI strength or unrestricted tactical success.

## Findings resolved during review

1. The first draft accepted any allied warrior. The final implementation requires a real spawn linked to the paid barracks ID; the unrelated-producer negative passes.
2. Projectile/HP coincidence was not enough to attribute damage. Exact per-instance spawn/fire/damage observation replaced it; zero-credit same-tick attacks, target replacement and unrelated kills now fail correctly.
3. Paused income HUD initially showed stale cached rates after build/upgrade. The UI now derives the live rate without mutating engine state.
4. Final review labels were made neutral for skipped material, with individual outcomes and counts retained.
5. Native/source review identified stale manual-pause feedback and old visual effects carrying into new attempts. Final controller tests verify state-derived feedback and Game-identity-based VFX reset, including repeated attempt IDs after bfcache restoration.

No unresolved engine-accuracy or progression-isolation defect was found in the audited scope. Native browser review, portrait layout, aggregate tests and final source-dist preflight remain separate.

## Reviewed source hashes

| Source | SHA-256 |
| --- | --- |
| `dist/index.html` | `042b8136f701354f8f219acf9030bea9250162f90a20db5fee04d2e7e1f3c9c2` |
| `dist/service-worker.js` | `9a79237a4fa6925cc0db86d588287eb1758355bcee20714a9bc803745ce9f88c` |
| `dist/manifest.webmanifest` | `8ec10e5c5b6577ba8df0f1296c387b7794dcc8c62f5853dcbfb2c374d835d06e` |
| `dist/styles.css` | `7f54f1d7dd6c04c9f6ac6faa8954f44e7761d6e0b4caf9745d475e5681e043c5` |
| `dist/engine.js` | `e47a168c099c2a4e1f45b238d5224cb44a02433a7cff06adbfb87095c4d56bc7` |
| `dist/training.js` | `5a26edb4615a87723f317e44289e03d4444eddb7d820d2c39067abfcb548a770` |
| `dist/training-app.js` | `dd5dd95c045d3cfa5fdea15ecaeeded05042f83bd5cd56d2c6f851704274782a` |
| `dist/training.html` | `fee383c2fd77a49852604227bdf9309029215a30b93c4a1ff370a5f9f285c108` |
| `dist/training.css` | `9c0f18a28a6f492f85b97a9ba0c8de5d45dbcaf7ac66ca73e07eb013d1cd50bb` |
| `dist/input-scope.js` | `e0bcfe941db36a885b050303c69cb960bce5d9bd00e232dda3cc5f9c6aa35108` |
| `dist/render.js` | `d917f6ad203fbb7c018de081d147c372e349b8b4935f7bbc77f5bff472545106` |
| `dist/vfx.js` | `af55fa0311735ab05706d6be8a6d540773062f8c8be903743120c7952b4d5e95` |
| `dist/app.js` | `fc93f44b556bff11b758308a0a38abaadb41106a3d821cee517d99c8a096662c` |
| `dist/persistence.js` | `8ce2338429ad1ade80cccae5c6987b76b3ec448f8018cc5dd8bd1b2229192512` |
| `dist/campaign.js` | `49ec88047efdf66f88a677a3f3a4de5b0067f97fef4df8a71cef05044da66781` |
| `dist/backup.js` | `f16de6ad26420dc448b3802b480e890b91d1b1b5ebe31f0eee6012ca2b5dc331` |
| `dist/profile-session.js` | `54cc0361a71511ee0d34b9f79e73463e6856a1a99af0ff08d23fe1634f1ea04d` |
| `qa/training-audit.mjs` | `799c6e1d201c94892afb51eb11967014996dc1de896848e78fead725513f3ad4` |

## Limits

- Local deterministic and synthetic tests are not human playtesting or competitive balance certification.
- The stub DOM does not verify layout, actual canvas pixels, native focus, real touch delivery, screen-reader experience or browser performance.
- No physical touch/controller, low-powered hardware, non-Chromium or packaged desktop result is claimed.
- No tutorial persistence/resume format exists. Engine serialization validity is tested as a correctness check, not an instruction to save training into the user's battle slot.
- Frozen baseline checks and local source-dist validation do not authorize any external transfer or publication.
