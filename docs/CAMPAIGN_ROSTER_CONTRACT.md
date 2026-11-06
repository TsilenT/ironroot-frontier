# Campaign roster and save contract

## Fresh progression

The normal campaign launcher uses `getProgressionCampaignOverview` and
`createProgressionCampaignMission`, not the legacy catalog's default factory.
The current path contains 19 missions: three teaching battles followed by the
existing sixteen authored missions.

| Stage | Starting mission | Buildable roster | Earned by |
| --- | --- | --- | --- |
| 1 | Roadside Watch | Barracks, Archery | A new profile |
| 2 | Shield at the Fork | Barracks, Archery, Watchtower, Gold Mine, Warden Lodge | Any Roadside Watch victory |
| 3 | Open Three Roads | All eight buildings | Any Shield at the Fork victory |

Open Three Roads opens the main campaign on victory. Extra stars are optional;
none of the roster or mission gates require three stars. Rootwarden keeps the
previously authored 800 HP / 8 damage stats and the existing combat behavior.
No movement, cross-lane, counter, economy or AI rule was changed.

The three immutable campaign rulesets are `frontier-campaign-watch`,
`frontier-campaign-fork` and `frontier-campaign-open`, each revision 1. Their
building and unit definitions contain only the available roster. Consequently,
`Game.canBuild`, `Game.build`, raw engine restoration and battle admission all
reject unavailable types. The citadel's own tower-type projectiles remain valid
at every stage. UI recommendations cannot enlarge these dictionaries.

## Exact scenario identities

- Every existing campaign mission, old optional introduction, map, ruleset and
  saved battle keeps its original revision-1 meaning.
- The three new mission IDs are `roadside-watch`, `shield-at-the-fork` and
  `open-three-roads`, scenario revision 1.
- The existing sixteen missions have explicit revision-2 descriptors for new
  campaign starts. These are derived from their original authored definitions,
  with the full campaign roster. The source does not copy sixteen missions.
- Legacy calls to `getCampaignMission(id)` and `createCampaignMission(id)` still
  select revision 1. New start callers use `createProgressionCampaignMission`.
- `getCampaignMission(id, revision)` resolves an exact descriptor.
  `scenarioForBattle(challengeId, campaignId, game)` derives the matching
  scenario revision from the bound immutable ruleset. Save/report/history
  callers must pass the actual game or an already resolved explicit identity.
- Campaign-only rulesets cannot be labeled as skirmishes or old mission
  revisions. Unknown scenario/ruleset revisions fail before storage mutation.

Early missions accept a closed set of earned replay tiers. For example,
Roadside Watch can be replayed with the two-, five- or eight-building roster,
but admission checks that the profile earned the selected tier. A running or
saved two-building battle stays two-building after the profile advances. A
fresh replay may select the higher tier. All sixteen revision-2 continuation
missions retain the full roster and Warden Lodge.

`createCampaignRestart(game, id)` rebuilds the authored starting position using
the active attempt's exact scenario, map and ruleset revisions, engine schema,
difficulty and AI setting. It resets elapsed state and RNG to the authored start,
without reading progress or selecting a newly earned replay tier. The caller
supplies the already-admitted mission ID: `Game` has no intrinsic mission ID and
cannot distinguish missions that share the same rules and battlefield. The
factory validates that context and the candidate's full identity before returning;
the caller still owns progress admission, storage ownership and write fencing.

## Returning players and records

Campaign progress keeps its existing version-1 shape. Three new IDs are added;
no stars or best times are fabricated. An already valid completion from the
original main campaign grants the full roster and preserves the player's next
main mission without requiring the new teaching path. Previously completed
teaching missions can still be replayed.

Old `first-watch` / `forked-road` records remain separate and visible through
`legacyIntroduction`. They do not count as the three new teaching victories or
grant a new-roster entitlement. Their ongoing saves retain the full legacy
seven-building rules. Legacy defaults and the old sixteen-mission overview
remain available for compatibility.

`ALL_CAMPAIGN_MISSIONS` remains the historical 18-entry catalog.
`CAMPAIGN_PROGRESS_MISSIONS` is the 21-ID record/admission catalog.
`PROGRESSION_CAMPAIGN_MISSIONS` is the derived sixteen-entry revision-2 catalog.
The current 19-mission menu is returned by `getProgressionCampaignOverview`.

## Storage safety

Profile protocol 4 is necessary even though the campaign JSON shape stays at
version 1: a protocol-3 client does not know the new mission IDs and could
normalize their records away. The application must request
`requiredProtocolVersion: 4` before ordinary domain access. Migration modifies
only a verified ready marker, keeps its epoch, and retains all five domain
values byte-for-byte, including malformed or unsupported values. Stale or
newly opened PR1 protocol-3 clients cannot read, write, delete or explicitly
recover across a protocol-4 marker.

`readCampaignProgressState` distinguishes supported data, unreadable storage,
malformed JSON and unsupported records. Presentation can still show recognized
records, but `writeCampaignProgress` refuses to replace unsupported source
bytes. Supported writes merge achievements, recheck the source and verify the
written bytes. A normal complete-profile export must not substitute normalized
in-memory progress over unsupported storage; use the explicitly labeled
retained-session export if the user needs to preserve that session.

Backups keep the existing version-1/version-2 protocol. Any new teaching record
requires version 2, as do explicit battle/history identities. Current imports
validate the full profile and immutable battle identity before any destination
access, and preserve the existing rollback/ownership gates. An older importer
that does not know the IDs or identities must reject this data rather than
silently downgrade it. This does not claim that every historic client is safe:
the existing production-v0.12 negative control still documents that a user can
explicitly authorize destructive recovery in that much older client. The
newer open tab then refuses further writes.

## Evidence

`tests/campaign-progression-rules.test.mjs` covers all tiers, rejection without
charging gold, forged entities/projectiles, earned replay, pinned resumes,
all sixteen Rootwarden continuations, returning/old-intro-only profiles,
scenario identity, modern history/report plumbing and actual citadel shots.

`tests/campaign-restart-identity.test.mjs` covers all sixteen missions in both
revisions, every allowed onboarding replay tier, old introductions, explicit
legacy schema-three saves, midcombat/restored/ended attempts, and rejection of
incompatible identities before storage access.

`tests/campaign-progression-storage.test.mjs` covers the pinned PR1 protocol-3
fixture, protocol-4 fencing/migration/failure paths, unsupported byte retention,
progress merge/readback, new-record-only and mixed backups, locked-tier
admission, raw-byte rollback and import finalization.

Existing frozen legacy runtime/profile/backup parity suites remain unchanged.
They are the independent evidence that revision-1 simulations, objectives,
progress and portable exports retain their original meaning.
