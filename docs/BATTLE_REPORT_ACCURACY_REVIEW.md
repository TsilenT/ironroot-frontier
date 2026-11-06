# Battle Report accuracy and noninterference review

Date: 2026-11-06. Scope: isolated local 0.11 candidate only.

## Verdict

The reviewed journal and report are truthful within their stated sampling limits. The independent audit passes **52 checks, 0 failures**, including **31 paired complete games / 62 simulations**. Every pair produces exactly the same final serialized engine state, including RNG state, and exactly the same attempted and accepted player-action trace with and without observation. Nine pairs include a save/restore continuation. These checks were rerun after the report-only presentation polish.

The engine, campaign rules, challenge rules, per-tick objective evaluation, persistence, backup, and profile-session files retain their baseline hashes. No report state is added to the Game, battle envelope, history, or backup format. Actual app-function tests find no repeated reward/history write when reopening the result and no stale report after a new battle or Resume.

This is a local Node and source review. It is **not** browser, mobile, controller, visual-layout, download-delivery, balance, or release certification. No server, browser, network transfer, commit, hosting, or publication was performed for this audit. The frozen 0.10 directory was not changed.

## Reproduce

From the 0.11 directory:

```sh
node qa/battle-report-audit.mjs --fixtures-only
node qa/battle-report-audit.mjs > /tmp/ironroot-battle-report-audit.json
```

The full command emits JSON containing every named check, the exact tested data/view/app/harness hashes, per-game serialized-save and action-trace SHA-256 values, accepted action counts, final engine counters, income rates, sample counts, and JSON byte sizes. Progress goes to stderr. The harness writes no runtime files and makes no network calls.

The completed revalidation is archived at `qa/report-evidence/battle-report-audit.json`, with its progress log, aggregate test log, and syntax log in the same directory. `qa/report-evidence/SHA256SUMS` records the evidence-file checksums. These are local source QA records, not runtime assets or publication approval.

Reviewed source hashes:

| File | SHA-256 |
| --- | --- |
| `dist/engine.js` | `e47a168c099c2a4e1f45b238d5224cb44a02433a7cff06adbfb87095c4d56bc7` |
| `dist/battle-report.js` | `9f1b49f561015436141bf108cbb443555540512fcffb6133ede2d7c59066852d` |
| `dist/report-view.js` | `5a0af7eaf256aec549013934d6a224676df0449f642997e6092e108f9e59345e` |
| `dist/app.js` | `fc93f44b556bff11b758308a0a38abaadb41106a3d821cee517d99c8a096662c` |
| `qa/battle-report-audit.mjs` | `a5b6249c2ddd0c6f00082e9b7d97893240979bb42b82bcdaa2ecc679ef6cafeb` |

The harness itself embeds baseline hashes for all seven protected simulation/persistence modules and checks them before and after running.

Additional local checks after the presentation polish: `npm test` reported **492 passed, 1 skipped, 0 failed** and `npm run check` passed. An earlier `npm run check:release` during active native UI review correctly rejected its temporary `dist/__qa_report_profile.html` and `dist/__qa_report_responsive.html` fixtures. Their owner subsequently removed those first-review fixtures. The parent owns final source-dist preflight after the targeted polish retest and cleanup; this accuracy document does not claim that gate passed.

## Measurement truth

### Whole-match engine counters

- Kills, buildings placed, and damage are copied from the existing counters, independently checked against both sides' final engine state. They include play before Resume.
- Buildings placed includes initial free allocations, including authored deployments. Upgrades do not create another placement. All 16 mission deployments were checked at time zero against their authored building counts and starting gold.
- Damage is engine-credited HP removed from units and structures. Automatic overtime citadel decay is not credited as player/enemy damage. The renderer and exported limitations disclose this distinction.
- The report does not calculate spending, refunds, income received, mine return on investment, lifetime recruits, unit losses, or a causal explanation of defeat from the available counters.

### Final state and living composition

- Both sides' final gold, base HP/max HP, living army counts, per-type living roster, and standing-building counts are independently projected from the final Game and compared exactly.
- Income is recomputed from living mines and their current levels, plus the base rate. It does not trust the cached HUD income. Paid build/upgrade/sale fixtures confirm correctness between ticks; a clearly synthetic zero-HP mine fixture confirms exclusion before array cleanup.
- All three maps, all five unit types, and all seven building types are covered. Map width and lane geometry are checked directly against the actual Game map. Final composition is explicitly labeled as living entities, not lifetime production.

### Timeline, Resume, thinning, and peaks

