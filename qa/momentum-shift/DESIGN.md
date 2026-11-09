# One last counterpush

Chapter 10 idea fodder, not an admitted encounter. This checkpoint preserves an
executable phase model and two pulse alternatives before any gameplay tuning.
No boss is implemented in the production engine. No campaign, profile,
progression, cache, normal save, or released mission changes are included.

## What should feel different

The player finally breaks the siege, then the citadel commits its last weapon.
The climax briefly reverses direction: an advancing army becomes a defensive
screen while replacement production catches up. That is a new strategic problem,
not another enemy income increase. Steve's proposed lethal army clear and roughly
10,000-HP raid boss are retained as an explicit alternative, not ruled out by the
usual ordinary-paid-AI default.

Use the twist once in one encounter. Do not spread low-health free armies through
ordinary missions. The ordinary adaptive opponent continues spending its actual
gold; the special boss is a declared authored encounter asset, not disguised as a
paid AI purchase or a resource-ledger success.

## First comparison to make

Both QA variants use a 6,000-HP enemy citadel, trigger at 2,100 HP or below, and
announce the breakout for 160 fixed ticks (8 seconds). Healing cannot reset the
commitment. On deployment the boss starts at 10,000 HP, is targetable immediately,
and has 80 ticks (4 seconds) of recovery before its counterpush begins. Neither
phase grants invulnerability, heals a core, removes factories, changes gold, or
alters normal AI. Values are design hypotheses, not tuned settings.

- **Bounded breakout:** 150 damage to hostile troops within 240 pixels of the
  citadel. At level one, archers, wizards and gryphons there die; warriors retain
  30 HP, siege 90, and Rootwardens 650. This makes the kind of army committed matter.
- **Lethal inner clear:** kill every hostile troop within the same 240 pixels,
  including flyers. It clears the actual siege at the core, not the player's
  whole army across the map. Buildings, allies and reinforcements outside the
  radius remain. This is not yet Steve's literal all-attacking-army clear: the
  existing engine lets archers attack a core from about 260 pixels and siege from
  275, because targeting subtracts a 55-pixel core radius. Those ranged attackers
  may survive the inner clear. Compare the dramatic payoff against the cost of losing an army
  the player cannot order to retreat.

The pulse is centered on the enemy core (Classic: 3,090,450), not the camera or a
moving boss. The exact radius edge is included. It happens once, without a second
pulse at half boss health. A future adapter must recompute affected living troops
from the authoritative post-damage snapshot; a stale warned target list is wrong.

For a literal all-besiegers version, compare a disclosed 310-pixel lethal pulse
or an exact currently-attacking-core predicate in the later engine adapter. The
latter requires authoritative target information that normal unit saves do not
currently retain. Neither alternative is implemented by this 240-pixel oracle.

The clearest first prototype should remain fully visible. A low-health trigger is
already a twist; hiding its cause and battlefield consequences in fog adds another
unproven mechanic. Fog can be considered separately after the visible encounter
works, with explicit observed-event rules rather than leaking hidden health.

## A warning is not a retreat command

Ironroot's troops move automatically. The player cannot select a unit and pull it
out of a warning circle. Therefore a countdown alone is not meaningful dodge
counterplay, and a lethal pulse must not be described as avoidable micro.

Give the player useful choices that the controls actually support:

1. Finish the citadel during the warning. A sufficiently strong burst is a legal
   win, even on the deployment tick. No hidden HP floor or forced second phase.
2. Commit sturdy screens for the bounded-pulse version, while producing fresh
   ranged support farther back. Existing ordinary upgrades remain useful.
3. Prepare another road or defensive production before triggering, then let the
   boss occupy the centre while an outer attack finishes the core.
4. Burn down the boss during its damageable recovery, or absorb its slow advance
   with replacement screens and supported ranged damage.

