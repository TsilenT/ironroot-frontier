# Immediate-purchase validation

Candidate: v0.20.1, based on `cd63f7c543b7c8425dc304105e229ff09d01e043`. No merge or deployment.

## Executed

- `npm test`: 1,505 total, **1,504 pass / 0 fail / 1 optional skip**, 57.5 seconds. See `full-suite-final.log`.
- `node --test --test-concurrency=4 tests/citadel*.test.mjs tests/bridge-profile.test.mjs tests/field-trial-profile.test.mjs tests/keyboard-persistence.test.mjs tests/profile-session.test.mjs`: **121 pass / 0 fail**. See `focused-regression.log`.
- `node scripts/check.mjs`: all runtime JavaScript modules parse.
- `node --check` for the two changed current browser QA modules: pass.
- `node scripts/verify-runtime.mjs`: **54 files / 1,036,435 bytes**. `runtime-inventory.json` records SHA256 for every runtime file. The inventory was identical before and after native browser QA.

The optional skip is `installed desktop tooling preserves the scoped minimatch compatibility contracts`, because optional desktop build dependencies are not installed. No dependencies were installed or changed for this patch.

## Retained initial failures

`focused-initial.log` retains the initial 42-pass/1-fail citadel run. Its new stale-writer test incorrectly expected `unsupported-protocol` for ordinary import, whereas the exact released protocol-10 writer reports `invalid-marker`; recovery import does report `unsupported-protocol`. The test was corrected to require ordinary import failure and the exact recovery error, with no runtime change. The repaired case passes in `focused-regression.log` (121/121) and the final full suite.

`full-suite-initial.log` records 1,491 pass, 8 failed cases and 1 optional skip. The failures were missing historical-input availability checks: four root JSON oracle files, ten compressed campaign evidence files, a frozen manual-flight spec and a current production-v0.15 upgrade helper. These were then materialized from the exact Git base with Git-blob verification, without editing the historical files. Once reached, the current upgrade helper's protocol-10 assertion required the same protocol-11 expectation change as the current profile tests. The final full run succeeds. The archived source/evidence was not rewritten to make tests pass.

## Native desktop sequence

The authorized local preview served the candidate runtime. A retained QA profile already had earned campaign progress, so this was a fresh battle attempt rather than an empty-profile claim. No profile reset or simulated game clock was used.

1. Start Roadside Watch: displayed clock 00:00, gold 420, TEACHING PAUSE. Opening Pause shows no Citadel choices entry. Resume returns to teaching, still at 00:00.
2. Select Barracks and click a legal highlighted site. The normal 140-gold purchase releases the teaching hold. Immediately pause: displayed clock remains 00:00 and Citadel choices is available.
3. Open choices: both buttons enabled, gold 280, no countdown. Press 1, R and Space from the heading: dialog stays open, paused and unbought.
4. Back returns to Pause. Reopen: gold is still 280, both choices still available.
5. Buy Regeneration: visible HUD gold is 90, exactly 190 lower. Both buttons are disabled; HP remains 6000/6000; status is eight seconds remaining, zero HP restored.
6. Reload: saved Roadside Watch at 00:00 appears. Resume and immediately pause: Regeneration remains bought, eight seconds remaining, zero restored. HUD gold 91 reflects the small normal resumed interval; no second purchase occurred. Back returns to Pause.

Screenshots: `citadel-immediate-teaching.png`, `citadel-immediate-ready.png`, `citadel-immediate-purchased.png`, `citadel-immediate-restored.png`. Corresponding accessibility text is retained, including the immediate debit and final paused state. The browser log observation contained browser-extension metadata errors; it did not establish application errors.

## Not executed

- Automated Playwright browser suite, including its retained quota/silent-save failure and physical-key/controller provider regressions. The current spec was updated and syntax-checked only.
- Short-phone rendering. Native viewport resize attempts did not change the browser viewport, so no phone-rendering pass is claimed.
- Native storage-fault injection, physical devices/controllers, non-Chromium, installed PWA update, desktop package build/signing, human enjoyment or balance study.

Actual-handler Node fixtures cover failed purchase persistence, warning survival through reopen, verified save-only retry, teaching release, unsafe/current-checkpoint restrictions, cancel, insufficient funds and explicit Resume. These are not native layout or trusted-event evidence.
