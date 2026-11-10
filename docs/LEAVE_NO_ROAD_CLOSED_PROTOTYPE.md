# Leave No Road Closed: closed QA proposal, epoch 1, runner correction 002

Fresh Chapter 9 hypothesis, not admitted content. No natural case has been opened. Formation, purse, seeds, policies and the 30-second goal are design choices, not balance evidence. Canonical starting point: commit `65ee1438435a9e8a4cb6b8b6930ac87ca17518b7`, tree `b6ee01ff93f43176a889d7fb3c226cf5ef442643`. The sparse copy's 1,351 present blobs/modes matched the complete inventory; 1,048 omitted files are not deletions. No repository AGENTS or skill files were listed.

## Encounter question

Fund and sustain the third road, or concentrate on an ordinary citadel breakthrough. The player inherits intact level-one barracks/archery pairs on north and middle and one rear mine. South starts uncovered. The opponent has three warrior screens, rear northern/southern archery, middle wizard support and one real mine. All are ordinary legal sites and prices. Starting purses are 900/100, cores 6000/6000, income 7.5/7.5 gold/sec. Normal adaptive AI pays for later construction, upgrades and volleys. There is clear view, no reserve, no protected target, no static central watch and no unit orders.

Secure all three crossings for 30 cumulative seconds OR destroy the enemy citadel by 10:00 with yours alive. One HP is enough. Ground captures take two uncontested seconds. Empty ownership persists, contest pauses credit, and flyers deny but cannot capture. No bridge income or capture bounty. Ordinary 5:00 escalation remains active. No forced core drain. The numbers may fail to produce an interesting decision; that is a reason to reconsider them, not to manufacture a mandatory control finish.

## QA boundary

Only QA, tests and this document are added. No production runtime, catalog, version, profile, prerequisite or reward is changed. Camp We Kept stays parked; Bram is not revived. Shared Watch's central-static/mobile decision is not reused. No Chapter 10 or remote work.

`scenario.mjs` binds an unregistered, frozen whole ruleset to a newly created Game using its native property descriptors. The actual native `_step`, control advancement, economy, production, AI and terminal order execute unchanged. It copies the earned full-roster citadel parent and adds only the existing cumulative-control configuration plus QA identity metadata. This bypasses constructor registration **only inside QA** and is an explicit preflight review point.

Native `Game` constructor/restore and campaign lookup reject the QA identity. Continuation uses a separate strict QA envelope: restore the native parent snapshot with its normal validator, validate the external control state with the actual control validator, enforce the same fixed-clock tolerance, then rebind. This is not battle-codec/profile/history admission and cannot demonstrate those production integrations. Any future release needs a real immutable identity, campaign factory/evaluator and complete integration review.

## Small natural proposal, still closed

Three fresh known seeds: 9305, 214927, 760141. Four cases per seed, twelve total, no held-out claims:

1. `broad-three`: paid southern barracks, archery and wizard support, economy, then screened siege across roads. Lost planned factories can be repurchased.
2. `core-three`: concentrated middle barracks and siege behind the inherited warrior/archer screen, wizard/ranged support, then economy and more siege. This is a credible supported attack, not front-first unsupported siege.
3. `cheap-three`: one southern barracks purchase only, then north/middle support and siege. No further south factories, replacements or upgrades. This is a plausible cheaper-coverage comparison, not a required loser.
4. `cheap-two-diagnostic`: exactly the same cheap policy, formation and seed, with only the required bridge count reduced from three to two. Its earlier ending can itself truncate later spending, so compare common-time traces before either ends rather than calling final expenditure matched-duration evidence.

All policies use own living structures only and attempt at most one ordinary paid command every five seconds. They wait when unaffordable, never inject money, and issue no spells/citadel purchases or troop orders. Native enemy AI remains adaptive and paid. Policies may fail or succeed by either allowed victory.

Review actual southern spending and replacements, factory/unit coverage, bridge captures and interruptions/resumptions, core damage and enemy purchases. The extra road should create a visible commitment or coverage consequence. A cheap-third success is legitimate. Equivalent behavior across cheap and broad attempts weakens the encounter's claim; merely achieving a higher threshold does not prove distinctive tactics. There is no automated balance/admission gate or demand that every alternative win.

## Preflight and execution

`node --test tests/leave-no-road-closed-prototype.test.mjs` runs authoring checks and isolated synthetic fixtures only. It never ticks the natural candidate formation. It covers placement, normal prices, building/mine/unit caps, native loss/draw/core-before-control precedence, deadline/goal boundaries, ordinary escalation/economy/AI, control interruption and strict QA save continuation. These are mechanics checks, not pacing evidence.

`node qa/leave-no-road-closed/run.mjs --freeze /ABSOLUTE/OUTSIDE/freeze.json` emits only a compact hash closure and proposal. It does not open a battle. Independent preflight must review the binding/envelope, supported policies and setup before the parent authorizes twelve natural cases. The eventual approval file must contain format `leave-roads-approval-v1`, status `parent-authorized-after-independent-preflight`, a named `independentReviewer`, verbatim `parentAuthorization`, and the exact `freezeSha256`.

Only after that approval: `node qa/leave-no-road-closed/run.mjs --run-approved /OUTSIDE/approval.json /OUTSIDE/results.json`. Output and its `/OUTSIDE/results.json.cases` sidecar directory must both be new and outside the repository. The summary records running, partial, complete or incomplete status. Each completed raw case is written exclusively to the sidecar **before** post-case cadence, prices, final restore and source verification. Passing verification gets a separate receipt. Stops and assertions retain the current serializable state, policy continuation, commands, ledger, traces and error in an incomplete draft. A post-case failure keeps the completed raw too. Nothing automatically retries or overwrites earlier artifacts.

The runner advances exactly `Game.update(.05)` through its exported `advanceRunnerTick` path. The native control rule already enforces its deadline; the runner must not reduce that fixed tick to the floating-point remainder before 600 seconds. Empty synthetic regression now advances from tick zero through the drifted 11,999th tick to terminal tick 12,000, and exercises last-tick control/core/loss/draw precedence through this exact runner path.

Asynchronous safe points yield to the Node event loop at most every 100 ticks (five simulated seconds), between cases and before post-case verification. They honor SIGINT/SIGTERM and `/OUTSIDE/results.json.stop`; handlers are removed in `finally`. Separate synthetic tests cover queued signal delivery, stop files, handler cleanup, raw-before-validation retention and interrupted drafts. The original 001 source/packet/freeze remain unchanged. This correction changes only the QA runner, tests and documentation; scenario, paid policies, seeds, counts, timing and goals remain byte-identical, with no candidate natural cases opened.

Results include ordinary economic receipts, five-second coverage traces, control changes, losses and strict restored native continuation at 30/90 seconds when the case is still active. Generated results, freezes, logs and screenshots stay outside the repository. Imports and `npm test` never run the natural matrix.
