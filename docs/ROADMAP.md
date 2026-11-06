# Development roadmap

## Current playable slice

Seven buildings, five unit types, three lanes, autonomous spawning, income and investment, building levels, salvage, active strike, three difficulty settings, original 2D models, touch/mouse controls, minimap, synthesized sound, local battle persistence and deterministic tests.

## Release gates

1. **Correct systems:** deterministic simulation, valid/corrupt saves, range/target filtering, air/ground interactions, upgrades/refunds, resource limits, victory and late-game behavior covered by tests.
2. **Readable play:** desktop and narrow/landscape layouts verified in a real browser; no clipped primary controls; building selection distinct from drag; counters and costs visible on touch.
3. **Fair strategy:** test naive and adaptive policies across multiple seeds, inspect extreme counters and snowballing, target meaningful economy decisions and comeback opportunities. Do not equate a bot's win rate with human balance.
4. **Good feel:** independent live playtests, readable silhouettes, impact feedback, clear loss explanations, camera and input comfort, no empty long openings or unexplained damage.
5. **Durability:** resume midcombat without divergence, safe storage failure behavior, background pause, performance at entity caps, repeated new-match/menu transitions.

## Beyond this slice

- Distinct battlefields with different strategic shapes, validated individually.
- Short campaign/challenges and progression that teaches roster counters.
- More enemy personalities, replayable seeds and battle history UI.
- Improved formations/path separation and richer contextual sound/animation.
- Settings for audio, visual quality, color distinctions, motion and controls.
- Controller support and desktop app packaging; offline font/asset distribution.
- Steam integration only after stable packaged build, platform requirements and distribution decisions.
- Online PvP requires authoritative networking, reconnects, abuse handling, matchmaking and a distinct testing effort. Do not present local AI as PvP.
