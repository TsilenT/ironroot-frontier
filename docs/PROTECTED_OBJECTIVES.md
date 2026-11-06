# Protected objectives: next-feature integration

## Status and provenance

The accepted source-only protected-objective feature is integrated in the isolated `ironroot-next-clarity` workspace on top of the frozen corrected 0.12 QA candidate. It is not a release, preview or publication approval. The repaired 0.12 candidate remains separate and unchanged.

The feature originated in `ironroot-objectives-lab`. The initial integration was verified to contain exactly the accepted feature deltas in `app.js`, `index.html`, `styles.css` and `service-worker.js`, with respectively 9, 5, 1 and 1 changed groups. The later native-review repairs below intentionally extend the app/HTML/CSS changes. The old app was not copied over the repaired app. `protected-objectives.js` is byte-identical to its accepted source.

This workspace also contains the independently integrated accepted renderer/VFX improvements. Those are outside this feature's ownership and are documented separately.

## Player-facing behavior

- Every original protected structure has a stable native camera button with a name, current HP percentage/bar and explicit **Critical** text at or below 30% health. Its accessible description exposes current and maximum HP.
- Names use authored roads and existing building names. Common Ground shows **North gold mine** and **South barracks**. Classic retains North/Middle/South, while Twin Span's second road is South. Duplicate type/road targets use their authored site coordinates.
- The protected objective dock reserves layout space above the build deck in portrait and normal-height layouts. In short landscape it shares a lower row beside the scrolling build deck, recovering battlefield height without reducing the renderer scale. Difficulty and **PROTECT** identity, aggregate progress and remaining time remain visible. Mission briefing text is unchanged.
- Activating a target cancels building/spell placement, clears held battlefield gestures, stops follow-camera, and centers/clamps the camera on the original target's x coordinate. Routine HP updates do not move the camera or keyboard focus.
- Target buttons are mounted once per battle and updated in place. A physical activation needs a fresh press on the same button and, when available, the same pointer ID. Native keyboard and assistive activation remain subject to the existing input-scope guards. Paused, ended, modal-blocked and inert battles reject activation.
- A separate polite live region announces critical/lost transitions. HP ticks are not live announcements. There is no new audio, flashing or pulsing.
- Results name each lost original. A loss observed live on this page includes the first observed simulation time to hundredths. A structure already absent when observation begins explicitly has an unknown historical loss time. No attacker or cause is inferred.

## Preserved behavior and integrity

The presentation module reads the campaign's existing `getCampaignTargets` original IDs. A replacement building at the same site never fulfills the original's identity. The monitor observes inside the existing objective evaluator callback at every evaluated fixed step without deciding outcomes, setting a winner or writing engine state.

The integration preserves the corrected candidate's history/preferences retry, captured completion ownership, closed-details focus filtering and native minimap click activation. Repaired persistence and all four training runtime files remain byte-identical to `QA_REPAIR_VALIDATION.json`. No engine, campaign, objective, challenge, save schema, profile key, backup protocol, report protocol or audio change is made by this feature.

The only adaptations to existing behavioral tests are no-op display hooks: `finishProtectedObjectives()` in the extracted persistence `finish()` harness and `setCompactBuildOpen()` in the extracted profile-recovery harness. All recovery assertions remain. The feature's historical frozen-rule checks are retained, while repaired persistence/training are verified against their independent corrected-candidate manifest rather than pretending persistence still equals pre-repair 0.11. No historical validation manifest was rewritten.

`protected-objectives.js` is included in the offline shell. Version/cache metadata remains 0.12.0 intentionally. A public release must choose its new version/cache identity separately, and native review must use a clean origin/cache for this exact candidate.

## Files

Runtime owned by this integration:

- `dist/app.js`
- `dist/index.html`
- `dist/styles.css`
- `dist/protected-objectives.js`
- `dist/service-worker.js`

Tests: `tests/protected-objectives.test.mjs`, `tests/protected-objectives-ui.test.mjs`, `tests/protected-objectives-layout.test.mjs`, `tests/protected-objectives-pointer.test.mjs`, `tests/toast-layout.test.mjs` and display-hook harness adaptations in `tests/persistence-recovery.test.mjs` and `tests/profile-session.test.mjs`.

Evidence: `PROTECTED_OBJECTIVES_VALIDATION.json` and `qa/protected-objectives-integration/`.

## Local verification

