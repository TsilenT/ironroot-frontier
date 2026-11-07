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
Validation results and limits will be recorded below after execution.
