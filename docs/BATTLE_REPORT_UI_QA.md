# Battle report native UI review

Date: 2026-11-06. Isolated v0.11 candidate at the managed preview `http://127.0.0.1:4173/`. This records the initial presentation, before any follow-up scroll/copy polish. Native Chromium mouse and keyboard through documented CUA APIs only. No Playwright, CDP automation, engine instrumentation, synthetic wins, alternate server, source transfer, publication, or changes to v0.10/public v0.7.

## Findings

The report is accurate and usable in the observed natural defeat. All four metric charts have readable numeric scales and elapsed-time labels; player solid/circle and enemy dashed/diamond distinguish sides beyond color. Final forces, objective outcome, sample tables, and truthful local-download status are available. Retry, Return to title, and Inspect stay reachable while report content scrolls in every tested size.

Recommended polish, reported during review:

1. Opening a report leaves only its opening lines visible beneath the large result header until the outer result body is scrolled. Reading then needs a second, inner vertical scroll. This is workable but needlessly fiddly, especially on a short landscape screen. One result-body scroller with a pinned footer and an opening-summary scroll target would be easier.
2. Coverage explanation, availability caveat, and download controls precede the useful totals. Put concise battle totals first, keep the partial-history warning ahead of charts, and move technical qualifications later. Prefer “Battle totals” and “buildings already standing at battle start” over “Cumulative engine totals” and “authored starting buildings.”
3. At 320 CSS pixels, metric-summary table row label “Enemy” wraps as “Enem” / “y.” Numeric values remain contained/readable. A small column/word-wrap adjustment would improve polish.

No blocking result-control or chart-overflow defect was observed in this pass. These are bounded observations, not a full accessibility/device certification.

## Safeguard and method

- Browser inventory showed one localhost tab; no obsolete active game tab remained. Other non-game tabs were left alone.
- Opened `__qa_report_profile.html` in that same tab, pressed **Retain original profile only**, and visibly observed “Original five save domains retained and byte-verified. No local game data changed.”
- Used a clearly labeled temporary `__qa_report_responsive.html` containing a real game iframe. Its only script changed iframe width/height. It did not inspect or mutate game state, saves, history, or the journal.
- Exact iframe CSS viewports: 1100×720, 320×568, 390×650, 844×390. The containing native Chromium window was 1212×886. These are desktop pointer/keyboard viewport checks, not phone hardware or physical touch.

## Fresh ordinary result

Played Holdfast deliberately idle, without purchases, upgrades, strikes, or synthetic actions, at ordinary 1× initially then 1.5×/2× through the visible speed button. The supplied force lost naturally at **0:59**. The result said **Trial failed** and **Holdfast: Your citadel fell**, with **7 enemies felled** and **1 building raised**. A no-defense failure is useful for checking a truthful defeat debrief, not a difficulty/balance conclusion.

The report initially stayed collapsed. Pressing Tab from the newly shown result moved focus to Return to title, consistent with Retry as the initial focus target. Shift-Tab twice selected Battle report; Space expanded it. The report showed:

- Holdfast, Classic, 0:59, Defeat.
- Recording 0:00–0:59 with 31 retained samples and clear sampled/noncontinuous coverage.
- Whole-match units defeated 7 versus 6, placements 1 versus 5, credited damage 1,607 versus 3,580.
- Gold first/last 650→962.75 versus 0→310.75; current income 5→5 for both sides.
- Living army 0 at finish versus 24; final standing buildings 0 versus 5.
- Citadel HP 1,800→0 versus 6,000→6,000.
- Objective outcome “Your citadel fell,” plus the explicit absence of separate objective checks.

The existing result and report agreed. The placement qualification explained why the idle player's supplied building counts as one. The debrief did not claim gold profit, total earnings, a playable replay, or reconstructed pre-resume data.

## Responsive and keyboard behavior

