# Battle report presentation (isolated 0.11 candidate)

This is a local-only presentation increment. It does not alter the engine, rules,
map geometry, saves, profile history, backups, or the 0.10 and public 0.7 builds.

## Files and integration contract

- `dist/report-view.js` exports `renderBattleReport(report)`.
- `dist/report-view.css` contains styles scoped to `.battle-report`.
- `tests/report-view.test.mjs` exercises the renderer using authentic outputs from
  `dist/battle-report.js`, plus deliberately malformed copies.

Load `report-view.css` after the main stylesheet. Mount the returned HTML in
`#resultReport` inside the existing result dialog, before its separate action
footer. The return value begins with a **closed native details** element. It has
no DOM IDs, so repeated mounts do not cause ID collisions. The renderer does not
read the DOM, install handlers, mutate the input, access a game, read/write
storage, or download anything. Invalid input throws `TypeError`; integration
should show a plain report-unavailable message without blocking result actions.

The root integration owns:

1. Creating, sampling and finishing the read-only journal.
2. Mounting the completed report once and clearing it for a new battle.
3. Preserving Continue/Retry as the initial result focus target.
4. Keeping the fixed result action footer outside `.result-body`, the dialog's
   single vertical scroller. The report body flows naturally inside it with no
   height cap or overflow rule, including on short landscape screens. The
   renderer does not override result-dialog layout or footer controls.
5. Handling `[data-report-download]` and updating `[data-report-status]`.
   The renderer supplies a regular button and a polite status region, not a
   download implementation, success claim or confirmation dialog.
6. The optional in-tab Last result entry point. The report states that it is
   available only until a new battle or page reload.

The button reads “Download report data (JSON).” Supporting copy explains that
this is a local data record, not a playable replay, and is absent from ordinary
saved games, history and backups. A failed or unsupported download must not be
reported as successful by the integration.

## What the debrief shows

- Battle name, actual map name, final simulation time and resolved result.
- Both-side kills, building placements and damage counters under “Battle totals,”
  immediately after the header and before coverage or download notes.
- Recording start/end, missing pre-resume history and any journal thinning,
  visibly before the first chart whenever the report is opened.
- Gold balance, current income rate, living army count and citadel HP histories.
- A readable numeric first/last/retained-sample range table for each chart.
- An optional retained-data disclosure with separate horizontally scrollable
  tables for the two sides.
- Living final unit roster, standing-building counts and final citadel HP.
- Recorded objective checks and marked-structure outcomes.
- The download button and its retention notes after the battle information.

The placement counter includes buildings each side started with; upgrades do
not count as new placements. Damage counts health removed from units, buildings
and citadels by each side. Health that citadels lose automatically during
overtime is not counted for either side. These caveats appear in plain language
alongside the numbers. An unavailable earlier timeline is not reconstructed from cumulative
counters. Sampled gold is not earnings or net profit; income is a current rate,
not receipts; living counts are not lifetime recruits or casualty counts.
Charts do not assert control of territory or explain why a battle was lost.
Objective checks say Met / Not met / Failed. A missing marked structure says
“No longer standing,” which does not invent a cause such as destruction instead
of salvage. Existing result UI remains the sole source of medals and stars.

Each chart uses elapsed simulation time, not equal spacing between observations.
Gold/income/army/HP vertical scales are separately labeled. The enemy uses a
dashed trace with a diamond endpoint; the player's trace is solid with a circle.
A single retained point appears at the center with “one moment recorded,” never
as an invented history. Lines merely connect sampled values. Chart ranges refer
to retained points, not the broader `observedPeaks` data, which may include points
removed by thinning. Visible times use the main battle clock's presentation
tolerance: `Math.floor(value + 1e-6)`. Accumulated 0.05-second steps such as
`59.99999999999873` and `149.99999999999986` therefore show `1:00` and `2:30`,
while ordinary fractions such as `59.95` still show `0:59`. The header, coverage,
axis text and descriptions, hour-format label, roster and retained tables use
the same rule. Sample coordinates, report data and JSON remain exact and
unchanged; numeric cells still use at most two decimals.

## Responsive and accessible behavior

The palette follows the game's dark forest panels, parchment ink and muted gold
rules. Display headings use the already-bundled typefaces; no new images,
services, fonts or scripts are loaded.

- Native disclosures remain keyboard-operable, including nested sample data.
- The naturally flowing report body is a named region, without an extra tab
  stop or nested vertical scroll area. The outer result body owns vertical
  scrolling while the separate action footer remains fixed.
- Four static SVGs have title/description, image semantics and descriptive names.
- Axis labels are normal 12px HTML text rather than text that shrinks with SVG.
- Tables have captions and scoped column/row headers, including chart summaries.
- Scrollable data tables have named focusable regions for keyboard access.
- Side labels, including “Enemy” in headings and chart-summary rows, never split
  across lines. The chart side column reserves 4.5em; numeric cells retain
  wrapping inside fixed-width columns rather than forcing the report wider.
- Narrative text wraps; retained-data overflow stays inside its horizontal
  table region, with no bounded inner vertical scroll area.
- Mobile spacing changes at 360px. Short landscape uses the same single vertical
  scroller as portrait, without a separate report height cap.
- No animation runs. Reduced-motion and forced-color styles are explicit.

The renderer validates structure, nonnegative finite numeric fields, side order,
coverage times, timeline order, and collection limits. It rejects more than 256
samples rather than quietly thinning another time. Text is escaped at the HTML
boundary, invalid XML control characters/surrogates are replaced, and text longer
than 512 characters is visibly truncated with an ellipsis. No provided text is
inserted into raw markup, styles, URLs or executable attributes.

## Verification and remaining gates

Passed locally:

- `node --check dist/report-view.js`
- `node --test tests/report-view.test.mjs` (17 tests)
- Real reports for Classic, Long March and Twin Span.
- Every authored campaign and field-trial ending, all known unit names, and
  objective/marked-structure data.
- Zero-time/single-point draw, resumed history and an 11-hour thinned timeline.
- Hostile strings, malformed Unicode, oversized strings and bounded HTML.
- Sparse arrays, nonfinite/negative values, incorrect side/count/time data and
  oversized input rejection.
- Repeated rendering, unchanged engine serialization and unchanged JSON export.
- Actual 0.05-step accumulation at 60 and 150 seconds, 12 boundary/nonboundary
  time cases including the hour rollover, and exact JSON time preservation.
- Report content order, visible partial-history disclosure, natural vertical
  flow and unbroken side labels through static HTML/CSS regression checks.
- Static checks for chart/table semantics, default-collapsed disclosure, color-
  independent legend, local-only rendering, scoped CSS and reduced motion.

No server or browser was launched by the presentation worker. Static tests do
not establish rendered layout, actual screen-reader behavior, touch behavior or
hardware performance. Separate browser QA must verify result-flow integration,
unbroken labels and contained numbers at 320px portrait, and single-scroll/fixed-
footer behavior in 844px landscape when permitted.
Publication, source transfer and desktop/mobile hardware testing remain outside
this module's authorization and verification.
