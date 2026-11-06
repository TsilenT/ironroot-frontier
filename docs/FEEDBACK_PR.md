# Combat feedback and objective warnings: v0.14 review

Unreleased PR scope. Live remains v0.13 at source `76135e7b56077a661f67b0b5eeab7c118ec57844`. This change has no deployment authority by itself.

## Player-facing changes

- Five legacy troop roles now settle from their actual attack contact into rest, rather than switching between two poses. Restrained recoil follows real hit timers. Rootwarden remains unchanged.
- A protected original reaching critical health gets one named status announcement and the existing warning sound. Simultaneous dangers are grouped; a six-second sound quiet window prevents chatter. Pause/help/hidden views defer delivery, results and stale sessions cancel it, and sound preferences remain authoritative.
- Authored campaign/trial Resume labels no longer show a skirmish sudden-death rule. Skirmishes retain their actual selected rule.

No unit statistics, economy, targeting, maps, campaign objectives, audio synthesis, save format or profile protocol changes. Engine, audio, battle codec, persistence, profile session and protected monitor remain byte-identical to the released baseline. This is presentation work, not new balance evidence.

## Review decision

The first visual proposal removed the existing victim glow. Independent native comparison found materially worse hit identification on compact and crowded fields. That removal was rejected. The corrected renderer retains the exact original glow and its existing reduced-motion/low-quality suppression, alongside the restrained contact/recovery poses.

The corrected synthetic comparison passed compact hit, dense mixed/grayscale, preference and contact checks. See [visual review](COMBAT_FEEDBACK_VISUAL_REVIEW.md) for original findings, corrected screenshots and limits. The warning integration received an independent read-only review with no actionable findings. These are not claims of human listening, physical-device behavior or full real-play feel.

## Verified locally

- Final combined root suite: **882 passed, zero failed, one optional desktop-dependency skip**.
- All runtime JavaScript parses. Strict runtime inventory: **43 files, 797,132 bytes**, with both new modules in the offline shell and no QA assets in runtime.
- Existing browser syntax/fixture preflight and eight harness checks pass.
- New warning/Resume fixture validator passes three actual-combat continuations and four admitted label fixtures.
- Fifty-four focused renderer tests include exact baseline glow parity and unchanged state/RNG/ground-marker contracts. Historical snapshots remain unchanged.
- Copied native preview was stopped and its temporary QA mount removed. The reproducible fixture and linked screenshot subset remain private source artifacts.
- Distinct unreleased v0.14 cache/footer/package metadata prevents reuse of the live v0.13 cache. Version-only changes are recorded in `integration-inputs/feedback-version-bump.json`.

## Browser gate still pending

Run `cd qa/browser && npm test -- objective-alerts.spec.mjs` on the exact PR commit. Six cases across the unchanged four profiles mean **24 planned instances, not 24 passes**. They exercise named HP, DOM-write deduplication, real audio scheduling, pause/help, terminal loss, mute/SFX and Resume identity.

The full existing matrix and ordinary paid-play cadence remain later combined gates before any release. Treat failures as findings, not reasons to weaken expectations. The audio probe observes real Web Audio scheduling and does not establish speaker audibility or subjective sound quality. Physical phones/controllers, non-Chromium/assistive technology and packaged desktop behavior remain unverified.

## Suggested PR

Title: **Improve combat feedback and objective warnings**

Base: private source `main` at the released v0.13 commit. Keep this one selected change set together; no direct main update, public export or Pages action. Review and test before a merge/release decision.
