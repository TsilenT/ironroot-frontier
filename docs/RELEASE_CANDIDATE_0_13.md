# v0.13 consolidated candidate

Released as v0.13 after the exact cloud gate passed and the user approved publication. Source: `76135e7b56077a661f67b0b5eeab7c118ec57844`; public build: `f6d59bf634590a823ae64eea7defc71f13880e8b`. The historical candidate findings below are retained as development evidence.

## What changed

- Campaign-first navigation and two optional introductory missions using one road, then two. Learning happens through the real building controls, paid construction and automatic armies.
- Optional replay after a one- or two-star victory. Alternative victories still count; skipped learning actions simply leave optional stars unearned.
- One mobile Build drawer across campaign, field trials and skirmishes, with readable original-objective health/focus controls and safe suspension when the screen cannot fit the battlefield.
- Rootwarden and Warden lodge in fresh skirmishes, with original 2D art, a durable low-damage role, active-roster guide, and honest area-damage/air/road-coverage limitations.
- Explicit open-ended or timed skirmish rules. Open-ended retains the disclosed five-minute escalation but removes automatic citadel decay. Saved battles keep their own rules.
- Plain-language text and the accurate Arrow volley display name. Existing action identifiers remain stable.
- Versioned rules/map/scenario identity, validation before save replacement, backup/history/report support, and a bounded seven-day safety pause without a fabricated winner.

## Preserved

The sixteen original missions, forty-eight stars, old map identities, legacy battle trajectories and serializer shapes remain intact. Introduction progress is separate. Old unit drawing commands match the accepted renderer. Existing profiles can continue their campaign without replaying the introduction.

## Validation

- Final dependency-free suite: **825 passed, zero failed, one existing optional desktop-dependency skip**.
- Syntax and public-runtime preflight pass: **41 files, 788,320 bytes**.
- Independent legacy comparison covers 27 complete paid skirmishes, restore checkpoints, timed boundaries, all sixteen old missions and progress, and genuine historical backups/profile code.
- An additional integration check matches twelve timed Rootwarden scenarios and 336 state/RNG checkpoints to the frozen playtest implementation. This is equivalence evidence, not new balance statistics.
- Bounded native review found no blocker. It completed both intros with honest two-star wins, activated Replay and Continue, exercised paid mobile building/inspection, protected targets, undersize pause, trial failure/Retry, and a Rootwarden skirmish whose timed identity survived menu changes and reload. Original local storage was restored byte-for-byte.
- The native review used the final gameplay bytes before the version-only bump. Only the footer/cache identity and package metadata changed afterward; hashes are recorded in `integration-inputs/version-bump.json`.
- Browser harness/fixtures and strict real-v0.12-to-v0.13 upgrade preflight pass. The first exact private commit `0823cb6776df37e2aa309e20fa329c565ca0a356` completed **844 entries: 715 passed, 126 failed, 3 intentional skips**. Its full failure mapping and narrow harness repair are recorded in `GATE_REPAIR_0_13.md`. The second candidate `cfc7c87242473aad0c4b9ac0515c1aabf1b27eb2` then completed **829 passed, 12 failed, 3 intentional skips**. Its twelve remaining failures share one toast-ordering assertion; measured geometry and the strict repair are recorded in `TOAST_GATE_0_13.md`. The final candidate `76135e7b56077a661f67b0b5eeab7c118ec57844` passed the complete matrix: **841 passed, zero failed, three intentional skips**, with no flaky tests. All twelve repaired toast cases reached and passed their downstream save assertions.

The test-only repair adds twelve actual-handler regressions and eight separate browser-harness contract checks. All eight harness checks pass. Seven additional toast-geometry checks cover active visibility, finite bounds, clipping and objective clearance. The forty-one playable runtime files remain byte-identical to the first v0.13 candidate. These local checks were followed by the exact full browser rerun reported above.

## Known limits

A genuine cached v0.12 tab blocks ordinary writes under the new profile protocol, but its explicitly confirmed backup-recovery flow can replace the profile. The old UI warns that all local progress is replaced and requires other tabs to be closed. The new client stops writing after that replacement. The test records this historical exception rather than promising universal old-client protection.

The native retained profile had old progress but no old active battle. The first exact cloud gate passed all twenty actual production upgrade checks, including released active-save migration. The corrected final candidate reran and passed them. Production smoke additionally migrated a real v0.12 Emberwatch save, then completed First Watch with two stars and verified Replay, save/reload/resume, its separate stars and the Forked Road unlock. Physical touch/controllers, non-Chromium behavior, assistive technology, native safe areas, packaged desktop operation, subjective audio quality and full human campaign completion are not certified.

Fixed flying crossings were deferred because the tested mechanic did not demonstrate useful new decisions. The unlistened longer score, unverified desktop export, and broad AI replacement were not merged. This candidate is neither multiplayer nor Steam-release ready.

## Closure

The consolidated release is live. The tested snapshot remains immutable. The next combat-feedback and objective-warning work is separate and is not covered by these release results. No intermediate proposals were published independently.