The focused suite exercises original identity/rebuild rejection, all authored target labels, critical thresholds and upgrades, simultaneous losses, restored missing targets, post-resume loss, exact fixed-step observation time, paired engine/evaluator/RNG parity, stable controls, cancellation without spending, pointer provenance, native Space wiring, actual held-input scope rejection, paused/modal/end gating, retry/skirmish resets, result text, toast placement and the repaired persistence/minimap/report/training flows.

DOM extraction tests and CSS assertions are source-level checks. They do not establish native geometry, focus behavior, physical touch, assistive-technology output or readability. The last clean aggregate run before the one-line pointer repair passed **671 tests with 0 failures and 1 existing skip** (672 total), including the separate accepted renderer/VFX integration. The latest focused suite, including the pointer inheritance regressions, passed **167/167**. The aggregate and clean-runtime preflight must be repeated after native QA fixture cleanup. JavaScript syntax and the strict **34-file** offline-shell preflight passed before temporary native QA fixtures were mounted. Commands and hashes are in the validation manifest.

## Native-review repair: short landscape and focus indicator

The first native review found two real problems in 844×390 Winter Stores: the north original mine sat behind the citadel HUD, and its badge was clipped by the shortened field. The “Showing…” toast also overlapped the minimap. Critical portrait controls exposed a missing-font rectangle instead of the directional arrow. The original evidence is `04-landscape-target-obscured.png` in the separate native-review evidence directory.

Repairs in this workspace:

- Protected-only short landscape uses a two-column lower row: the existing scrolling build deck on the left, the protected-objective dock on the right. The target buttons retain 44px minimum size and their existing text sizes. The extra full-width dock no longer subtracts its height from the battlefield. Renderer/VFX bytes and the renderer's scale policy are unchanged.
- The existing citadel HUD nodes move into the header only in that layout. HP values are not duplicated or independently synchronized. Orientation changes and a new non-protect battle move the same nodes back to the battlefield. Named target controls are never rebuilt by a layout change. Narrow headers give up decorative branding, not citadel HP or resources.
- Protected-landscape toasts use actual field height, toast height and minimap position to choose the middle band with at least an 8px minimap gap in the tested geometric cases. Battlefield resize reruns positioning. The dock's offset is not used to position a battlefield toast.
- The direction mark is drawn with CSS borders and a rotated line. It needs no arrow font; the critical portrait icon remains visible when the word “Focus” is suppressed. Native accessible button names are unchanged.

Node regressions cover these layout decisions, node identity through rotation, restoration on a non-protect start, focus-indicator construction and measured toast placement. Native validation of the repaired layout remains required.

## Very short landscape: battle-first layout

The first repaired-candidate native retest accepted 844×390, portrait critical/focus indicators, toast clearance and same-page resets. It found a further 568×320 defect: a roughly 126px field clipped North target/badge geometry and put South targets under the bottom navigation. Front and Pause also overlapped. See the native review's `retest/06-narrow-north-focus.png`.

For protected landscape views at most 360px high, the next repair uses an explicit battle-first layout:

- The full-width objective dock is 60px high and retains difficulty/protect identity, objective progress, time, named HP controls and a minimum 44px **Build** button.
- Building controls open on request as an overlay over the canvas, rather than permanently taking vertical space. Existing readable cards/prices and horizontal scrolling remain. Optional explanatory captions are omitted in this compact drawer. Successful build/rally selection closes it without spending. The visible button becomes **Cancel** while placement is armed. Cancel, Pause, automatic storage-conflict/recovery pauses and protected-target focus close the drawer. Controller X closes it when returning from HUD navigation to battlefield gameplay. Actual placement still uses the existing engine path.
- Pause, speed, audio and Preferences use a 2×2 grid of 44px buttons in a reserved 152px rail beside the canvas. Home and Front use a separate 44px row with a 44px-high minimap beneath it. None is over a road. No essential HP readout, price, target name or sprite is scaled down.
- The 568×320 source budget is a 48px header, a 416×212 canvas plus its rail, and a 60px dock. The unchanged renderer still uses scale 0.32. The canvas itself is observed for size changes, and pointer coordinates still come from its own bounding rectangle.
- Opening/closing the drawer and switching between compact/ordinary battle layouts create distinct existing input-guard scopes. A held input cannot cross those transitions to spend or activate another control. Covered-canvas activation is rejected while the drawer is open. Controller navigation opens the drawer before focusing a build control. Independent adversarial source review caught and verified repairs for controller X leaving menu scope active and direct auto-pause paths leaving the drawer above the pause veil. Actual-handler regressions cover both. Closing returns focus only when it would otherwise hide the focused control; focusing an original retains that target button's focus.

