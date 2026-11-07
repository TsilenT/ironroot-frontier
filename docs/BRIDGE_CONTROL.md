# Optional Skirmish bridge income · v0.19.0 candidate

Base verified before edits: private `main` was exactly
`495cf2563f8b9f06723e27e06ae77dcdc5d9b2ca` (v0.18.1).
Work is isolated on `codex/skirmish-bridge-income`. No merge or deployment.
PR #14 is unrelated and was not inspected, changed, or used.

## Contract fixed before focused validation

The new immutable identities are `frontier-bridge-open@1` and
`frontier-bridge-timed@1`. They retain the corresponding automatic-flyer roster,
AI, costs, combat, escalation and ending policy. All published identities stay
unchanged. Setup defaults off and binds the checkbox only when a new Skirmish
is constructed. Restart and Resume retain the bound identity. All three existing
Skirmish maps are supported; authored maps/scenarios cannot admit this mode.

Each road has a symmetric 210 by 130 world-unit rectangle centered on map center
and road Y. A troop's center on the boundary counts. Dead troops, structures,
effects and projectiles do not. Troops are counted by actual X/Y, independently
of their original road, current road label or the global frontline.

Every bridge begins unowned. Ground troops need two uninterrupted seconds alone
against no opposing living troop to capture. Air troops deny capture and income
but cannot capture. An owner remains while contested and indefinitely while
empty. Enemy ground attempts suspend payment immediately and must complete the
same two seconds to switch ownership. If an unfinished attacker leaves, the
old owner earns again. There is no timeout, immediate flip or capture bounty.

The engine samples control after its simultaneous movement and damage phase at
each 0.05-second fixed step. Zone entry/exit and death therefore resolve at that
sample, with at most a tick's temporal discretization. Only eligible time after
the two-second threshold is paid; the capture-completion instant itself pays
nothing. Extra gold is available before that tick's AI decision. No new AI
policy or free resources are introduced.

The entire map makes at most **0.5 gold per second**, divided equally by road
count. Both sides share this cap. Empty owned bridges pay; enemy presence stops
the owner's share, without transferring it. No mine/base-income theft, combat
buff, overtime multiplier or other reward. The amount is provisional and not
tuned. Open-ended battles remain open-ended, including strategic stalemates.

## Persistence and evidence boundaries

Only these two rulesets have `state.bridgeControl`, containing per-road owner,
capturing side and progress plus exact cumulative bridge gold for each side.
Strict admission requires the new shape and bounds progress below two seconds,
side identities, aggregate earnings by elapsed time, and total rate at 20.5/s.
Other rulesets retain the 20/s limit and reject control state. Existing engine
and envelope versions remain valid; no old active-battle migration is added.

Profile protocol 9 fences older clients that reconstruct known preferences or
cannot read history carrying the new ruleset IDs. This is needed to remember
the optional `skirmishBridgeIncome` boolean safely. Existing settings, campaign
stars/unlocks, trial records and history are retained, including old backups
that lack the new preference. It is not a campaign progression change.

Total income remains total income. The new contribution is shown separately;
reports retain current rates and the exact full-match bridge-gold counter.
Rate snapshots do not establish other earnings or spending. UI uses existing
in-play space and non-live detailed status, with field/minimap owner and contest
cues that do not depend on color.

The paid study's fixed preregistration is in
`qa/bridge-control/study-plan.json`. The earlier presence/12-second lease shadow
study was not consumed and supplies no balance evidence for persistent ownership.
## Measured validation

- Aggregate Node run: 1,461 passed, zero failed, one existing skipped
  optional desktop dependency compatibility test (1,462 total). See
  `qa/bridge-control/node-final.log`.
- All runtime JavaScript parses; browser harness preflight passes. Source runtime
  preflight admits exactly 52 runtime files, 1,008,378 bytes, recorded with SHA-256
  per file in `qa/bridge-control/runtime-final.json`.
- Pure/new-mode tests cover boundaries, actual positions, both sides, dead and
  non-troop exclusions, ground capture, friendly air, hostile air denial,
  uninterrupted capture, unfinished withdrawal, repeated flips, empty ownership
  for 86,400 simulated seconds, exact threshold payment, map-wide cap, overtime,
  strict save rejection and byte-identical continuation. Six exact serialized
  snapshot oracles from verified v0.18.1 prove disabled behavior unchanged on all
  three maps with both endgame identities and paid air/Rootwarden/mine actions.
- Profile tests preserve old earned domains and explicit checked/unchecked
  preferences through backup/restore, and fence exact v0.18.1 writers.
- The fixed 36-game paid comparison passed all ledger/cap/save checks, with 457
  accepted paid actions and 121 save/continuation checks. Every air/Rootwarden
  policy game produced both types and recorded attacks. The final-source rerun,
  needed after stricter save bounds, reproduced every original game result,
  action and state hash. Initial evidence remains retained. See
  [the full paid-study review](../qa/bridge-control/study-final-review.md).

The paid study has one seed, Normal difficulty and scripted policies. Rush won
6/6 disabled and 5/6 enabled; the other two policies lost 6/6 in both modes. One
Long March rush changed from a 151.9-second win to a 216.55-second loss despite
the scripted player earning more bridge gold. This adverse result is retained.
The largest single-side bridge payout was 42.65 gold, at most 7.30% of that
side's earnings excluding starting gold. The 90-second payout leader won 17/18
enabled games: extra gold largely followed stronger field positions, so longer
term snowball remains an open question. No reward was tuned. All games ended
naturally; this does not certify long stalemates or force equal strategy wins.

32.26% of bridge receipts arrived while empty. Natural empty ownership lasted
at most 5.7 seconds, and no isolated air-only denial occurred; the pure contracts
supply those mechanical checks. The study is not human balance certification.

Initial failed evidence is retained: transient extracted-UI fixture dependencies
and hardcoded protocol-8 test expectations. Their assertions and downstream
checks were retained; current tests passed after integration fixes.

The first focused native run passed 8/12 cases. Four minimum-font failures (8px landscape total income, 9px desktop bridge subtitle) and a visually observed flyer-over-label occlusion were repaired with a mode-scoped 11px font and labels drawn after troops/projectiles. No new row or smaller controls. Failed artifacts remain in `qa/bridge-control/browser-initial`. Final native and post-repair aggregate checks are still running at this draft stage.
Physical devices, non-Chromium browsers and production smoke are outside this
candidate's evidence. No merge, deployment, PR14 integration, permanent upgrades
or spell changes are included.
