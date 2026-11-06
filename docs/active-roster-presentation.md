# Active-roster presentation integration

The engine remains the only simulation. These changes bind presentation to the
game's immutable definitions and do not change combat, spawning, targeting,
income, counters, movement or battle outcomes.

## Application interfaces

- `createCodex(context = null)` accepts a `Game` or registered ruleset descriptor.
  It returns deeply frozen `{ UNIT_CODEX, STRUCTURE_CODEX, ECONOMY_GUIDE }`.
  A game context also supplies the active map's building cap. Economy figures
  describe an unmodified level-1 skirmish baseline, not an authored mission's
  current allocations. The existing named exports remain legacy-only.
- `drawUnitPortrait(canvas, type, side = 0, context = null)` takes the active
  game or ruleset in its fourth argument. It returns false for an unavailable
  unit or invalid canvas. The default admits only the five legacy unit types.
- `Renderer.draw(game, ui, dt)` binds the game-local building/unit definitions
  automatically. The application still sets the map and theme when starting or
  restoring a battle. Invalid stale build selections do not draw a ghost.
- `getMissionScouting`, `renderMissionScouting` and `renderScoutingSvg` accept an
  optional game/ruleset context as their second argument. Otherwise they resolve
  the mission's declared ruleset, defaulting to legacy for historical missions.
  Explicit conflicting mission/context identities reject. No roster union is
  used for names, order, placements or objective types.
- `createBattleJournal(game, { resumed, mode, id, name, identity })` accepts the
  canonical identity returned by the battle codec. Recording captures identity
  and rules once. Existing callers without identity resolve their mode/id through
  the codec (`challenge` is the presentation alias for `trial`).

The application should refresh the catalogue and portraits on start/resume, and
pass the codec's identity to the journal. It must not pass a title-screen rules
selection to an already running or restored battle.

## Reports

New completed reports are schema version 2, with `identity` and a frozen
`rules: { name, endgame }` section. Compositions and names come only from the
recorded game's definitions. A new report requires a terminal engine or authored
objective result; recording never creates an engine winner.

The view continues to accept genuine version-1 reports. Version-2 reports state
the selected scenario, map revision and ruleset. Both current policies disclose
five-minute escalation. Timed rules disclose decay after seven minutes; open
rules disclose no automatic decay or forced time-limit winner. These are rule
descriptions, never inferred causes of a particular defeat.

The resumed-observation disclaimer, actual observation timestamps, bounded
256-point thinning, original-target outcomes and full-match counters remain.
Reports are observational session records, not playable saves or backup data.

## Art and compatibility

`dist/rootwarden-art.js` is the accepted original Canvas helper, unchanged:
SHA-256 `70430d5e6a05963ecb245e3181d8ee43c2a21165a31260e75fc0403ba59bafda`.
The host owns health bars and ground team markers. The helper owns its single
shadow. Locomotion uses observed position changes and a bounded live-unit cache,
not attack cooldown. Instant engine attacks display contact/settle phases only.
Reduced motion, both teams and compact rendering retain the accepted art.

The immutable `qa/fixtures/accepted-clarity` files are copied from the already
accepted clarity candidate, not generated from this integration:

- Renderer: `9f77b130b7397f188a63dfb960a90d2b5b17d0da94c4e8bd7a1f56ba64aed99e`
- VFX: `90a98c0899610079301c98c0c9851f44318c1e5b455cb230464a03d11dfe8393`
- Engine dependency: `83d315ba2a25ced0167543896c48c1d9ae0096827767e9bbe28485c5ae1810f5`

The active-roster tests compare actual legacy drawing commands against those
files across all three existing maps and five viewports, plus the Classic
terrain/theme/portrait fixture. They do not replace historical oracles with
new source hashes. The original production-v0.12 fixture is separate and is
used for genuine version-1 report compatibility.

## Focused verification

Run directly with Node, without dependency installation:

```sh
node --test tests/active-roster-views.test.mjs tests/rootwarden-art.test.mjs \
  tests/renderer-maps.test.mjs tests/codex.test.mjs tests/scouting.test.mjs \
  tests/report-view.test.mjs tests/battle-report.test.mjs tests/portraits.test.mjs
```

This covers active/legacy roster separation, direct numeric definitions,
identity mismatch rejection, reports for both endgame policies, genuine old
report rendering, exact old canvas-command parity, observed movement/reset,
instant-hit pose mapping, shadow ownership and 560 art geometry/state cases.
Browser interaction and release validation are separate integration gates.
