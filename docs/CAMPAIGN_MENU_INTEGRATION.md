# Campaign and menu integration work

Local development only. Production is v0.14.1, source merge `27e9477e4abb8188f59e71e0663486507a34603d`, whose tree matches tested PR #4 head `f06d940428bd2f23b9616f151f92c09170fe3107`.

## Included locally

- Enforced three-stage campaign roster, authored one/two/three-road openings, full-campaign Rootwarden access, exact scenario revisions and protocol-4 storage fencing. See CAMPAIGN_ROSTER_CONTRACT.md.
- Released phone layout, safe-content guard, fullscreen, middle-button pan and right-click cancellation. The only overlapping phone/progression conflict was a test harness binding, resolved by retaining both sets of imports and context values.
- Amended draft PR #5 (`704d74177186d53fddaf9cd6901e04f37fe6ecb4`) pause/options presentation, with fullscreen controls inside the independently scrolling options content. Its checkpoint-ownership and opener-focus fixes are included. Combined native/browser review remains ahead; this is not yet a release candidate.
- Story → Chapter → Mission navigation from PR #6 is adapted to the actual 19-mission progression, with mandatory objective facts visible and optional detailed rules folded. Old lessons remain a separate conditional legacy chapter.
- `start` now uses an options object with separate `fresh` and `scenarioRevision` fields. Retry/replay callers pass an explicit scenario revision. Fresh controls report/tutorial/camera initialization, not battle identity.

## Review findings and resolutions

PR #5's initial head `0f3b1b90de98007f6f0bffd7dd5c96947268f3dd` had two independently reproduced defects, now fixed on the same PR and incorporated locally:

1. A verified restart checkpoint is followed by an unconditional session claim in start. A newer-tab checkpoint in between can be adopted and overwritten. The amended flow retains its existing ownership token, checks it before swapping the displayed game, and never reclaims on `fresh: true` restart. Later saves still verify the same token.
2. Opening Options directly from play first focuses the pause menu. Closing Options therefore loses the original gear-button focus. The amended flow captures the actual event opener before pausing and restores it through dialog focus management. Browser regression cases cover Done and Escape.

Campaign integration adds a separate requirement: restart the exact active scenario and roster, never the legacy factory default or the profile's latest earned roster. The pure `createCampaignRestart(game, id)` helper is now wired into the menu and covered by exact-identity tests. It retains the attempt’s roster rather than substituting newly earned profile unlocks.

The user approved creation of navigation and teaching draft PRs after the earlier denied attempts. PR #6 is now represented by the locally adapted navigation work. PR #7 teaching is now adapted and merged into the new three-mission opening. Hide hints preserves the planning hold, paid construction uses the ordinary engine path, and explicit Start/Resume releases it only after existing safety guards pass. No remote merge or publication of this combined work has occurred.

## Verification state

Before this integration, campaign progression passed 920 Node tests with one optional skip. After the phone, navigation and initial menu signature/layout integration, 43 focused presentation, campaign UI, restart identity, phone and HTML tests passed. The navigation/menu/phone intermediate aggregate passed 951 tests with one optional skip, and syntax/runtime/browser-fixture checks. The amended restart/focus delta then passed 26 focused tests. No combined browser run, final teaching-inclusive aggregate, remote commit, PR update or deployment is claimed. The initial PR #5 component evidence remains historical, not proof of this combined state.

## Combined v0.15.0 local checkpoint

The three proposals now coexist with the actual campaign progression and released phone controls. The combined root suite passed **973 tests, zero failures and one existing optional desktop-dependency skip**. All runtime modules parse, the runtime inventory validates, and the browser-suite syntax/immutable-fixture/harness checks pass. Fifteen actual-app teaching integration tests pass, including paid planning in all three openings, pause/options, skip, restore, restart and safety precedence.

The first combined teaching run exposed a test-fixture omission: the amended Options handler references the real dialog focus map. The fixture now supplies that map and asserts the original Options opener; no runtime exception was suppressed or production logic weakened. The earlier failed log remains an intermediate result.

The stable isolated v0.15.0 native review is recorded in CAMPAIGN_V015_NATIVE_REVIEW.md: two earned opening wins and menu/responsive checks passed; a browser error 9 prevented third completion/replay. Browser regression cases include the current Story/Chapter/Mission path, explicit teaching Start for ordinary combat scenarios, and new confirmed-restart coverage for two/five/eight-building attempts and both campaign revisions. Those browser cases are prepared, not executed here yet. The final exact-candidate cloud gate remains required.

A later unbounded aggregate run terminated the combat-feedback child before reporting its cases; it produced no assertion detail. The unchanged file passed all eight tests in isolation, and the project test command now bounds execution to four concurrent files. The bounded complete run passed 973 tests with one optional skip and zero failures. This is test scheduling, not a removed assertion or fabricated pass. The bounded final result is separate from that earlier interrupted child. The native browser also lost its tabs around this period; no cause is established, so it is not labeled a game defect or linked causally to the Node runner.

The independent restart review also strengthened a newly prepared browser test: comparisons now use the codec's decoded identity rather than a nonexistent envelope property, and the suite adds an explicitly unfinished profile to require renewed teaching. These are real coverage fixes, not executed browser-pass claims. Protocol-upgrade browser cases now include ready v3 → v4 alongside absent/v1/v2 profiles.
