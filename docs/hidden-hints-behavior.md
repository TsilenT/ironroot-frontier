# Hidden coaching banner

Local held candidate only. This work does not change the uploaded flight PR,
any frozen source copy, production, simulation balance, scenario identity or
profile/save protocols.

## Behavior

- Hide removes the entire campaign teaching banner and clears its live-region
  content. There is no replacement “hints hidden” or paused-status banner.
- Mobile reserves zero pixels for the hidden banner. The same Show button moves
  into the existing navigation area. While an explicit teaching hold still
  needs Start/Resume, that same control remains beside the normal controls.
- The short-portrait side navigation stays active when hints are hidden. This
  preserves the 320×430 battlefield safety fix and returns the former banner's
  height to the battlefield instead of switching to the taller bottom controls.
- The hidden mobile controls remain at least 44×44 CSS pixels. Standard portrait
  and landscape use the existing map row. Short portrait uses a five-row,
  two-column navigation grid; its minimap shares the last row with Start/Resume
  during a teaching hold and expands after the hold ends.
- Show restores the same hint nodes and their normal reserved row. Keyboard
  focus stays on Hide/Show across DOM moves, and controller HUD mode remains
  active when that focused control survives the reflow.
- Hide changes presentation only. It does not release a teaching hold, spend
  gold, start combat, save a preference, change history, or modify a checkpoint.
  A fresh Roadside Watch still starts only after the actual paid first barracks.
  Later/manual lessons retain their existing explicit Start/Resume behavior.
- Existing per-attempt defaults remain: resumed incomplete missions can show
  hints again; completed replays begin with hints disabled. No storage key was
  added. Pause, Options, Back and viewport recovery keep their existing rules.

## Checks

Executed on the local held candidate:

```
node --test tests/hidden-coaching.test.mjs \
  tests/campaign-mobile-integration.test.mjs \
  tests/campaign-teaching-integration.test.mjs \
  tests/short-coached-portrait.test.mjs \
  tests/mobile-coach-text-inset.test.mjs
node scripts/check.mjs
node scripts/verify-runtime.mjs
node --check qa/browser/hidden-coaching.spec.mjs
node --check qa/browser/campaign-teaching-helpers.mjs
```

The focused Node set passed **58/58**, with no skips or failures. Twelve new cases
cover full-banner removal, cleared live regions, returned layout space,
320×430 through 844×390 layouts, safe-area insets, repeated toggles, rotation,
paid first construction, retained teaching holds, controller menu state and
explicit viewport recovery. The focus fixture deliberately blurs controls on
reparent so the app must restore focus. Existing cases and assertions remain.
All runtime JavaScript parses; source-dist validation passes for all 49 files.

Node geometry is a source-derived fixture, not native CSS/browser evidence.
The local CUA browser could not reach the container preview at
`http://127.0.0.1:4194` (`net::ERR_CONNECTION_REFUSED`). The temporary server was
stopped. No local native-browser pass is claimed from that attempt.

`qa/browser/hidden-coaching.spec.mjs` adds five runnable cases across the four
existing profiles, without new exclusions: native keyboard hide/show and paid
first-build, 320×430 safe-area/rotation/manual hold, and Options/Back/reload
semantics, the full Resume label during a later manual hold, and the
Build/Close/Cancel labels during first construction. These cases
measure actual banner bounds, navigation hit targets, world geometry, focus
and every rendered character against its control and viewport. Their syntax is verified; browser execution and the
combined aggregate remain separate gates. Independent native-review evidence,
when available, belongs in `hidden-hints-native-qa.md`.

The shared first-build browser helper now identifies the opening from the
rendered teaching state and saved scenario rather than stale hidden hint copy.
This is necessary because hidden live-region content is intentionally cleared.


## Native-review typography correction

Independent native review found that the full Resume text exceeded its 44px
button at 320×430 during a later manual teaching hold, despite valid control
geometry. The narrowly scoped collapsed short-portrait Resume rule now uses
bundled Barlow Condensed at 14px with no inline padding. The 44×44 target,
visible Resume wording and full “Resume battle” accessible name are unchanged;
no broader UI text was reduced. The browser regression explicitly reaches the
later Resume state and measures rendered characters with 0px and 34px bottom
safe-area insets. Native retest results belong in the independent QA record.


Native review also found that the 44px compact Build control's Cancel state
retained the wider default lettering and ran into Show. The same narrow 14px
condensed-type treatment now applies only to that collapsed short-portrait
control. A separate native regression selects Barracks, checks full Cancel ink
inside its own target and before Show, cancels without spending or starting,
then completes the ordinary paid opening. Build and Close are checked too.
The reviewer confirmed Resume ink fits after its repair; final native evidence
for both repaired controls is tracked in the independent QA record.
