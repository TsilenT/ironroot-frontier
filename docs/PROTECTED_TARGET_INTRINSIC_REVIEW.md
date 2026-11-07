# Protected target intrinsic sizing review

Reviewed the short-portrait padding-only repair independently. No runtime files or existing browser assertions were edited by this reviewer.

## Finding

The reported 320×430 button was 151×45.578px at y386–431.578, beyond the dock bottom at 430. Its source minimum-content budget explains the failure: 12×1.2 name + 11×1.2 health + 3 row gap + 5 top padding + 8 bottom padding + 2 borders = 45.6px. Browser fractional line-box rounding explains the small difference from 45.578px. A 44px minimum cannot prevent content from demanding more than 44px.

The new scoped padding of 4px 5px 7px reduces that same source budget to 43.6px. With the unchanged 44px minimum, a single-line name and single-line health state can fit the 44px track without a height clamp, font reduction, or content clipping. Horizontal padding is unchanged from the narrow-screen rule, so this repair does not consume additional label width.

## Cascade and states

The three-class `.protected-mobile.protected-short-portrait .protected-target` override follows the generic narrow-screen, portrait and sidebar target rules. It changes only padding and applies to all protected states. It does not alter ordinary battles, non-short portrait, or sidebar layouts when the short-portrait class is absent.

- Healthy and damaged retain their two-row name/health-and-Focus grid. Damaged changes border color, not border width.
- Critical retains full-width health, bold status text, its absolutely positioned focus hint, and the name's 14px right-side reservation for the 10px icon. Its inset state shadow does not increase the CSS border box.
- Lost retains full-width loss text and a removed focus hint. The name and loss explanation remain present; disabled opacity stays 1.
- Name wrapping and health wrapping remain enabled. This repair does not replace original labels with shorter aliases or ellipses.
- The absolute meter remains 3px tall and 2px above the bottom. Its 5px footprint is below the 7px content padding, leaving 2px separation at the line-box budget level. The critical icon's fixed 5px top position remains unchanged.

## Evidence and limits

Added `tests/protected-target-intrinsic.test.mjs`. It reads actual source rules for font sizes, line heights, row gap, border, original and repaired padding, minimum size, meter size and offset. The original mobile padding is a negative control: it must exceed the same 44px budget. Structural checks protect labels, state rules, meter clearance and the padding-only scope.

Focused validation command:

    node --test tests/protected-target-intrinsic.test.mjs tests/phone-*.test.mjs tests/protected-objectives*.test.mjs

Result: 70 tests passed, 0 failed. No full aggregate was run.

These checks are source arithmetic and behavior regressions, not a browser text measurement or proof that every state fits. The 43.6px result assumes both text rows remain single-line. Actual loaded font metrics, bold critical/lost glyph widths, Focus text/icon width, every original's name, line wrapping and browser rounding still require the existing real-browser checks. In particular, validate healthy/damaged/critical/lost at every short-portrait viewport, retaining dock/viewport bounds, minimum hit areas, full text visibility, ink/icon/meter nonoverlap, and all unrelated field/rail assertions. Do not weaken those checks to accept the patch. No browser security workaround, remote action, or production change was performed in this review.
