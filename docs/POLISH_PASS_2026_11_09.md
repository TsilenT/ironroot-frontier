# Focused polish pass — 9 November 2026

Four small verified repairs are checkpointed on `polish/interaction-review`.
The next useful usability change is making the compact build drawer's horizontal
scroll discoverable. Campaign content and combat were reviewed but not rebalanced.

Base: released v0.28.0, `6b6cf964097a815b214933c7e74bb3f23b72d5d5`.
Implementation: `2fff5789240fbb7fe6b039bb5a0cb95c41e739f9`, tree
`74131d417298494a008eba1fcd80ce3a86e19074`. This report and evidence are a later
documentation-only checkpoint. Only `dist/app.js`, `dist/index.html` and
`dist/styles.css` change the runtime. The release version/cache remain v0.28.0;
the integration owner must assign the next version/cache before publication.
No campaign mission, engine, audio synthesis, profile protocol or save schema changed.

## Ranked findings

| Priority | Verified issue | Disposition |
| --- | --- | --- |
| P2 | Opponent, trial, building and Volley choices indicated selection with the `.active` visual style, but exposed no selected/armed state. Maps, campaign missions and mode choices already had that state. | Fixed: `aria-pressed` follows native selection, switching, cancellation, paid build completion and restored Skirmish difficulty. Trial reconstruction retains the selected button's focus. This improves control semantics; it does not make the canvas game fully usable with a screen reader. |
| P2 | Campaign count text had 4.22:1 contrast when active and 3.70:1 when inactive, below 4.5:1. Counts were 7px on narrow layouts, 8px on desktop. | Fixed: both mode-count badges use the existing ink color, measured 6.5553:1, and a 10px font across layouts. Counts fit at 320px, 390px, 844px landscape and desktop widths. |
| P3 | The speed button always had the accessible name “Change battle speed,” so its visible 1×/1.5×/2× value was excluded from that name. | Fixed: accessible name and tooltip say current and next speed, including the reset to 1× on resume/new start. No speed rule changed. |
| P3 | The fullscreen guide and two save-recovery messages directed players to “Preferences,” while the actual entry and dialog are named “Options.” | Fixed those three navigation references. Ordinary uses of “preferences” for saved settings remain. |
| P3 | Compact Skirmish build drawers have eight cards but hide the existing “Scroll for more buildings” hint. At 390×650 the card list is 929px wide in 269px; at 320×568 it is 873px in 204px. The screenshot shows only two full cards and part of a third beside Volley. | Follow up: show a compact horizontal-scroll cue inside the existing drawer/header. Scrolling can reach the last card; this is a discoverability issue, not a verified inability to build it. Check whether fresh players find the remaining cards before choosing the exact cue. |

The open drawer finding is backed by
[geometry and hidden-hint observations](../qa/polish-2026-11-09/final/drawer-discovery.json)
and the [390px drawer screenshot](../qa/polish-2026-11-09/final/phone-build.png).
It was left separate from the held mobile Volley PR #14 and its unresolved
history investigation.

## Review scope and observations

Native headless Chromium 155.0.8059.79, Playwright 1.65.0, axe-core 4.14.0;
ordinary wall-clock execution, two Playwright workers. These are cloud desktop
and emulated touch viewports, not physical phones.

The initial automated screen audit covered 43 UI states: first briefing,
Options and first paid-build teaching at 1180×757, 390×650, 320×568, 320×430
and 844×390; Story, Skirmish setup, map picker, field guide, pause, Citadel
upgrades and build controls at all but 320×430. The count contrast issue was
the only reported axe violation in those states. No uncaught page errors were
observed. After repairs, the same 43 states had no reported violations or page
errors. Two additional latest **The Road We Know** briefing/scout states passed
on desktop and 390px layouts. These later browsing checks used explicitly
synthetic completed mission records and do not establish earned campaign progress.