Executable geometry checks read the CSS size tokens and use the actual pinned Renderer to project every authored original at 568×320, 640×320, 640×360 and 844×320. They conservatively enclose protected models, upgrade marks, health bars/shadows and scale-adjusted badges; assert at least 8px vertical clearance; exclude the header, objective dock, navigation, minimap and tool controls; and verify six separate 44px rail buttons. The same test reproduces the prior 126px clipping and Front/Pause intersection. Actual canvas-local input round-trips through the unchanged renderer. These checks validate the planned geometry, not measured browser CSS or physical-device usability.

## Compact pointer activation repair

Native testing of the battle-first layout confirmed model/badge visibility and rail separation at 568×320, but ordinary Build pointer activation did nothing. Keyboard Enter opened the drawer and ordinary card selection armed placement, isolating hit testing from the handler. The parent objective HUD deliberately sets `pointer-events: none`; protected target buttons already override it, but the new Build/Close/Cancel button did not.

The repair adds only `pointer-events: auto` to `.compact-build`. App, HTML, renderer/VFX and all game mechanics remain unchanged from the reviewed battle-first candidate. The HUD remains noninteractive outside its explicit buttons.

The executable source regression parses the actual HTML ancestry and stylesheet, selects active media rules by specificity/order, and resolves inherited `pointer-events`. It covers Build/Close/Cancel, both protected targets and noninteractive objective labels at 568×320 and 640×360, disabled/inert gates, and hidden Build controls in the larger/portrait layouts. Removing the single declaration reproduces the visible, enabled but pointer-ineligible control.

`qa/browser/protected-objectives-pointer.spec.mjs` adds the native regression: computed style plus `elementFromPoint` at the actual button center, trusted ordinary touchscreen taps on touch projects or mouse clicks on desktop, and actual drawer/placement transitions for Build, Close and Cancel. It also covers pause/resume, Settings inertness and orientation. It is syntax-checked but has not been browser-executed by this worker. Existing browser configs/runtime hooks and the parent's mounted native QA fixtures were not changed.

**Bounded viewport gate:** current geometry validation starts at 320px viewport height. At 568×300, source analysis still predicts rail overlap and North clipping; the branch currently applies there, so a fallback remains unresolved. The ≤360px implementation condition must not be described as proof of support for every shorter viewport.

## Native UI gate: retest required

Retest this exact repaired workspace at **320×568**, **390×650**, **844×390** and desktop, plus **568×320** and an orientation round-trip, using Common Ground and Winter Stores. In short landscape, verify both north and south original sprites and badges, the header HP readouts, scrolling build prices, 44px target buttons and toast/minimap clearance. Review healthy and critical states, including the longest labels.

1. Confirm no body overflow, clipped prices, missing primary build controls, tool/minimap overlap or insufficient control sizes. The source declares 44px minimum target buttons and a portrait-only 2×2 toolbelt, but those sizes/clearances need browser measurement.
2. Activate every named target with touch, mouse, Enter and Space. Verify the intended original and road are visible rather than obscured by the dock, citadel HUD, toolbelt or minimap. Repeat after resize/orientation changes and while a building or spell is armed; gold must not change.
3. Keep focus through HP/critical changes. A held battlefield touch, wrong pointer, or press spanning pause, Preferences, result and retry must never jump the camera. The next fresh press must work without a delay.
4. Confirm readable HP and explicit critical text, transition-only announcements, and no new audio or flashing. Native screen-reader behavior is not covered by Node tests.
5. Lose a protected original while the citadel is intact. Results must identify the lost structure and observed time. An already-missing restored original must retain the explicit unknown historical-time wording.
6. Retry; enter a non-protect mission or skirmish; return to title; inspect and reopen the result/report. Confirm no stale dock, target identity, loss text, hidden-control focus, or repeated history writes.
7. At 568×320, open/close Build with mouse and keyboard, scroll to every card/price, select a building and Rally, cancel, pause/resume, and focus either original while the drawer is open. No gold may change before explicit paid placement, no control may overlap Pause/Front, and all target sprites/badges must remain visible when the drawer closes. Check a press held across drawer and orientation transitions.
8. Recheck the corrected candidate's history/preferences retry warnings and captured-result ownership with the new result loss list present, along with report scrolling and minimap release activation.

No browser, server, hosting, commit, upload or publication action was performed by this integration worker. The parent coordinated the first native review and will coordinate the targeted repaired-candidate retest; it remains a release-blocking gate.
