# Native bridge-mode browser review

The latest applicable runs pass **25 focused cases**: 12 new bridge cases and 13 existing navigation/coaching regressions. No skips or automatic retries. The final source runtime matches `runtime-final.json`: 52 files, 1,008,378 bytes. `browser-summary.json` records exact run counts, durations and the inventory hash; `browser-measurements.json` retains measured geometry and paid ledgers.

## Coverage

The new matrix uses real Chromium with trusted mouse/touch actions and normal wall-clock simulation at 390×650, 320×430, 844×390 and 1180×757. There is no virtual clock, runtime/stat patch, injected income, forced click or game-instance hook in the paid case.

- Fresh setup defaults off; saved checked and unchecked choices survive reload and preserve existing preferences, trial records and result history. New timed Twin Span binds the bridge identity. Changing setup before Resume does not change that battle, and confirmed Skirmish restart retains its map/rules with fresh unowned bridges. Campaign and Trial setup hide the option.
- A real 140-gold forward barracks is purchased through the native build controls on each viewport. Its naturally spawned ground troops capture a bridge. Empty ownership continues paying; the ordinary checkpoint, reload, Resume and subsequent earnings retain the same owner/rules. The measured ledger is `420 − 140 + 5×elapsed + 2×kills + bridgeGold`, with absolute residual below 2×10⁻¹² gold. HUD shows total **+5.17/s** and separate bridge contribution **+0.17/s**. Pause/options/Back, scrollable rules, drawer and real hit testing pass.
- A separately declared **synthetic restored-state fixture** on Long March and Twin Span tests air contest, interrupted payment, pending enemy ground takeover, a natural completed flip, non-color rendered labels, accessible non-live status, and save/reload. Its synthetic units/ownership do not supply paid-gameplay or balance evidence.
- Existing native regressions pass across four profiles for hidden hints through Options/Back, Shield at the Fork restart-to-briefing, and Common Ground's Skirmish/Replay navigation. An additional existing case explicitly checks 320×430 hidden teaching, safe-area padding and rotation.

| Viewport | Measured battlefield | Minimum mobile control | Paid bridge gold at paused checkpoint | Total income |
|---|---:|---:|---:|---:|
| 320×430 | 320×242 | 44×44 | 0.816667 | 5.166667/s |
| 390×650 | 390×426 | 44×44 | 0.875000 | 5.166667/s |
| 844×390 | 692×282 | 44×44 | 1.041667 | 5.166667/s |
| 1180×757 | 1180×476 | Existing desktop sizing | 0.550000 | 5.166667/s |

All measured control centers hit the intended target; there were no control collisions, objective-text overlaps or clipped income/contribution text. Desktop controls retain their existing 31px minimum; the mobile 44px targets are preserved. Restored bridge gold increased in every paid case.

## Retained failures and repairs

`browser-initial/` retains the first 12-case run: 8 passed, 4 failed. New bridge strings inherited 8px landscape income and 9px desktop subtitle sizing. The runtime now scopes 11px income/contribution text to active bridge games. Visual review also found that troops could cover field status text; geometry/progress stays below actors and labels now draw above them. All downstream assertions were retained.

`browser-final/` retains the repaired-runtime 12-case run: 10 passed, 2 failed. The two failures were transient synthetic-observation races: the saved capture had one second left, and it naturally finished between accessible-status and current-canvas-frame reads. Correct owner switches were visible in the failed evidence. The QA observer now latches the first actual capture/contest Canvas2D call and accessible status in a bounded record. It calls the original draw once with unchanged receiver/arguments and adds no simulation calls, timers or animation frames. Only the four affected synthetic cases were rerun in `browser-observation-final/`; all four passed. The eight already-passing paid/default cases were not redundantly repeated.

`browser-regressions/` retains 12/12 existing cases; `browser-short-hints/` retains the additional 1/1 shortest-screen case. Logs, JSON, screenshots and error contexts are retained for the PR; the larger trace ZIPs remain locally retained and ignored by Git. There were 41 total executed instances across these bounded runs, including six retained preliminary failures. The latest applicable result is 25/25.

## Visual review and limits

Reviewed setup, drawer, paid ownership and contest screenshots at the requested sizes. Checked controls scroll naturally on 320×430; Begin remains reachable by ordinary input. Paid ownership frames show the field marker, minimap owner cue, separate contribution and ordinary total clearly. Post-repair first-road `X BLOCKED` clears the flyer.

The ordinary temporary “Battle resumed” toast can cover the second-road pending-capture label in an early restored-state screenshot. The capture label's actual rendering and accessible status are established by the passive observations, not claimed as unobscured pixel proof in that frame. No toast/clock/runtime change was made for a screenshot. Full rules/status remain available in the pause disclosure.

These are emulated Chromium layouts and synthetic restore checks, not physical-phone, non-Chromium, screen-reader usability certification, deployed smoke or human balance evidence. No production browser was changed and no complete 1600-case suite was run.
