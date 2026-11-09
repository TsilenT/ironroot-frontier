# Independent review: reconstructed The Road We Know v0.28.0

Reviewed 2026-11-09. No release-blocking source finding remains in the reviewed scope. This is a source, deterministic-engine and narrow DOM-fixture review, not native UI, human balance, publication or deployment approval.

## Exact source and preservation

Before implementation edits, I independently checked all 58 runtime files plus package/README against canonical Git blob SHAs from commit `ddb47b2dfcb87cfe90e6c0e35e16cab6c058736f`, tree `6f571f0bde6d8b330962e1cb1f43b8718fcc069e`, and copied them read-only into this review folder. Another 686 recovered baseline files were verified and copied before their tests/docs were edited. Unmaterialized remote paths were recorded, not treated as deletions.

Actual old/new module comparison passed: 32 old rule definitions and initial/30-second game states; 98 old mission descriptors; 99 revision/layout attempts, restarts, codec admissions and 30-second states/evaluations. All 48 historical fixture files match canonical Git blob SHAs. The original protocol-18 fixture is byte-exact, SHA256 `0371903b4df5d8227089c4e3e38fa155152cef485f201088734767cb2b12a4bc`.

Fresh old-data hashes reproduce the historical targets: rules `8145be9199c93f688a8170f92b0185af81608b7e4321516f0de3d5ca1ae30554`; catalog `d1c2899f3ff76da02d4afb231e5efe61bbdbf4e764329dda032e7b18eb52f5c8`. These supplement actual comparisons rather than replacing them. Shared engine, AI, maps, combat, fog and citadel mechanics are unchanged.

## Fresh commands and results

Run project commands from `ironroot-rebuild-road`:

- `npm test`: 2,009 tests, 2,008 passed, 0 failed, 1 skipped; 78.283 seconds. Skip: optional installed desktop tooling/minimatch check because desktop build dependencies are absent. Full output: `../ironroot-road-independent-review/final-full-tests.log`.
- `node --test tests/road-we-know-*.test.mjs`: 23/23 passed, no skips.
- `node scripts/check.mjs`: all runtime JavaScript parses.
- `node scripts/verify-runtime.mjs`: passed; stored runtime manifest equals freshly inspected files.
- `node --test tests/service-worker-cache-refresh.test.mjs`: 4/4 passed. The fresh-cache `Request(..., {cache:'reload'})` fix is preserved.
- `node ../ironroot-road-independent-review/compare-old.mjs`: preservation comparison above passed.
- `node ../ironroot-road-independent-review/mission-independent.mjs`: exact formation, ordinary rules, locked admission, restore/restart, 70 invalid identity combinations across identity/history/backup, deadline, own-core-loss precedence, 1-HP win, no required building, one-star progression, 26 main missions/78 stars and no Chapter 10 passed.
- `node ../ironroot-road-independent-review/profile-independent.mjs`: marker-only upgrade retains epoch/all five domains; 50 old-client write/import attempts rejected; current import, old-import ownership loss, future-protocol retention and failed-marker modes passed.
- `node ../ironroot-road-independent-review/paid-independent.mjs`: eight authored-seed policies independently instrumented; ordinary prices, income/kill/refund conservation, detached receipts and maximum one player paid action per five seconds passed, including spells. Maximum independently integrated ledger error was 9.65e-11.
- `node ../ironroot-road-independent-review/evidence-independent.mjs`: checked all 48 stored runs/1,166 ordinary-price receipts (850 builds, 126 upgrades, 186 volleys, four citadel choices), then reran all 16 held-out cases and checked another 390 receipts against the final summary. All matched. Output: `final-evidence.log`.

Actual app `returnToBriefing` and Begin flows were additionally exercised for Road restart and result Replay using the existing narrow DOM fixture. Both return a fresh, exact Road identity. This is not a native browser claim.

## Feasibility and evidence limits

On authored seed 7301, independent paid runs won with broad novice (149.6s), screened siege (138s), supported Rootwarden (149.5s) and north rush (114.55s), all with 6,000 own HP. Direct rush lost at 185.8s; air-heavy, safe-economy and idle also lost. The supported Rootwarden plan uses both roads and is not evidence of a southern-only breakthrough or mine destruction.

The predeclared new held-out seeds are 98317 and 620219. Screened siege and north rush each won 2/2; broad novice and supported Rootwarden each lost both. Direct rush lost both. Earlier development seeds remain separately labelled. These are bounded paid feasibility results, not human win rates or a claim that all strategies are forgiving. No added damage/resources, free reserves, required target, hard-attrition redesign or route nerf is present.

Action-time receipts detach the engine's mutable return objects. Dedicated tests verify later upgrades/caller mutation do not rewrite a build receipt, and paid build/upgrade/Volley/citadel sequences use one shared five-second cadence. The final simulator retains full-precision ledger values; its repeated fixed-tick ledger error is genuinely zero here, while the independent elapsed-time integration yields tiny floating-point error. Both are below 1e-6.

The route test's earlier north/south wording was narrowed to “supported routes.” README explicitly says only the available route is complete and Chapter 7/campaign remain unfinished. Native UI, physical-device, full browser-matrix and live release gates remain separate.

## Final byte identities

Runtime: 58 files, 1,163,407 bytes. SHA256 of `JSON.stringify(inspectRuntime('dist').files)` with sorted filenames is `95ab414c37edb00dc0294c9ec20a3c6ada609da71fd669be0836a81ad67def0a`. The saved runtime-manifest file SHA256 is `4940655e4b16d92d87fdf2254614b35beebfd4b731f094bd3931cd1f16cf4b24`. No equivalence or mismatch is inferred from historical aggregates using another serialization convention.

- campaign.js: `806767a01859990f0549b21deb4a83b9aade8690f903b74a5f44220d83d1f66a`
- rulesets.js: `d7bcc76853f1e03d2bd7d92575b1559df4180f597045f9db789a6e89b4096230`
- battle-codec.js: `186df63d9b30850a1f81ca214b23ce61a476a2b12c02d9d50a42b4cff9c6dc19`
- profile-session.js: `6ac7fb1530c568ca462e558c3c6ae806f1cfd62f01285a83c69e1d13609201fe`
- Policy: `b63bca3503bf4ff6e1d64beb48b92ff970df1b4aec5c5995c97bbdcbd956155f`
- Final 48-run summary: `b17ae5069d7cd0b5cb8ea5374b5282da2b8c8d29eac8c950cfb486ea1adc998f`
- Raw run receipts: `b4320313938313ba77d987300f62885fbb6618b0d70d1c1351235fd323e43f3c`

No project source fixes or remote writes were performed by this reviewer. README/evidence-only additions after the test freeze do not alter the reviewed runtime; any subsequent runtime/test/policy changes require affected checks again.
