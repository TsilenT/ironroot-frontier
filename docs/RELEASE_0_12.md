# Ironroot Frontier 0.12: Guided practice

## Scope and status

This isolated local candidate addresses a concrete first-play problem found in
earlier UI reviews: novice players have to learn placement, automatic production
and counters while a live opponent is already advancing. The new title link
opens a separate Field School with five short replayable lessons.

It is not a released build, source-transfer approval or permission to bypass the
stopped candidate commit/ref paths. Last verified public/private main remains
0.7. Frozen 0.10 and 0.11 source directories are separate and unchanged.

## What the player learns

1. Choose a barracks, pay for a marked placement and observe its real warrior.
2. Place ranged support behind a warrior screen and observe actual combat.
3. Pay for a mine, watch income accrue, pay for its upgrade and observe the new
   income rate.
4. Use an actual siege production building against a normal-health tower.
5. Answer a real flying target with archers rather than ground-only troops.

Instruction steps freeze simulation time. Observation steps use the ordinary
engine at normal speed. Starting gold and any free starting structures are
disclosed. No combat-stat bonuses, fabricated casualties or hidden invulnerability
are added. A learner can pause, restart, skip or replay a lesson; skipped lessons
are not presented as completed.

## Isolation and controls

Practice has its own temporary Game instance and page. It imports no campaign,
backup, profile or persistence services and does not save progress, record normal
match history, award stars or replace an active saved battle. Leaving or reloading
practice resets it. The normal game is reached with Return to game.

The canvas uses the game's existing renderer and models. Build cards plus marked
map sites teach the same choose-then-place interaction. Labeled site buttons give
a keyboard-accessible alternative. Dragging pans instead of spending. Minimap,
Home/Front controls, selection and paid upgrades remain available where relevant.
Shared input-scope protection prevents an old held gesture from activating a new
lesson control. Native focused controls retain their keyboard behavior. This
training page does not claim physical-controller support.

The offline worker now recognizes the exact deployment-relative training.html
route, including nested hosting paths. Its cached navigation returns the training
page rather than the normal index. Same-origin GET limits, asset behavior and
network fallback remain unchanged. All four training files are part of the atomic
versioned shell.

## Verification records

- `TRAINING_SYSTEM.md`: state transitions, authored setups, observations and
  actual-engine learning contract.
- `TRAINING_UI.md`: page/input architecture and scoped unit tests.
- `TRAINING_ACCURACY_REVIEW.md`: independent costs, causality, observer parity,
  identity, progression and isolation audit.
- `TRAINING_UI_QA.md`: bounded native UI observations and limitations.
- `TRAINING_BROWSER_QA.md`: prepared four-profile automated regression matrix,
  fixture validation and actual execution status.
- `TRAINING_DESKTOP_ROUTE.md`: tightly bounded bundled-page navigation policy
  and mocked-main-process tests, not packaged-runtime verification.
- `../LOCAL_VALIDATION_0_12.json`: final local counts, preservation and manifest.

Prepared or discovered browser cases do not count as executed tests. Scripted
lesson success does not establish broad human onboarding effectiveness, balance,
physical touch/controller performance or full accessibility. Normal-game balance,
the pending exact held-touch cloud gate, non-Chromium devices, subjective audio,
packaged desktop and platform distribution remain separate release requirements.

## Measured local results

The final combined candidate passes **548 Node tests**, with **0 failures and
one optional desktop-tooling skip** (549 discovered). Runtime and desktop policy
JavaScript parse. The strict source-dist preflight passes **33 runtime files /
651,493 bytes**, with complete offline coverage and no temporary QA artifacts.

The independent audit passes **63/63 checks**, including 30 paid lesson runs
across six seeds and 7,142 paired fixed ticks. Another 1,315 paired engine calls
cover irregular outer frame timing. Parity compares the exact actual inner
engine calls, including the tutorial's deliberate pause at a completed step; it
does not claim an unsplit outer-frame call has identical accumulator rounding.
Actual controller code under DOM/canvas doubles also verifies zero storage or
network access, accurate pause text and new-Game VFX clearing. Those doubles are
not browser rendering evidence.

Native Chromium independently completed all five lessons through ordinary UI
actions and real observations, including exact mine/upgrade costs and immediate
income display. Before any disposable normal-game activity, the original five
save domains were visibly verified as byte-identical. The review found and led
to fixes for stale pause feedback and an awkward phone map-placement round trip.
The targeted retest and final restoration details are in `TRAINING_UI_QA.md`.
Portrait card-to-canvas placement now works without a return scroll, keyboard
focus stays below the sticky map, pause feedback matches state and landscape
remains readable. Profile equality and byte-verified restoration passed again.
All **248 frozen 0.10 files and 304 frozen 0.11 files remain unchanged**.

The prepared four-profile browser matrix discovers **720 instances / 180 logical
cases / 12 files**. Training adds **72 instances / 18 cases**, with no new skips;
three intentional inherited skips remain. Syntax and all fixture validators pass.
**Automated browser execution remains NOT RUN** pending the separately authorized
runner and source-action gate. Discovery alone used installed Playwright 1.57.0;
the pinned 1.65.0 dependency was not changed or installed locally.

One deliberately injected zero-treasury recovery case is not silently rescued:
the shield/archer lesson may lose its practice opponent during the long real
income wait and correctly time out at 100 seconds. Retry restores the disclosed
funded setup. Ordinary gated lesson actions cannot exhaust their starting grants.

Final source review also caught that the desktop shell's blanket navigation ban
would block the new practice page. Its main-frame navigation/redirect guard now
permits only canonical `ironroot://game/`, `/index.html` and `/training.html`,
with optional fragments and no queries. External and arbitrary local navigation,
subframes, permissions and downloads remain denied. Twelve desktop tests pass,
with one optional tooling skip; they use mocked Electron APIs and cannot establish
real packaged navigation. No Electron process, package build or system setting
was used or changed for this correction.
