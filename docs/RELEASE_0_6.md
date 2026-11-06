# Release 0.6: The Ironroot Campaign

## Player-facing additions

- Twelve authored missions across four story chapters, branching unlocks and 36 optional stars.
- Protection, income, survival, strongpoint and citadel objectives with explicit briefings and optional mastery goals.
- Original characters, dialogue and epilogues, plus woodland, highland, ashland and citadel visual themes.
- Campaign save/resume and Continue/Retry flows; protected structures cannot be accidentally salvaged.
- Fixed-step objective completion at normal and accelerated speed, so deadline results do not depend on frame batching.
- Readable campaign briefing on narrow phones and short landscape screens.
- Stronger save safety across tabs and campaign-progress merging.

## Evidence

- 186 Node tests passed with no skips or TODOs; all runtime modules parse.
- Independent actual Chromium play: Emberwatch, Three Roads and Winter Stores victories; stars, unlocks, protected failure/retry, save/resume, cross-mode transitions, High Pass theme and old-tab save protection verified.
- Campaign content sweep: 288 successful clears across reference/mastery policies and 12 seeds; 143/144 three-star mastery runs, all authored-seed mastery routes pass.
- Extended cloud browser harness prepared for campaign and cross-tab regressions; 0.6 cloud execution is a separate pending gate. The earlier corrected 0.5 harness passed 81 cases with 3 existing skips.

## Honest limits

The campaign's themes use one physical three-lane layout. No PvP, backend or account service exists. Normal AI still has a known weakness to some forward-infantry policies. Physical touch/controller hardware, subjective audio listening, full campaign human playtests, offline update validation and native desktop/Steam certification remain unfinished.

Controller and portable-backup modules/tests are included only in the private source snapshot as next-iteration foundations. They are not imported, publicly shipped or claimed as 0.6 player features.
