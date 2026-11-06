# v0.12 exact-candidate repair review

This is a local repair candidate, not a release approval. The public game remains
on v0.7. The first v0.12 candidate, private commit
`181c859e8c47a2497e190ee39874ff3fedda4b98`, failed its cloud browser gate.
Do not deploy this repair until its own exact uploaded commit passes review.

## Original evidence

- The original full cloud run returned 662 passed, 55 failed, and three intentional
  skips. Correcting two stale training-feedback assertions yielded 50 passed and
  22 failed in the isolated training rerun. These are different runs, not additive
  evidence.
- Trusted portrait touch events focused a control before its compatibility click.
  The training focus handler scrolled the target 40–46 CSS pixels in that gap.
  Pointer release then clicked the surrounding coach instead of the button.
- A tap one CSS pixel inside the minimap's right edge could target the neighboring
  Front button. Deeper inset taps worked; reducing the tested target area would
  conceal the defect.
- Controller navigation included descendants of collapsed report disclosures.
  Chromium refused the attempted invisible focus, leaving navigation stuck.
- Independent storage review found that an unavailable history read could be
  treated as empty and overwrite prior results. A failed result/preferences write
  was not surfaced reliably.
- Independent offline upgrades succeeded with all five profile domains intact.
  One browser update job took about 62 seconds. The test's short takeover timer
  began before that job resolved, producing a premature rejection.

## Repair boundaries

- Training alignment must not move a native pointer target before compatibility
  click. Keyboard focus still needs to uncover obscured controls. Scope guards
  continue rejecting gestures held across a lesson/result transition.
- Minimap activation uses a native click listener. Original edge coordinates,
  camera tolerances, and the held-input guard remain in place.
- Both dialog and controller candidate lists exclude the contents of every closed
  disclosure, retaining only its visible first summary and that summary's children.
- History/preferences recovery is fail-closed on unreadable or conflicting state,
  with visible unsaved status and deliberate retry. Pending results are page-local
  when storage cannot accept writes; they are not crash-durable. LocalStorage has
  no cross-tab atomic compare-and-swap.
- The offline harness waits for the browser update job before starting its bounded
  activation deadline. It still requires a different activated controller, exact
  current offline assets, and unchanged profile data.
- The failed-battle-save test injects its scoped fault after profile initialization
  and real battle advancement. Startup/migration failure is a different test case.
- The history disclosure selector identifies its direct history container rather
  than accidentally matching the newly added controller settings disclosure.

## Protected systems and review limits

Engine rules, AI, campaign objectives, maps, saves/backup formats, renderer, audio,
and shared input-scope logic are not changed by this repair. Historical baseline
hash manifests are not regenerated. Exact-hash assertions are narrowed only for
the app/persistence files intentionally repaired; executable regressions replace
those two equality checks.

New visual-readability, protected-objective, threat-alert, and AI experiments remain
in separate workspaces and are not part of this candidate. No AI experiment was
accepted. Known concentration-rush weaknesses remain a balance issue, distinct
from this release-blocking input/data-preservation repair.

Local Node, syntax, and fixture results do not prove native touch behavior.
The corrected cloud run must cover all four existing Chromium profiles, including
the original held-game-result tests and new first-tap/storage-failure cases.
Physical touch devices, Safari, real controller hardware, packaged desktop runtime,
and subjective music listening remain unverified.

## Final evidence

Final frozen local run: **613 passed, zero failed, one optional desktop-tooling
skip** (614 discovered; zero TODO). Runtime syntax, the strict 33-file offline
manifest, and all browser fixture/source checks passed. Runtime total is 668,049
bytes. `QA_REPAIR_VALIDATION.json` records the exact file hashes and scope.

Independent source reviews found no remaining blocker in the bounded repaired
input and persistence paths. The input reviewer first found two additional
multi-contact/interruption defects; both were corrected and independently retested
on the final training module. Storage review ran 111 focused checks. These are
source/Node findings, not browser or physical-device certification.

The browser suite retains the original cases and adds eight first-native-tap
instances plus 24 storage-recovery instances. Expected discovery is 752 instances,
including the same three intentional inherited skips; the authorized runner must
confirm its actual discovery. Suggested focused commands before the full gate:

```sh
cd qa/browser
npm test -- training.spec.mjs
npm test -- storage-recovery.spec.mjs
npm test -- maps.spec.mjs battle-report.spec.mjs campaign.spec.mjs \
  --grep 'minimap ends|controller focuses report|gesture held across'
npm test -- service-worker-update.spec.mjs
npm test -- maps.spec.mjs --grep 'engine-driven victory'
npm test -- regression.spec.mjs --grep 'failed save warns'
npm test
```

The corrected cloud commit and execution are still pending. A focused green run
does not replace the full matrix. A pre-existing removal-only storage failure can
leave an older resumable battle after history succeeds; cleanup is best-effort and
this repair does not claim durable storage transactions.
