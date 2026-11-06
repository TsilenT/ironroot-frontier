# Ironroot Frontier 0.11: Battle Reports

## Status

This is an isolated local candidate, not a released build and not approval to
transfer or publish source. Public and private main remain at the previously
verified 0.7 release. Corrected candidate commit/ref actions are stopped pending
user-authored approval; no alternative upload or hosting route was used.

The 0.11 checkout is separate from the frozen 0.10 source. All 248 files pinned
in `BASELINE_0_10.json` are preserved in that frozen source. The simulation,
campaign, objectives, persistence, backup and profile-session modules are also
byte-identical between those candidates.

## Player-facing increment

- Optional Battle report disclosure in the normal result dialog, with the
  Continue/Retry, Return to title and Inspect actions kept in a fixed footer.
- Both sides' full-match kills, building placements and credited damage, with
  clear explanations of starting structures and automatic overtime decay.
- Bounded sampled timelines of gold on hand, current income, living army and
  citadel HP. Actual elapsed time determines chart spacing. Numeric summaries,
  accessible sample tables and different line/marker shapes complement color.
- Final living forces, standing buildings and recorded objective checks. The
  report does not invent a cause of death, defeat or structure disappearance.
- Last battle report reopens the completed result during the current page
  session without re-awarding progress or appending history.
- An optional local JSON download. The app reports that a download started,
  not that a file was saved. Desktop-shell downloading remains unsupported and
  shows an explicit message rather than pretending to export.

## Measurement and durability boundaries

The report is an observation, not a replay, save file, economy ledger or strategic
diagnosis. Gold balance is not earnings/profit; living troops are not recruitment
or casualties. Existing engine counters cover the whole match, including play
before Resume. Timeline recording begins on this page: a resumed or late-started
journal prominently discloses the missing earlier segment. Long recordings are
thinned to at most 256 retained actual points and disclose that reduction.

Reports do not enter ordinary saves, campaign/trial progress, history or backups.
They are available only until another battle begins or the page reloads. Download
the JSON if a local record is wanted. Observer/render/export faults do not void a
valid battle result, block result actions, or change the saved-game schema.

## Verification records

- `BATTLE_REPORT_DATA.md`: bounded immutable journal and schema contracts.
- `BATTLE_REPORT_VIEW.md`: escaped presentation, chart semantics and layout.
- `BATTLE_REPORT_ACCURACY_REVIEW.md`: independent full-engine parity and
  actual-app-function tests, with reproducible JSON evidence.
- `BATTLE_REPORT_UI_QA.md`: bounded native Chromium review, original-profile
  preservation, observed findings and targeted polish retests.
- `BATTLE_REPORT_BROWSER_QA.md`: four-profile regression harness and its exact
  execution limits. Prepared/discovered tests are not reported as passing runs.
- `../LOCAL_VALIDATION_0_11.json`: final local gate counts and runtime manifest.

The paired simulation audit compares both attempted and accepted paid actions,
exact final serialized Game/RNG states, and restored continuations. It validates
noninterference and data truth, not strategy balance or device performance.
Native UI testing uses ordinary fresh and resumed Holdfast defeats and labeled
responsive viewports. It is not twelve/sixteen-mission browser completion, a
screen-reader audit, physical touch/controller validation or a user cohort.

On the polished runtime, the independent audit passes **52/52 checks**, including
**31 pairs / 62 complete simulations** and **9 restored continuations**. Aggregate
Node tests pass **492**, with **0 failures and 1 optional desktop-tooling skip**;
all runtime modules parse. JSON evidence, exact reviewed hashes and checksums are
under `qa/report-evidence/`.

The prepared browser matrix discovers **648 instances / 162 logical cases / 11
files**, including **96 instances / 24 cases** for reports. Three intentional
inherited skips remain. **No automated browser case has run against 0.11 here.**
Fixture validation passes; discovery alone used the installed Playwright 1.57.0
without changing the pinned 1.65.0 dependency. The authorized runner must use the
pinned dependency and report actual results separately.

Final local source-dist preflight passes: **29 runtime files / 582,481 bytes**,
with an exact SHA-256 manifest, complete offline-module coverage, and no temporary
QA fixtures. The native reviewer restored and visibly byte-verified the original
five profile domains after both passes. Final targeted review confirms one result
scroller, readable 320px table labels, keyboard access, summary alignment and
fixed landscape actions. All **248 frozen 0.10 files remain unchanged**. These
checks validate the local candidate only, not publication or an automated browser
pass.

## Still required before release

1. Obtain the required source-action approval without bypassing the stopped
   commit/ref paths, then run the exact candidate in the authorized cloud gate.
2. Run the full pinned four-profile browser matrix, including the corrected
   held-touch result-action regression inherited from earlier candidates.
3. Broaden human gameplay, accessibility, non-Chromium and physical-device
   reviews, including report usability and low-powered-device performance.
4. Retain the known Long March Hard advanced scripted-rush weakness until a
   measured balance change passes economy, pacing and campaign gates.
5. Validate packaged desktop interaction/audio/controller behavior and platform
   distribution requirements. This remains a single-player pre-release game,
   without online PvP, Steam integration, or a claim of Steam readiness.
