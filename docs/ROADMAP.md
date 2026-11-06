# Ironroot Frontier roadmap

## Current state

Production is v0.13, built from source `76135e7b56077a661f67b0b5eeab7c118ec57844` and public commit `f6d59bf634590a823ae64eea7defc71f13880e8b`. Live smoke verified the older campaign save migration and a new introductory mission clear, replay, save and resume. Its complete Chromium matrix passed **841 cases, zero failures, three intentional skips**; root tests passed **825 with one optional desktop-dependency skip**. These are automated/emulated results, not physical-device or human-balance certification.

The v0.13 integration brings together:

- Campaign-first navigation, shared in-game coaching, one-road and two-road introductory missions, optional learning stars, and replay after a partial-star victory.
- Sixteen preserved main missions and forty-eight stars, plus two optional introductions with six separate stars; branching chapters and destruction, protection, economy and survival objectives.
- Rootwarden screening troops and their Warden lodge in fresh skirmishes; legacy battles and authored missions retain their original roster/rules.
- Open-ended or timed skirmishes with explicit saved rules, three skirmish maps, fair paid AI actions, and a bounded supported-duration safety pause.
- A single mobile Build drawer across modes; individual protected-objective health, camera focus and honest loss details; viewport safety suspension and reliable dialog navigation.
- Readable original 2D art, reduced-motion/quality options, original procedural music/SFX, factual field reference, mission scouting and optional post-match reports.
- Local saves, portable JSON backup, corruption preservation, profile ownership, offline updates and experimental controller support.

The selected campaign, lane, copy, tank and mobile proposals are consolidated. Fixed flying crossings, broad AI replacement, the unlistened longer score and unverified native export were not merged. They are not hidden release dependencies.

## Next coherent batch

Prioritize clearer combat feedback and actionable objective danger over increasing content counts:

1. Restrain attack contact/recovery poses to actual attack events. The engine applies damage immediately, so the visuals must not invent a later windup or change timing. Preserve ground anchors, combat geometry, silhouettes and reduced motion. Accept only after an independent dense/mobile visual comparison.
2. Connect the existing warning sound to real critical protected-objective danger, with named visual information already present. Batch simultaneous warnings, suppress repeated chatter, handle pause/resume and restored critical targets honestly, and respect SFX/mute settings. No new save protocol or hidden damage rules.
3. Review the combined changes in ordinary paid play. Keep useful alternatives and player-caused stalemates; do not tune every policy into a forced victory or timeout.

No automatic deployment follows these changes. Freeze and verify a substantial candidate before a deliberate release decision.

## Remaining product work

- More real-player campaign and counterplay sessions, including intentional poor compositions, uncovered roads, economy payback, and losses that clearly explain what happened. Bot policies are evidence of specific behavior, not player win rates.
- A carefully designed explicit export-and-reset recovery path for a damaged save when no compatible backup exists. Current behavior protects the original bytes and refuses silent replacement.
- Subjective listening and music pacing. PCM/mute/clipping tests do not establish that a score sounds good.
- Physical phone and controller testing, remappable inputs, screen-reader/accessibility review, non-Chromium behavior, localization and long-session low-powered-device checks.
- Packaged desktop play/save/audio and safe native file export. Wrapper/unit tests do not substitute for launching the actual package.
- Distribution/rights review, stable signed builds where appropriate, Steam integration and store decisions only when separately authorized.

Online PvP remains a distinct project requiring authoritative networking, reconnection, latency handling, matchmaking and abuse protections. Local AI is not presented as PvP.

## Validation policy

Preserve historical rules and genuine released-save fixtures. Validate before replacing storage. Keep exact candidate hashes, separate passed/failed/unrun checks, retain negative tests, and exercise interrupted/repeated navigation and held input. When the interface legitimately changes, update the test to the real user contract without dropping its later assertions.

Prefer fewer meaningful releases. No number of passing tests makes the game automatically balanced, universally accessible or Steam-ready.
