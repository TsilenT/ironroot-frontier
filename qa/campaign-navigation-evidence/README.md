# Campaign navigation validation

Base: `b8b2e6d1b200b9550803f5cb16b8d96ccc28f222`. Implementation starts at `a4f5ad8`; the final follow-up keeps historical 0.12 UI navigation unchanged, strengthens the upgrade test’s exact before-tick restore check, and keeps the package/worker release identity aligned. The old upgrade assertion compared live RNG state after resumed simulation; the complete state is now compared before the first tick. The combined release should receive its final version bump during integration.

Validated on 2026-11-06 with system Chromium `155.0.8059.79`. Phone projects use Chromium touch emulation; they are not physical-device Safari/Chrome tests. The desktop viewport uses Chromium. Native Electron was not launched; its source/security tests passed and its optional installed-build-dependency check was skipped because desktop build dependencies are absent.

| Check | Result | Evidence |
| --- | --- | --- |
| Full Node suite | 883 passed, 0 failed, 1 existing optional desktop-tooling skip | [node-tests.log](node-tests.log) |
| JavaScript syntax | All game modules parse | [syntax.log](syntax.log) |
| Runtime/offline inventory | 44 files, all imported modules cached | [runtime.json](runtime.json) |
| Main browser flows | 128 passed across all four projects | [browser-flows.log](browser-flows.log) |
| Compatibility/offline browser flows | 52 passed across all four projects | [browser-compatibility.log](browser-compatibility.log) |
| Worker/runtime contracts after version alignment | 11 passed | [worker-contract.log](worker-contract.log) |
| Browser update harness contracts | 7 passed | [browser-harness.log](browser-harness.log) |
| Desktop source/security checks | 12 passed, 1 optional tooling skip | [desktop-checks.log](desktop-checks.log) |
| Geometry audit | No horizontal overflow, 44px navigation controls | [geometry.json](geometry.json) |

The main browser run includes the new campaign navigation suite plus existing campaign, campaign onboarding and integrated flows. It covers all 18 authored briefings, exact rules disclosures, mandatory protection/health/income/hold conditions, keyboard heading focus and dialog tab wrapping, locked mission launch prevention, cross-chapter navigation, launch/save/return/resume, completed replay records, success Continue, deadline Retry, protected salvage, stale-tab save preservation, and real introductory mission completion.

The supplemental compatibility run checks expanded chapter unlocks, all four expanded mission starts/saves/resumes and scouting, offline play, and real production-0.12 Far Beacons worker takeover with all five storage domains preserved.

## Reproduce

From the repository root:

```sh
npm test
npm run check
npm run check:release
node --test tests/desktop.test.mjs tests/desktop-training.test.mjs
```

From `qa/browser` (install with `npm ci`; use `--cache /tmp/ironroot-campaign-npm-cache` if the home cache is not writable):

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npx playwright test '(^|/)(campaign-navigation|campaign-onboarding|campaign|integrated-flow)\.spec\.mjs$' --reporter=list
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npx playwright test expanded-campaign.spec.mjs offline-shell.spec.mjs production-upgrade.spec.mjs --grep 'existing twelve|frontier unlock|UI start save|scouting|real service-worker|production 0.12 far-beacon' --reporter=list
```

## Visual evidence

- [Phone mission briefing](phone-briefing.png): flavor and plain goal precede optional details.
- [Phone story browser](phone-story.png): chapter list is reached through Story.
- [Phone chapter](phone-chapter.png): chapter story and mission choices, with vertically scrollable cards.
- [Desktop protected briefing](desktop-protected-briefing.png): required income and original-building protection remain prominent.
- [Landscape with saved mission](landscape-saved-briefing.png): mission content scrolls while launch and resume remain available.

The saved-mission audit measured 221px of usable content at 320×568, 350px at 390×650, 197px at 844×390 and 367px at 1180×757. Screenshots and geometry use synthetic QA profiles. No user profile was changed and nothing was deployed.

See [integration boundaries](../../docs/CAMPAIGN_NAVIGATION.md) before combining with progression or phone/fullscreen work.
