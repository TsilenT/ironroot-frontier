# Short coached portrait repair (local candidate)

The reported 320×430 restored protected campaign reserved 48px header, 44px teaching, 60px objectives and 96px bottom navigation. Its 182px battlefield legitimately triggered the unchanged 212px safety floor. Removing the pause or hiding the teaching rail would conceal the defect.

For `.protected-short-portrait.mobile-coaching` only, navigation now occupies a 104px column beside the battlefield. Build spans the rail, the four tools use two rows, and Home/Front plus the minimap use two rows. All existing DOM controls remain visible and at least 44px. The teaching strip and protected names/HP dock remain full width below the field. The existing 1px coaching text inset is preserved. Tall portrait, uncoached portrait and landscape layouts are unchanged.

At 320×430 with no inset, authored grid arithmetic yields a 216×278 battlefield. A synthetic 21px bottom safe area leaves 257px height. Root fitting, safe-area subtraction, pinch behavior, safety thresholds and the explicit recovery latch are unchanged. The navigation has a 248px full track/padding budget. Overflow first consumes its 6px bottom padding; once actual controls overlap the teaching row (at a 393px viewport height), the unchanged guard pauses rather than shrinking or hiding controls.

## Verification

- New `tests/short-coached-portrait.test.mjs`: exact source rules, source-derived 320×430 geometry, old-layout negative control, safe-area and tiny-viewport negative cases. These are not a CSS engine or native-browser proof.
- Existing `tests/phone-viewport-fit.test.mjs`: unchanged; all 9 checks pass alongside the 3 new checks. Its shared synthetic layout helper has been updated to model the new short-coached side rail without changing existing assertions. It remains source-derived arithmetic, not browser evidence.
- New `qa/browser/short-coached-portrait.spec.mjs`: actual geometry, text containment, full hit targets, teaching visibility, resumed clock, drawer open/close, bottom safe area and repeated tall/short transitions. Syntax checked only in this environment.
- Existing browser specs and assertions, including `phone-viewport.spec.mjs`, are unchanged.

Two existing synthetic expectations described the bug as intentional: 320×430 guided restore and 320×400 startup were expected to pause. They now explicitly assert safe geometry (216×278 and 216×248 respectively), while the complete unsafe pause/freeze/recovery assertions run at 320×370, where 44px rail controls overlap the teaching control. No browser failure assertion or safety threshold was weakened.

The toast remains unchanged because its containing block is the positioned battlefield, not the app; the new browser companion checks a real protected-target “Showing” toast against that field and checks navigation hit targets. It also checks the full-width topbar and field-only drawer bounds.

Native browser execution was unavailable/unstable in this task. No browser result, physical-phone certification or release readiness is claimed. Run the unchanged phone viewport suite and the new companion in all configured projects against the final combined source, then the full gate. Physical device/browser chrome/PWA acceptance remains separate.

The shared geometry fixture now includes teaching regions and modeled teaching controls whenever teaching is enabled. A direct 320×370 negative regression and 394px/393px control-overlap boundary checks cover this requirement without manual control-array augmentation. The browser companion also checks real 430→370→400 resizing, frozen saved state/time and explicit recovery.
