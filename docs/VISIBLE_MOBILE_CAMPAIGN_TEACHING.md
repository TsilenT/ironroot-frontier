# Visible mobile campaign teaching

Unreleased local v0.15 candidate. No publication, version/cache change, engine
change or successful-build repeat-policy change belongs to this patch.

## Interaction

- The same `campaignCoach`, hint toggle and Start/Resume button move out of the
  shared Build drawer during a planning lesson. No duplicate building controls
  or detached tutorial simulation are introduced.
- Build while paused closes the reading dialog into a closed drawer, with the
  concise next action already visible and Build focused. Selecting a building
  closes the drawer but leaves its placement instruction and Start available.
- The scrollable hint starts with a short next action. Its existing full advice
  remains available by scrolling. A changed instruction resets that scroll.
- Start (at zero battle time) or Resume (later) explicitly releases the existing
  teaching hold. Hiding/showing hints does not. Failed placement stays correctable
  and normal purchases still cost gold. The real 2 → 5 → 8 roster is unchanged.
- Any enabled, applicable campaign hint activates the mobile rail, including a
  restored First Watch or current campaign attempt. Hint visibility never creates
  a teaching hold. Completed replays keep their existing disabled-hints default;
  explicit Show hints reveals the rail without pausing. Battles with no guidance
  keep the prior shell. Hide preserves a reachable Show action, and each new
  battle resets that transient latch.
- The initial reading dialog now scrolls its copy independently of its pinned
  Plan and Start actions. Its reading region is keyboard focusable. Focus order
  includes that region, while initial focus remains on Plan.
- Space and arrow keys inside the scrollable hint retain their native reading
  behavior rather than starting combat or panning the canvas. Canvas shortcuts
  and Escape behavior remain unchanged.

## Layout and safety

Portrait reserves a separate hint row between the battlefield and objective
dock: 88px normally, 44px below 560px visible height. Start/Resume and Hide/Show
retain 44px targets even in the compact row. The existing protected objective,
menu, Build, Home/Front and minimap controls are not replaced or hidden.

Active landscape teaching uses the existing full-height right sidebar for HUD,
objectives and navigation. A 64px teaching strip sits above only the left field,
not across the top of the sidebar. The drawer stops below that strip. Portrait's
drawer similarly stops above the strip, so neither open state hides teaching.

The new rail region and visible action buttons participate in actual-rectangle
viewport safety checks. The 212px world floor and safe-area bounds are unchanged.
The source-derived geometry fixture yields 214px of world for ordinary 320×480
with a 34px bottom inset, and 235px for protected 740×320 with 21px bottom inset.
These are source-model numbers, **not native measured results**. Truly smaller
protected portrait layouts can remain insufficient during teaching; the existing
safety pause is retained rather than shrinking controls or hiding required text.

The existing uncoached protected-shell regression cases use a completed mission
record, whose normal hint default is disabled. This preserves their original
geometry assertions and negative controls. Active fresh and resumed guidance
have separate coverage.

## Validation and remaining gate

- Final `npm test`: 982 tests, 981 passed, zero failed, one existing optional
  desktop-dependency skip.
- Actual-app teaching integration: 23 passed, covering all three paid/frozen
  lessons, closed/open drawers, failed correction, Hide/Show, protected landscape,
  safe insets, rotation, unchanged restored/completed layout and reading keys.
- Existing phone viewport suite: 9 passed.
- `node scripts/check.mjs`, `node scripts/verify-runtime.mjs` and the full browser
  source/fixture `npm run check --prefix qa/browser` passed.
- No native browser was run by this worker. The parent reserved the supported
  browser for an independent combined-source review after this patch and the
  separate one-shot-build patch are integrated.

`qa/browser/mobile-coaching-visibility.spec.mjs` adds four prepared logical cases:
real Plan/selection/paid and failed placement through all three rosters, actual
DOM geometry and hit testing with safe insets/protected landscape, pinned narrow
modal actions, and native keyboard reading. Geometry captures include full
character visibility of the concise next action and rail exclusion from canvas,
protected dock, header and navigation. The first two cases intentionally exclude
desktop because they assert the mobile rail, while the two accessibility cases
run in all four existing profiles (14 configured instances total).

Native combined review, physical phone/PWA, non-Chromium browsers, screen readers
and hardware controllers remain separate verification boundaries.


## Resumed-hint follow-up

A separate delta against `qa/campaign-v015-followup/components/VISIBLE_MOBILE_TEACHING_MANIFEST.json` corrects the
initial rail's planning-only latch. Runtime changes are limited to including an
enabled, non-null `campaignCoach` hint in that latch. No CSS, simulation, save,
roster, modal or pause policy changes are included.

Actual-app tests cover resumed First Watch, Forked Road and the three new opening
missions at short portrait with a 34px bottom inset, ordinary portrait and short
landscape. They compare the complete engine checkpoint before any frame, require
no teaching modal/hold or ordinary pause in fitting geometry, verify enabled
hints and Hide/Show outside Build, then require natural simulation advancement.
They also cover fresh legacy attempts, completed replay opt-in and protected
battles with no applicable advice. Prepared native assertions cover resumed
First Watch/current-campaign visibility, actual fresh restart and completed
replay hint opt-in through real controls.

A genuinely guided protected mission still consumes the existing rail's space.
For example, restored Winter Stores at 320×430 leaves only 182px of world, so the
unchanged 212px guard pauses it for size; 740×320 fits. The safety latch is not a
teaching hold and cannot be cleared by an automatic resume. This is a disclosed
layout cost, not permission to weaken minimum geometry or hide required tools.

Final follow-up command results, exact file hashes and browser execution status
are recorded separately in `qa/campaign-v015-followup/components/RESUMED_MOBILE_HINTS_MANIFEST.json`.