- Observations use simulation time, not wall-clock time. The journal does not advance the engine, spend gold, consume RNG, or replace Game methods.
- The initial and terminal snapshots are checked independently. A terminal state between scheduled observations is force-captured. Zero-time, same-time changed-state, single retained point, and subinterval endings are covered.
- Resume creates a new journal. Missing pre-resume observations are disclosed; cumulative counters remain whole-match counters. A late, non-Resume journal is also marked partial. Resume at time zero does not claim a fully observed match.
- Timeline values are actual captured snapshots. No interpolation is stored. Charts visibly explain that connecting lines do not reconstruct intervening events.
- The synthetic long-duration boundary fixture runs observation times to 10,000 seconds without pretending this is a normal game. It exercises multiple thinning passes, keeps at most 256 points, preserves exact initial/final times, and verifies every retained point against a separately captured observation.
- An intentionally unique gold maximum at 2 seconds is later removed from the retained timeline. Its exported observed peak remains exactly correct, including its time. Peaks are maxima of captured observations, not continuous or lifetime maxima. The renderer's chart ranges are explicitly ranges of retained samples, not the richer exported observed peaks.
- All tested exports contain finite numbers, bounded arrays, immutable copied values, and no RNG/tick state or complete entity records. They round-trip through JSON exactly, but both Game restore and backup parsing reject them. The largest normal-game pretty JSON was 802,812 bytes; the largest normal-game retained series was 215 points. The independent structural/byte checks also cover the thinned fixture.

## Outcome precedence and identity

Explicit synthetic terminal-state fixtures, separate from paid simulation evidence, verify:

- Mandatory original-structure protection wins over a simultaneous enemy-citadel destruction. A paid replacement at the same position does not restore the original protected target's identity.
- Mandatory player-citadel health also wins over an enemy-citadel destruction.
- Objective completion with an intact enemy citadel is a victory with an objective source.
- Alternate citadel victories retain any unmet primary-objective rows rather than silently claiming all objectives were met.
- An engine draw is reported as a draw in skirmish. A campaign draw follows its existing failed-objective evaluation, while preserving `engineWinner: "draw"` as a separate fact.
- A journal rejects a different Game both before and after completion. Same-Game completion is idempotent and returns the same frozen report.
- Changing the live Game after completion does not change any exported report bytes. A deeply frozen Game can be observed and finalized without mutation.
- Invalid/nonterminal finalization does not poison the journal. A subsequent valid finalization succeeds. NaN, infinity, negative gold, unknown entities, and sparse arrays are rejected rather than exported as fabricated/null data.

## Actual app integration checks

These tests execute the actual `app.js` helper/function bodies in Node VM contexts with DOM/storage doubles. They are more than string checks, but do not claim actual browser rendering or input coverage.

1. **Finish and reopen:** actual `finish()` runs repeatedly and Last Result is reopened five times. There is exactly one history write, one campaign-result call, one progress-persist call, and one saved-battle removal. The current reveal helper aligns the summary by scrolling only the existing result body and focuses it with `preventScroll: true`. The DOM doubles exercise its actual geometry and selector guard; using `scrollIntoView` would fail this test. Reopening only changes view state. Final Game bytes and frozen report identity remain unchanged.
2. **New battle / Resume:** actual initialization clears the old journal/report, Last Result flag, and report markup before creating the new observer. A failed initialization leaves no stale downloadable report. A subsequent Twin Span resumed result has the correct new map and partial scope.
3. **Sample fault:** an observer exception disables further sampling and sets the isolated report fault. No Game bytes or progress/history state change. The valid finished match still receives its one ordinary result/reward.
4. **Render/finalization fault:** a deliberately throwing renderer produces the explicit unavailable-report message while the valid battle result is finalized exactly once.
5. **Save contract:** actual `save()` uses the unchanged `writeBattle()` path. The captured envelope is exactly `{format:"ironroot-save",version:2,challengeId:null,campaignId:null,game:game.serialize()}`. In-memory report/journal objects are not serialized.

Source inspection also confirms sampling occurs only after the existing active-battle advancement path; initial recording happens after authored setup or restore; the finished report is retained only in the current page; and successful profile replacement goes through the existing reload path. No new reward call, storage key, replay mechanism, or persistent journal was added by these helpers.

### Presentation-polish revalidation

The plain-language Battle totals section now precedes recording coverage. Independent assertions verify that full-match/pre-Resume scope, starting allocations, upgrades-not-placements, automatic overtime loss, sampled-history limits, and living-not-lifetime roster caveats remain intact. The report no longer creates a second vertical scrolling area inside the result body.

Independent boundary fixtures verify that visible seconds use the same `Math.floor(value + 1e-6)` tolerance as the main result clock: floating-point values infinitesimally below 1:00, 2:00, 2:30 and 1:00:00 display consistently, while a value genuinely below the boundary stays in the preceding second. The underlying report scope, final snapshot, final retained sample, export bytes, and Game bytes retain the exact original timestamps. This is display consistency only, not interpolation or measurement rounding.

