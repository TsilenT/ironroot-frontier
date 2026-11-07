# Ashen Crossroads — optional Field Trial candidate

Based on main `ea9da128e1a2d9902dc3261c045dd8ec1c1f9010` (v0.17.2). This branch is a v0.18.0 draft candidate, not a deployment. The repository has no AGENTS.md or .agents/skills instructions. The existing production URL and hosting are unchanged.

## The choice

Destroy **any two of three named enemy positions within 4:00**, or destroy the enemy citadel. The third position may remain standing. The citadel alternative is explicit because ordinary engine victory stops combat immediately.

| Position | Road | Pressure and opportunity |
| --- | --- | --- |
| Pinewatch | North | Forward level-2 tower, with an archery range behind it. Siege is useful against the static defense, but its slow push needs time. |
| Stonegate | Middle | Level-3 barracks. Veteran warriors pressure the center; a screen and splash can break their line. Leaving it alone benefits from a defensive tower. |
| Ember Roost | South | A deeper level-2 aerie. Archers can answer the flyers, which may also engage troops on the adjacent road. |

Start with 650 gold, a healthy 6,000-HP citadel and one ordinary barracks on each road. Enemies use the disclosed fixed formation. The existing seven-building authored automatic-air ruleset is unchanged. No unit, AI, routing, economy, production or combat stats change. Ordinary flyers remain a viable alternative: a separate paid aerie strategy destroys Stonegate and Ember Roost while Pinewatch and both citadels live.

The trial joins the existing selection, hint, scouting, result, record, history and backup flows. The objective dock reuses stable native focus buttons and the reserved mobile layout. Names and remaining/destroyed states are visible during play; focusing a standing position cancels placement and centers the camera using the final field dimensions. The counter moves `0/2 → 1/2 → 2/2 · Complete`. Results identify the surviving optional position. There is no new progression system.

## Compatibility

- The legacy five trial descriptors and their all-of semantics stay unchanged. Only the current trial catalog gains the sixth entry.
- New trial identity is `trial/ashen-crossroads@2`, with the existing `frontier-authored-air-local@1` ruleset and Classic map. Revision 1 rejects this current-only ID.
- Campaign catalogs, story order, earned stars/unlocks and 19 missions / 57 stars are unchanged. Historical campaign catalogs remain distinct and unchanged.
- Protocol 8 upgrades only the verified profile marker. Exact protocol-7 code is hash-verified from the main base; already-open and later-opened old clients cannot overwrite, delete or recover-import over the new record. Campaign data, preferences, history and existing trial records remain intact.
- Backups validate records against the current trial catalog. Modern result identity works through the existing history codec; legacy history admission is unchanged. No battle-save migration architecture or report schema is added.
- Version/cache and desktop package metadata advance together to avoid a stale asset identity. No desktop build, signing or store work was performed.

## Measured route evidence

`node tests/ashen-crossroads-balance.mjs` reproduces the compact per-run measurements. `tests/ashen-crossroads-policies.mjs` contains the purchase plans, with one attempted legal purchase every 3 or 6 simulated seconds and a 0- or 6-second opening delay. The 36 runs cover every combination of three pairs, seeds 719/57/999, two cadences and two opening delays. Seed 999 also roundtrips through the existing battle codec in the Node test.

Every counted route destroys **exactly the intended pair**, while the third target and both citadels remain alive, and the engine winner remains null. Each purchase checks its real cost and built counter; gold is reconciled against starting gold, income, kill rewards and spending. Every run observes 0/2, 1/2 and completion. Citadel victories and incidental pairs were excluded during tuning.

| Intended pair | Passes | Time (s) | Gold spent | Gold left | Third target HP | Enemy citadel HP |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| North + middle | 12/12 | 93.65–130.10 | 895–1,165 | 13.50–288.50 | 245–518 | 6,000 |
| North + south | 12/12 | 74.20–127.00 | 840–1,110 | 53.50–253.00 | 1,260 | 4,408–6,000 |
| Middle + south | 12/12 | 66.55–99.60 | 815–1,035 | 4.25–220.50 | 1,379–1,400 | 4,508–6,000 |

All 36 retained the player's 6,000 HP with these selected plans. These are demonstrations of viable choices, not claims of equal efficiency, human difficulty or a 10/10 experience. Purchase order and position matter: slower unprotected pushes can lose or reach the citadel before their intended second target. Those are not counted as route proof. Idle and unsupported pushes lose on three seeds; paid tower-only defenses reach the 240-second timeout with both citadels alive and no objective win. Synthetic unit tests separately cover exact-deadline success/failure and defeat priority.

## Verification and limits

Validated with Node 24.22.1, Playwright 1.65.0 and Chromium 155.0.8059.79:

