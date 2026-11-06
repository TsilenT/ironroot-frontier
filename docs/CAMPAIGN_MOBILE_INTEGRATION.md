# Campaign and mobile integration record

Date: 2026-11-06. Status: **unreleased, runtime frozen for combined native review**. This document covers navigation, shared coaching, app-level roster/save integration and the mobile shell. The product ledger remains `INTEGRATION_DECISIONS.md`.

## Inputs and decisions

- The verified live release is v0.12, commit `24edddab2cff33b3f91b396bc855193f87421ba3`. Its 753 browser passes and three intentional skips are historical evidence, not evidence for this candidate.
- The integration was copied from the frozen mobile/protected-objective lab. All **462 original files** still match `integration-inputs/source-sha256.json`; no source lab was edited.
- Campaign proposal `d80d8393372726cb030a1145d341dd631d6a53ed` was read through the GitHub connector at that exact commit. Accepted campaign-first entry, contextual hints through real controls, optional one/two-star replay and focus-aware Continue/Back. Rejected its delayed roster introduction through the seventh original mission: the separate intro policy now exposes two then four choices, with all seven original choices immediately available in the legacy campaign. **All buildings** and restored battles expose the active game's complete roster.
- Mobile controls are shared by ordinary campaign, intro, trial and skirmish battles. The former protect-only layout gate was removed deliberately. Ordinary missions use a smaller dock with their actual objective, not invented protected targets. Protected missions retain named original-target health/focus.
- Copy proposal `c4ae6842e70794310c6ea878b7dc6c03c46dad2b` contributed 56 of 58 app/index literal groups. The old default **Begin Skirmish** and prominent **Learn to Play** entry were rejected because they conflict with campaign-first navigation. The final storage warning retains “apply only to this page.” The displayed spell name is **Arrow volley**; action IDs and mechanics remain unchanged. The literal selection record is `integration-inputs/copy-decisions.json`.
- Engine, intro content and active-roster presentation were integrated through their owners' APIs. Navigation does not rewrite original mission IDs, prerequisites, maps, medals or combat rules.

## Current behavior

### Navigation and coaching

New profiles recommend First Watch, then Forked Road, then the original campaign. The introduction is optional, has its own six stars and does not alter the existing sixteen missions or forty-eight stars. Profiles that already cleared a legacy mission continue their existing campaign. **Go straight to the campaign** changes selection without awarding progress.

Guidance is inferred from the real battle. It uses ordinary paid build/upgrade commands and the original controls; it neither places free structures nor runs a detached tutorial simulation. The isolated `campaign-flow.js` presentation policy is two choices, four choices, then the full active legacy roster. Guidance uses actual lane geometry and does not describe outer roads in a one-road mission. **All buildings**, hiding hints and resuming a save are reversible presentation choices.

Highlights target visible controls. A card inside a closed phone drawer redirects to **Build**. An offscreen site or owned structure redirects to **Home**. Pausing or opening a dialog clears highlights. Build selection, expansion and drawer transitions preserve the existing semantic input guards rather than cloning controls.

A one- or two-star victory offers an optional replay while keeping prior best stars and times. Continue selects the next mission and focuses Start. Save and return focuses Resume, which retains the saved scenario and rules. Deferred focus callbacks verify that the title/dialog state still permits the intended target.

### Shared mobile shell

All battle modes reuse the original Build drawer, Close/Cancel behavior, Home/Front/minimap navigation, selection panel, HP and pause controls. Ordinary portrait battles use a 56px dock; protected battles retain their reviewed 84px dock. Landscape uses the existing compact shell, rather than adding coaching rows above the field.

Safety is based on actual measured battlefield/control geometry, including the 212px visible-world requirement and 44px controls. An insufficient viewport pauses combat. Returning to adequate space does not silently resume or catch up simulation time. Protected-original health remains truthful and protected originals cannot be salvaged through the UI.

### Active rules, saves and supported duration

The live deck, shortcuts, guide, portraits and upgrade costs derive from the active game's immutable definitions. New skirmishes expose eight buildings and an explicit open/timed choice. Legacy battles and authored missions retain seven. A preference for the next skirmish cannot reinterpret a restored battle.

