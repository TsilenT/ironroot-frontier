# Native protected-objective review

Date: 6 November 2026 UTC. Reviewed the frozen, private `ironroot-next-clarity` lab, not the corrected 0.12 release candidate. Nothing was published or fixed during this review.

## Subsequent short-portrait gate: latest status

The additional 320×480 and 390×500 native samples **fail geometry**, despite readable intact/critical target labels. Citadel HUD/navigation obscure the originals after Focus; focus toasts and lower controls overlap the minimap row. At 320×480 the ordinary deck also clips its prices. The 320×568 control remains usable, but does not establish a minimum supported height. See [the bounded short-portrait review](PROTECTED_OBJECTIVES_SHORT_PORTRAIT_REVIEW.md) for precise screenshot bounds, evidence and scope. The compact 568×320 pass below remains valid for its sampled layout. The candidate3 engine guard had been rebased before the later short-portrait review; that review does not validate it. Final later cleanup passed 34 files / 697,981 bytes after byte-verified profile restoration.

## Earlier bounded compact-layout retest

**The sampled native repair gate passes on the final freeze.** At 568×320, the original models/badges and the six rail controls are now visible and separated. The central Build/Close/Cancel pointer failure discovered in the first compact-layout pass was repaired and retested successfully. The 844×390 repair and sampled portrait/orientation recovery still work. No new blocker was observed in this bounded pass.

This is approval of the specific native fixes and flows below, not full campaign, hardware, accessibility, browser-matrix, or release approval. Common Ground/live Twin Span remains untested. Heights below 320px remain explicitly outside this gate and a known geometry limitation. The separate strict-enum candidate repair had not been rebased into this lab; this review makes no claim about that work.

### Exact final freeze

- `app.js`: `261e61b19a55b21606f637fb2fa7f68eea31082d6dc112ebd05892029cbf9be4`
- `index.html`: `cfff5afdfeb31d771e2bfb0eaa89e67d9be1f444c04c7d9cc4a67b30271ff271`
- `styles.css`: `349ada26081e3ca24267efb8ea4492cd3b135be3ad4ceaf639e95f6ea2f6f102`

The pointer repair changed only CSS after the first compact pass; the app, index, renderer and VFX stayed frozen. The parent reported 167 focused tests plus syntax checks for that repair. This worker performed native checks and final runtime preflight, not a rerun of the source suite or an automated browser regression.

### Compact-pass defect and repair

The first compact freeze (`styles.css` beginning `890dcbea`) drew Build but did not accept its pointer clicks during live play. Repeated clicks around 00:20 and 00:38 produced no drawer or label change. Native Tab from North through South to Build, followed by Enter, opened the drawer; pointer selection of Barracks then closed it and armed placement. This distinguished a pointer hit-target defect from a broken drawer mechanism. Source inspection showed the button inherited the objective HUD's transparent hit-testing behavior. The test was stopped at a stable pause, with the same original snapshot retained, while the author repaired the CSS. No runtime change was made by this reviewer.

Evidence from that failed freeze is in `retest2/`, especially `03-pointer-build-noop.png`, `04-keyboard-build-opens.png` and `05-paused-handoff.png`. The explicit `pointer-events:auto` repair passes the following native retest.

### Final native observations

