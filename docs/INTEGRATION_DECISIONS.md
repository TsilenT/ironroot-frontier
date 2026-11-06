# Consolidated next-game candidate

Status: local integration, not a release. The live game remains v0.12 at source commit `24edddab2cff33b3f91b396bc855193f87421ba3`. No proposal below has deployment authority by itself.

## Product direction

The next candidate should feel like one game: open on the campaign, teach through its real controls, offer clear routes between missions and optional modes, and make useful battlefield information readable on a phone. The user prefers substantial improvements and fewer deployments. Alternative winning strategies and stalls caused by a player's composition are acceptable; every benchmark does not need to end or reward the same build.

## Selected work

- **Campaign entry, shared coaching, and replay:** integrate proposal `d80d8393372726cb030a1145d341dd631d6a53ed`. Keep normal paid commands, real controls, an immediate full-roster escape, and optional replay after a one- or two-star clear. Coaching must direct a phone user to the visible Build control before a card hidden inside the drawer. Presentation alone must not rewrite old saves or mission rules.
- **Mobile battlefield and protected objectives:** use the frozen mobile-layout work as the local base. It has individual objective health/focus, explicit viewport suspension, reachable 44px controls, and an actual short-portrait/landscape review. Preserve the existing input, profile ownership, recovery and safe-exit boundaries while merging navigation.
- **Rootwarden:** select the frozen 800-HP, low-damage screen and original 2D art for deliberate roster integration, subject to the unified ruleset and combined checks. Its role is an alternative durable front line, not a guaranteed answer to every barracks opening. The independent paid playtest demonstrated both useful wizard-screening and a real infantry/area-strike weakness.
- **Early lane progression:** selected the authored one/two-road geography from proposal `7e76e79c2097f33406e272ad7e7eaf19db40388b`, not its copied QA engine or crossing mechanic. New optional mission IDs `first-watch` and `forked-road` have their own six stars; the existing sixteen missions and forty-eight stars keep their meanings. An alternative victory still wins, but missing learning actions leave optional stars to replay for.
- **Player copy:** selectively integrated `c4ae6842e70794310c6ea878b7dc6c03c46dad2b`. Campaign-first navigation takes precedence over that branch's old skirmish-first labels. The display name is Arrow volley, retaining the existing action/control identifiers. The review also corrected an article typo and avoided describing upgradeable towers as unable to heal.

## Deferred or rejected

- Reject the broad AI replacement that repaired one rush but produced other difficulty and pacing problems. Keep the known baseline until a distinct opponent or level earns inclusion on its own merits. A readable specialist weakness can be intentional.
- Defer the longer procedural score until an actual listening review. PCM and clipping measurements establish technical behavior, not good music.
- Do not include native desktop export merely because its isolated module tests passed. Packaged runtime verification is still missing.
- Defer fixed flyer crossings. The proposed warning/transfer mechanism changed no outcomes in 384 paired scripted cases and weakened some separate-road raids. That does not prove all crossing designs are bad; this one has not earned the extra rule/UI complexity.
- Do not simply remove sudden death without addressing save duration. Existing engine and backup/history validation reject time beyond 10,000 seconds. An open-ended option must validate before overwriting a resumable save and retain strict structural limits.

## One integration boundary

All selected work lands in this checkout. Original source labs and historical production fixtures remain unchanged. No parallel worker edits the same runtime files. Navigation/layout owns the app shell; a separately agreed engine/save contract owns roster, map/scenario revisions and endgame behavior. Prose is applied after those interfaces settle, with exact control names and mechanic meanings preserved.

Preserve v0.12 trajectories and source saves explicitly. New battles may select a new immutable ruleset; preferences cannot reinterpret an ongoing battle. Unsupported revisions must retain original data rather than silently converting or deleting it. Keep identifiers stable where only display copy changes. “Rally” currently means an area-damage volley, not a troop buff.

## Completion gate

1. Review and accept/reject every incoming proposal, with a short reason.
2. Finish one coherent integration and run the dependency-free suite and runtime/asset checks against its final bytes.
3. Exercise real campaign entry, construction, coaching, protected-target navigation, victory/replay/continue, failure/retry, settings/back, and save/resume on the combined UI.
4. Check legacy production upgrade, new ruleset save/backup/report/history identity, long-session boundaries and corrupted-data preservation.
5. Run representative paid strategy comparisons and independent adversarial review. Mark ongoing games as ongoing, not fabricated losses.
6. Fix material findings in a batch, retest affected paths, then run the exact-candidate browser matrix. Publish only after a deliberate consolidated release decision.

Physical phone/controller behavior, subjective audio quality, non-Chromium accessibility, packaged desktop behavior, full human campaign completion and Steam release requirements remain separate unverified gates.

## Integration checkpoint

The shared mobile shell now applies to ordinary campaign, intro, field-trial and skirmish battles, rather than appearing only for protection objectives. The navigation-only checkpoint passed 739 tests plus one existing optional skip before ruleset/content changes began. That count is not the final combined test result.

Engine, intro and active-roster source work is complete. New skirmishes select immutable `frontier-rootwarden-open` or `frontier-rootwarden-timed`; legacy battles remain `frontier-legacy`. The open option retains the disclosed five-minute escalation but removes automatic citadel decay. A seven-day supported-duration boundary safely refuses further advancement without inventing a winner. The continuous empty-game boundary test and restored snapshot passed; this does not measure device performance.

The paid introductory reference routes clear in 58.1 and 97.9 seconds; a thirty-second delayed start remains viable in the sampled authored scenarios. A no-mine alternative wins the second intro with two stars rather than false economy credit. These are scripted pacing observations, not human onboarding certification.

The accepted renderer's legacy drawing commands remain exact across three maps and five viewport sizes; the new Rootwarden art is byte-identical to the reviewed original. Reports now identify the actual ruleset while old reports remain readable. Independent QA is replacing obsolete whole-current-source assertions with pinned historical-source verification and real legacy trajectory/serialization comparisons. Historical hashes are not being repinned to the new implementation.

Combined native navigation/playtesting and the final aggregate/browser gates remain pending. There has been no new publication.