The briefing must disclose one last breakout and the army-clear rule. At the
threshold, show the affected area and an 8-second count, a compact persistent HUD
line, and one readable cue. Reduced motion must retain the shape/countdown, and
muting audio must not hide the warning. Announce recovery and the beginning of the
counterpush separately. A global deployment announcement is intentional public
encounter information, not accidental scouting.

If a later version requires boss death, it needs an explicit boss objective and
different victory rules. This experiment deliberately retains a core-race win.
Do not quietly replace a valid citadel kill with an invulnerable phase transition.

## Why 10,000 HP needs a combat test

10,000 HP is 12.5 ordinary level-one Rootwardens or about 55.6 warriors. Ten
level-one archers would need about 61.8 seconds of uninterrupted unmodified fire;
ten warriors about 50 seconds. Siege has no triple damage against a troop, so ten
level-one siege engines need about 70 seconds before losses or splash effects.
Those are static arithmetic checks, not fight outcomes.

A useful starting combat hypothesis is a very slow, single central-road boss
(28 pixels/second, 80 melee damage every 2 seconds, no resistance or regeneration).
It would take about 106 seconds to walk core-to-core without contact. Keep its
health and high damage legible, not a small normal warrior with inflated numbers.
Ground-only attacks allow flyers to help; retained ordinary archers can protect
the boss, but no unannounced anti-air burst should close that route. These combat
stats are not in the executable kernel and have not been simulated.

Keep the normal 5:00 escalation visible: production x1.65, troop-to-structure
damage x1.75, and citadel shots 32 to 18. Decide explicitly whether a new boss
inherits the troop-to-structure multiplier. Do not tune a short encounter while
silently ignoring a much stronger late counterpush. There is no forced core drain
in the proposed open-ended test; any simulation cap is a censored stall.

## Other forms worth comparing

- **Relief column from the rear:** a finite, disclosed reserve arrives from an
  actual rear entry point and marches along one announced road. Existing normal
  units lower art/combat risk. It can be intercepted and delayed, but can feel like
  another ordinary wave. Decide whether it is an authored reserve or escrowed
  paid purchases; preserve that choice in the ledger instead of inventing wages.
- **Interruptible muster:** reveal a reserve works before threshold. Destroying
  it before the breakout weakens the reserve, while direct citadel pressure stays
  legal. This buys strategic anticipation but risks repeating earlier factory
  demolition encounters. It is not implemented here.
- **Citadel becomes the boss:** transformation can make the spectacle stronger,
  but consumes the current win target and demands new victory, targeting, history
  and rendering semantics. It is the largest implementation and fairness risk.
- **One-off surprise:** possible as an intentionally surprising story beat, but
  compare restart frustration, unavoidable losses and repeat-run interest against
  the disclosed version. It is not an excuse to call a hidden wipe fair.

## Architecture checked against canonical Screen

Baseline: private merge e3ef4e160b6d223484820dbe102961ef7d31e39b,
tree 9e764d661d2942af123ed0f65c277c2a728e06e6, v0.33.
The source copy is sparse outside its complete runtime. Its verified inventory
has 2,376 paths, with 1,048 intentionally omitted locally. Preserve those remote
paths in any checkpoint. Do not import the CUT Bram prototype or Shared Watch's
separate proposed engine changes.

- `dist/engine.js`: `update` advances fixed 0.05-second ticks; `_step` queues
  ordinary simultaneous damage, resolves it, removes dead units, and decides core
  victory before another AI purchase. Trigger/deployment must be placed openly in
  that sequence. This model chooses post-damage core death before a due breakout.
- `dist/rulesets.js`: whole rules and rosters are deeply frozen. A boss needs a
  separate QA-only whole-rule identity and actual unit definition. Mutating a
  saved warrior into a 10,000-HP boss fails level-health admission and is wrong.
- `dist/engine.js`: a side has a 70-unit cap, state has a 140-unit limit, and all
  units require valid identities. Reserve one enemy slot for a guaranteed one-off
  boss, with the ordinary factories respecting that reservation. Never delete
  allied troops or silently go to 71 to make it appear. The cap policy itself
  needs an exact ruleset contract and tests before engine integration.
