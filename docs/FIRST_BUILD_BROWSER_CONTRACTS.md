# First paid-build browser contracts

## Scope and validation status

Fresh, unfinished Roadside Watch now opens directly in the real building UI.
Its clock and both armies remain held until a successful paid barracks order.
There is no initial Plan/Start dialog or free Start action. This is deliberately
not a change to the engine, save identity, restored attempts, completed replays,
legacy First Watch, or subsequent lessons.

This document records changes to **existing** browser regressions. The focused
`first-build-start.spec.mjs` and `portrait-income.spec.mjs` are separate coverage.
No browser execution was performed for these adaptations. `node --check` passed
for all eight edited JavaScript files. Playwright discovery could not run because
`@playwright/test` is not installed in this workspace (`MODULE_NOT_FOUND`). No
dependencies were installed and no aggregate validator or browser run was used.
All viewport, focus, cost, pause, input, save, and real-time victory assertions
still require the next browser run; syntax checks are not passing-browser proof.

## Shared start contracts

`campaign-teaching-helpers.mjs` now makes `startRunning` complete the actual paid
barracks order when the rendered Roadside hint identifies the initial hold.
`finishFirstBuild` also supports a caller that has already activated Begin with
the keyboard. It reads the ordinary checkpoint and public rendered geometry,
selects the real barracks card, navigates Home, checks the site's hit target,
and sends native touch/mouse input. A passive pointer listener verifies trusted
input. It uses ordinary Pause/Resume to validate one barracks, its invested cost,
and gold after the actual elapsed income. It neither edits live game state nor
injects a build. Other lessons retain their real dialog's Start choice.

The local start wrappers in `campaign.spec.mjs` and
`campaign-onboarding.spec.mjs` now delegate to that shared helper. Existing
callers in campaign progression, navigation, integrated flow, fullscreen entry,
and accessibility/backup inherit it without changing their downstream assertions.
Skirmish, challenge, legacy, completed, and later-mission callers do not receive
an extra purchase. The normal save-and-return focus path therefore now starts
with the legitimate paid Roadside building rather than bypassing the first step.

The keyboard briefing/navigation case calls `finishFirstBuild` after its native
Enter activation, retaining all briefing, tab order, pause, save, and resume
focus assertions.

## Explicit compatibility teaching context

The existing indefinitely paused numeric tests cannot use fresh Roadside after
a barracks is bought. `startLegacyTeaching` declares an unfinished revision-one
First Watch save, clears campaign progress for that explicit fixture, resumes it
through UI, then uses Pause and confirmed Restart to enter its actual fresh
teaching dialog. The restored attempt is not treated as automatically paused.
First Watch has the same one-road geometry, starting 420 gold, and normal 140/175
barracks/archery costs. The resulting zero clock, gold, and dialog are asserted.
This keeps exact numeric coverage without substituting a runtime state hook or
claiming that the old optional teaching flow is new Roadside onboarding.

### Build completion

All existing cases use this explicit legacy context. Assertions and costs remain:
- One successful placement clears the real tool/drawer; bare confirmation does
  not buy; subsequent archery produces two buildings and 105 gold.
- Invalid territory spends nothing; occupied-site correction retains the order;
  two barracks leave 140 gold.
- Touch and pen with real Shift remain one-shot, trusted input is checked, and
  the successful single purchase leaves 280 gold.
- Desktop Shift-repeat, including narrow desktop, survives the first order and
  ends on a normal click; two purchases cost 280 total.
- Three repeat purchases exhaust 420 gold and automatically stop repeat mode.
- Controller confirm remains one-shot with keyboard Shift held.
- Held placement interrupted by visibility pause cannot buy on release.

No exact frozen clock, gold, empty-unit, saved-building, drawer visibility, or
non-persisted teaching-state assertion was removed.

### Contextual coaching

Generic dialog/indefinite-planning cases now explicitly start legacy First Watch:
- Reading, inert background, initial Plan focus, frozen checkpoint, two paid
  purchases, explicit Resume, army production, income, and restore validity.