## Findings resolved during review

1. **Cross-game calls after completion:** the initial implementation returned the cached old report before checking Game identity. The owner moved identity validation before the early returns in both sample/finalize paths. Independent regressions now reject the wrong Game both before and after completion.
2. **Sparse invalid arrays:** absent array indices were skipped by `map`/`filter`, allowing synthetic sparse objectives/targets to export as null entries. The renderer rejected them safely, and normal engine/evaluator arrays were unaffected. The owner added central own-index validation. Independent sparse objective, target, and building tests now reject these inputs and still permit subsequent valid finalization.
3. **Late-journal wording:** the view initially implied a non-Resume journal started with the battle even when its first time was nonzero. The view now says recording began on the page, separately states its time, and discloses missing earlier play. This does not change any measurement.

No unresolved accuracy or noninterference failure was found in the reviewed scope. Future runtime edits require the affected checks to be rerun; these results identify the exact tested bytes above.

## Paid full-game paired matrix

All commands use public paid build, upgrade, cast, and sell APIs. Initial authored formations and gold are unchanged. Alternative seeds are assigned only before the first tick. Both members of each pair use the same policy and end normally through engine victory/defeat or objective completion/failure, not a forced test outcome. Save/restore pairs restore the exact legitimate serialized state at 60 simulated seconds and start a fresh partial journal in the observed member.

The generic policy's Gold Rush failure is deliberately retained. A passing parity check does not mean its policy wins or proves balance. Several authored victories may use their legitimate alternate citadel route; this matrix does not certify every primary route. The idle Classic control reaches a natural overtime-era end at 428 seconds. Both victories and defeats occur naturally; draws and simultaneous mandatory failures are covered only by the separate synthetic fixtures.

| Mode / map or mission | Seed | Difficulty | End seconds | Outcome | Restore | Retained points |
| --- | ---: | --- | ---: | --- | --- | ---: |
| skirmish / classic | 733 | easy | 100.30 | victory | No | 52 |
| skirmish / classic | 91237 | normal | 155.15 | defeat | Yes | 49 |
| skirmish / classic | 7281901 | hard | 94.30 | defeat | No | 49 |
| skirmish / long-march | 733 | easy | 137.55 | victory | No | 70 |
| skirmish / long-march | 91237 | normal | 186.15 | defeat | Yes | 65 |
| skirmish / long-march | 7281901 | hard | 111.00 | defeat | No | 57 |
| skirmish / twin-span | 733 | easy | 121.30 | victory | No | 62 |
| skirmish / twin-span | 91237 | normal | 116.85 | defeat | Yes | 30 |
| skirmish / twin-span | 7281901 | hard | 121.65 | defeat | No | 62 |
| skirmish / classic (idle) | 3940101199 | normal | 428.00 | defeat | No | 215 |
| campaign / emberwatch | 1101 | Authored | 37.20 | victory | No | 20 |
| campaign / three-roads | 1203 | Authored | 93.95 | victory | No | 48 |
| campaign / winter-stores | 1307 | Authored | 150.00 | victory | Yes | 46 |
| campaign / wings-of-ash | 2101 | Authored | 71.75 | victory | No | 37 |
| campaign / stonegate | 2203 | Authored | 73.15 | victory | No | 38 |
| campaign / long-vigil | 2309 | Authored | 150.00 | victory | Yes | 46 |
| campaign / cold-forge | 3101 | Authored | 98.50 | victory | No | 51 |
| campaign / black-ledger | 3203 | Authored | 120.20 | victory | No | 62 |
| campaign / furnace-heart | 3307 | Authored | 163.25 | victory | Yes | 53 |
| campaign / crown-foothold | 4101 | Authored | 180.00 | victory | No | 91 |
| campaign / last-light | 4201 | Authored | 180.00 | victory | No | 91 |
| campaign / ironroot | 4303 | Authored | 119.40 | victory | Yes | 31 |
| campaign / open-horizon | 5101 | Authored | 87.10 | victory | No | 45 |
| campaign / river-charter | 5203 | Authored | 114.85 | victory | No | 59 |
| campaign / far-beacon | 5309 | Authored | 111.15 | victory | Yes | 27 |
| campaign / common-ground | 5407 | Authored | 105.95 | victory | No | 54 |
| challenge / shieldbreaker | 117 | Authored | 65.80 | victory | No | 34 |
| challenge / skyguard | 231 | Authored | 75.35 | victory | No | 39 |
| challenge / siegecraft | 349 | Authored | 83.55 | victory | No | 43 |
| challenge / goldrush | 463 | Authored | 150.00 | defeat | No | 76 |
| challenge / holdfast | 587 | Authored | 140.00 | victory | Yes | 41 |