Resume uses the shared strict decoder. Unsupported or invalid stored battles remain unchanged and block overwriting the slot with a new battle; the original bytes can be exported for recovery. Saves validate the candidate before storage, with campaign progress provided to the codec. Imports, modern history identity and reports use the same scenario/rules identity.

The app handles both the derived supported-limit state and a prospective simulation refusal. It pauses, disables resume, gives a save/return route and never invents a winner. The latch cannot be cleared by ordinary pause/resume. Protocol 3 coordinates ordinary writes with older clients, but cannot retroactively prevent a genuine cached v0.12 page's explicitly confirmed destructive recovery/import. See `INTEGRATED_LEGACY_QA.md` for that measured limitation.

## Frozen bytes

The complete inventory is `integration-inputs/runtime-freeze.json`: **41 runtime files, 788,320 bytes**. No cache or release-version bump was made. The service-worker inventory includes the new campaign, intro, ruleset, codec/history and art modules.

| File | Frozen source-lab SHA-256 | Integration SHA-256 |
| --- | --- | --- |
| app.js | `50130fab265b3acd83cbd37f132a9548bbc4866ad34f748d22d9f9ea0908f8ad` | `e5a8b10e3dbf8ee2113957c599f389013211ae2291761b1f79b943c56fbea178` |
| index.html | `5a20d1890b7eb95bfeac703b430b46ea9450f2960d9fec1f2692032e7baf789d` | `02db087aa3894b5825d8621b093fdd3a1856bd2cf8e29238a0267cd896b85376` |
| styles.css | `07585ad8eee08d0f2633198d6c23282fcdcfeb2e5a80563bd3b9729c179a3dde` | `8eca0c80f80065cc02ae66b846ed33bcc8c16b4301336bafd1e599a9d55cd63c` |
| campaign-flow.js | Not present | `8cdd7e1215d15f8d47b2d9389cd4f19118f48b4befa166014df152303dbbd47e` |
| service-worker.js | `b12e6a574f4393c557ee0d74bc12f2da70be534b3cec32cdeec65da3b4897639` | `4e41477509bd727e71e79ba40562e6800018406c748cfb9a878b49c3405a1212` |

The proposal's exact materialized app/index/styles/coaching bytes remain under `integration-inputs/proposal/dist/`; the corresponding live-release app/index/styles/SW bytes remain under `integration-inputs/release/dist/`. These private source records are not runtime assets.

## Verification and boundaries

- The navigation-only checkpoint passed 739 tests plus one existing optional skip before the ruleset/content integration. It is not the final result.
- The final combined Node run recorded **807 tests: 806 passed, zero failed, one existing optional skip** in `qa/integrated-legacy/final-aggregate.tap`. Independent QA owns that aggregate and the legacy parity evidence. Runtime hashes remained unchanged through its run.
- A separate 42-test focused run passed active-roster views, actual Resume handlers, new app rules/identity/safety behavior, coaching, campaign/mobile interaction and the shared shell. VM fixtures run extracted production functions and provide explicit browser-boundary adapters; they do not prove native layout or touch behavior.
- The shared-shell tests exercise fresh and restored campaign, trial and skirmish states, protected-to-ordinary transitions, node identity, rotations, insufficient geometry and explicit resume. The app rules tests cover eight-to-seven deck changes, legacy restore, new skirmish selection, prospective safety refusal, invalid-save retention and intro continuation.
- Syntax and complete runtime/import/precache validation pass. All browser-harness modules parse. No dependency install was needed.
- Browser replay fixtures now start from the last active fixed step of a real paid Emberwatch run. Shared decoding accepts them and the next ordinary step earns the expected one/two/three-star result. Optional medal state is deliberately varied for UI coverage; these are synthetic UI fixtures, not balance evidence. Already-completed snapshots are not admitted by weakening the decoder.
- The combined native reviewer is using a byte-exact separate preview. No browser result is claimed in this record. Browser-matrix preparation and real v0.12 upgrade coverage have a separate owner. Physical devices/controllers, non-Chromium behavior, a full human campaign and release/publication remain unverified.

No remote branch, push, new deployment or public release was created by this integration task.
