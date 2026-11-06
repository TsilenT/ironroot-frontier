# Guided practice native UI review

Review in progress, 6 November 2026. Isolated local 0.12 at the approved managed preview. No external hosting, source transfer, runtime edit, commit, simulated outcome or engine-state injection.

## Method and profile protection

Native Chromium in a 1212 × 886 desktop window, using documented CUA native input and screenshots. Native accessibility provider is unavailable in this browser session, so controls are screenshot-coordinate/native-key operated. No Playwright, CDP evaluation, DOM evaluation, hidden state or engine introspection was used. The existing obsolete safeguard tab was reused; no active game tabs remained.

Copied the approved `qa/manual/profile-safeguard.html` to a temporary local dist fixture. Retain reported: “Original five save domains retained and byte-verified. No local game data changed.” The same tab is retained throughout. Profile verification/restoration and fixture cleanup are still pending.

## Observed ordinary gameplay so far

- Main title v0.12 Guided practice link entered the separate page.
- Barracks lesson: paused at 0:00 with 280 gold while reading, choosing/cancelling and panning. Cancel explicitly said no gold spent. A selected-build drag panned without placing/spending. A fresh canvas click bought the barracks for 140, leaving 140. Explicit Start observation produced a real visible warrior and stopped at 0:01 with 146 gold.
- Shield/arrow: paid range via its labeled site button, activated by Tab/Space after selecting its card. Gold fell 350→175. Observation completed at 0:08 with visible warriors/archers and the explanation that enemy arrows hit the warrior screen while friendly archers fired from behind.
- Blur by focusing the address bar immediately paused shield observation. Returning focus to the battlefield left it paused; explicit Resume was required. Home, Front and minimap moved the camera without spending or placing.
- Mine: paid190 from330 left140 and immediately showed7.5/s while paused. Two seconds of actual observation left155. Selected the owned mine with its named button, then explicitly paid133 to upgrade, leaving22 and immediately showing8.75/s. Second observation completed at0:04 with39 gold. No automatic upgrade or hidden spend.
- Siege review underway.

## Confirmed issue

Manual Pause observation updates the status header and Resume action correctly, but retains the feedback callout “Observation running at normal speed.” Confirmed in siege at0:21. Blur-pause feedback correctly says it paused while away. This is a nonblocking copy/state clarity defect, not a failure to pause.

## Pending coverage and limits

Siege/air completion, replay/skip/jump/summary, responsive viewports, title with Resume, return route, unchanged-profile comparison, final restore and cleanup remain pending. No physical touch, screen-reader, controller or audio claim.

## Completed review

The pending-coverage section above is superseded by the results below.

### Remaining combat and honest review

- Siege: explicitly bought the270-gold foundry from540, then observed ordinary engine spawning, travel, shots and the marked tower's destruction at0:31. The success statement said the siege engines damaged the marked tower, which was destroyed in actual combat. It did not promise a particular final blow.
- Anti-air: paid175 from350 for the range, observed the numbered tracked gryphon ring in flight, and saw the real target defeated at0:14. The success text correctly stated that archers struck the tracked gryphon and warriors/siege cannot provide that air cover.
- The first final review showed5 completed,0 skipped,0 failed, with all five lesson rows Completed.
- Replayed the first lesson using native keyboard Home/Return in the selector. Bought another barracks ordinarily, then Restart restored an empty setup,280 gold and0:00. Skipped that attempt, entered the second lesson, then jumped with native End/Return to the fifth and skipped it. Final review honestly showed2 completed,2 skipped,0 failed, with the second lesson Not Attempted. No skipped work was represented as completed.
- No clearly visible lingering old particles were confirmed during the sampled fresh setups. The parent separately queued renderer VFX cleanup; this review did not inspect hidden particle state.

### Readability and feel

The actual engine observations are short and understandable. Paused reading, explicit spending and separate Start observation prevent instruction text from racing combat. The numbered rings make the relevant building/gryphon easy to identify; the watch camera moves to the intended target. The siege buildup takes longer than the other examples but shows actual travel and shots, and its target disappears before success is awarded. The plain success explanation links the visible event to the lesson.

Portrait390×650 and320×568 were checked as explicitly sized iframe content viewports using desktop mouse/keyboard input. Text, canvas, all three roads, Home/Front/minimap and buttons stayed within width. Scrolling reached all instructions/actions. The paid labeled-site button worked at320, and Continue remained large/readable after payment. These are pointer-responsive iframe checks, not physical touchscreen tests.

**Phone interaction issue:** the initial portrait battlefield occupies most of the first screen, while the lesson title/setup, current instruction and build card sit substantially below it. Reading the current step and choosing a card requires roughly another screen of scrolling, then returning to the canvas requires another long scroll. The adjacent labeled-site button avoids that trip and is usable, but normal map placement feels awkward. A small portrait layout improvement is queued by the parent; not yet retested here.

At844×390 the battlefield stays visible beside the scrolling coach. All three lanes and navigation fit, and primary Continue/Start/Pause actions are reachable without horizontal clipping. Readability is good at this width. The initial Skirmish title is tall and scrolls, but the requested Campaign title uses its compact layout.

