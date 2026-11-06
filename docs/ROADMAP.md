# Development roadmap

## Current pre-release game

Seven buildings, five unit types, three lanes, autonomous spawning, income and investment, building levels, salvage, rally strike, three AI settings, original 2D models, touch/mouse controls, minimap, adaptive procedural score and effects, local battle persistence and deterministic tests.

The released 0.7 campaign has twelve missions in four chapters, original fiction, branching unlocks, protection/economy/destruction/survival objectives and 36 optional stars. The isolated 0.10 candidate adds four missions on Long March and Twin Span, a fifth chapter, 48 total stars, and data-derived scouting reports. Five standalone field trials teach counterplay. Settings cover independent music/effects, volume, motion and quality, and display recent battle history. Local portable JSON backups and experimental standard-controller navigation are implemented. The 0.8 candidate adds a factual unit/economy field reference with original static portraits. Local 0.9 adds longer and two-road skirmish battlefields while preserving Classic and existing campaigns. The confirmed held-touch result-action leak is fixed locally in corrected 0.8/0.9/0.10 code, but its exact four-profile browser gate remains pending. Candidate commit/ref operations are stopped pending user approval; none of these newer candidates is published.

Isolated 0.11 adds an optional post-match Battle Report: factual two-sided totals, sampled economy/army/citadel timelines, final forces and objective checks. A resumed timeline discloses its missing beginning, and a bounded series discloses thinning. Reports are current-page data with an optional local JSON download, not replays or durable history. Independent paired simulations preserve exact final engine/RNG states and action traces. Native result-flow review and an unrun four-profile regression harness supplement those tests; device performance and the exact browser gate remain required. The frozen 0.10 source is unchanged.

Isolated 0.12 addresses the first-play learning gap with five short guided practice lessons on a separate page. It uses actual paid actions, production and combat while pausing instructions. Training is deliberately temporary and cannot alter normal saves, campaign progress, history or rewards. The original simulation, normal game controller and persistence modules are unchanged. The lesson system, observation truth, touch/keyboard UI and offline route require their own independent checks before release; frozen 0.10 and 0.11 remain separate.

## Release gates

1. **Correct systems:** deterministic simulation, corrupted saves, targeting, air/ground interactions, upgrades/refunds, resource caps, objectives, exact deadlines and late-game behavior covered by tests.
2. **Readable play:** desktop, narrow portrait and short landscape verified in a real browser; primary controls reachable; placement distinct from drag; counters and costs visible on touch. Physical devices remain required.
3. **Fair strategy:** compare naive and adaptive policies across seeds, inspect extreme counters, economy payback and snowballing. Normal AI has a new early-pressure response, but its human difficulty and all opening policies still need broader review. Bot results are not human balance certification.
4. **Good feel:** independent human playtests, readable silhouettes, audible mixing, meaningful losses and progression. Current browser reviews are useful but not a substitute for a player cohort.
5. **Durability:** resume without divergence; safe storage failures; portable backup; offline updates; repeated mode transitions; bounded effects and performance on low-powered hardware.
6. **Distribution:** controller mapping, packaged runtime actually launched and played, signed/notarized platform builds where appropriate, licensing audit, Steam integration and store requirements.

## Next iterations

- Keep hardening the shipped portable-backup recovery and cross-tab ownership paths.
- Validate shipped experimental controller support on physical hardware and add remapping.
- Broader campaign/device playtests, economy pacing and AI response testing. The fifth chapter has authored, independent and primary-route simulations plus bounded native UI reviews; those are not a human player cohort or a physical-device validation.
- Finish independent balance, device, backup and offline-update validation for the implemented Long March and Twin Span maps before exposing them publicly. Keep Classic and existing campaign saves exact. The authored fifth chapter is implemented in an isolated checkout against the unchanged map engine; complete its separate browser/progression/protocol migration gates before publication.
- Broader original sound/visual polish after subjective player reviews.
- Validate the integrated self-contained licensed font bundle across browsers and native desktop. Full notices are already available in-game.
- Localization, accessibility, remappable inputs and player-facing diagnostics.
- Validate Battle Reports with player reviews before adding strategic advice. Any future earnings, casualties, production totals or causal tips require real event counters rather than guesses from sampled snapshots. Consider durable report history/replays only with explicit storage/schema design and migration testing.
- Steam integration only after a stable packaged game and explicit distribution decisions.

Online PvP is a separate substantial project: authoritative networking, reconnects, latency behavior, abuse handling, matchmaking and competitive validation. Local AI is never presented as PvP.
