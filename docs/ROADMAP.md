# Ironroot Frontier roadmap

## Current state

Production is **v0.17.0**, source merge `342d8b594091d323f2c0e92d9a170de0fcbdc2b9` and public commit `b2d3cbb550b929a8813c0a251fb6792bfcc4d59f`. Automatic nearby-enemy flyer behavior and PR #9 prose have shipped; manual routing controls are removed. Live smoke was desktop. Portrait coverage was emulated source QA, not physical-phone validation.

The current game includes:

- Campaign-first navigation, shared coaching and three required teaching battles that grow the earned roster from two to five to eight buildings, followed by sixteen continuation missions. Optional stars and partial-star replays remain available.
- Paid first-barracks automatic start, a single mobile Build drawer, portrait income, Hide/Show hints, protected-objective health and warnings, reliable dialog navigation and browser Back/Forward handling.
- Rootwarden screening troops, automatic nearby-enemy flyers, open-ended or timed skirmishes with three maps, field trials and isolated optional guided practice.
- Combat feedback, readable original 2D art, reduced-motion/quality options, procedural music/SFX, field reference, mission scouting and optional local reports.
- Local saves, portable JSON backup, corruption preservation, profile ownership, offline updates, desktop mouse controls, optional fullscreen and experimental controller support.

Earlier selected AI economy/rush patches are incorporated. Recent support/reserve/ranged-first/tower experiments were rejected without changing production; broad AI replacement is not selected. The longer score remains unselected without subjective listening. Fixed-gateway/forced-return flying prototypes and unverified native export are not release dependencies.

PR #10 merged at `3548031a3e8d8e04c7b81784d6c0fe174b1522fe`. It adds opt-in deterministic tests only, with no runtime change or game release. [FEATURE_DELIVERY.md](FEATURE_DELIVERY.md) records current disposition and historical release evidence.

### Historical v0.13 evidence

The previous roadmap recorded v0.13 source `76135e7b56077a661f67b0b5eeab7c118ec57844` and public commit `f6d59bf634590a823ae64eea7defc71f13880e8b`: 841 Chromium cases passed with zero failures and three intentional skips; 825 root tests passed with one optional desktop-dependency skip. Its smoke covered older campaign-save migration and a new introductory mission clear, replay, save and resume. These are historical automated/emulated results, not physical-device or human-balance certification.

## Current review batch

The **v0.17.1 keyboard-controls candidate remains unmerged and undeployed**:

1. Add Battle keyboard controls inside existing Options, with twelve configurable actions, clear/reset, roster-slot semantics and effective-key help. Optional guided practice retains its defaults and storage isolation.
2. Preserve browser shortcuts, native control activation, layered Escape, input scope and held-key safety. This increment does not add keyboard-only battlefield placement or change touch/gamepad mappings.
3. Validate preference writes, retries, backups, rollback and stale-tab behavior. Profile protocol 7 protects the new setting from later-opened older clients without changing campaign identities or engine rules.
4. Gate the exact candidate with focused real-browser controls, paid placement, bounded portrait/landscape fit and pertinent regressions. Do not substitute virtual-time checks or source assertions for actual native activation.

No deployment follows automatically. Freeze and verify the candidate before a deliberate release decision.

## Remaining product work

- More real-player campaign and counterplay sessions, including intentional poor compositions, uncovered roads, economy payback, and losses that clearly explain what happened. Bot policies are evidence of specific behavior, not player win rates.
- A carefully designed explicit export-and-reset recovery path for a damaged save when no compatible backup exists. Current behavior protects the original bytes and refuses silent replacement.
- Subjective listening and music pacing. PCM/mute/clipping tests do not establish that a score sounds good.
- Physical phone and controller testing, broader input remapping and keyboard-only battlefield access, screen-reader/accessibility review, non-Chromium behavior, localization and long-session low-powered-device checks. The current Battle keyboard controls candidate covers a bounded desktop subset.
- Packaged desktop play/save/audio and safe native file export. Wrapper/unit tests do not substitute for launching the actual package.
- Distribution/rights review, stable signed builds where appropriate, Steam integration and store decisions only when separately authorized.

Online PvP remains a distinct project requiring authoritative networking, reconnection, latency handling, matchmaking and abuse protections. Local AI is not presented as PvP.

## Validation policy

Preserve historical rules and genuine released-save fixtures. Validate before replacing storage. Keep exact candidate hashes, separate passed/failed/unrun checks, retain negative tests, and exercise interrupted/repeated navigation and held input. When the interface legitimately changes, update the test to the real user contract without dropping its later assertions.

Prefer fewer meaningful releases. No number of passing tests makes the game automatically balanced, universally accessible or Steam-ready.
