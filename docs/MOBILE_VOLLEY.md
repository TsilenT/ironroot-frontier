# Visible mobile Volley candidate

**Current integration:** [v0.18.2 on merged v0.18.1 main](MOBILE_VOLLEY_INTEGRATION.md). The following is the preserved original v0.18.1 candidate review record, including its historical failures and sequencing decisions.

This draft starts from exact private `main` **b88119fdd2cc288633e58bfaf0baffa302ee76de** (v0.18.0, profile protocol 8). Branch: `codex/mobile-volley` in an isolated worktree. The candidate identity is **v0.18.1 / ironroot-v0.18.1**. No merge, publication, deployment, signing or store work is part of this change. Production was neither accessed nor modified.

## Selected control and tradeoffs

The existing `#rally` button is the sole spell action. Compact layouts move that same node from the desktop deck into Sound's third utility cell; desktop restores it to its original 145px card. Compact Sound is hidden, with audio still available in Options. Desktop Sound remains visible and synchronized. The existing layout transition retires held input before moving nodes and restores focus afterwards; focused desktop Sound transfers focus to Volley when its shortcut disappears.

The compact target is **44×44 CSS px**. Its three lines show **Volley / ◆ 75 / Ready**, a seconds countdown, or **Cancel** with a selected border and `aria-pressed=true`. Unavailable states say **No gold**, **Build** during first-building teaching, or **Paused**. Name/state use 14px bundled Barlow Condensed; cost uses 12px DM Sans. Measured text contrast is at least **6.39:1**, including the selected background. All text fits inside the target. This is dense but readable in inspected Chromium screenshots; no smaller type, new row or narrower field was needed.

The old 104px coached portrait, 276px coached/short landscape and 152px ordinary landscape rails retain their dimensions. CSS explicitly assigns Volley the Sound cell, including collapsed hints' third row. Safety now measures the visible Volley instead of hidden Sound and still enforces 44px controls, 212px field height and 128px field width. A deliberately narrowed 43px Volley triggers the existing pause latch; restoring it requires explicit Resume.

While armed, the existing field-note position displays **Tap enemy troops** until cancellation/cast. This small overlay occupies a field edge; it adds no layout track. Taps on the note are inert, preventing an accidental cast through its copy. It stays clear of income, objectives and coaching. The full desktop card description remains available. The accessible name describes targeting/cancellation and stays constant throughout recharge; only the visual countdown changes, without a live region or per-second accessible-name updates.

Arming and cancellation retire any pending field gesture and do not call the engine's paid cast. Cancelling an armed Volley works even if its funds have become insufficient. First-building teaching refuses arming and retains its paid-barracks start gate. Existing Escape, right click, separate Cancel, remapped keyboard and controller Y/A/B routes remain. Browser Back now cancels an armed Volley before applying its existing menu/pause route, preventing Resume/Forward from resurrecting stale targeting. It adds no history entries or new history framework.

Spell cost (75), cooldown (25s), damage, economy, units, automatic flyers, campaign unlocks, trial rules and profile schema/protocol are unchanged. Existing campaign stars, trial records, settings and result history are checked in the independent browser suite. No in-progress-save compatibility architecture was introduced.

## Evidence and reproduction

The new focused browser suite is `qa/browser/mobile-volley.spec.mjs`; the independent input/recovery suite is `qa/browser/volley-independent.spec.mjs`. Native touch, multitouch, pointer holds, resizing, history, storage and audio checks run in real time. Only the separate cooldown case uses bounded 100ms virtual-clock increments, ending at tick 513 with exact ordinary-engine replay parity (fractional RAF remainder excluded). Real cast cases replay each recorded cast against `Game.restore` and verify exactly 75 gold and 25s cooldown, with no duplicate paid command.

The scenarios cover desktop 1180×757, phone 390×650, narrow 320×568, shortest portrait 320×430 and landscape 844×390. Ordinary skirmish, protected Winter Stores, new Ashen Crossroads and first-build teaching each retain their objective/resource labels; applicable hints are tested both shown and hidden. Example field sizes: at 320×430 protected coaching is 216×278, hidden coaching is 216×322, and Ashen Crossroads is 320×226; at 844×390 ordinary play is 692×282 and the coached sidebar is 568×326 (568×390 with hints hidden). The safety case also checks 240×180 plus the existing short coached pause/recovery regressions.

```sh
npm test
npm run check
npm run check:release
npm run check --prefix qa/browser
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium qa/browser/node_modules/.bin/playwright test --config qa/browser/playwright.config.mjs mobile-volley.spec.mjs
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium qa/browser/node_modules/.bin/playwright test --config qa/browser/playwright.config.mjs volley-independent.spec.mjs --project=phone --project=desktop
```

Exact executed selections, results, repairs and limitations are recorded in [validation.json](mobile-volley-evidence/validation.json), [independent.json](mobile-volley-evidence/independent.json), and [initial-failures.json](mobile-volley-evidence/initial-failures.json). Geometry files retain per-scenario measurements; cast and cooldown files retain compact payment/parity evidence. All initial failures and downstream assertions were retained and resolved or explicitly classified, rather than skipped to obtain a pass count.

