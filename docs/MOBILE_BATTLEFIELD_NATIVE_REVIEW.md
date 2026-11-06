# Mobile battlefield bounded native review

Date: 6 November 2026 UTC. Private frozen `ironroot-mobile-battlefield-lab` via the existing managed localhost preview. No source edits or publication.

## Result

**The sampled cohesive mobile-layout gate passes. No new blocking defect was observed.** The previous short-portrait original-target, minimap/tool and clipped-price problems are absent in the sampled mobile layout. Shorter unusable views now stop play and require an explicit recovery action, rather than squeezing the battlefield or silently continuing combat.

This is a bounded native pointer/keyboard review, not full campaign, hardware, assistive-technology, browser-matrix or release approval. The synthetic inset checkbox changes CSS geometry only. It is not native safe-area/device emulation or a test of visualViewport zoom.

## Reviewed freeze and method

- `app.js`: `50130fab265b3acd83cbd37f132a9548bbc4866ad34f748d22d9f9ea0908f8ad`
- `index.html`: `5a20d1890b7eb95bfeac703b430b46ea9450f2960d9fec1f2692032e7baf789d`
- `styles.css`: `07585ad8eee08d0f2633198d6c23282fcdcfeb2e5a80563bd3b9729c179a3dde`
- `mobile-battlefield.js`: `7344944d0203bfa7f22e669fb36e7f7bb31dc8440d695d08d75f9530b1f31f65`

The parent reported 716 passing source tests plus one existing skip. This worker did not rerun that suite. Native CUA actions used the existing Chromium window, the same local tab, screenshots and pointer/keyboard input. There was no DOM evaluation, browser framework, hidden-state modification, unlock, import, chooser, browser/server launch, install or remote action. Winter Stores was legitimately available in the retained profile.

The responsive fixture used exact iframe content sizes. Bounds below are approximate native screenshot pixels, not computed DOM metrics. Window screenshots are 1212×886; the iframe origin is approximately (30,210).

## Portrait launch, restore and visibility

- **320×480 fresh launch:** Entering Winter Stores immediately showed the live 00:00 battle, populated HP/objectives and working controls. No false screen-size pause appeared. The field was approximately 320×228, x30–350/y282–510. Header HP/mission, objective dock and navigation occupied separate rows outside it. Both original mine models, health strips and diamond badges were visible after North and South Focus. The focus toast sat between their roads, clear of the navigation and target badges.
- **390×500 restore:** Save & return, then Resume Mission, restored the ordinary battle at 00:23 without false size suspension. Both Focus buttons returned the camera from the central bridge to the original mines. The world was approximately 390×248, x30–420/y282–530. HP panels, objective labels, controls, minimap and toast were readable and separated.
- **320×480 restore:** After a real undersized hold, safe title exit and Resume Mission at 320×480, the saved battle resumed normally and could immediately be paused. No false screen-size pause appeared. The dock retained North 100% and South 12% HP · Critical in that sampled paused state.
- **390×500 fresh launch with synthetic inset:** A fresh mission launched and ran without false suspension with the checkbox enabled. The 34px synthetic bottom inset left approximately 214px of field, x30–420/y282–496. North/South models and badges, named focus toast, full-sized navigation, objective dock and drawer prices all fit above the reserved bottom area. This is a stricter fitting geometry sample, not a physical safe-area claim.
- **320×568 control and orientation:** Both originals/badges and named focus toast were clear in the approximately 316px field. Rotation to 844×390 restored the landscape rail/dock arrangement without duplicated HP or a stale drawer. The 844×390 field was approximately 692×282. The earlier 568×320 rotation showed a 416×212 field, six separated rail controls, header HP and readable 29% HP · Critical state.

All named focus controls and navigation actions retained approximately 44px-plus visible heights. This is layout evidence, not physical touch-target testing.

Evidence: `02-320x480-fresh.png`, `03-320x480-north.png`, `07-390x500-restored.png`, `11-568x320-rotation.png`, `23-320x480-restored.png`, `24-390x500-inset-fresh.png`, `25-inset-originals-focus.png`, `27-320x568-control.png`, `28-844x390-rotation.png`.

## Build, inspection and modal flows

1. **Build → Close → Build:** Pointer activation opened and closed the drawer. The label changed appropriately and did not spend gold.
2. **Card → Cancel:** Selecting Barracks closed the drawer and exposed ordinary placement squares. Cancel cleared placement and restored Build. Gold increased through normal income, from 624 before the sequence to 711 while armed and 722 after cancellation/pause; no purchase occurred.
3. **Actual paid placement:** A fresh Barracks selection followed by an ordinary empty northern site click placed a visible new Barracks. Gold changed from 722 to 611 across roughly three seconds of 10/sec income, consistent with the displayed 140 cost. The new building was subsequently opened through its visible model.
4. **Inspection:** Clicking that new Barracks opened the reused inspection drawer with Level 1, 700/700 HP, 9.0s/wave, Upgrade 98, Salvage +70 and Close. Closing it, then reopening Build, showed building cards rather than stale inspection. No salvage or upgrade was performed.
5. **Prices/scrolling:** Initial Barracks 140, Archery 175 and fixed Rally 75 were readable. Horizontal scrolling exposed Sanctum 230 and Aerie 250. The remaining Foundry 270, Watchtower 220 and Gold mine 190 were readable in the wider orientation. The 390×500 inset drawer also kept the later prices visible. No card-price clipping like the old ordinary portrait deck was observed.
6. **Pause and Preferences:** Pausing from the open drawer closed it before the pause UI. Preferences from the open drawer covered the game normally; closing Preferences left the drawer closed. Controls did not remain above the modal. No preference was changed.