- Root suite: **1,431 passed, zero failed, one existing optional desktop-dependency skip** (1,432 total).
- Runtime parse and inventory preflight: passed, 51 runtime files.
- Existing browser harness `npm run check`: passed, including frozen fixture and continuation checks. New browser modules also pass `node --check`.
- New real-time trial suite: **20 passed**, zero failures/skips/retries, across all four profiles plus the narrow profile's 320×480 resize.
- Selected existing Back, protected-control, keyboard and hidden-hint regressions: **27 passed, zero failed, nine pre-existing mobile exclusions for desktop keyboard cases**.
- Native paid UI proof: **4 passed**, zero failures/skips/retries, with exact full-game replay and no engine/counter edits. North + south were destroyed in every run; Stonegate retained 1,260 HP, and the player's citadel retained 6,000 HP. Every run paid 1,015 gold through five real build-bar/canvas purchases. Compact action/tick/cost evidence is in [paid-ui.json](ashen-crossroads-evidence/paid-ui.json).

| Native paid profile | Time (s) | Gold left | Enemy citadel HP |
| --- | ---: | ---: | ---: |
| Desktop 1180×757 | 101.15 | 202.75 | 5,021 |
| Portrait 390×650 | 104.20 | 220.00 | 4,758 |
| Narrow 320×568 | 92.50 | 155.50 | 6,000 |
| Landscape 844×390 | 101.80 | 206.00 | 5,000 |

Initial checks found a real camera-clamping issue after cancelling placement changed the deck height. Refreshing renderer dimensions before focusing fixes it; the original exact-camera assertion now passes. Test harness imports, current-catalog versus historical-catalog loops, and synchronized package-lock version assertions were updated without removing downstream assertions. Initial paid UI instrumentation had a selector error and incorrectly assumed enemy gold remained zero; those observer errors were repaired. The first mobile build order reached the documented citadel alternative, so those runs are **not** counted as route evidence; the later order covers the southern flyers earlier. No content or combat rule was changed to manufacture those results.

Reviewed screenshots: [short portrait, 320×480](ashen-crossroads-evidence/short-portrait-targets.png), [landscape, 844×390](ashen-crossroads-evidence/landscape-targets.png), [phone result from the native paid route](ashen-crossroads-evidence/phone-result.png). Names, remaining states, target controls, Build and navigation fit. The result explicitly distinguishes the third standing position.

Reproduction commands:

```sh
npm test
npm run check
npm run check:release
node tests/ashen-crossroads-balance.mjs
cd qa/browser
npm ci
npm run check
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npx playwright test ashen-crossroads.spec.mjs
cd ../..
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium qa/browser/node_modules/.bin/playwright test --config qa/field-trial-browser/playwright.config.mjs
```

The real-time browser suite covers selection/scouting, target geometry and focus, partial/reload, Back/Forward, restart/retry, results/records, backup export/import and old-client fencing on desktop, portrait, narrow and landscape. The narrow profile additionally checks 320×480. Simulation-only paid UI coverage uses bounded callback-preserving clock increments and the shipped 2× speed control, with native build controls/canvas clicks and exact ordinary-engine replay. It does not establish real-world pacing or gesture/storage timing; those stay real-time in the separate suite.

No complete large browser matrix, physical-device, non-Chromium, deployment, signing or store certification is claimed. The original downstream input/navigation/hint/keyboard assertions remain in place. Screenshots are emulated Chromium evidence.


Focused existing browser regression command:

```sh
cd qa/browser
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npx playwright test protected-objectives-pointer.spec.mjs back-navigation.spec.mjs keyboard-controls.spec.mjs hidden-coaching.spec.mjs --grep 'compact Build Close|shared mobile field|active battle Back|restart and guide|Back cancels held activation|ordinary build and HUD|remapped first roster slot|native disclosure, select|hidden hints stay hidden'
```


## Changed-file manifest

```text
README.md
desktop/package-lock.json
desktop/package.json
dist/app.js
dist/backup.js
dist/challenges.js
dist/index.html
dist/profile-session.js
dist/scouting.js
dist/service-worker.js
dist/styles.css
docs/ASHEN_CROSSROADS.md
docs/FEATURE_DELIVERY.md
docs/ashen-crossroads-evidence/landscape-targets.png
docs/ashen-crossroads-evidence/paid-ui.json
docs/ashen-crossroads-evidence/phone-result.png
docs/ashen-crossroads-evidence/short-portrait-targets.png
package.json
qa/browser/ashen-crossroads-fixtures.mjs
qa/browser/ashen-crossroads.spec.mjs
qa/browser/validate-flight-order-fixtures.mjs
qa/browser/validate-production-v015-upgrade.mjs
qa/field-trial-browser/.gitignore
qa/field-trial-browser/paid.mjs
qa/field-trial-browser/playwright.config.mjs
tests/ashen-crossroads-balance.mjs
tests/ashen-crossroads-policies.mjs
tests/ashen-crossroads.test.mjs
tests/autonomous-air-authored.test.mjs
tests/autonomous-air-save-compat.test.mjs
tests/field-trial-profile.test.mjs
tests/fixtures/profile-session-v0172-source.mjs
tests/keyboard-persistence.test.mjs
tests/mobile-startup-fixture.mjs
tests/profile-session.test.mjs
tests/protected-objectives-ui.test.mjs
```