1. **Pointer Build → Close:** Build opens the visible drawer, becomes Close, and a second pointer click hides the drawer and restores Build. No gold is spent.
2. **Build → card → Cancel:** Selecting Barracks closes the drawer and exposes ordinary battlefield placement squares. The button becomes Cancel. Pointer Cancel clears placement and returns to Build without buying anything. Gold increased normally through 648 → 658 → 665 during the sequence.
3. **Actual paid placement:** A fresh Barracks selection and ordinary click on the northern site raised a visible Barracks. Gold changed from 780 to 647 across the capture interval, consistent with the 140 price and intervening 10/sec income. The normal success toast appeared. Only one new building was purchased; a later result recorded four buildings including the three starting structures.
4. **Rally:** Selecting Rally from the drawer closes it and arms the action without spending. A subsequent North target focus cancels the armed Rally, restores Build, reveals the original, and displays a readable named toast. Gold rose from 689 to 711 during this sequence; no 75-gold debit occurred.
5. **Target focus while drawer open:** Activating South closes the drawer and reveals the original South mine and its badge. The two originals remain distinguishable from the newly placed barracks. Native North/South focus and the initial mission toast are clear of rail controls.
6. **Drawer scrolling:** Horizontal scrolling exposed Sanctum 230 and Aerie 250 alongside the fixed Rally 75 card. Initial Barracks 140 and Archery 175 cards were also readable. The final bounded pass sampled the later prices rather than rechecking every card independently; the earlier landscape pass covered the remaining strip.
7. **Pause/Preferences:** Pause from an open drawer closes the drawer before showing the pause veil. Preferences from an open drawer covers the game normally; closing it leaves the drawer closed and the battle usable. No underlying drawer remains above the modal. Preferences were not changed.
8. **568×320 geometry:** The canvas is approximately 416×212 screenshot pixels, with the separate 152px control rail and 60px dock. Both mine models, health strips and diamond objective badges fit vertically, and Pause/Front no longer overlap. Header HP, resources and time remain readable. Named target controls, Build and rail controls retain roughly 44px or greater visible heights. These are screenshot/layout observations, not physical touch measurements.
9. **Orientation:** With the drawer open, resizing to 844×390 restores the ordinary visible command strip, with no duplicate HP displays or stale overlay. Returning to 568×320 closes the drawer and restores the rail/dock arrangement. Live and paused retries at 390×650 and 320×568 restore their expected portrait field, dock and build strip; no compact Build overlay remains. A camera adjustment on resize is not represented as automatic persistence of a focused target.
10. **Ordinary loss/results:** The first paid-placement run eventually lost only **South gold mine**, correctly named at **00:43.70**. The protected North mine survived. The narrow result was readable at both portrait sizes and Retry reset the new battle normally. This was incidental ordinary test play, not a balance or mission-win test.

No physical touch/pen, controller hardware or controller X result is claimed. Keyboard activation was demonstrated on the preceding compact freeze, not treated as proof of the reported controller regression. Held-input cross-scope races, source browser regressions, storage-conflict fault injection, long labels and all full-review limits below remain outside this bounded native pass.

### Final restoration and cleanup

The same tab and original retained snapshot were kept across the compact failure and CSS repair. The original snapshot was never overwritten. After the final run, the battle was paused and saved/exited. The exact safeguard reported the expected five-domain differences; Restore then explicitly confirmed **original five save domains restored and byte-verified**, with protocol 2 retained. No raw profile contents were copied into reports.

The tab was navigated to `about:blank`, then only `dist/__qa_clarity_profile.html` and `dist/__qa_clarity_viewport.html` were removed. Final `node scripts/verify-runtime.mjs` passed **34 runtime files / 697,955 bytes**. Browser and runtime were released. This is local integrity validation, not permission to publish.

Final evidence: `/workspace/shared/ironroot-clarity-ui-review/retest3`.
- `01-pointer-build-open.png`, `02-pointer-cancel.png`, `03-paid-placement.png`: repaired pointer flows and paid construction.
- `04-rally-closes-drawer.png`, `05-target-cancels-rally.png`, `06-drawer-scroll-prices.png`: Rally, target focus and scrolling.
- `07-landscape-orientation.png`, `10-390-retry-layout.png`, `11-320-retry-layout.png`, `12-south-focus-closes-drawer.png`, `13-orientation-drawer-reset.png`: bounded layout/scope checks.
- `08-portrait-320.png`, `09-portrait-390.png`: actual South-only loss results after rotation, not live critical-layout screenshots.
- `14-profile-difference.png`, `15-profile-restored.png`, `runtime-preflight.txt`, `reviewed-sha256.txt`: final cleanup/integrity evidence.

## Earlier landscape repair retest (historical)

The repaired freeze was retested natively later on 6 November. **The original 844×390 blockers and missing glyph are fixed in the sampled flows. The expanded 568×320 stress gate still fails.** This is not full native or release approval. The original review below is retained as historical evidence, not a claim that its 844×390 defects remain in the repaired code.

