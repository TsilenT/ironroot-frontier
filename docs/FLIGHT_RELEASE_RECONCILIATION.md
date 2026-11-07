# Flight reconciliation onto released v0.15

## Provenance

The working flight integration began from revised PR #8 commit `9aebcfd2dd3a2f5ff442f31860489366ce644ca0`. It has now been reconciled onto the exact released v0.15 source tree `8e41d9b03a4cabbaa1768b1ba4d25257df5bf268`, merged at `f26b88106bed3d4932f5bf086cf21d5da18b5923`. Neither frozen source snapshot nor production was changed.

The production flight adaptation retains PR #2 prototype provenance (`4581245af7e23e7c3b5eb905d4a29c663006e0ea`), rather than substituting the older experimental engine. The intended remote change is one updated draft PR #2 with released-main and prototype ancestry, followed by exact-source review. No merge or deployment is authorized by a local check alone.

## Released repairs retained

- Title Options Back restores its opener instead of rebuilding/focusing the campaign heading.
- Returning from practice seeds only the necessary finite history entry. Nested menu Back and battle checkpoints remain intact.
- Short coached portrait shares the battlefield row with a 104px navigation rail. The coaching text inset and 44px protected-target intrinsic padding remain unchanged.
- The corrected QA server reads a file before sending success headers and returns 404 cleanly.
- Every release-only source file is retained. Overlaps in app imports, appended CSS, documentation, package preflight and navigation tests preserve both sides' changes.

An independent source reconciliation found no lost repair or unresolved conflict. Its 80 focused tests passed, covering navigation, practice history, protected target geometry, teaching ink, server responses, flight profile fencing, campaign identity/restarts and flight presentation.

## Small production follow-up

The scout expander now names its selected mission, rather than a historical map name. Roadside Watch therefore reads “Scout battlefield · Roadside Watch.” Three new Node tests execute the actual production assignment across current and historical mission catalogs and restored attempts. Existing campaign browser checks also assert the visible label while navigating every current briefing. No mission ID, map or save was renamed.

## Verification status

The first reconciled aggregate passed 1,148 tests with one optional desktop-tooling skip; this was before the three scout tests and new actual-v0.15 upgrade coverage were added. Runtime syntax and the 49-file offline/runtime inventory passed. All browser preflights passed, including 56 authored flight checkpoints and 3,920 exact continuation comparisons. These counts describe local checks, not native input or a completed browser matrix.

Final aggregate results, the frozen source manifest, and exact cloud/browser results must supersede this intermediate checkpoint. Earlier flight reports retain their original source hashes and limits. The previous 390px native inspection is not evidence for this reconciled source; the new isolated native pass is recorded separately.

## Release boundary

Live remains v0.15.0. Flight is not shipped. New immutable flight rules, revision-3 High Pass-and-later attempts, and profile protocol 5 require explicit save/upgrade verification. Historical attempts must remain no-crossing and keep their exact restart identity. No physical device, installed PWA, non-Chromium, physical controller, subjective audio or Steam readiness claim follows from these checks.

## Final local checkpoint

The reconciled source passed **1,153 Node tests**, zero failures and one optional desktop-tooling skip (1,154 discovered). Runtime syntax, the 49-file offline/runtime inventory and all browser preflights passed. The actual released v0.15 fixture is hash-pinned at 46 files / 907,887 bytes; two Node gates cover four legally earned profile checkpoints and the old/current protocol boundary. No current runtime edit was needed for that upgrade fixture.

Local browser discovery found **1,576 cases in 33 files**, including 124 flight cases and 16 actual-v0.15 upgrade cases. Discovery used the available Playwright1.57 adapter, not the pinned cloud1.65 runtime, and did not execute browsers. The temporary local dependency symlink was removed. The exact final cloud matrix remains required.
