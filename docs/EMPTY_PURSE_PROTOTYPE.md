# The Empty Purse: unopened QA proposal

Status: fresh, untested Chapter 9 candidate. No mission, ruleset, prerequisite, profile, version or runtime asset has been admitted or changed. Canonical Watch v0.34 remains the production baseline. This packet is for independent review before any candidate gameplay.

## Source facts and the distinct question

Baseline commit `65ee1438435a9e8a4cb6b8b6930ac87ca17518b7`, tree `b6ee01ff93f43176a889d7fb3c226cf5ef442643`. The full external 2,399-file inventory has SHA256 `99598b55d37e7d7c82664e5ae848ba2405e9ec244843331c410187dbc36e6123`. All 1,351 materialized blobs matched before the isolated copy; all 1,048 omissions remain listed and must be preserved unchanged. The external source-verification receipt retains every materialized path and omission. No repository-specific AGENTS or local skill instructions were present.

Salt in the Stores asks whether to raid real enemy mines or sustain a direct siege. Its observed direct wins leave the outer mines alive. Borrowed Ground instead makes inherited assets compete for twelve real construction plots. Both lessons are already represented. Empty Purse would ask whether to liquidate useful **own** income for earlier support on the ordinary roomy 24-site Classic map. It has no economic target, protected mine, cramped cap or required sale. Shared Watch's static/mobile coverage choice and the separate reserve/boss experiments are not reused.

Ordinary source mechanics, not design changes:
- Mine cost 190. Actual JavaScript upgrades cost 133 and 199, giving level-three investment 522, full HP 684 and normal full-health salvage 261.
- A level-three mine yields 5 gold/sec above baseline; a level-one mine yields 2.5. Keeping both means 12.5 total/sec. Selling the larger leaves 7.5 total/sec until ordinary changes.
- Refund is floor(investment × 0.5 × HP/maxHP), so the same half-health mine yields 130, not 261. Factories continue producing without unit wages.
- Ordinary normal paid AI, the full eight-building earned roster, automatic air, citadel choices and the 300-second escalation remain. No forced drain, hidden cash, refund override, scheduled reinforcement, repair requirement or new engine hook is introduced.

## Fresh encounter hypothesis

Every number below is untested design, not recovered history or observed feasibility. Player: 0 cash, healthy 6,000-HP core; level-two middle barracks x970 and archery x830; level-two outer towers x1110; level-three middle mine x410 and level-one south mine x410. The combat formation is Salt's existing supported formation; only the inherited own economy and liquid cash change.

Enemy: 100 cash, healthy 6,000-HP core; level-one outer barracks x2370, middle level-two barracks x2230, level-one archery x2370, level-two tower x2090 and one level-one mine x2790. This is Salt's ordinary opponent minus its two forward mines, not the parked recovery candidate's six-producer mixed-air pressure. Enemy total income starts at 7.5/sec. These are a credible existing supported formation and a modest economy, not a proof that this new low-cash matchup works.

The QA factory binds the existing generic full-roster campaign ruleset, distinct from admitted Salt/Watch identities; the engine and campaign catalog stay byte-identical. Core destruction by 600 seconds with the own core surviving is the only objective. One HP can win; own loss/draw takes precedence; a win after the deadline fails. No mine survival, asset kill, purchase or damage floor is required.

## Exact paired policy and pending nine-case plan

`qa/empty-purse/PLAN.json` fixes seed-major order 9102, 923, 6401, each running retain-income, salvage-one-mine, idle. These are disclosed known inputs, with no heldout claim. All nine cases remain unopened.

Retain keeps both mines. Salvage sells only the original level-three mine at tick zero, spending that five-second command slot. Both then use the same finite paid support plan: middle sanctum, north barracks and archery before north foundry, south barracks and archery before south foundry, middle Warden and another middle archery. Afterward, ordinary surviving combat-producer upgrades use the documented stable ordering. Each build is retried until affordable; lost completed buildings are not rebuilt. No mine is bought/replaced, other asset sold, spell cast or citadel choice bought by these scripts. All such ordinary actions remain available to a player, and the AI retains its normal choices.