Reviewed repaired hashes: `app.js` = `0ff7046672bce0753c2bf56de9e7774b86ffbdda3fbb0f7ac874da285143402d`; `styles.css` = `81fe0eb496f5d2a909482224f2473794eebf6a9d7ec14ac62eae01988306325f`. Renderer, VFX, and protected monitor hashes are unchanged. The source/test freeze reported by the parent was 658 passes plus one skip; this worker did not rerun that suite.

### Repair checks that passed

- **PO-N1 resolved at 844×390:** Both citadel HP readouts now appear once in the header. Both original mines and both target badges are visible on the battlefield. I navigated to the enemy side with the minimap, then separately activated North and South. Each returned to the original site without the previous HUD occlusion.
- **PO-N2 resolved at 844×390:** The full initial mission toast and both named focus toasts were readable above the minimap. They did not cover or get covered by its controls. The focus toast also remained clear at 568×320.
- **PO-N3 resolved in sampled states:** The CSS-drawn arrow is visibly an arrow, not a hollow rectangle, in healthy 844×390 and active 568×320 critical controls. At narrow critical width, the target name wraps rather than clipping; 18% HP · Critical remains readable.
- Header HP, gold, army, and time were readable at both landscape widths. No duplicated HP display appeared when rotating 844×390 → 568×320 → 320×568 → 390×650 → 844×390.
- At 320×568 and 390×650, the paused battle retained readable **12% HP · Critical** indicators and bars. These were paused-layout checks, not a new exhaustive live portrait input pass. The previous active portrait input results remain the earlier pass's evidence.
- Horizontal build-strip scrolling remained functional. The initial landscape cards/prices and later Gold mine/Sanctum/Aerie prices were reachable while Rally stayed available. At 568×320 the strip shows fewer cards, but Aerie and its 250 price were reachable by scrolling.
- The same-page protected mission → Save & return → ordinary Outrider skirmish transition removed the dock and moved the two HP displays back into the battlefield once. This was checked at both 568×320 and 844×390 without reloading the game.
- A 3.5-second native mouse press on the South target was released normally; it focused South and displayed its toast while combat reached critical health. No hidden state, scripted timing mutation, or synthetic outcome was used.

### PO-N4 · P2 · 568×320 field is too short for protected targets and controls

**Reproduction:** Start Winter Stores ordinarily at 844×390, resize through the fixture to 568×320, then activate North or South gold mine. This was observed at both damaged and critical health, before any loss.

**Observed:** The battlefield occupies only about 126 screenshot pixels vertically, from window y266 to y392. The North original sits against the field's top edge around x163/y272, with its upper artwork/health/target-badge area clipped out of the field. The South original falls behind the home/minimap row at the bottom. Focusing either original restores its world x position but does not make both the structure and badge inspectable. The front-camera button also overlaps the lower portion of the Pause button: the horizontal toolbelt and bottom minimap row collide in the same narrow vertical space. Header and dock text themselves fit.

**Impact:** The newly added narrow-landscape stress size still fails target visibility and separated-control requirements. Repair the field's available vertical space or its geometry/control placement; do not regard the successfully repaired 844×390 case as proof that all short landscapes pass. No fix was attempted during review.

Evidence: `retest/05-narrow-landscape.png`, `retest/06-narrow-north-focus.png`, and `retest/07-narrow-critical-south-focus.png`. The latter shows a readable South focus toast and explicit 18% Critical state while the target area remains obscured. Approximate coordinates above come from native screenshots, not DOM measurement.

The ordinary 568×320 skirmish screenshot also shows the pre-existing short-field toast clipping near the build deck. This retest does not attribute that non-protect behavior to the protected-only repair, but it reinforces that this stress size needs a broader short-field review.

### Retest integrity and evidence