- Save validation checks exact state fields, unit fields, effect/projectile
  kinds, HP by level, IDs, bounds and winner/core consistency. This QA sidecar's
  identity is deliberately rejected as an extra normal engine field. A playable
  version needs strict phase, unit, tick, entity-link and terminal cross-checks.
- `dist/campaign.js` and `dist/battle-codec.js`: scenarios, core victory and
  objective completion have precise mission/ruleset/map identities. A deployed
  boss must not make an old save acquire a new phase or make an ordinary core win
  stop winning. Normal history, backup, profile fencing and Restart/Replay require
  separate integration; the QA model writes none of them.
- `dist/render.js`, fog observation, combat feedback, reports, codex and source-
  controlled service-worker assets all need explicit new-unit handling. Normal
  unknown-unit fallbacks and field-guide disclosures are not a visual boss pass.

The safest next engineering step is a separate QA ruleset plus an atomic fixed-
tick engine adapter. Keep phase metadata, boss identity/HP and queued one-off
effects in the same saved transaction. Consume intents only once; saving the
updated sidecar and applying its pulse later risks a lost effect, while replaying
an unconsumed intent risks a duplicate wipe. Do not patch live engine objects or
run this sidecar as a campaign controller.

## What is executable now

`kernel.mjs` is a pure, strict phase state machine. It emits semantic intents; it
does not spawn, move, target, damage or render a boss. `pulseHits` is a separate
local-damage oracle over an explicitly supplied troop snapshot, not engine combat.
`viewShift` is read-only. Save restoration copies validated primitive state. A
sequential fixed-tick caller is required; duplicates/skipped ticks are rejected.
At `maxTick` the host must pause safely, preserve state and permit export rather
than fabricate a loss or keep stepping. A trigger on the final legal tick may
announce a deployment beyond the seven-day ceiling; the paused warning remains
unconsumed. This model rejects further advancement and does not extend that ceiling.

Run `node --test tests/momentum-shift-prototype.test.mjs`. Synthetic tests cover
exact thresholds, healing after commitment, both pulse forms, warning/recovery
boundaries, one-use persistence, all core terminal precedences including 1-HP wins,
same-tick boss/core deaths, restore parity, repeated presentation, invalid fields,
local pulse scope, and unchanged-engine rejection of injected state/fake units.
They are not paid runs, natural player outcomes, human-balance evidence, browser
interaction tests or boss combat feasibility. Generated logs/results remain outside
the repository. No new seed matrix, heldout claim or campaign admission is made.

## Before choosing a playable encounter

Freeze source, rules, opposing economy, pulse variant and evaluation plan before
running development matches. Keep losing runs and stalls. Compare at least:

- Continued core race, distributed production, prepared defence, durable screen
  plus ranged support, air-heavy pressure, and deliberately unprepared all-in.
- Boss/no-boss matched controls to establish what actually reversed momentum.
- Kills on the trigger and deployment ticks; trigger just before/after 5:00;
  enemy unit cap full; player core at 1 HP; both cores falling together.
- Save/resume immediately before/after every transition and pulse, repeated
  Restart/Replay, paused/2x stepping, and malformed/older saved identities.

Record trigger/deployment times, affected units and their replacement investment,
time to first boss contact, boss damage received, player core damage, spending and
income ledgers, alternate-road progress, and final outcome. Do not tune away every
fast race win simply to force the spectacle. After development, bind an independent
heldout plan to exact source and untouched seeds. Then perform real desktop and
phone interaction review, including readable countdowns without sound or motion.

Keep the idea only if the reversal produces a recoverable decision and a memorable
counterpush. If 10,000 HP is just a long cleanup or the lethal clear feels like a
tax on winning, prefer the bounded pulse or an interceptable finite relief column.
