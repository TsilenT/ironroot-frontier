# The Last Engine: playable spectacle lab

This is a separate QA-only follow-up to the phase oracle in private draft PR42,
head `37d00737047830ae84ffd024df032c383a4765b5`, tree
`e75b3c1de328c71dab6d68f0d0efd7355083b138`. The three oracle files remain unchanged.
There is no Chapter 10 mission, campaign admission, version reservation or release.

## Latest design intent

Steve clarified that smaller reinforcements may suit current encounters, while
the final mission or missions can use an enormous last reinforcement for emotional
impact. A late spectacle can be worthwhile even if it is unlikely to change who
wins. The boss should draw attacks from every road because of its actual size,
then create a race to kill it before it reaches the player's citadel.

That changes this experiment's success criterion. It is not required to rescue
the enemy economy, equalise the battle or invalidate the player's successful
siege. The enemy may have almost no buildings left. A short, overwhelming victory
over the boss can still be a useful ending. Do not reject the idea just because
the player was already winning.

## What this prototype actually does

- At 600 enemy citadel HP or below, including a lethal hit, spawn **The Last
  Engine** once. It is a real 10,000-HP enemy unit, not a scaled-up normal sprite.
- Its one-time lethal breakout clears living hostile troops within 310 pixels of
  the enemy core, including flyers and all ordinary core attackers. It does not
  wipe the player's remote army or buildings. A 69-unit pre-deployment reservation
  guarantees room without exceeding the ordinary 70-unit enemy cap.
- A damageable three-second emergence gives the large model a readable entrance.
  This is not a dodge countdown: ordinary troops still cannot be manually pulled
  back. The lethal clear is an intentional dramatic rule, not ruled out by the
  ordinary-paid-AI default.
- Its 210-pixel circular body is an actual targeting footprint spanning all three
  roads. Warriors and Rootwardens on both outer roads can strike its edge; archers,
  siege, wizards, flyers and Volley use the same body geometry. Normal ground
  opponents do not acquire new cross-road targeting.
- It marches at 26 pixels/second along the middle, attacking without stopping or
  chasing a distraction. A lone screen cannot pin it at the enemy gate. Movement
  joins the engine's pending movement commit, and damage uses the same simultaneous
  queue as ordinary combat.
- Every 2.4 seconds it can hit hostile troops and buildings within 38 pixels of
  its body for 140 damage. Contact with the player core deals 1,200 damage instead.
  Normal post-5:00 structure damage x1.75 still applies. It has no regeneration,
  resistance, invisible HP floor or invulnerability.
- Original Canvas artwork depicts a giant furnace-driven walking citadel with
  eight legs, four towers, a road-spanning footprint, nameplate and health bar.
  An additional HUD bar keeps exact boss HP visible. Reduced motion disables its
  art motion and retains the static outline and readable information. These
  implementation facts are not a claim that the visuals have been viewed.

The values are exploratory, not a balance recommendation. In particular, the
breakout, health, speed and contact damage have not been selected through a paid
policy matrix or human playtest. The ordinary adaptive opponent still purchases
with its real treasury while its core lives. The boss is an explicitly authored
one-time asset, not disguised as a paid purchase. Its destruction grants the
ordinary two-gold unit bounty, not a permanent campaign reward.

## The ending is an explicit choice

Two immutable, QA-only whole-rule identities are generated:

1. `frontier-qa-colossus-aftermath`: the enemy core may die normally. Once the boss
   deploys, the battle continues until both it and the core are destroyed while
   the player core survives. A living boss can win after its own core has fallen.
   Simultaneous final boss/player-core deaths draw when the enemy core is dead.
2. `frontier-qa-colossus-core-race`: core destruction still ends the battle even
   with a living boss. This preserves the first oracle's race alternative and
   demonstrates how normal termination can cut off the spectacle.