- Alternative composition, unmarked legal sites, hidden hints, Options return
  and focus, and archery-only construction. The legacy roster's All buildings
  control is correctly visible, exactly two cards are visible, and the foundry
  card remains hidden. Roadside's absent optional roster remains asserted by
  the unchanged progression test and genuine onboarding test.
- Start now, manual pause, Preferences return, deliberate teaching replay and
  Escape followed by explicit resume.
- Saved planning construction resumes normally. Its completed Roadside replay
  portion remains explicitly Roadside and retains its no-automatic-hold check.
- Visibility interruption retains zero time and no held-gesture purchase.
- Dialog tab trapping and Space isolation retain their exact focus assertions.
- Dialog geometry, 44px actions, suggested-site visibility, and pause label.
- Unsafe viewport/read-dialog interaction retains its foreground hit test and
  explicit safe Resume requirement.

The full Roadside real-win route remains a genuine fresh Roadside launch. It no
longer selects Plan or Start: buying the suggested barracks releases simulation,
archery is then purchased normally, and the hidden free Start and advancing clock
are asserted before acceleration. Victory, earned completion, Continue into
Shield at the Fork, exact later-lesson 215-gold planning, and all later paid
routes remain intact. Subsequent-lesson restart and third-mission full paid win,
stars, replay roster, save identity, and completed-progress assertions are unchanged.

### Mobile coaching visibility

The zero-index generic Plan/Start-rail context now means explicit legacy First
Watch; indices one and two remain genuine Shield at the Fork/Open Three Roads.
The Plan, invalid correction, paid construction, closed drawer, frozen cost,
44px/hit-testing, hidden/shown hints, and explicit Start assertions are retained.
Short portrait safe inset, rotated protected manual teaching, narrow dialog
scroll/focus, and keyboard hint reading keep their full geometry/freeze checks.

The restored First Watch/Roadside loop still asserts both restored attempts run
without a forced hold. After confirmed fresh restart, First Watch retains the
old dialog/Start rail. Roadside instead asserts no dialog/free Start and frozen
state, buys its real barracks through `finishFirstBuild`, then checks the running
rail geometry and advancing clock. Completed legacy replay checks are unchanged.

### Browser Back

The teaching-dialog Back/Options-return case uses the explicit legacy fresh
lesson, retaining the checkpoint equality, TEACHING PAUSE label, no pause-menu
leak, and explicit Resume assertions. Other Back scenarios use skirmish or
explicit restored fixtures and are unchanged.

## Genuine first-step onboarding

`campaign-onboarding.spec.mjs`'s opening-guidance test activates Begin directly,
asserts no modal and zero time, then checks the real two-card roster and barracks
highlight before buying. Its own purchase is the first barracks, so it is not
pre-purchased by `startRunning`. It additionally asserts the clock advances after
that purchase. Archery hint/selection, two total buildings, exact paid cost plus
income, revision/ruleset/map identity, and restore validity are all retained.

## Reference and direct-start audit

All coachingModal/Plan/Play references were reviewed by context, including the
remaining references in `campaign-restart-identity.spec.mjs`, `pause-menu.spec.mjs`,
and `campaign.spec.mjs`. Restart identity cases with completed opening profiles
must keep skipping teaching; their sole unfinished teaching case is the Fork.
Pause-menu's unfinished campaign case is legacy First Watch, so its dialog
remains correct. The campaign helper's residual dialog dismissal is for ordinary
legacy/later teaching, not a bypass of the new Roadside hold.

Direct Begin activations were reviewed across all existing browser specs.
Desktop input, regression, map, font, offline-shell, service-worker, field-guide,
report, and production/profile-upgrade setup paths select skirmish/challenges or
explicit legacy/earned fixtures and keep their original semantics. Expanded
campaign starts use earned later missions. Fullscreen's direct entry case only
asserts launch visibility and fullscreen requests, so opening in the new held
building UI is correct. Its saved-campaign case already uses `startRunning`.
Protected/restored short-portrait coverage is unchanged. No skip, timeout, or
visibility/focus assertion was relaxed to accommodate the new first-step flow.