### Profile equality before normal gameplay

After all five lessons, replay/retry/skip/jump review and responsive practice, returned to the same safeguard tab and pressed the new read-only Verify button. Visible result:

> Original five save domains are still byte-identical. Verification made no changes.

This occurred **before any normal battle was started** and before restoration, establishing that the tested training paths did not change those original domains rather than merely hiding a change through restore.

### Main Campaign title regression with Resume

Only after that equality gate, started an ordinary disposable Wings of Ash mission, paused at00:06 and used Save & return to title. No outcome or campaign win was earned. Loaded the title in the844×390 fixture and selected Campaign.

The compact campaign panel showed chapter navigation and a substantial scrollable briefing region above side-by-side Begin Mission and `Resume mission · Wings of Ash · 00:06`. The new Guided practice link, field guide and preferences links fit below. Scrolled the briefing to its setup/scouting/hint/end without hiding either primary button. The previous tiny-briefing regression was not reproduced in this tested Campaign+Resume state.

### Restoration and cleanup

Returned in the same tab to the safeguard and pressed Restore. Visible result:

> Original five save domains restored and byte-verified. Protocol2 is retained. No synthetic progress was created by this fixture.

No training run remains active. Both temporary dist fixtures were removed after the observed restoration. The native CUA portion ended with its required completion summary. No runtime file, frozen baseline, hosting state or source history was changed by this reviewer.

## Remaining limits

The queued portrait/manual-pause/VFX polish still needs a targeted retest. No actual touch/pen delivery, screen-reader audit, physical controller, audio audition, every keyboard route, browser failure/timeout path, hidden-document background-tab path, bfcache restoration, or held-pointer/held-key transition matrix was exercised here. Ordinary retry and replay were tested; injected failure/recovery was not. Node/source tests are separate evidence and should not be presented as native UI coverage.

## Targeted polish retest

A second native freeze tested the revised sticky portrait battlefield/current-action line, focus alignment and state-derived pause feedback. The same native Chromium/screenshot method and explicitly sized iframe viewports were used. The approved safeguard was retained again before testing. No normal game was played in this retest.

- **320×568 normal map placement:** scrolled the single document to the Barracks card while the resource strip, current-action line, all three roads, highlighted site and Home/minimap/Front remained visible above. Choosing the card changed the adjacent text to `Barracks selected · tap the gold ring (140 gold).` A direct click on the still-visible canvas ring paid140, leaving140. No return scroll to the map was needed. This resolves the previously observed portrait map-placement round trip.
- The sticky battlefield occupies about335 pixels at this size, leaving a compact but usable coach window. The coach still requires ordinary reading/scrolling; the solution is not a claim that the whole lesson fits in one screen. A large manual scroll can naturally move a nonfocused card behind the sticky region, but scrolling back or focusing the control brings it into view.
- Native Tab navigation through canvas navigation, lesson selector, disclosure and Continue showed the selected controls below the sticky field with a clear focus outline. Space on Continue advanced to a visible current-step heading and Start observation. Ordinary first-lesson observation completed at0:01 with146 gold and a visible spawned warrior.
- **390×650 normal map placement:** advanced to shield/arrow, selected its card, verified that Tab made its labeled site button fully visible below the sticky field, then used the actual still-visible canvas ring instead. The paid placement left175 from350. Card, site button and canvas were all usefully reachable without the old long map round trip. Current-action text reflected selection and success.
- **Manual pause/resume correction:** started shield observation normally, pressed Pause at0:06 and saw all relevant copy agree: header `PAUSED · RESUME WHEN READY`, current-action `Time paused. Resume observation below.`, coach `OBSERVATION PAUSED`, feedback `Observation paused. Resume when ready.`, and Resume observation button. Space on that focused button restored the observing labels and `Observation running at normal speed.` The stale-running feedback issue is resolved in this tested path. The lesson then completed ordinarily at0:08.
- **844×390 quick regression:** all three lanes, navigation, readable coach success text and full Next lesson action remained visible in the side-by-side layout. Moving to the next mine setup showed a clean0:00/330-gold field with no visibly lingering combat effects. This is a sampled visual check, not hidden VFX-buffer inspection or exhaustive replay/bfcache verification.
- No horizontal clipping or inaccessible primary action was observed at the three tested sizes. Fonts/current-action text remained readable. The320-pixel build-card shortcut wraps onto a second line but is legible.

After leaving training, pressed the read-only Verify button before Restore. It again reported: `Original five save domains are still byte-identical. Verification made no changes.` Then Restore reported the original five save domains restored and byte-verified with Protocol2 retained. Both temporary fixture files were removed after that result. No active training session remains. Required native completion summary was sent.

The two confirmed UI findings from the initial pass are resolved in the targeted native retest. No blocking issue remains from this review. Physical touch/pen, controller/audio/screen-reader coverage, full browser matrix, bfcache and held-input adversarial transitions remain untested here. The all-five completion evidence is the initial pass; this targeted pass repeated only first and shield/arrow lessons.
