# False Quiet independent source review

Reviewed 2026-11-08. No source correctness blocker found within this review's scope. This is not publication approval.

## Scope

Reviewed campaign authoring/progression, A/B ruleset identities, save/history admission, restart selection, fog intelligence, scouting, profile18, and actual-app Chapter 7 catalog registration. Compared prior campaign descriptors and rulesets with the River closure baseline; existing descriptors remain unchanged. App imports the complete CURRENT_CAMPAIGN_CHAPTERS catalog instead of reconstructing an incomplete list.

Reviewed source anchors:
- app.js SHA-256: 9dadb68892756d5159cbfd6127067c49c0a6af77a180156549823c69bc07d941
- campaign.js SHA-256: a779edd2254fb1f86a344d46e4c44023b104191adb20240b6f9e945d9dacb3a1

## Independently executed checks

- All 29 tests in tests/false-quiet-*.test.mjs pass, including both layouts' actual-app startup/restart/HUD checks at 320×430, 390×650 and 1180×768.
- npm run check passes.
- npm run check:release passes its local 58-file source-runtime validation.
- qa/false-quiet/verify.mjs passes fixed target identity, fog, loss precedence, source-policy restrictions and retained paid-ledger checks.
- Re-executed eight production/prototype parity comparisons without rewriting the parity artifact: both layouts, seed 7301, scout-adapt-5s, screened-siege-5s, direct-rush-5s and broad-novice. Outcome, route, duration, HP, gold, spending, casualties, first contact/sight, every transaction, decisions and ledgers match exactly, including defeats.
- Earlier direct probes confirm initial A/B sanitized observations and original target IDs match; fresh starts call Math.random once and Restart never calls it; cross-scenario identity relabeling rejects; exactly-600-second completion is accepted, later completion rejected, and own defeat overrides objective success.

## Design interpretation

Paid-prototype documentation correctly distinguishes legal blind infantry success from observation-sensitive adaptation. It explicitly does not establish that paying for information is required or optimal, or that this is uniformly harder than River. The slower broad route is viable in half the sample, not a novice guarantee. No blocker is raised merely because direct infantry is successful. No sampled citadel-route win is claimed.

## Remaining gates

The parent-owned full aggregate suite was still running when inspected; this report does not claim its completion. Native final browser acceptance, physical-device interaction, and real-player comprehension remain separate gates. The future service-worker-only cache patch is expressly excluded and requires its own review. No publication or deployment was performed or verified.
