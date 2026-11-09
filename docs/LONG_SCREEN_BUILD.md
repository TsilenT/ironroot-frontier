# The Long Screen

Fourth mission in the partial Siege Coast chapter, after The Hammer Turns. Current main route: 31 missions, 93 stars. Chapter 7 remains three missions. Chapter 8 remains unfinished; Chapters 9 and 10 are not admitted here.

## Identity and public contract

- v0.33.0; profile protocol 24.
- Campaign `the-long-screen` revision 1, whole rules `frontier-campaign-long-screen` revision 1, Classic revision 1.
- Fresh fixed public seed 8404. The test-only uint32 constructor override is checked before construction. Ordinary launch, replay and restart use 8404; Resume retains the original state/RNG.
- Destroy the enemy citadel by 600 seconds with the player citadel alive. No required unit, workshop or road. Optional medals: at most 180 seconds; at least 4,500 player HP.
- Normal ordinary adaptive AI. Both cores 6,000 HP, player/enemy cash 1,100/100, one actual mine each, 7.5 gold/sec each including baseline. Level-one authored investment 785/855.

Player authoring order: barracks830 north/middle/south, archery690 middle, mine410 middle. Enemy order: Warden lodge2090 middle, archery2370 middle, barracks2370 north/south, mine2790 middle. This is frozen exploratory F2's formation, without its F1 second lodge/sanctum overload.

## Encounter boundary

The intended decision is supported demolition of central troop production versus temporary central containment while a supported outer ground army advances. The lodge is optional, and units already spawned survive its destruction. Wardens have 800 troop HP, low melee damage and a 12-second level-one lodge spawn; the building has 650 HP. No new combat mechanic or enemy subsidy is added. Automatic flyers engage ground contacts, so this is not an air-bypass lesson.

Repeated middle maintenance is an available investment, not a proven requirement for victory. Known-seed diagnostic replays can still win after omitting later middle payments, at the cost of more central losses. Script wins are feasibility evidence, not a human-ease or general balance claim. No ordinary 5:00 escalation outcome is established by short runs.

## Runnable verification

`npm test`, `npm run check`, and `npm run check:release` are the release gates. New tests cover exact mission admission, terminal/deadline precedence, optional medals, seed fencing, paid ordinary actions, current catalog, five-domain profile fencing/import/rollback/ownership, prior-source paid/restore parity, and isolated preview preparation. Minimal executable prior-source controls are retained; no new full historical runtime snapshot is added.

`qa/long-screen/PLAN.json` declares 24 development cases before their first run: all eight unchanged F2 policies on known seeds8303/448273 and fresh public8404. `node qa/long-screen/simulate.mjs EXTERNAL_DIRECTORY` runs the actual production campaign factory and evaluator and refuses to write results inside the repository or overwrite earlier receipts. Simulation guards use completed/failed, bounded steps and progress checks. Generated matrices, source closures, audits, screenshots, review reports and checkpoint manifests are external, not repository payload.

No heldout is claimed by the development plan. Independent validation requires a reviewer-approved external plan binding the exact source closure and disjoint untouched seeds. Source changes invalidate that approval. The current Screen runtime is deliberately rejected by the historical Hammer final-source freeze, rather than relabelled as Hammer validation.

## Compatibility and isolation

The engine and all previous whole rules remain unchanged. Screen adds no save fields. Exact mission/rules/map identity is enforced for battles, results, histories, backups and restart. One-star Hammer completion unlocks Screen. Profile24 prevents old Hammer23 and earlier clients from discarding the new record, without rewriting existing domain bytes.

The only general presentation correction reads building names from a mission's exact ruleset roster, so a Warden lodge can be described without consulting the older seven-building roster. Existing deployment text stays identical. Native preview uses disclosed synthetic prior progress, natural paid public-seed checkpoints, session-only storage and a disabled service worker. It is not production-user migration evidence.
