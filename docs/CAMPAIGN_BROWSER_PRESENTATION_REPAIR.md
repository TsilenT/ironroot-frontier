# Campaign browser presentation expectations

This test-only repair belongs to the held local next candidate. The uploaded
cloud candidate `598925cbfea60acc734513d05dc14eeafe80a57d` and its existing
execution evidence remain unchanged. No browser, server, upload, merge or
deployment was run for this repair. Browser execution against the final combined
candidate is still pending.

## Confirmed contracts

The actual `renderCampaign` implementation names the scouting disclosure after
the selected mission: `Scout battlefield · ${mission.name}`. The former map-name
expectation was stale after the Roadside Watch label correction. The expanded
mission loop now requires the exact mission label. The legacy-to-expanded
keyboard switch also requires the exact Emberwatch and The River Charter labels
instead of Classic and Twin Span.

The briefing renderer retains the roster line, every authored briefing item in
order, and then adds this final item for scenario revision 3 or newer:

> Campaign records include stars and best times from earlier mission versions.

The 19-mission browser navigation check still requires exact whole-list
equality. It now includes that final item for the thirteen revision-3 missions
and independently requires exactly one occurrence. The three opening missions
and three Embers missions require zero occurrences. No authored rule, roster or
objective item was removed from the expectation.

Pure production-assignment tests additionally check all 37 historical
revision-one/revision-two descriptors, including the legacy optional lessons,
without a records notice. Repeated selection must remove an obsolete notice and
must not duplicate it. These historical-descriptor tests do not claim that a
title-screen preview of a new flight-enabled attempt uses an old save's revision.

## Retained coverage and checks

Both browser files retain their cases, timeouts, geometry, deployment, levels,
objectives, keyboard and storage assertions. The scouting label checks are now
stronger exact-text assertions. Flight-order specs/helpers and runtime files
were not edited by this repair.

Passed locally:

- Syntax checks for `qa/browser/expanded-campaign.spec.mjs`,
  `qa/browser/campaign-navigation.spec.mjs` and
  `tests/campaign-browser-presentation-contract.test.mjs`.
- 22 Node tests, zero failures or skips:
  `node --test tests/campaign-browser-presentation-contract.test.mjs tests/campaign-scout-label.test.mjs tests/campaign-presentation.test.mjs tests/scouting.test.mjs`.

The pure checks execute production presentation assignments and inspect the
browser expectations. They do not establish rendered layout, native input,
focus, timing or storage behavior in a browser. No full-suite or browser pass is
claimed by this note; final combined-source verification remains separate.