Results: the full root suite passed **1,435 tests**, with one optional desktop-dependency skip. Runtime parsing, browser harness checks and the 51-file release inventory passed. The primary browser work covers **13 distinct passing cases across the full run and focused repairs**, plus **10 existing mobile regressions and the desktop right-click regression**. Repeated cases are not counted as new coverage.

One independent phone Back/Forward run observed `history.length` change from 4 to 5. Earlier disarm, no-spend and checkpoint checks passed, but that run did not reach later Resume assertions. Three exact-spec repeats and the final six phone/desktop input checks passed with the strict history assertion retained. The cause remains unestablished; this is **an unresolved intermittent observation for review**, not a claimed fix or proven preexisting defect. Compact diagnostic evidence and all downstream outcomes are retained. Independent final input checks used the final JavaScript; a subsequent desktop-only 11px recharge-status style was verified by primary geometry/cast checks.

Inspected screenshots: [desktop](mobile-volley-evidence/desktop-ashen-1180x757.png), [390×650](mobile-volley-evidence/phone-ashen-390x650.png), [320×568](mobile-volley-evidence/narrow-phone-ashen-320x568.png), [320×430](mobile-volley-evidence/narrow-phone-ashen-320x430.png), [short hidden hints](mobile-volley-evidence/narrow-phone-protected-320x430-hidden.png), [ordinary landscape](mobile-volley-evidence/landscape-ashen-844x390.png), [coached landscape with hidden hints](mobile-volley-evidence/landscape-protected-844x390-hidden.png), plus [Ready](mobile-volley-evidence/volley-ready.png) and [recharge](mobile-volley-evidence/volley-recharge.png).

The bounded history-readiness follow-up changes tests/evidence only. The earlier Forward assertion could pass before traversal because pause/unarmed were already true. The replacement observes a **new native popstate and the complete expected document/entry marker**, then verifies the native current marker before continuing. It retains strict pre-Resume length equality, frozen checkpoint/no-spend/paused/unarmed checks, explicit Resume, fresh battlefield input and persistent profile checks. Complete native calls, markers, document identities and timing are attached in `finally`, including when an assertion fails. No game data is written to history.

One comparison run passed **8/8 affected cases**: candidate and exact base, fresh-document and seeded-reload, phone and desktop. Both heads use identical traversal readiness; base arms through its native `R` shortcut because mobile Volley is hidden, avoiding a base-only Build entry. Every fresh-document case stayed **5 → 5 → 5** through baseline/confirmed Forward/Resume, remained finite through two additional cycles, and exited to the genuine preceding document in three Back steps. Reload cases stayed equal before Resume and increased by one only after explicit Resume: three measured **4 → 4 → 5**, phone candidate **5 → 5 → 6**. The latter extra entry was recorded before reload and baseline sampling; its setup cause is not asserted. Candidate disarmed and fresh resumed input stayed free; base retained targeting and cast on fresh input.

These results **do not explain or prove a fix for the historical pre-Resume 4 → 5 failure**. Its full original failure trace is unavailable. The readiness defect and the separately observed post-Resume reload effect must not be conflated with that earlier observation. Prior evidence is retained unchanged. See [measured follow-up results](mobile-volley-evidence/history-readiness.json) and [complete compressed native traces](mobile-volley-evidence/history-readiness-traces.json.gz). Reproduce only the affected comparison with:

```sh
VOLLEY_HISTORY_COMPARE_BASE=1 PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium qa/browser/node_modules/.bin/playwright test --config qa/browser/playwright.config.mjs volley-independent.spec.mjs --project=phone --project=desktop --grep 'native history readiness'
gzip -dc docs/mobile-volley-evidence/history-readiness-traces.json.gz
```

Limits: emulated Chromium, synthetic controller provider, and a visibility-signal test double; no physical-device, real gamepad, screen-reader or non-Chromium certification. The small persistent aiming note is a deliberate field overlay. This is a bounded control improvement, not a full browser matrix or balance study. The full optional desktop-dependency check remains skipped because desktop build dependencies are not installed.

## Release handoff

Only **four runtime files** changed: `dist/app.js`, `dist/index.html`, `dist/styles.css`, `dist/service-worker.js`. The complete **51-file** SHA-256 runtime inventory is [runtime.json](mobile-volley-evidence/runtime.json). It contains runtime assets only, without QA fixtures or this private evidence. Root and desktop package metadata advance to 0.18.1; no desktop build was performed. The exact changed-file list is [changed-files.txt](mobile-volley-evidence/changed-files.txt). The draft PR and final commit are reported by the coordinator handoff; this document does not grant release approval.

Release sequencing: PR15 is scheduled for independent review/release first and may use v0.18.1. PR14 retains its current runtime identity during this test-only repair; it must be rebased on the verified later main and assigned a distinct next identity by the coordinator before any eventual release. This repair does not incorporate or alter PR15 restart semantics.

No applicable `AGENTS.md` or repository `.agents/skills` were present at the pinned base or in the workspace instruction root. Existing README/check scripts, CI requirements and the managed cloud runtime skill were followed. The original checkout was left intact and all work stayed in one isolated feature worktree/branch.