The same tab began at `about:blank` with no active game. The exact recreated safeguard showed no retained snapshot; Retain then Verify explicitly confirmed five-domain byte identity. Only ordinary Winter Stores/skirmish UI was used. Common Ground remained untested; no unlock or full-campaign rerun was attempted. There was no runtime edit, DOM evaluation, browser/server launch, install, publication, physical-touch claim, or audio claim.

After testing, the running skirmish was paused and saved/exited. Verify reported the expected disposable differences, then Restore explicitly reported original five-domain byte-verified success. The tab was navigated to `about:blank` before removing only the two temporary QA HTML mounts. Strict runtime preflight passed **34 files / 691,448 bytes**. No active game/fixture view or retained snapshot remains.

Retest evidence lives in `/workspace/shared/ironroot-clarity-ui-review/retest`:
- `01-retained-verified.png`: initial safeguard verification.
- `02-landscape-initial-toast.png`, `03-landscape-north-focus.png`, `04-landscape-south-focus.png`: repaired 844×390 behavior.
- `05-narrow-landscape.png`, `06-narrow-north-focus.png`, `07-narrow-critical-south-focus.png`: 568×320 stress findings and corrected arrow.
- `08-320-critical-paused.png`, `09-390-critical-paused.png`: critical indicators after rotation.
- `10-landscape-build-scroll.png`, `11-narrow-build-scroll.png`: later cards/prices remain reachable.
- `12-narrow-skirmish-reset.png`, `13-landscape-skirmish-reset.png`: no stale dock or duplicate HP on same-page reset.
- `14-profile-difference.png`, `15-profile-restored.png`: expected change and successful restoration.
- `runtime-preflight.txt`, `reviewed-sha256.txt`: final local validation and exact freeze hashes.

**Next gate:** Resolve PO-N4 and recheck 568×320, plus regress 844×390 and portrait rotation. All untested hardware/accessibility/campaign coverage limits from the original review still apply.

## Original review verdict (before repair)

**Do not pass the native UI gate yet.** The new dock materially improves identification of original protected structures, health monitoring, and loss explanations. Real loss reporting, placement cancellation, native keyboard activation, stable focus, retry, and same-page skirmish reset worked in the sampled flows. However, the 844×390 layout hides the North gold mine behind the citadel HUD even after explicitly focusing it, and the minimap covers focus feedback. These fail the feature's target-visibility gate.

Common Ground was legitimately locked. Its briefing was reviewed, but no hidden unlock or synthetic progress was used. Live Twin Span protection, its different target names, and the longest labels remain untested.

## Method and integrity

- Native Chromium, 1212×886 window, approximately 1180×757 normal game content. All browser interaction used documented native CUA screenshot-coordinate mouse and keyboard operations. The accessibility provider reported x11, so no assistive-technology result is claimed.
- Responsive fixture iframe content sizes: 320×568, 390×650, and 844×390. These were pointer/layout tests, not physical touch or mobile-device tests. The fixture's own outer scrolling was used to show the full 390×650 frame.
- Ordinary Winter Stores play produced two actual protected losses. A further brief Winter Stores run tested the same-page transition to ordinary skirmish. No combat state, outcomes, unlocks, or profile values were injected.
- No browser/server launch, Playwright, DOM evaluation, install, runtime edit, upload, commit, or publication. Read-only source inspection helped interpret the observed geometry.
- The pre-existing tab showed the prior review's successful restoration, not an active game. The exact new safeguard showed no retained snapshot. Retain and Verify then reported original five-domain byte identity. The same tab was retained throughout testing.
- At the end, Verify reported the expected differences from disposable play. Restore explicitly reported: “Original five save domains restored and byte-verified. Protocol 2 is retained. No synthetic progress was created by this fixture.” No raw profile contents were read into or copied into this report.
- The final browser view was `about:blank`, with no game or fixture view remaining. Only `dist/__qa_clarity_profile.html` and `dist/__qa_clarity_viewport.html` were removed.
- Post-cleanup `node scripts/verify-runtime.mjs` passed: **34 runtime files, 687,017 bytes**. This is local source-dist validation, not publication approval.

## Issues

### PO-N1 · P2 · Landscape focus leaves the protected original obscured

**Reproduction**

