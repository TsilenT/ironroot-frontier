# Normal AI rush-response integration

## Scope and exact engine

This is a source integration record, not a statement that this change is live.
Only two decisions in normal AI changed: rear-row production no longer counts
as a nearby screen, and normal establishes a barracks before ranged support
when that lane has no barracks ahead of the rear rows. The mirrored threshold
is strictly less than 2650. Authored barracks at 2230, 2370 and 2510 still count.
Air and immediate ground-incursion responses retain priority.

- Baseline SHA-256: `404a6d420960d2ce352a94aa13cae2e85263d2dec151269d4a210f8cdce3ffc9`
- Integrated SHA-256: `0e94556092df4c5b74f6002bfb8e70fe8477b9e66363e17485b6c083373bd889`
- Selected upstream patch: `9fa5f40344735e1f83575c9542c9120e61f3c2c7`

Combat, prices, resource grants, purchase paths, decision budgets, timers and
easy/hard behavior are unchanged. No unrelated branch files were merged.

## Integration checks

On Node v24.22.1, the current complete suite passes 239/239 tests and all runtime
JavaScript modules parse. The three selected AI regression tests are retained.
Six more tests cover both map sides at 2510/2650/2790, rear-only lane priority,
anti-air, immediate tower response, saving for a screen, and full-frontier
affordable upgrade fallback. No gameplay win rate is asserted as a unit test.

The focused integration diagnostic runs the **working engine**, substituting
only the supplied baseline AI for paired comparisons:

- 240 skirmishes across seeds 37001–37003. Both sides and both first-event actor
  orders are exercised for normal rush and economy probes. All ledgers balance
  exactly, every final save validates, and there are no timeouts or draws.
- Easy/hard have 36/36 identical paired complete-state hashes across burst,
  center and fast-screen policies. This is stronger than merely matching wins.
- The old `economy-screen` probe builds zero opponent mines in all 24 runs.
  Its upgrade fallback spends money it intended to save for a mine.
- The corrected four-producer `screen-save` buys mines, but loses all 12 runs
  against the new normal. Its mines do not repay before destruction.
- Three forward barracks, then one rear-center mine, beats the new normal in
  12/12 runs. All 12 mines repay their base cost; 11 repay all later upgrades.
  This does not establish that the mine caused the victory.
- Flipping only the first decision event reverses the apparent side split:
  burst AI wins change from left/right 3/0 to 0/3; center AI wins change from
  0/3 to 3/0. Later actor ordering is identical. Do not call this map-side bias.
- 192 campaign runs cover 12 missions, reference/mastery routes, both AI
  versions and seeds 33001–33004, including repeated restores on seed 33004.
  Each version clears 95/96 and earns three stars in all 48 mastery routes.
  Every completion and star outcome is unchanged.

**Known inherited failure:** Last Light's reference route, seed 33003, loses
the original north signal watchtower at 172.6 seconds. Both versions fail with
the identical complete-state hash. This is not a new regression, but universal
campaign-clear claims would be false.

## Wider independent audit and limits

Before integration, an independent audit ran 1,376 unique skirmishes and 576
campaign runs. Easy/hard matched in all 72 paired states. Both versions cleared
287/288 campaign routes, with only the same Last Light failure; all 144 mastery
routes per version earned three stars. Candidate normal won 64/64 against easy,
42/64 against old normal and 22/64 against hard in a mixed-difficulty screen.
Those sampled aggregate results support difficulty ordering, not universal
dominance or a claim about perceived player difficulty.

In that larger audit, the corrected three-barracks/one-mine route beat candidate
normal 24/24; every mine repaid its base cost and 22 repaid full investment.
The original economy probe still built no opponent mines. Unupgraded mines
need 76 seconds to repay 190 gold at 2.5/sec. Upgrade increments cost 133 and
200 gold for 1.25/sec each, requiring 106.4 and 160 additional seconds of
incremental payback. Income alone is not profit. Mine value still needs a
same-timing, no-mine ablation to separate income from opportunity cost.

These are correlated deterministic policy probes, not independent statistical
trials or human playtests. The threshold was selected with campaign formations
in mind. Only three missions use adaptive normal AI; eight use fixed enemies
and one uses hard. A large mission count does not imply broad adaptive-AI
coverage. Some paid spell and concentrated-infantry policies still beat normal.

Actual player-facing checks remain separate: first input at 0, 0.25, 0.5, 1 and
2.5 seconds, interrupted/rebuilt screens, spell timing, losing the first
producer, readable warnings and recovery. The simultaneous scripted decision
event is not native UI input. This record establishes neither subjective fun
nor music quality, controller hardware behavior or device performance.

## Reproduction

The isolated diagnostic is `tests/ai-rush-audit.mjs`. Its baseline is an explicit
local engine snapshot; it does not fetch Git or change runtime files. Output
JSON records the exact hashes, policy, seed, map side, order convention, actual
first actor, purchases for both actors, paid mine investments, earned income,
mine loss time, survival duration and full-investment repayment.

```sh
npm test
npm run check
node --check tests/ai-rush-audit.mjs
node tests/ai-rush-audit.mjs guard 3 37001 /path/to/baseline-engine.mjs /path/to/results
node tests/ai-rush-audit.mjs campaign 4 33001 /path/to/baseline-engine.mjs /path/to/results
```

`current` in diagnostic JSON means the supplied baseline AI; `candidate` means
the working engine AI, as stated in `versionMeaning`. The `opening-flip` order
changes only the first event. The broader `screen` mode changes all frame-order
parity, so it must not be confused with that controlled experiment. `guard`
deliberately retains the flawed economy policy as a labeled negative control
beside the corrected saving policies. Ordinary `tests/balance.mjs` results do
not provide these controls and should not be used to certify mine viability.
