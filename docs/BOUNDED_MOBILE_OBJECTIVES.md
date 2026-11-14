# Bounded mobile objectives

The objective dock is a fixed screen region. `objectiveContent` owns vertical scrolling; its text and cards use natural-height grid rows and wrap unbroken strings. `objectiveHUD` keeps Build as a sibling outside that scroller in normal landscape. Portrait and sidebar layouts retain Build in navigation. Desktop uses `display: contents` for the inner wrapper and retains the existing layout.

This replaces the Reed Beds/Ramparts name-width cutoffs and their extra dock-height rules. It does not calculate screen space from a mission ID, a label length, or a particular objective state. The existing 60/84px protected and 44/56px ordinary portrait budgets remain; short landscape can use its existing right-hand dock track. Content grows inside those budgets.

## Guarantees and limits

- Objective descendants cannot paint outside the scrollport. The port must remain inside its dock slot and separate from the world and fixed navigation. Loss of actual clipping/scrolling is a safety failure, not permission to ignore overflowing controls.
- Fixed controls retain the existing 44px target requirement and the battlefield retains the unchanged 212px height and 128px width floors. Truly insufficient screen space still pauses and requires explicit Resume after recovery.
- Objective controls retain intrinsic 44px hit areas, non-overlap and reachable scroll-space bounds. A partially visible card is an ordinary scrolled fragment, not a claim that its entire hit area is visible at every scroll position. Longer cards, summaries and metadata may require scrolling; content is not ellipsized or reduced to fit.
- Long finite plain text, including unbroken strings, can wrap and scroll without growing the shell. This is not a guarantee of unlimited DOM size/performance, arbitrary third-party CSS/positioned widgets, or a glyph larger than the entire available reading viewport. Browser/assistive-technology behavior still needs physical-device acceptance.

The safety guard therefore checks two spaces: the visible fixed shell, then local objective coordinates. Raw rectangles above or below a real clipping scrollport are allowed only when they remain within its reachable content extent. Hidden overflow without user-operable scrolling and unreachable horizontal overflow fail the local check. Existing essential target references remain checked even if an accidental style hides them; other interactive objective descendants are checked as well.

## Reading and input

The named region is a mobile keyboard stop with an inset focus outline. Native scrollbars and a small vertical-scroll cue indicate overflow. Short portrait puts metadata after the primary summary/cards, keeping it available within the same reader instead of hiding it. Critical/loss announcements keep their existing live-region policy; ticking counters do not become a new noisy announcement stream.

Touch drags, wheel input and native scrolling keys stay within the objective region. Escape retains its existing behavior. Native Space/Enter activation on objective buttons remains available. Gamepad users can focus the reader and scroll with Up/Down; existing button focus reveals offscreen controls, and Back leaves HUD navigation. Desktop battle shortcuts retain their existing path.

A scroll or an actual change to the pressed button's rectangle invalidates its physical press. A stable text rewrite does not: ordinary HUD updates repeatedly assign strings. Queued scroll notifications also do not invalidate a new press at the already-settled offset. No timeout/debounce is used. HP/phase updates retain mounted controls and the player's reading position; entering a new battle may start a new reader.

## Why this approach

Growing the dock to fit arbitrary text takes space from the battlefield and can turn a text change into a screen-size pause. Clipping or ellipsis alone loses information. Per-mission width cutoffs cannot cover future translations, font sizes or dynamic labels. A separate modal can show long text but adds an open/close step to repeated target focus and interrupts the battle context. A bounded local reader keeps fixed battle actions available and makes the tradeoff explicit: extra information is reached by scrolling.

## Verification contract

`tests/objective-region.test.mjs` exercises the composed shell/local guard, including oversized/offscreen cards and failing containment, reachability, target-size, overlap and world-floor cases. Existing startup, pause, safe-area and short-coached fixtures continue to execute real app functions; their arithmetic is not browser evidence.

`qa/browser/objective-region.spec.mjs` uses actual Chromium layout and native input for long mixed-script/unbroken text, enlarged names, twelve cards, all-character scroll reachability, stable shell geometry, pointer cancellation/fresh presses, keyboard/gamepad reading and clipping removal. The reader samples with overlap derived from actual glyph height; it does not loosen visibility bounds. A ticking counter can be verified at a rendered value while stable labels are fully read. Synthetic long progress/deadline cases pin only those two elements’ actual DOM text against normal short HUD assignments; an observer would briefly restore the short layout and clamp scrolling. They do not alter game state or geometry. Real dynamic-state coverage remains separate.

The campaign audit covers all 42 current missions and two legacy lessons, including valid synthetic prerequisite profiles, native starts and target taps. Prepared dynamic checkpoints use production Game/codec admission and are explicitly synthetic; these tests are not a natural all-campaign playthrough or balance certification. The 320×430 coached case must retain its 216×278 field, teaching strip, full-size navigation and explicit unsafe recovery, as described in `SHORT_COACHED_PORTRAIT_REPAIR.md`.

Generated browser results, screenshots, coverage tables and cache/deployment evidence stay outside the repository. Release claims depend on the final test and deployment results, not this design document.
