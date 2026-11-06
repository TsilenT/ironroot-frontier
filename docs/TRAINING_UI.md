# Guided practice interface (local 0.12)

## Entry and isolation

`dist/training.html` is a separate page. The main title links into it and the permanent **Return to game** link goes to `./`. Training does not import `app.js`, persistence, profiles, backups, battle reports, campaign or challenge modules. It never reads or writes browser storage, registers a worker, makes network requests, awards anything or modifies the saved-battle slot.

The page creates its own `TrainingSession`, which owns a fresh real `Game` for each lesson. The renderer receives that game read-only. Build and upgrade actions go through session methods, not direct engine shortcuts. Setup grants and free starting structures are disclosed in **Authored practice setup**, with the actual starting gold and absence of enemy AI in its visible summary. The permanent practice-only notice says that saves and records remain untouched and practice resets when leaving. Session review reports actual completed, skipped, failed and not-attempted outcomes; skipping is never treated as completion.

The page may use an already-installed main application's offline shell. Cache/navigation handling is integrated separately by the parent task. The training page itself performs no cache or storage writes.

## Player flow

Five replayable lessons cover paid placement and automatic production, warrior screens for ranged support, mine income and a paid upgrade, siege against a specific tower, and archers against a specific flying target.

1. Read the current instruction with time stopped.
2. Choose the available build card. Choosing or cancelling never spends gold.
3. Tap the gold highlighted safe site. An explicitly labeled site button performs the same paid action after the player selects the build card.
4. Continue past the success explanation. A watch step then requires **Start observation** before time runs.
5. Watch real engine combat or income until the authored objective completes, then continue at the player's pace.

The upgrade step requires selecting the actual owned mine (canvas or named button) and pressing the displayed paid upgrade action. Only the lesson's allowed build card appears; invalid sites are rejected before any spend. Insufficient resources are handled by the session's **Wait for income** option, which runs the normal economy rather than granting replacement gold.

The lesson picker immediately starts a fresh attempt of the chosen lesson. **Restart lesson** resets the current attempt; **Skip lesson** records a temporary skipped outcome and moves ahead. All are safe because practice is intentionally ephemeral. No confirmation modal competes with the battlefield.

## Input and accessibility

- Mouse, touch, pen and keyboard are supported by this page. It does not add controller support or change the main game's controller behavior.
- Pointer travel greater than eight CSS pixels is a pan, never a placement. The helper also checks movement first observed on release, vertical drags, out-and-back drags, multiple contacts, cancellation and lost capture.
- H / F or Home / End move to home / front. Left/right arrows pan. The minimap is a labeled, focusable slider with keyboard navigation and position text; pointer activation occurs on release, not contact.
- 1–7 match the main build order, but only the current lesson's available card can be selected. Escape cancels. Space pauses/resumes a running observation when focus is on the battlefield or page. Focused buttons, links, the lesson selector and other native controls retain their normal keyboard behavior.
- Tab and native button activation provide a complete non-canvas route for required placement and upgrades. This is not a claim of full nonvisual combat accessibility.
- Shared `input-scope.js` capture guards invalidate held pointers, trailing compatibility clicks and held activation keys across status/step/lesson/pause/replay transitions. A fresh press works immediately; there is no debounce timeout.
- Blur and hidden-document events stop running observations and require an explicit resume. Page exit stops the session. Back/forward-cache restoration creates a new temporary session rather than reviving an exited attempt. VFX particles and shake reset for every new Game identity, including such restorations, while steps and pauses within a Game retain their effects. Observation feedback is derived from actual pause/recovery state instead of stale session messages.

## Layout

Desktop and short landscape use a battlefield column and coach column. Portrait keeps a compact sticky battlefield above the coach while the single document scrolls. A concise current-action line remains with the map while a build card, site button or instruction is in view. The map height is content-sized: a 34-pixel HUD, at least 44 pixels for the current action, a 200–220-pixel canvas, and 56 pixels for navigation, approximately 334–354 pixels total. The measured height supplies scroll margins; focus and card/site activation additionally uncover controls below the actual sticky edge. No nested dialog or coach scroller is introduced. Controls have at least 44-pixel hit targets. Landscape retains the existing full-height renderer fit. Portrait uses the renderer's original 0.32 minimum scale to keep units readable; at the 200-pixel minimum canvas, the visible vertical world range is 137.5–762.5, containing all three lanes at 260, 450 and 640. `render.js` is unchanged.

The initial camera centers the current recommended site; Home, Front and the minimap remain visible alongside the battlefield. Gold sites use a high-contrast ring and number drawn by this page after the standard renderer. Original engine art, icons and locally bundled fonts are reused. No new sound, balance or assets are introduced.

## Verification

`node --test tests/training-ui.test.mjs` passes 27 focused tests covering paid explicit actions and costs, cancellation, unavailable cards, wrong-site rejection, owned-mine upgrades, immediate derived income after paused mine actions, whole-second display tolerance, new-Game VFX isolation including reused bfcache attempt IDs, state-derived manual/away pause and resume feedback, portrait action summaries and uncovered control alignment, portrait height/touch/lane budget, drag thresholds, release-only movement, multitouch, lost capture, held gestures at result/retry/skip/pause transitions, new replay scope, save-free imports, interruption wiring, fresh bfcache restoration and honest review language.

These are Node logic/source integration checks, not visual browser or device validation. Browser-native visual and interaction review at 320/390 portrait and 844×390 landscape is a separate pending parent gate. No browser, server, hosting, upload or commit was performed by this UI worker.