Selected screenshots were visually inspected. The first-build coach remains a
scrollable region at short heights, and the compact Build/pause/options controls
stay in the established navigation area. Existing first-build tests verified
paid construction starts combat, rejected actions do not skip the gate, Pause
and Options preserve it, and reload follows the normal saved-attempt behavior.

Audio, volume, reduced-motion and effect-quality controls were checked through
native input, persistence and reload on desktop and 390px layouts. Sound/music/
SFX off, 5% native-keyboard range value, reduced motion on and Low detail were
retained. The full Node suite includes the existing cue, scheduler, gain and VFX
checks. **No listening assessment was performed**: musical quality, perceived
cue clarity, fatigue and physical speaker/headphone behavior remain unassessed.
No human balance, sustained touch play, physical controller, installed PWA,
live update, Firefox/WebKit or screen-reader certification is claimed.

## Validation and evidence

- Full final Node suite: **2,008 passed, 0 failed, 1 optional skip**. The skipped
  installed-desktop-tooling check requires `desktop/` development dependencies.
- Focused final browser suite: **29 passed, 0 failed, 3 intentional exclusions**
  (mouse Shift-repeat test on the three touch projects). This is 16 new control
  state/contrast cases and 13 existing first-build cases.
- Runtime syntax and source-dist preflight passed: **58 runtime files**, with
  a complete SHA-256 inventory in the evidence. This is not publication approval.
- Post-fix screen audit: **45 bounded screen states**, no reported axe violations
  or uncaught browser errors. Axe checks cannot establish complete accessibility.
- Native settings/reload observations: both tested layouts matched every checked
  saved setting; no uncaught errors.

Artifacts are in [the evidence directory](../qa/polish-2026-11-09/).
[Before](../qa/polish-2026-11-09/before/narrow-briefing.png) and
[after](../qa/polish-2026-11-09/final/narrow-briefing.png) show the mode-count repair;
[the latest Road scouting screenshot](../qa/polish-2026-11-09/final/desktop-road-scout.png)
shows the later briefing review. Raw results preserve scope and synthetic fixtures.

The first new browser run had 12 passes and four test failures: its paid-build
observer incorrectly expected only one home barracks, forgetting the Skirmish's
existing barracks. It was corrected to identify the purchased 550/450 site.
One of those cases also reached the initial 20-second deadline under concurrent
checks; the suite now uses the existing paid-build suites' 40-second allowance.
The initial failures are retained rather than presented as product defects.
An earlier wrong test import prevented discovery and was corrected before tests
ran. The exploratory later-briefing fixture initially used only the historical
mission list and opened Shared Crossing; it was corrected to use the current
progression overview and explicitly require The Road We Know. Temporary audit
script setup/syntax errors did not execute application checks and are not passes.

Reproduce the checked browser slice from `qa/browser/` after `npm ci`:

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npx playwright test polish-state.spec.mjs first-build-start.spec.mjs --workers=2
```

Root checks:

```sh
npm test
node scripts/check.mjs
node scripts/verify-runtime.mjs
```

The exploratory axe scans used `axe.run(document, {runOnly: {type: 'tag',
values: ['wcag2a', 'wcag2aa', 'wcag21aa']}})` after opening each listed screen
with native controls. Axe was installed into an ephemeral audit directory, not
added to runtime dependencies. The committed browser regression measures badge
contrast and fit from actual computed colors and geometry.

## Handoff

The branch is pushed. No merge or deployment was attempted. A draft PR creation
was **denied** by automatic approval review: it regarded opening a PR on
`TsilenT/ironroot-frontier` from `polish/interaction-review` to `main` as an
external commitment requiring explicit user permission. The denied operation
did not execute; it was not retried or bypassed. Reading the recent user history
did not supply explicit PR authorization. Branch publication had already
succeeded. The integration owner can review this checkpoint and obtain permission
to open the prepared draft PR. Existing campaign rebuilding can continue independently.
