# Flight inspector and narrow pause layout repair

This note covers the held local candidate, not production or the unchanged
`598925c` QA source. No upload, merge or deployment is part of this repair.

## Retained negative evidence

The original native report is
`qa/cloud-598925c/Ironroot-PR2-598925c-QA-report.json`.

- At 320×430, ordinary scrolling, focus and two animation frames left North at
  y=296.375, height=46 and bottom=342.375 against command-deck bottom=342.
  Its full width and centre hit passed, but 0.375 CSS pixels remained clipped.
  The deck still had 175 pixels of scroll range available. Full visibility
  remains mandatory; a passing centre hit does not replace it.
- At 320×568, Restart ended at y=586.765625, beyond even the old 569-pixel
  limit. Air routes added vertical space to the initial collapsed pause menu.
  Modal scrolling allowed eventual access but did not satisfy initial fit.

## Scoped runtime change

Only `dist/styles.css` changes runtime behavior:

- Add 8px block-axis scroll padding to the desktop flight inspector and the
  mobile command deck, which is the actual mobile scroll owner. This gives
  ordinary nearest-edge scrolling space for fractional bounds and focus ink.
- At portrait widths up to 400px and heights up to 600px, reduce pause-menu
  padding and section whitespace. Text sizes and all 44px targets stay intact.
  Air routes remains expandable, with the complete route text and instruction.
  The existing modal scroller remains available for expanded or longer content.

No app/HTML, focus/history, portrait income, first-build auto-start or collapsed
hint behavior was changed. Runtime CSS SHA-256 at the native-review handoff:
`1fe8c072007e667c3498143c27e03608ee10c97a391b5d0774c7dcbf0ec142dd`.

## Verification and limits

- `tests/flight-pause-layout.test.mjs` retains both recorded negative cases in
  a strict no-tolerance containment oracle and checks scoped CSS contracts.
  These are oracle/source tests, not proof of native layout.
- 27 focused Node tests passed, including flight UI, pause startup, portrait
  income and hint text-inset regression coverage. Log:
  `qa/flight-pause-layout-focused.tap`.
- Runtime JS syntax and syntax for the new browser files plus existing flight
  and pause browser suites passed.
- `qa/browser/flight-pause-layout.spec.mjs` adds the initial 320×568 no-scroll
  fit check for all primary actions and Air routes, exact viewport/scrollport
  bounds, 44px targets, centre hits, repeated expansion/collapse, focus wrap,
  unchanged paused save and Options/keyboard return. Both new browser modules
  are included in browser-package preflight.
- The existing 320×430 and 667×300 flight-control tests retain their full
  `toBeInViewport({ratio:1})`, hit-test, order, resource and downstream checks.
  Existing pause/history and Options suites remain unchanged.

Independent supported native-preview review was requested once CSS stabilized.
Its measurements and final combined-source browser gate are separate evidence;
neither is claimed by these Node/syntax results. No shell browser was launched.

In the authorized cloud browser runner, include this new spec along with the
existing flight-orders, pause-menu and back-navigation suites. The new spec
alone does not replace their coverage or the full final-candidate matrix.
