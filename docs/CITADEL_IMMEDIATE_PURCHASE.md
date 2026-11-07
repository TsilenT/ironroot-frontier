# Immediate citadel purchase, v0.20.1

Base: released private main `cd63f7c543b7c8425dc304105e229ff09d01e043`, tree `1be2466de57cab64630ee90f152cb27f3523fb5f`. This candidate is not merged or deployed.

## Change

Citadel-enabled battles allow a purchase from time zero when the player has 190 gold and the existing battle/save safety checks permit it. One mutually exclusive Extra Arrow or Regeneration choice remains optional. Forced first-build and coaching holds still take precedence; after their normal release, Pause → Citadel choices is immediately available. No gold is spent automatically.

The initial 90-second/1,800-tick gate, its purchase-validation floors, obsolete pre-98-second healing cap, countdown copy and readiness toast are removed. The validator still requires finite nonnegative purchase time, a nonnegative safe-integer purchase tick, time/tick consistency, nonnegative counters, real damage history and the tighter per-purchase healing bound. Regeneration still waits eight full simulated seconds after purchase and after damage. Buying neither heals nor changes firing cooldown. Pause freezes the wait. Cost, effects, native AI decisions and both-side eligibility remain shared.

Only six runtime files change: `citadel-options.js`, `citadel-view.js`, `app.js`, `profile-session.js`, `index.html`, and `service-worker.js`. Existing ruleset IDs, Campaign revision 5, Field Trial revision 3, earned rosters, bridge rules and unrelated mechanics are unchanged. The cache is `ironroot-v0.20.1`; desktop lockfile changes are limited to the two application-version fields.

## Saved state

Profile protocol 11 is a marker-only compatibility fence against actual released protocol-10 clients, which reject early paid checkpoints. Marker upgrades retain the existing epoch and all five domain bytes. No campaign progress, records, preferences, history or active battle is reconstructed by the upgrade.

Old purchased checkpoints restore state-equivalently, retaining their choice, purchase timestamp/tick, damage history, HP, gold, cooldown and effect counters. Unbought v0.20 citadel checkpoints gain immediate availability. Historical non-citadel identities remain unavailable. Protocol-9 regressions and a new hash-pinned actual protocol-10 writer fixture cover both already-open and reopened stale clients, including import recovery. Future or interrupted markers and unverified upgrades remain blocked.

## Verification

- Full default Node suite: **1,504 passed, zero failed, one optional skip** (1,505 total). The skip requires uninstalled desktop build dependencies.
- Focused citadel/profile/keyboard regression: **121 passed, zero failed**. Covers exact time-zero and early purchases, exact one-time debit, insufficient funds/cancel, true recovery boundary, early save/backup/history round trips, released bought snapshots, AI parity, teaching/safety guards and persistent save-failure warnings with save-only retries.
- Runtime syntax passes. Runtime inventory: **54 files, 1,036,435 bytes**. Pre/post-browser SHA256 inventories match exactly.
- Native desktop browser: fresh Roadside Watch attempt behind first-barracks teaching; no Citadel entry during the hold; legal paid barracks releases teaching; immediate purchase at displayed 00:00; Back/cancel and modal 1/R/Space isolation; exact 280→90 purchase debit; 6,000 HP and eight-second wait retained; reload and resumed paid choice; Back returns to Pause. This used a retained earned QA profile, not an empty-profile reset.
- The current automated browser spec now expects immediate availability and no readiness toast. Its existing keyboard, failure/retry, stale-checkpoint and unsafe-viewport cases remain. Syntax was checked, but the automated browser suite was **not executed** in this pass.

An initial focused test expected the wrong ordinary-import error from the pinned protocol-10 writer; correcting the test expectation required no runtime change. The first broad run failed on missing local historical inputs. Those files were recovered byte-for-byte from the exact base; none were regenerated or edited. A newly reached current upgrade helper contained a stale protocol-10 assertion, updated to 11. The complete rerun passes. Initial and final logs are retained in [the QA folder](../qa/citadel-immediate/REPORT.md).

Short-phone rendering, native quota/silent-save fault injection, physical phones/controllers, non-Chromium browsers, installed PWA upgrades, desktop packaging and human balance/enjoyment testing were not performed. Save-failure behavior was tested through actual production handlers in a Node DOM fixture; that is not native browser fault evidence. Existing historical QA reports and snapshots remain unchanged.
