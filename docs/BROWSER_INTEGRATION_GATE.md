# Combined browser integration gate

## Status and candidate boundary

**Prepared, not browser-executed.** This handoff changes only `qa/browser/` and this document. No browser or HTTP server was started, no dependencies were installed, and no fixture/runtime bytes were changed by this gate work.

- Dependency-free browser syntax and fixture validation: PASS (`npm --prefix qa/browser run check`).
- Production fixture: PASS, exactly 33 runtime files / 668,075 bytes. Historical manifest SHA-256: `1bfa09e053e363e0589a8a96180be04cc4821b0b644b5b5923de66b83b6f6ff7`.
- Real browser execution, Playwright discovery, service-worker takeover and actual offline response verification: **UNRUN** in this handoff.
- After the parent’s metadata-only bump, strict upgrade preflight: PASS for root package `0.13.0` / worker `ironroot-v0.13.0`. The same-identity negative control still fails as required. Runtime inventory remains 41 files / 788,320 bytes. Actual browser takeover remains UNRUN.
- Package and worker versions are read from the candidate, not hard-coded as “0.12” in the update expectation. The gate requires matching package/worker identity, a strictly newer version, and changed worker script bytes.

The parent must freeze and inventory the final combined `0.13.0` candidate, then use that exact directory in the authorized cloud browser runner. A prior native preview or a Node pass is not evidence that these browser cases passed. Re-run after any later candidate or harness change.

## Matrix

Registration-only Node counting finds **211 test definitions × 4 configured projects = 844 matrix entries** across 17 spec files. This is an accounting check with a temporary test-registration stub, not Playwright discovery or execution. The three pre-existing non-phone skips in the coordinate-specific phone regression remain. Confirm counts with real `playwright test --list` in the runner before execution.

| Spec | Definitions | Four-project entries |
| --- | ---: | ---: |
| accessibility-backup | 18 | 72 |
| battle-report | 24 | 96 |
| campaign-onboarding | 9 | 36 |
| campaign | 10 | 40 |
| expanded-campaign | 34 | 136 |
| field-reference | 4 | 16 |
| fonts | 2 | 8 |
| integrated-flow | 6 | 24 |
| maps | 33 | 132 |
| offline-shell | 1 | 4 |
| production-upgrade | 5 | 20 |
| profile-upgrade | 14 | 56 |
| protected-objectives-pointer | 2 | 8 |
| regression | 21 | 84 |
| service-worker-update | 2 | 8 |
| storage-recovery | 6 | 24 |
| training | 20 | 80 |

Projects remain phone 390×650, narrow phone 320×568, landscape 844×390, and desktop 1180×757. Mobile projects use touch input. The existing two-worker configuration and test-level timeouts are retained.

## Integrated flow coverage

- Campaign is the default entry. Skirmish requires an explicit mode choice. Tests intended to exercise skirmish select it rather than silently starting First Watch.
- First Watch begins on a one-road map without a free player building, exposes two real paid cards, and uses normal 140/175-gold construction. Forked Road has two roads and four paid cards. Optional introduction completion does not increase the legacy 16-mission/48-star totals.
- Skipping the introduction grants no stars and creates no battle. Paid-run near-result checkpoints verify First Watch → Forked Road → Emberwatch navigation, primary Continue focus, shared controls and authored roster identity.
- One-/two-star mission results expose optional replay. Three-star results do not. Worse retries preserve existing best stars/time. Replays are fresh authored battles, not reused terminal state.
- Rootwarden skirmishes expose eight cards, charge the actual 210-gold lodge cost, spawn the real 800-HP Rootwarden, and show the active six-unit field reference. Open-ended and sudden-death selections remain bound to engine/envelope-v3 identities through save, reload, Resume and backup-v2 restore. Historical importers reject new-format backup content.
- Arrow volley uses the real control, actual 75-gold cost and cooldown.
- Historical and authored legacy battles retain their original engine-v1/v2 and envelope-v2 identities and seven-card roster. New skirmishes are asserted as v3 explicitly; legacy restore assertions were not broadened to accept any version.
- Shared mobile Build helpers press only real controls. A hidden desktop Cancel is routed to the actual visible mobile Cancel placement control, rather than opening the drawer, clearing selection and then trying an invisible button.

## Preserved behavioral contracts

No failing test was deleted, no camera/input/layout tolerance was widened, and no browser test was marked expected-failure to manufacture a pass. The strict minimap oracle still uses the trusted delivered click coordinate, retains pointer/click telemetry, and performs no retry/re-centering. Native held-pointer interruption, training click/focus ordering, scrolling/hit-testing, history corruption retention, recovery export, backup import barriers and preference/history write verification remain in the matrix.

