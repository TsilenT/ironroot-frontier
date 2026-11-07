# Short coached portrait geometry review

## Result

Source/layout review found no remaining blocker in the narrow short-coached CSS change. This is source-derived validation, not a native-browser pass.

At 320×430 with no safe-area insets, the 48px header, 44px teaching row and 60px dock leave a 278px field. The 104px side navigation leaves 216px field width. The prior 96px bottom navigation reduced field height to 182px, below the unchanged 212px safety floor.

## Cascade and containment

- Later short-coached selectors override portrait row/column placement: field and navigation share row 2, teaching remains row 3, dock remains row 4, and header/teaching/dock span both columns.
- Navigation remains a grid. Static toolbelt/map positioning neutralizes inherited absolute offsets and transforms; inherited margins are zero. Eight navigation actions retain 44px minimum dimensions.
- Rail content requires 248px including padding: 44+92+92 tracks, two 4px gaps and 12px padding. At 430px total height it has 30px spare space; a 21px bottom inset leaves 257px field/rail height. At 400px the full rail fits exactly. Slightly smaller layouts can lose bottom padding before controls overlap; 248px is not the safety guard's exact cutoff.
- The app remains the positioned grid ancestor for the existing drawer. In the no-inset 320×430 case, inherited drawer expressions resolve to right 104px, bottom 104px and max-height 278px. The battlefield remains the relative, clipped ancestor for toast positioning.
- Existing safe-area padding and safety floor are unchanged. Arbitrary native notch/zoom combinations, actual font ink and browser grid containing-block behavior still require browser validation.
- Full-width protected cards and teaching retain their prior label widths and font-inset rule. No new hiding, scaling, duplicated controls or threshold relaxation was found.

## Fixture correction verified

Review caught a false positive in the shared synthetic fixture: it omitted teaching controls/region from returned geometry, allowing 320×370 despite rail overlap. The implementation worker added those nodes and removed duplicate manual augmentation. The regression now rejects 370px and 393px while accepting 394px and 400px. The shared fixture explicitly remains an arithmetic model, not a CSS engine.

## Checks

- Final focused run: 20/20 passing across short-coached portrait, mobile startup and shared mobile shell tests.
- Earlier focused run: 27/27 passing across mobile geometry, pause, coach text inset and viewport fit tests.
- Final boundary-only rerun: 4/4 passing after adding the 394px safe boundary.
- Browser companion syntax passes. Its assertions cover actual field bounds, control hit testing/collisions, protected labels, coach text, clock advancement, toast containment, drawer containment, bottom inset repeated tall/short resize, and 430→370→400 freeze/save/explicit-Resume recovery.
- Original `qa/browser/phone-viewport.spec.mjs` is byte-identical to the pre-repair comparison copy. SHA-256: `081d89e4b4cccd774d055dc44d849d9d2b5dcf2ad3d81a5fdff3eb10bcbbc106`.
- No browser launch, security workaround, external action or aggregate suite was performed by this reviewer. Parent owns aggregate and cloud browser validation.