The 230-gold sanctum is arithmetically affordable at the 20-second no-sale decision slot from uninterrupted 12.5 income/sec. Selling yields 261 immediately but uses tick zero, allowing the first support command at 5 seconds. This **15-second affordability difference is source arithmetic only**. Bounties/combat can alter actual timing; earlier construction does not establish arrival, useful support or a better outcome. The 261 refund divided by 5 lost income/sec gives 52.2 seconds of uninterrupted-income crossover, not a battlefield recommendation.

A matching full-source/environment freeze, named independent review, coordinator authorization and exact invocation are required by the unopened runner. It reuses `qa/salt-stores/economy.mjs`, retains both ledgers/ordinary-price receipts, all failed player attempts, normal AI calls, unit births, effective hits, structure losses, HP and scheduled actual-state traces. Primary strikes are attributed to the paid producer's units; splash and volleys remain in the damage log but are deliberately not claimed as attributed support damage. Thus attributed damage undercounts full support contribution.

Interpret actual first construction, unit birth, first primary contact, own pressure/losses and later income together. Same-seed comparisons use the latest shared scheduled trace no later than the earlier of 90 seconds or either termination; no after-end income is projected. Refund removals remain distinct from combat losses. Displayed gold alone is not a gate or a conclusion. Keep and salvage are intended alternatives, not guaranteed winners. There is no required idle loss, forced no-sale loss, universal-win requirement or mandatory purchase. If timing has no useful field consequence, or the supported retain route cannot be established, report that honestly before considering a new design epoch. Do not make selling mandatory to rescue the concept.

## Verification and remaining gates

The dedicated tests forbid engine ticks and use only deterministic setup, ordinary direct commands, synthetic time/funding/damage fixtures, source arithmetic, core/deadline boundaries, output safety and freeze rejection. Synthetic fixtures are not legal battle outcomes. Syntax and existing runtime/cache verification also do not advance this candidate.

A full aggregate has not been run in this initial scope because it includes battle simulations; existing frozen-source suites may require a separately bound verification-only allowance for additional canonical code. Do not weaken historical source-freeze checks merely to get a green aggregate. Independent review of this unopened packet comes first. Only after separate approval may the exact nine known cases run. All generated logs, freezes, receipts, result summaries and screenshots belong outside the repository and must remain immutable once cited. Completed and partial results must be retained; no automatic retries or tuning of opened cases.

Following gameplay, independent economy/outcome review, any justified further frozen comparison, aggregate compatibility, production admission/persistence, native UI, exact remote CI and publication would remain separate decisions. No browser, natural balance case, remote write or production admission is authorized by this packet.


## Preopen revision 2: runner guard correction only

The original unopened packet and freeze remain unchanged in their original workspace. Independent preopen review found that unexpected failures could discard the in-case draft and that a synchronous loop delayed JavaScript signal handlers. This revision changes neither setup, policy, seeds, ordinary economy nor interpretation/outcome gates.

The case body now catches every error, capturing a serializable draft with phase, current state, initial state, receipts, commands, field events and traces. Each component has a capture-error fallback so a malformed component does not hide the others. A completed raw is written before the post-case source assertion. A separate verified receipt binds its raw hash only after that check succeeds; failures retain both the raw and an incomplete draft. Storage failure, process kill without a catchable signal, and machine loss cannot guarantee a final write.

Execution is awaited throughout. Every 100 fixed ticks and between cases, an asynchronous checkpoint yields to the event loop before checking stop-file and SIGINT/SIGTERM state. This bounds normal cancellation latency to at most 100 ticks of work plus scheduling and retains the interrupted draft without retry. New regression checks use synthetic records, injected failures, stop files and actual self-signals in a zero-battle subprocess. No candidate tick is opened by these checks.