The shared battle decoder deliberately rejects already-ended saves. Older fixtures that removed the last objective or stored zero-HP bases have therefore been replaced with admitted *active* snapshots, followed by a real fixed simulation step. Paid reference policies produce primary campaign/trial completions. Disclosed synthetic imminent damage produces protected/alternate/base loss cases. Each fixture is independently admitted, restored and stepped before the browser test runs; exact outcome/counter/identity expectations remain.

A “completed at time zero” save is no longer a valid Resume case. Its retained browser case starts at zero and earns completion at 0.05 seconds with two exact timeline points. The zero-duration, single-point report contract remains independently checked at the data layer. This is a deliberate admission-contract update, not a claim that browser zero-duration completion was exercised.

Literal copy expectations follow the reviewed copy. Legacy mission validation continues to compare mechanics, while explicitly excluding narration fields that the user requested be rewritten. Historical source fixture files and their hash manifests remain unchanged.

## Production 0.12 → candidate upgrade

`production-v012-fixtures.mjs` reads only the pinned historical production fixture. The server validates it before listening and exposes only an explicit allowlisted update session plus a fixed GET/HEAD historical route. Request parameters cannot select arbitrary filesystem roots. Historical 0.7 production and **private-QA 0.8** update cases remain separate; 0.8 is not described as a production release.

Four independent disposable sessions cover Classic, Long March, Twin Span and authored Far Beacons. Each:

1. Seeds known five-domain synthetic data admitted by the real 0.12 campaign/backup/profile modules, including nondefault settings, trial records, map-bearing history and distinct best times. Three scenarios carry all 16 missions/48 stars; Far Beacons carries 13 missions/39 stars and legitimate prerequisites.
2. Starts and pauses the battle through the actual historical UI. Map skirmishes also buy an actual archery range. Captures exact domain strings and the separate ready-protocol-2 marker; verifies exact current-engine restoration before time advances.
3. Installs the real old worker, verifies every precached hash and independently verifies the uncached worker script. An unrelated cache is retained as a deletion-scope control.
4. Keeps the old document alive, advances only its random session, invokes the genuine registration update helper and waits for a different activated controller. Takeover alone must leave every profile byte unchanged.
5. Opens the candidate offline. The only automatic profile change allowed is protocol 2 → 3 with the same epoch. All five domain strings must remain byte-exact. Every candidate precache entry must be served by the worker with the expected hash, all five fonts must load, and complete font notices remain accessible.
6. Resumes and re-resumes the legacy battle without changing its map, ruleset, envelope/engine schema, formation or authored identity. The initial persisted snapshot is exact; live UI time may advance only within the existing strict three-second bound.
7. Exports/validates preserved progress, settings, trial and history content. Opens and reloads the independent training route offline, pays 140 gold for a barracks, observes the real first warrior, restarts, skips and returns without any persistent profile change.
8. Starts and reloads a new v3 Twin Span skirmish offline. Only the deliberately replaced battle domain may change. Attaches source/candidate versions, worker/script and shell hashes, actual update timing, markers and save comparisons.

The takeover case does not claim a natural full v0.12 mission completion or human balance verification. Full current result/report coverage, real old-QA save-to-report continuation, portable restore and all five natural practice lessons are covered separately by the retained suites.

## Historical stale-client limitation

The real 0.12 profile implementation refuses ordinary reads/writes and unconfirmed imports after protocol 3. The upgrade cases verify all 15 five-domain read/write/remove attempts fail without changing bytes.

**Do not claim an absolute old-client fence.** The historical UI can explicitly restore a legacy backup with `recover:true` after the real replacement warning, recovery-consent checkbox and “Replace local saves” action. A separate disposable negative-control test deliberately acknowledges that warning while retaining the modern tab. It demonstrates the historical protocol-2 replacement, then verifies the modern tab blocks every subsequent normal read/write/remove and import, keeps the recovery dialog open, and does not overwrite the replacement.

This historical limitation is immutable source behavior. No current code is used to impersonate the old client, no old fixture is patched to hide it, and no universal downgrade-safety claim is made.

## Runner order and evidence

From the frozen combined checkout:

1. `npm --prefix qa/browser run check`
2. `npm --prefix qa/browser run check:upgrade` (must pass after the actual bump)
3. In the authorized runner with the intended Playwright/browser versions installed: `npm --prefix qa/browser run list`
4. `npm --prefix qa/browser test`

Keep the full test list, browser/version/runtime inventory, JSON/HTML result reports, failures/traces/screenshots and update attachments tied to the exact candidate hash inventory. Separate PASS, FAIL, SKIP and UNRUN. Do not infer real-device, physical-controller, Safari/WebKit, packaged-desktop or publication coverage from Chromium loopback tests. No remote commit or publication is part of this gate.