1. Start or retry the legitimately available Winter Stores mission.
2. Use an 844×390 content viewport.
3. Move the camera toward the enemy using the minimap.
4. Activate **North gold mine** in the protected dock.

**Observed:** The camera returns to the home side, but the northern original mine, its health strip, and target badge remain behind **Your citadel**. The southern original at the same world x position is visible near the bottom-left. The dock accurately reports the northern mine's HP, but its focus action does not reveal the object it names.

In the saved native image, the iframe content begins near window coordinate (32,219). The citadel HUD occupies roughly x44–194 and y275–311; the northern mine's lane/site is in that covered band around x163. The southern mine is visible around (163,408). These are screenshot observations, not DOM measurements. Returning from an enemy-side view reproduced the same result.

**Impact:** A player trying to locate or manage the original target in short landscape cannot visually inspect it after using the new control. This is a release-blocking failure of this feature's explicit native target-visibility requirement. No claim is made that the underlying HUD problem originated in this feature rather than being exposed by the shorter field.

Evidence: `04-landscape-target-obscured.png`, `05-landscape-focus-repro.png`.

### PO-N2 · P2 · Landscape minimap covers mission and focus feedback

**Reproduction:** Start/retry Winter Stores at 844×390, or activate a named target after navigating away.

**Observed:** The initial long mission toast appears behind the home/minimap/front controls. Its center text is covered. The short target-focus toast is almost entirely covered by the same minimap region. Source inspection is consistent with the observation: the landscape toast starts 112px below the battlefield top, while the shortened protected battlefield places the minimap in that region.

**Impact:** Important mission guidance and confirmation of which target was focused are not readable in this layout. The dock itself remains readable. The initial toast overlap is visible in the native tool transcript; the target-focus overlap is preserved in `05-landscape-focus-repro.png`.

### PO-N3 · P3 · Focus arrow renders as a missing glyph

**Reproduction:** Inspect either target button on desktop or portrait. Inspect a critical target at 320×568.

**Observed:** The authored ↗ after “Focus” renders as a small hollow rectangle in this Chromium/font environment. At portrait critical health, CSS removes the word “Focus” and leaves this missing-glyph rectangle as the visible activation hint.

**Impact:** The accessible name and native button remain functional, and healthy-state “Focus” text still communicates the action. The critical-state visual affordance is less clear precisely when it is most useful. Use a supported, reliably drawn icon or retain readable action text in a separately reviewed fix.

Evidence: `06-390-keyboard-focus.png` and `focus-glyph-crop.png`. The latter is only an enlarged crop of the native screenshot, not a new UI capture.

## Passed observations

### Target health and layout

- Desktop displayed both named original mines with 100% HP, bars, focus controls, difficulty/PROTECT identity, income/2-of-2 progress, and remaining time. The full build deck and all prices were visible.
- 320×568 and 390×650 kept the named dock, HP values, progress/time, 2×2 toolbelt, minimap, main build controls, and Rally price reachable without game-body horizontal overflow. The command strip intentionally scrolls horizontally; its partially visible next card is not treated as a clipping defect. Scrolling to Sanctum/Aerie at 320 showed their full prices and kept Rally available.
- Target button rectangles were approximately 44–46 screenshot pixels high, consistent with the source's 44px minimum. No computed DOM box or physical touch-target certification was performed.
- At 320×568, both originals visibly transitioned through damaged health to **23% HP · Critical**, then **12% HP · Critical**. Explicit critical wording and the red-tinted state remained readable. The final loss followed normal combat.
- At 844×390 the dock's labels/health and control deck fit. Its issue is battlefield visibility and feedback overlap, not dock text clipping.
- In ordinary-density combat, the larger troop visuals and ellipse/diamond team marks did not conceal the visible mines or their target badges. This is not a maximum-density objective certification; the separate renderer review's crowding limits still apply.

### Focus and input