- 1100×720: four charts and their summary tables remained legible. Nested report/body scrolling worked. The footer was fixed outside both scroll areas.
- 320×568: headings, explanatory text, download button, and chart axes wrapped/fit without page-wide horizontal overflow. Metric summary tables were cramped as noted above. Retry, Return to title, and Inspect remained visible. Sample tables intentionally overflowed only inside their own region; a native horizontal scroll revealed Gold/sec, Living units, and Citadel HP columns.
- 390×650: income and living-army charts/tables were readable, including unbroken Enemy labels. Footer remained visible while scrolling.
- 844×390: the report's small inner height requires substantial scrolling, but chart axes and numeric tables remain readable and the pinned footer remains reachable.
- Space and Enter toggled native report and sample disclosures. Tab focused the named report scroll region with a visible focus outline; Page Down moved its content. Escape from within the open report collapsed it and restored visible focus to its summary. A second Escape left the result safely in place.
- Inspect the battlefield exited the result and showed the frozen ended battlefield. Its menu control returned to title.

## Last result and history

After Return to title, Last battle report reopened the existing 0:59 result/report. Repeated that route twice, including an Inspect round trip. Preferences → Recent battles showed the same five visible entries before and after:

1. Defeat · Holdfast · 00:59
2. Defeat · Skirmish · Long March · 01:59
3. Victory · Skirmish · 02:13
4. Victory · Winter Stores · 02:30
5. Defeat · Winter Stores · 00:43

There was no duplicated visible Holdfast entry. Campaign still displayed 3/16 missions and 9/48 stars. Because this was a defeat, repeated victory reward/medal awarding is not established by this UI observation; separate integration/data tests remain necessary.

Starting another ordinary Holdfast and saving back to title removed Last battle report and left Resume trial · Holdfast · 00:05. This establishes new-battle clearing through the visible UI.

## Download observation

Pressed the ordinary **Download report data (JSON)** button once. The app displayed **“Report download started. Check your browser’s downloads to keep it.”** Chromium's native download bubble displayed a new item as **Done**, 121 KB, under an environment-generated UUID filename. No file picker was forced and no hanging filechooser wait was used.

This is UI-only download coverage. No known authorized readable file path was provided, so downloaded bytes, JSON schema/content, suggested filename fidelity, and browser cancellation detection were not verified here. The app did not overclaim that a file was saved or delivered.

## Resume and restoration

An actual second Holdfast was started, paused at **00:05**, and saved with **Save & return to title**. The title showed **Resume trial · Holdfast · 00:05**. Browser reload preserved that saved trial; pressing Resume returned to Holdfast and the visible clock/objective progressed from six seconds. The battle again ran idle at ordinary 2× to natural defeat at **00:59**.

The new report was initially closed and correctly disclosed:

> Recording began when this battle was resumed on this page, at 0:05. Recording ends at 0:59.
> Earlier play from 0:00 to 0:05 is not in these charts. Engine totals below still include that earlier play.

It retained **28 samples**. The displayed gold chart's horizontal axis started at **0:05**, not 0:00, and ended at **0:59**. The battle outcome remained the actual Holdfast citadel defeat, 7 kills and 1 placement. This establishes the visible partial-coverage flow through a real save/reload/resume; it does not substitute for JSON/counter schema tests.

Returning to title showed Last battle report again. Reloading then removed that entry. Thus both new-battle and page-reload clearing were observed.

Finally, returned the **same tab** to the safeguard page and pressed Restore retained original profile. The visible result was:

> Original five save domains restored and byte-verified. Protocol 2 is retained. No synthetic progress was created by this fixture.

Only after that observation, completed the CUA session and removed the temporary responsive and profile fixture files from isolated dist. No earned test wins existed (both tests were losses); all review history/save effects were restored to the retained original five domains. The runtime freeze was released for the parent’s polish pass.

## Limits and follow-up