The aftermath rule is disclosed before starting, not a surprise invulnerable
citadel. A direct lethal core strike can trigger the last weapon from the wreckage.
If the player core has already died on that tick, no new boss is spawned. An
already-destroyed enemy core cannot shoot or make further AI purchases, but existing
ordinary factories still work. These are proposed encounter rules, not changes to
the released campaign. The victory selector restarts the lab so its briefing and
actual bound rules cannot disagree.

## Isolation and reproducibility

The authored generator makes exact, asserted source edits only in a **new external
directory**. It fails on a missing/ambiguous anchor, an existing output directory
or an output inside this checkout. The committed `dist/` bytes, immutable published
rulesets, normal save/profile/history/backup paths, service-worker assets and
mission catalog remain unchanged. Do not publish the generated lab as production.

To prepare a local developer preview:

    node qa/momentum-shift/playable/prepare-lab.mjs /tmp/ironroot-colossus-lab-new

Serve that external directory with a normal local static server and open
`lab.html` in the matching local development environment. It does not register a
service worker. The standalone shell uses only its own tab-session save key,
`ironroot.colossus.lab.v1`; it does not read or write the production profile.
Both new rules have `qaOnly: true`, so even the generated normal battle codec
rejects them from profile saves and backups.

The staged option is a disclosed synthetic late-battle fixture: 80 core HP,
no surviving enemy buildings, and nine authored player attackers close to the
enemy core. Their first siege hit can destroy the core and release the final
weapon from the wreckage. It demonstrates emergence promptly, not a naturally earned or
paid victory. The fresh option starts from an authored full-health deployment,
ordinary treasuries and paid adaptive AI. No fresh-assault outcome is claimed.

The shell offers ordinary construction, upgrades, salvage, Volley, citadel
choices, pause, 1x/2x stepping, pan/minimap navigation, Restart, and lab-only
save/resume. Browser interactions and physical-device usability still need review.
The shell is a testing aid, not a finished campaign interface or accessibility pass.

## Verification scope

Run `node --test tests/momentum-colossus.test.mjs`. It builds a temporary external
runtime and exercises real engine combat, not the old semantic-intent oracle.
Tests cover real attacks from every road and roster type, body-range air retention
and Volley, slot reservation, lethal local clearing, emergence, unstoppable
movement, one-use state, aftermath/core-race terminal rules, strict phase/entity
admission and save/resume through combat. Separate exact-state comparisons run
seven published whole-rule/map combinations against the unchanged baseline engine.

These are synthetic mechanics/regression checks. They are not paid strategic
validation, human balance, a victory-rate claim, sound assessment, or evidence that
the huge artwork reads well on desktop/phone. No generated runtime, logs, screenshots,
source manifests, run records or review reports belong in the repository payload.

Visual review in the current environment is **unverified**: the attempted local
preview URL was unreachable, and rebinding the resulting error tab was then denied
by the browser URL policy before page-content observation. That browser action was
stopped. Do not relabel static source review as a rendered or interactive pass.

## Next useful checks

- View the entrance, large silhouette, all-road attacks, initial clear and final
  march in a working local browser. Check muted/reduced-motion, 390px portrait,
  landscape and desktop. Sound and larger defeat/collapse treatment are not added
  by this checkpoint.
- Check interrupted/repeated UI flows, actual paid clicks, lab save/resume and
  changing the victory rule. Keep production saves inaccessible throughout.
- Freeze a separate development plan before outcome runs. Compare staged spectacle
  and fresh assaults, all-road armies, unprepared all-ins and prepared replacement
  production. Preserve fast boss kills and losses rather than tuning them away.
- Measure the original trigger-to-core-death window, particularly after 5:00, in
  core-race mode. Compare that with aftermath mode instead of forcing an invisible
  core health floor to guarantee a phase.
- Decide through viewing/playtesting whether this is one final battle, several
  escalating final encounters, or a spectacle to cut. Smaller finite relief columns
  remain separate future encounter ideas; no current mission receives them here.

No Chapter 10 admission or deployment follows automatically from this lab.