The world is intentionally covered while its Build/inspection drawer is open. Closing it restores the unobscured originals. This is not treated as the prior persistent-HUD occlusion defect.

Evidence: `04-build-open.png`, `05-cancel-paused.png`, `06-paid-placement.png`, `08-building-inspection.png`, `09-later-build-prices.png`, `10-settings-over-drawer.png`, `26-inset-build-prices.png`, `29-middle-build-prices.png`.

A late optional Rally-cancellation attempt was not completed because the undefended second battle had already ended. It is **not** counted as a Rally pass. The ended battle correctly named both lost original mines at 00:43.70; subsequent inspection showed Original missing. `30-ended-battle-inspection.png` documents that state, not a successful Rally cancellation. This bounded task did not require another full campaign result/balance run.

## Insufficient-space hold and recovery

- Rotating the running battle from **568×320 to 568×300** produced “Battle paused for screen size.” Resume was visibly disabled; Save & return to title remained available. The normal pause layer was behind the safety panel.
- A three-second native held click on disabled Resume did not dismiss the panel or resume combat. Keyboard Tab moved to the explanation region rather than an underlying game control. Screenshots continued to show **802 gold / 00:41** behind the panel across the blocked checks and the subsequent grow.
- Growing back to **568×320** changed the message to “Battle ready to resume” and enabled Resume, but left the game paused. The same 802/00:41 values remained. Only a fresh pointer Resume restarted play. Immediately pausing again showed 809 gold / 00:41 and South 18% Critical, consistent with the short resumed interval rather than wall-clock catch-up.
- The **34px synthetic inset at 320×480** correctly invoked the insufficient-space hold. The same inset at 390×500 fit. This is a deliberate space tradeoff, not a declaration that all 320px-wide devices fail.
- A second extended fallback sequence preserved the saved 00:41 checkpoint. Safe title exit showed “Resume Mission · Winter Stores · 00:41.” Explicit restore, followed immediately by ordinary Pause, showed 815 gold / 00:42 and South 12% Critical, consistent with the fresh short resumed interval rather than the elapsed review time. The first battle did not die while the panel held it.

Native screenshots support frozen displayed time/gold and absence of health/time catch-up. The opaque safety veil prevents an independent exact HP-number comparison at every blocked instant; no hidden HP inspection was used. Source-level exact-step guarantees remain separate evidence. No persistent focus escape, automatic resume or stale overlay was observed.

Evidence: `12-568x300-blocked.png`, `13-blocked-inert-freeze.png`, `16-grow-stays-paused.png`, `17-explicit-resume-no-catchup.png`, `18-390x500-synthetic-inset.png`, `19-320x480-inset-blocked.png`, `23-320x480-restored.png`.

## Tiny fallback and safe exit

At **320×160 without inset**, the fallback retained two approximately 44px-high actions, separated by about 8px, and an approximately 40px explanation viewport. Initial safe-action focus stayed within the dialog. Tab focused the explanation; End visibly scrolled from the heading to “Your battle stays paused”; another Tab returned to the safe title action, skipping disabled Resume. Both actions remained fully visible.

At **320×194 with the synthetic inset checkbox**, the fixture applied 42px fallback bottom padding. The explanation/actions occupied the same usable 160px region. Resume occupied approximately y265–309 and Save & return y317–361; the iframe ended near y404, retaining the reserved lower area. Tab/End again scrolled the explanation. Tab then Return on Save & return exited safely to the ordinary title UI while still undersized. Growing the title back to 320×480 exposed the saved mission resume action. The tiny title itself scrolls; no claim is made that all title content is simultaneously visible there.

Evidence: `14-tiny-fallback.png`, `15-tiny-keyboard-scroll.png`, `20-320x194-inset-fallback.png`, `21-inset-keyboard-scroll.png`, `22-tiny-safe-title-exit.png`.

## Integrity, cleanup and limits

Tab 31 began at about:blank. The production tab and a separate static art-study tab were left unchanged. The same local tab retained the five original domains and Verify explicitly confirmed byte identity before play. The retained snapshot was never replaced. At the end Verify reported the expected disposable differences; Restore explicitly confirmed **original five save domains restored and byte-verified**, with protocol 2 retained. No raw save contents were recorded.

The local tab was navigated to about:blank. Only `dist/__qa_mobile_profile.html` and `dist/__qa_mobile_viewport.html` were removed. Final `node scripts/verify-runtime.mjs` passed **35 runtime files / 716,280 bytes**. App/index/CSS hashes still matched the freeze. Browser and preview were released for the queued separate task.

Evidence directory: `/workspace/shared/ironroot-mobile-ui-review`. `01-profile-retained.png`, `31-profile-difference.png`, `32-profile-restored.png`, `runtime-preflight.json` and `reviewed-sha256.txt` record integrity.

Unverified: physical touch/pen/controllers, native safe-area/environment behavior, visualViewport zoom/offset changes, screen readers, exact hidden-state/frame instrumentation, Common Ground/Twin Span, longest-label authoring cases, other browsers, full campaign balance and a full release regression. No import/chooser or synthetic progression was used. No new defect was repaired during this review.