- Desktop: selected Barracks at 623 gold, then activated South gold mine. Placement squares and armed-card state cleared, the original was visible, and gold continued rising through normal income to 704. No 140-gold purchase occurred.
- 320×568: armed Rally, then activated North gold mine. The armed spell cleared without a 75-gold debit. The toast named North and both original sites were visible.
- Native Tab from North moved focus to South; native Space activated South without pausing the battle. South's visible focus outline was present at 12% critical health. The separate 390×650 sequence below provides the stronger before/after evidence of focus retention through multiple HP updates.
- 390×650: Tab then Enter activated South and produced “Showing South gold mine.” The same South focus outline persisted while HP decreased from 89% to 34%. The saved first evidence image was captured a little later at 84%; this is ordinary simulation progression between captures.
- Pause kept the dock visible but disabled its focus hint; clicking a paused target did not navigate or resume. Preferences opened and closed over the paused battle without exposing a working target through the modal. Ended-battle targets showed “Original missing” and did not navigate.
- Minimap native click navigation moved toward the enemy; a fresh target activation moved the camera home. No exhaustive held-pointer or key-across-modal race test was performed.

### Loss, result, and reset

- Normal undefended Winter Stores combat lost both originals at **00:43.70**. Each result bullet named the exact original: **North gold mine** and **South gold mine**, with the wording “original structure lost, first observed at 00:43.70 battle time.”
- The citadel remained at its mission-start **64%** immediately before and after loss. Winter Stores starts with 3,800 HP; this was a protected-objective failure while the citadel was intact, not a citadel defeat.
- The 320×568 result scrolled independently while Retry/Return/Inspect remained reachable. The battle report expanded and its recording-coverage text accurately disclosed that the resumed run began recording at 0:19, rather than pretending to have earlier samples.
- Retry reset both mines to 100% HP and cleared the previous loss state. A second normal undefended run produced the same two named loss times.
- Inspect battlefield showed disabled “Original missing” dock entries and the intact citadel. Return to title worked.
- On the same page, a new Winter Stores run → pause → Save & return → ordinary Outrider skirmish removed the protected dock and restored the normal battlefield/build layout. No stale protected name, HP, or loss text remained in the skirmish.

## Coverage limits and next gate

Before acceptance, repair and re-review the landscape target/HUD and toast/minimap collisions. Recheck the missing glyph in the shipped font environment. Keep the source-only functional test results distinct from these native observations.

Still untested: live Common Ground/Twin Span and longest labels; actual physical touch/pen, controller hardware, screen reader and live announcements; Safari or a browser/device matrix; maximum-density target visibility; every held-input scope transition; already-missing restored-original wording; failure-injected history/preferences persistence warnings and captured-result ownership; full campaign balance, sustained performance, or subjective audio. The test involved no defensive construction or win attempt, so it is not a balance verdict. No publication or release approval is implied.

## Evidence

Evidence folder: `/workspace/shared/ironroot-clarity-ui-review`.

- `01-common-ground-locked.png`: briefing and legitimate lock.
- `02-desktop-focus-cancel.png`: desktop focus after Barracks cancellation.
- `03-real-protected-loss-320.png`: actual named result at 320×568.
- `04-landscape-target-obscured.png`, `05-landscape-focus-repro.png`: landscape blockers.
- `06-390-keyboard-focus.png`, `07-390-focus-health-update.png`: stable native keyboard focus through HP updates.
- `08-390-result.png`: second normal loss result.
- `09-ended-dock-controls.png`: ended target states and scrolled compact build deck.
- `10-skirmish-reset.png`: same-page skirmish without stale dock.
- `11-profile-difference.png`, `12-profile-restored.png`: expected disposable change and successful restoration.
- `focus-glyph-crop.png`: enlarged native screenshot detail.
- `runtime-preflight.txt`, `reviewed-sha256.txt`: final allowlist and reviewed runtime hashes.

Reviewed key hashes: `app.js` = `bbfb2e49a9b7ba4905ceba9d4c8baedac1e6edddf50bd412d1d56d1ded9de44a`; `styles.css` = `44ee6ad58efd2d390ebe120148b262eedf38225725e3057ad862b556e8fa0827`. Renderer and VFX hashes still match the accepted readability freeze.
