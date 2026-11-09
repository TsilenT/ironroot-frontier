# Wake the Reserve: isolated Chapter 9 hypothesis

QA only. The mechanism checkpoint was preserved on draft PR44, parent commit
c0f8f46609d05eaccc3040dd19c8477db1102c83, tree
b043e937d848f9906e1385c69961130e88fac9fa. Its complete inventory has 2,405
files: 1,357 materialized and 1,048 retained inventory-only omissions. The original
encounter uses unchanged Shared Watch engine source from commit
65ee1438435a9e8a4cb6b8b6930ac87ca17518b7. Checkpoint002 remains immutable.

No dist file, scenario catalog, ruleset, profile/release version or prerequisite
changes. This incremental slice modifies five QA/test/doc files and adds four
runner/policy/observer/test files. Generated records stay external. No natural
baseline case or browser interaction has run.

## Minor event, distinct from the finale

Destroy the enemy citadel within ten minutes while yours survives. Both sides
start with three ordinary barracks, one archery, one mine and healthy 6,000 HP
citadels. The opening purse is 900/100 gold; normal paid adaptive AI, factories,
income and five-minute escalation continue. These are unbalanced hypotheses.

The enemy also has an ordinary northern watchtower, the original North Command
Post. Destroying it warns for six seconds, then releases one finite contingent:
four ordinary level-one warriors and two ordinary level-one archers at the enemy
rear on north. They march, target, attack and die through the existing engine.
The 70-unit cap defers arrivals; ordinary factory output retains its earlier
position in the tick. There are no treasury grants, repeat top-ups, stat buffs,
core clamps, army wipes, boss geometry or universal lane reach.

The post is optional: bypass north, strike early, or prepare support first. Its
controllable timing offers a better first local reversal hypothesis than a
low-citadel trigger, which overlaps the finale experiment. Natural arrivals must
still be shown to reach a contested fight. They need not change the winner,
force a purchase or be harmless. No damage threshold is an objective.

## Mechanism and review corrections

MinorReserveGame is a QA subclass using private _step/_spawn methods, not an
approved engine extension. Its separate strict JSON envelope holds an unchanged
engine snapshot plus the original post ID, trigger tick and at most six ordinary
release records. The production battle codec rejects that envelope.

Each actual fixed tick resolves ordinary movement/simultaneous damage and core
outcomes before the reserve event. Core termination and the deadline suppress
new triggers/arrivals; released troops first fight on the next ordinary tick.
Replacements never rearm the original ID. Restore validates the fixed clock,
authored original identity/location and monotonic release IDs.

Review found that paid Volley can free cap slots between ticks while dead unit
records remain. Due incomplete queues therefore require 70 total enemy unit
records, not 70 living records. Saving neither advances nor drains the queue;
the next ordinary tick removes corpses and drains available slots. Full/partial
cap, payment/kill-income and exact JSON continuation have focused regression.
The original post ID cannot be reused by a unit, and same-type release records
cannot be reordered. QA commands reject all spending/salvage after core/deadline
termination; the shell disables those controls while retaining camera, explicit
save/restore and restart.

Production admission would still require reviewed immutable identity/state,
codec/history/backup integration, progression/profile fencing, briefing and real
warning UX. Copying this subclass into the production app is insufficient.

## Exact baseline hypotheses, not yet executed

PLAN.json and policies.mjs declare exactly three cases at seed 9104 with reserve
disabled: north-supported, south-bypass, idle. The two paid plans mirror each
other: buy rear archers, a Warden screen and rear siege before economy,
opposite-road support and further sustained pressure. All sites are statically
checked against the inherited camp. No front-first siege, regeneration loop,
health-based repair or hidden-state decision is used.

A player decision occurs at tick zero and every 100 ticks (five seconds),
including rejection/no-op boundaries. Failed planned builds retry next cadence;
only success advances the plan. Afterwards, upgrade surviving owned producers
by level, primary/middle/opposite road, declared type priority, rearward x and ID.
No player salvage, Volley or citadel purchase is part of these policies. Idle
issues no commands. Exact build lists and ties are executable source, not prose
that can be reinterpreted after outcomes.

The runner records all player/AI command attempts, ordinary payment/income/kill
reconciliation, actual births/fires/effective damage, unattributed splash,
original structure/post loss, first core contact and five-second force summaries.
Natural 30/90-second and first original-loss checkpoints restore independent game
and policy shadows for the next ten actual ticks. Terminal tails stay terminal.
A paid win only establishes a route for independent review. Every loss/rejection
and any idle win remains visible. If neither paid route wins, stop before adding
reserve difficulty or searching new seeds.

## Guarded preparation and execution

Run focused tests with:
node --test tests/minor-reserve-qa.test.mjs tests/minor-reserve-runner.test.mjs

The source binding requires the verified external PR44 inventory
ironroot-minor-reserve-remote-c0f8f466-inventory.json, SHA256
0d302f73cc35e1652a799915d9e7012ff278076b93a64700cd3963bafd8139b2.
Only five declared parent modifications and four new files are accepted. All ten
working-file hashes, present/omitted source digests, plan, workspace, Node binary,
arguments and OS environment are bound. Use the workspace root as cwd.

The dedicated external ironroot-minor-reserve-baseline-evidence directory must
exist beside this workspace. Then prepare a NEW external freeze with:
node qa/minor-reserve/run.mjs --freeze NEW_EXTERNAL_PENDING_FREEZE

This command runs no encounter. An independent reviewer/coordinator must provide
an approved packet with format minor-reserve-baseline-approved-v1, status
approved, named reviewer, actual authorization, the unchanged pending freeze and
an exact invocation array binding the Node binary, absolute runner path,
--run-approved, absolute approval file and fresh external output directory.
Only then may the exact approved invocation run. There are no seed/case overrides,
resume, overwrite or silent retry paths. Source is checked between cases and
after completion. SIGINT/SIGTERM or OUTPUT.stop stops at the next 100-tick check
or case boundary and retains partial records. Output must remain under the
external evidence directory, never the repo.

A later enabled/disabled paired check needs a separate freeze and authorization.
No broad matrix, heldouts, seed search, release or remote write is authorized by
this source checkpoint.

## Manual shell, not browser-certified

Serve the repository root with python3 -m http.server 8000 and open
/qa/minor-reserve/. Start is paused. Use the camera/minimap, select a building
then click a legal site, and use ordinary paid commands. Explicit JSON text
save/restore never touches a real save slot. There is no profile, localStorage,
automatic storage or network write. The shell has not been browser-tested and
is not the production UX or human difficulty evidence.