- No campaign victory, medal award, marked-structure objective, long-match thinning, zero/single sample, error fallback, forced colors, real screen reader, physical touch, hardware controller, or audio listening was exercised here.
- Desktop native input and exact iframe layout checks are not mobile hardware coverage.
- No actual downloaded JSON file was read; content/schema validation remains a separate test gate.
- A later runtime presentation change needs a targeted UI retest. This initial pass does not certify a changed version. Cleanup and original profile restoration are complete.

## Targeted polish retest

Completed 2026-11-06 against the parent's subsequent stable presentation update. This section supersedes the initial nested-scroll, wording/order, and Enemy-wrapping findings above; the original evidence is retained for traceability.

Repeated the explicit retain-only safeguard before play and observed byte-verified retention. Used the same tab and a temporary labeled, layout-only iframe. Played one fresh idle Holdfast through normal 1×→1.5×→2× speed controls to its natural **0:59** defeat: 7 enemies felled and 1 building raised. No purchases, synthetic win, state injection, file picker, or download retry occurred.

### Verified changes

- **Single vertical scroll:** The report now flows inside the result body's single vertical scroller. At desktop 1100×720, opening it by Shift-Tab from Retry and Space immediately exposed the field record and Battle totals without needing an outer-then-inner scroll maneuver.
- **Opening alignment/focus:** At 320×568, clicking the summary closed it and Enter reopened it with the full focused summary aligned at the top of the result body. The visible focus outline stayed on the summary. Page Down repeatedly scrolled its ancestor result body, through totals, coverage, and charts.
- **Useful ordering/copy:** “Battle totals” comes before coverage notes and charts. “Both sides · the whole battle, including play before a resume” and the plain starting-building explanation are easier to read. This retest used a fresh report; the actual resumed-flow evidence remains the earlier pass, not a newly repeated resume claim.
- **Narrow table fix:** At 320×568, the full gold chart and summary table could be viewed together. Enemy stayed on one line. Values and range remained contained, with no page-wide horizontal overflow. The numbers are compact at this size but usable.
- **Keyboard sample tables:** Tab from the main summary reached View retained sample data. Enter expanded it; Tab focused the player's table region with a visible outline. Right-arrow presses scrolled that region to Gold/sec, Living units, and Citadel HP without widening the dialog. Tab continued through the enemy table to Download.
- **Download placement/reachability:** At 320×568, Tab reached the download button after Objective outcomes. The ephemeral/local-record caveats and About these records remained readable. At 844×390 the button was also visible above the pinned footer. This retest did not create another download; the earlier native-download UI observation remains the download-action evidence.
- **Landscape/reopen behavior:** At 844×390, Return to title then Last battle report reopened the same result with the main summary aligned at the top. Space immediately collapsed that summary, proving it received keyboard focus; Enter reopened it. Page Down and ordinary wheel scrolling moved the single result body. Chart title, axes, elapsed time, and summary values remained readable with deliberate scrolling.
- **Footer:** Retry, Return to title, and Inspect stayed fixed and reachable through the tested desktop, 320×568, and 844×390 scroll positions. The previous nested vertical-scroll friction is resolved in the observed paths.

### Time-format verification limit

The fresh natural result was 0:59, not an exact minute/deadline boundary. No synthetic boundary result was injected or claimed. Separately ran:

`node --test --test-name-pattern='whole-second labels' tests/report-view.test.mjs`

The focused test **whole-second labels use only a tiny tolerance, including the hour boundary** passed (1/1). The parent owns broader data/integration verification; this UI retest does not claim a naturally observed 60/120/140/150-second boundary.

### Final restoration/cleanup

Returned the same tab to the safeguard and observed **“Original five save domains restored and byte-verified. Protocol 2 is retained. No synthetic progress was created by this fixture.”** Then submitted the required CUA completion summary and removed both temporary dist fixtures. No `__qa*` files remained in dist. Runtime freeze released only after cleanup. No new blocker was found; the initial limits on real hardware, audio, screen readers, victory rewards, and actual downloaded JSON bytes remain.
