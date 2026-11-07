# Battle keyboard button contrast — v0.17.2 candidate

This fixes the enabled Change/Clear buttons in Options. Their inherited light
text was painted over Chromium's light native fill. Only the `.keyboard-row
button` fill, text and border styles change; the existing focus outline, 44px
minimum height, padding and grid remain. No game/input/profile logic changes.

Base: merged main `cf0dba19afb73cb1fb9c67ca9fff321eacefb452`, tree
`31b81baaf78d65106996d6b004ed1a5a1b5d8f13`. Its runtime was verified identical
to reviewed PR11 head `2f9322742a432def46464dc5a0b04fdcdd30e0da` before editing.
Candidate version/cache: `0.17.2` / `ironroot-v0.17.2`. Profile protocol remains
**7**; this correction adds no migration. Existing protocol-7 upgrade/fence
behavior remains intact. Merge and publication belong to the repository worker.

## Rendered evidence

Cloud Chromium 155.0.8059.79 / Playwright 1.65.0, two workers, normal wall-clock
timing. All 24 enabled buttons were sampled. Desktop hover and native Tab focus
sample both Change and Clear. Ratios use computed opaque foreground/background,
actual fill/border styles and opacity; translucent forced-color highlights are
composited against the measured fill. No assumed transparent/native background.

| State | Old text contrast | New text contrast | New border / fill |
| --- | ---: | ---: | ---: |
| Normal | 1.0561:1 | 8.8263:1 | 4.5980:1 |
| Hover | 1.0561:1 | 6.7722:1 | 4.3634:1 |
| Keyboard focus | 1.0561:1 | 8.8263:1 | 4.5980:1 |
| Native forced colors | 21:1 | 21:1 | System colors, at least 3:1 |

The old fill was `rgb(239,239,239)` with text `rgb(238,233,217)` and no border.
The new normal fill is `#324231`, hover fill `#40543d`, text `--ink`, normal
border `--muted`, hover border `--gold`. The existing 2px gold focus outline
with 3px offset remains visible (7.5793:1 against the button fill). The test
requires text >=4.5:1 and border/focus against fill >=3:1. Forced-color-adjust
remains `auto`, with native system colors and real keyboard activation.

| Viewport | Before | After |
| --- | --- | --- |
| Desktop 1180×757 | [Screenshot](before/desktop.png) | [Screenshot](final/desktop.png) |
| Short portrait 320×568 | [Screenshot](before/narrow-phone.png) | [Screenshot](final/narrow-phone.png) |
| Short landscape 844×390 | [Screenshot](before/landscape.png) | [Screenshot](final/landscape.png) |
| Desktop forced colors | [Screenshot](before/forced-colors.png) | [Screenshot](final/forced-colors.png) |

Screenshots were inspected. Controls remain 44px high, inside the viewport
after native scrolling, with no horizontal overflow in the dialog or scroller.
The 1px borders add 2px to intrinsic widths (Change 78.656px, Clear 61.078px);
the existing grid fits all three viewports. Short screens retain the existing
scrolling content and fixed Done footer. Geometry and all computed samples are
in the neighboring JSON files. Mobile viewports are emulated, not physical-phone
evidence; forced colors are Chromium emulation, not an OS-wide certification.

## Gates and retained failures

- `before.log` and `before/results.json`: 4 expected failures, 2 profile exclusions.
  Three ordinary profiles fail text contrast and missing borders; forced colors
  already had readable text but lacked a border. Every failed case still completed
  native Enter capture, remapping Pan left to A, durable readback, Clear/null and
  Restore defaults. Their JSON records retain those downstream assertions.
- `candidate.log`: initial CSS-only gate, 4 passed, 2 profile exclusions.
- `browser-final.log` and `final/results.json`: final v0.17.2 runtime, 8 passed,
  10 intentional profile exclusions. Four contrast/layout/action cases plus
  existing desktop Enter/Space held-activation guards, Tab/focus/disclosure/Back
  capture cancellation, and native disclosure/select/range/actual fullscreen.
- `contrast-final.log` and `final/contrast-results.json`: final contrast assertion
  gate after adding the >=3:1 border assertion and alpha-aware highlight math.
  Four applicable cases, two intentional forced-color profile exclusions.
- `node-final.log`: 60 passed, 1 optional desktop-dependency skip. Relevant web,
  runtime inventory, desktop metadata, keyboard handler/persistence and input
  scope checks. `syntax-final.log`: application modules and new browser test parse.
- `runtime-inventory-final.json`: 51 allowlisted runtime files, 981,150 bytes.
  Full SHA-256 inventory, independently regenerated after final runtime edits.
  Manifest SHA-256: `8f9dc70ecd345a422f6f78b0ae28ec23365acada615679f892ad2896df6b521c`.

Only three public runtime files differ from the base:

| File | Bytes | SHA-256 | Git blob |
| --- | ---: | --- | --- |
| `styles.css` | 110791 | `7f2a9741cc927d348eb7f25b8f92600aea585e2cf036dd1ca84ebb2818737d88` | `c93d4260ce1fba13279291cd94a80a956e25aa0b` |
| `index.html` | 46260 | `0e3ee67a91a8082aea33c4ef5ed3bf7473d7a5c09b7dadb1f13e7b516eeaf529` | `f0f8ecb93f0d26729a55392f65f92ee20d5003e0` |
| `service-worker.js` | 2575 | `7819d216cfa61e317b8595f45ed1f2e952f837cec554a3a96d3c6bd75be9a205` | `756783eb8cfc53733ec3f87c8e683c7d2ab1d232` |

The new test uses ordinary click/tap, native Tab/Enter and key capture. It does
not force clicks, change resources, hook storage writes or replace game state.
No full browser matrix or gameplay replay was run for this CSS-only correction.
No merge, deployment, public-repository change or Library transfer was performed.

Two initial local command setup errors (a relative evidence directory and a
metadata command run from the browser directory) stopped before those operations;
both were corrected. No application failure was hidden by these setup corrections.

Reproduction from `qa/browser`:

```sh
IRONROOT_CONTRAST_STAGE=final PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npx playwright test keyboard-contrast.spec.mjs --project=desktop --project=narrow-phone --project=landscape --workers=2
```
