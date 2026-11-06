# Development roadmap

## Current pre-release game

Seven buildings, five unit types, three lanes, autonomous spawning, income and investment, building levels, salvage, rally strike, three AI settings, original 2D models, touch/mouse controls, minimap, adaptive procedural score and effects, local battle persistence and deterministic tests.

Twelve campaign missions in four chapters add original fiction, branching unlocks, protection/economy/destruction/survival objectives and 36 optional stars. Five standalone field trials teach counterplay. Settings cover independent music/effects, volume, motion and quality, and display recent battle history.

## Release gates

1. **Correct systems:** deterministic simulation, corrupted saves, targeting, air/ground interactions, upgrades/refunds, resource caps, objectives, exact deadlines and late-game behavior covered by tests.
2. **Readable play:** desktop, narrow portrait and short landscape verified in a real browser; primary controls reachable; placement distinct from drag; counters and costs visible on touch. Physical devices remain required.
3. **Fair strategy:** compare naive and adaptive policies across seeds, inspect extreme counters, economy payback and snowballing. Normal AI still has a forward-infantry rush weakness. Bot results are not human balance certification.
4. **Good feel:** independent human playtests, readable silhouettes, audible mixing, meaningful losses and progression. Current browser reviews are useful but not a substitute for a player cohort.
5. **Durability:** resume without divergence; safe storage failures; portable backup; offline updates; repeated mode transitions; bounded effects and performance on low-powered hardware.
6. **Distribution:** controller mapping, packaged runtime actually launched and played, signed/notarized platform builds where appropriate, licensing audit, Steam integration and store requirements.

## Next iterations

- Portable player-progress and battle backup with validated restore.
- Controller-first navigation and explicit placement without a mouse.
- Further campaign UI/device playtests, economy pacing and AI response testing.
- Distinct physical battlefield geometry only with corresponding pathing/balance validation.
- Broader original sound/visual polish after subjective player reviews.
- Fully self-contained licensed font distribution.
- Localization, accessibility, remappable inputs and player-facing diagnostics.
- Steam integration only after a stable packaged game and explicit distribution decisions.

Online PvP is a separate substantial project: authoritative networking, reconnects, latency behavior, abuse handling, matchmaking and competitive validation. Local AI is never presented as PvP.
