# Chapter 6 presentation closure

This bounded change finishes the presentation of the existing five-mission River Compact route. It adds no mission, chapter, battle rule, unlock, reward, profile version or saved-data field.

## Result copy

A River Between Us has two valid victory routes. Its published victory descriptor describes the command post falling and crossings standing open, which is not necessarily true when the enemy citadel falls first. It also overstates current bridge ownership after the player has banked the required time and subsequently lost the crossings.

The result screen now checks the evaluated `completed` result before choosing victory prose. Within that successful result, the actual winner and enemy-citadel HP select the same citadel route used by `evaluateCampaignMission`. The evaluator still decides defeat, deadline and protection precedence. No labels, elapsed-time guesses or current bridge counts select the victory route.

- Citadel victory: “With the enemy citadel fallen, the River Compact has broken the toll commander’s hold on the river.”
- Compound victory: “With the original North Command Post destroyed and 60 seconds of secure passage banked across two crossings, the River Compact can keep its own roads supplied.”

A simultaneous citadel and compound completion uses the citadel copy, matching evaluator priority. Failure copy remains the mission name followed by the evaluator’s existing label. The published mission descriptor is unchanged.

## Current briefings and chapter ending

The current Shared Crossing launch descriptor uses “Secure the convoy route” without the historical “Chapter 6 preview” prefix. Fresh, restarted and replayed briefings retain the current subtitle and route reward while their mechanical fields still come from the exact admitted scenario revision.

The five current rewards remain:

1. Shared Crossing → One Signal Is Enough.
2. One Signal Is Enough → Lanterns on the Water.
3. Lanterns on the Water → Borrowed Ground.
4. Borrowed Ground → A River Between Us.
5. A River Between Us → Completes The River Compact.

The current progression overview has a separate presentation epilogue: “From the lantern-lit banks to the borrowed yard, the river towns now share the watch over crossings and signal fires, so the next convoy need not depend on Rowan’s company to reach the far bank.” It appears after the existing five-mission completion check and does not advertise another playable chapter. The historical chapter descriptor remains unchanged.

The finale still offers Skirmishes as its primary action and an optional mission replay even after earning three stars. Those handlers, rewards, progression rules, identities and saved profiles are unchanged.

## Verification

The focused Node run passed **159 tests, zero failures and zero skips** on 2026-11-08. Its 17 new closure tests execute production result, restart/replay and briefing functions with the existing small DOM fixture and real evaluator.

Coverage includes:

- Compound victory with crossings still clear and with all crossings lost after banking 60 seconds.
- Citadel victory with the original command post standing and no banked time, both actual terminal indicators, and simultaneous completion of both routes.
- Own-citadel loss, draw and deadline precedence without a failure-copy override.
- Exact five-mission order, rewards, unlock boundaries and chapter completion.
- Current subtitle and rewards across fresh, restart and replay briefings for all five missions, with exact restart battle state.
- One-star and three-star finale actions, preserved records and no automatic new battle.
- Immutable historical mission/chapter descriptors, prior profile protocols, backups, battle identities and existing restart/replay behavior.

Command:

```sh
node --test --test-concurrency=4 \
  tests/chapter-six-closure.test.mjs \
  tests/campaign-presentation.test.mjs \
  tests/campaign-progression-ui.test.mjs \
  tests/campaign-replay-briefing.test.mjs \
  tests/campaign-restart-identity.test.mjs \
  tests/campaign-profile-compat.test.mjs \
  tests/river-between-mission.test.mjs \
  tests/river-between-ui.test.mjs \
  tests/river-between-profile.test.mjs \
  tests/river-between-control.test.mjs \
  tests/shared-crossing-profile.test.mjs \
  tests/one-signal-profile.test.mjs \
  tests/lanterns-profile.test.mjs \
  tests/borrowed-ground-profile.test.mjs \
  tests/persistence-recovery.test.mjs
```

The result boundaries are synthetic fixtures, not paid gameplay or balance evidence. This record does not claim a full aggregate pass, browser/device acceptance, remote publication or deployment verification; those are separate release checks. No historical fixtures or fingerprints were rewritten.
