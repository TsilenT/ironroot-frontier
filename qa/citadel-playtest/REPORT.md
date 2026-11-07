# Citadel playable QA — 2026-11-07

The final focused Chromium suite passed **30 cases**, with **18 intentional project skips, zero failures and zero retries**. It ran against source commit **`2602e6571f07555787602ef814fa6fc6beb467f2`** on `codex/skirmish-citadel-options`, based on main `5ec1f967a1c8c8f9861f68b8fef3cf99c4fa460d`. Every inventoried runtime/harness hash matched that commit and remained unchanged throughout the final run: [source proof](browser-reviewed-source-proof.json), [start hashes](browser-reviewed-start-sha256.json), [end hashes](browser-reviewed-end-sha256.json). The parent's complete Node/CI results are recorded separately in [validation.json](validation.json).

## Final browser evidence

Chromium 155.0.8059.79, Playwright 1.65.0, Node v24.22.1. Desktop 1180×757, short portrait 320×430, landscape 844×390; a separate 667×300 check preserves the 212px battlefield threshold, and 320×250 exercises the explicit safety hold. Native browser input and the real update/render loop are used throughout. No browser simulation-clock or live-game hook is installed.

| Final cases | Passed | Evidence covered |
| --- | ---: | --- |
| Fresh Skirmish and authored-mode/profile flows | 6 | Default choices, independent bridge setting, identity/restart, campaign revision 5, trial revision 3, all five isolated practice lessons, earned bytes preserved |
| Legal restored paid arrows/regeneration | 6 | Exact 190-gold cost, no instant heal/cooldown reset, one choice, purchase wait, Back cancellation, restore |
| Synthetic visible arrows/regeneration | 6 | Native Home camera, visible cyan extra projectile, complete measured glyph bounds, active recovery and interruption by actual damage |
| Initial dialog focus | 3 | Heading focused and visible before any test scrolling; native Tab reaches the first purchase |
| Fresh native-time purchase | 1 | Native 2× speed reaches readiness, one toast without focus movement, trusted UI purchase |
| Controller focus | 1 | Disclosed standard Gamepad API provider; normal application polling, activation and cancel |
| Additional short landscape | 1 | Real layout/control geometry and safety threshold |
| Interrupted purchase guards | 2 | Newer cross-tab checkpoint survives held release; unsafe resize blocks purchase and requires explicit Resume |
| Independent-review regressions | 4 | Heading/scrolled Space and remapped Pause; quota; silent dropped write; historical restart versus new Begin |

The 18 skips are deliberate viewport gates: eight desktop-only cases skip the two touch projects, and the extra landscape case skips the other two projects. They are not omitted failures. [Per-case results](evidence/browser-reviewed-cases.json) include the project, status, elapsed time, observations and exact paid snapshots.

In the final fresh native-time case, Extra Arrow was bought at **91.60 simulated seconds, tick 1832**, with **4,509/6,000 HP**. Gold changed **902 → 712**, and HP and the ordinary firing cooldown were unchanged. The browser case took 49.5 seconds wall time. This is a genuine fresh easy-AI UI purchase; it does not establish a recovery benefit or balance.

The restored purchase cases use reproducible legal paid two-sided histories, with AI disabled and normal building costs/income. The synthetic scenes explicitly arrange time/entities to expose feedback and do not enter paid gameplay results. Full-label visibility uses native Canvas transforms and `measureText` glyph bounds inside the actual battlefield; screenshots are also inspected. [Selected screenshots and original hashes](evidence/images.json) include initial dialog views, corrected feedback, quota warning and the adverse visual captures retained below.

## Paid engine sample: limited exposure

The fixed [plan](PLAN.md) ran exactly **8 games: four paired choice comparisons**, seeds 17/91 × bridge off/on × assigned arrows/regen, with normal native AI, honest paid opening/support scripts, and a 450-second bound. All eight ended in player defeat **before eligibility**: 81.80 seconds for seed 17 and 81.20 seconds for seed 91. The assigned purchase attempts are retained as `battle-ended`; **0/8 eligible, 0/8 purchases, 0/8 upgrade-effect observations**. No outcome-tuned replacement games were added.

Both sides' gold ledgers reconcile within 6.3 × 10⁻¹² gold of floating-point residual; bridge-off residuals are zero. Bridge-on enemy receipts were 31.8333 and 31.35 gold for seeds 17 and 91; player receipts were zero. No game reached the first declared 90-second common horizon, and no Volley was cast. Gross spell-cost observation is implemented as 75 gold, but this sample does not exercise it. [Raw per-game actions/results](paid-results.json) and [summary](paid-summary.json) retain first damage, source composition, spending, bounties, final production, outcomes and receipts. This sample supports no conclusion about either upgrade's usefulness or enjoyment.

This sample predates the later applicability correction. Its exact source and imported dependencies are retained with matching original hashes in [paid-source-snapshot](paid-source-snapshot/README.md); source reconstruction required no outcome replay.

## Retained failures and corrections

- The initial optional-mode browser run was stopped on the parent's scope change. Its JSON retains one harness failure (timed selection was made before a reload that legitimately resets that select), one interrupted case, and 22 unrun cases. The selector was moved after reload. [Interruption record](browser-initial-interruption.json), [initial per-case evidence](evidence/browser-initial-cases.json).
- An intermediate 21-pass run overlapped `app.js`/`index.html` edits and is not exact-final-source certification. The later frozen 26-pass run had matching start/end hashes. Both remain retained.
- Initial synthetic captures showed the center bridges; canvas draw calls alone had observed offscreen labels. Native Home corrected the capture, exposing a real clipped-label defect on 320px portrait. The renderer now clamps the badge within a 4px viewport margin, and the observer checks complete glyph bounds. [Offscreen capture](evidence/failure-offscreen-feedback-capture.png), [clipped label](evidence/failure-narrow-regen-label-clipped.png). The first Home run's six passing anchor checks are explicitly insufficient visual certification; the stronger six-case rerun and the final full suite passed.
- Independent review found keyboard actions could run behind a heading-focused dialog, and failed purchase saves lacked persistent feedback. Four new native regressions passed after correction. Quota and silent-drop tests keep the old durable checkpoint, retain the paid in-memory choice/warning across reopen, and clear the warning only after a verified retry writes the exact paid choice. The final 30-case run includes all four.

All raw screenshots, traces, HTML/JSON reports and prior results remain private/local under `/workspace/ironroot-citadel-playtest/qa/citadel-playtest/`. [Raw retention manifest](evidence/retained-raw-manifest.json) records exact paths, bytes and SHA-256 values; compact repository evidence does not silently replace or delete the originals. No external transfer, branch operation, merge, deployment or signing action was performed by this QA task.

## Reproduce and limits

Run from `qa/browser`, choosing fresh output names so original evidence remains intact:

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium \
PLAYWRIGHT_HTML_REPORT=../citadel-playtest/browser-replay-html \
PLAYWRIGHT_JSON_OUTPUT_FILE=../citadel-playtest/browser-replay.json \
npx playwright test citadel-options.spec.mjs \
  --project=desktop --project=narrow-phone --project=landscape \
  --output=../citadel-playtest/browser-replay-artifacts
```

The paid snapshot has its own exact-source replay command. `python3 qa/citadel-playtest/compact-evidence.py` regenerates compact records/images from retained raw browser results without running games or deleting files.

These are engine and headless Chromium checks, not human enjoyment, physical-device, Safari/Firefox, screen-reader or physical-controller playtests. The native paid match and legal restored histories establish access/payment behavior; synthetic scenes establish mechanisms/presentation under declared arrangements. The eight normal-AI games expose no upgrade opportunity. Recommend keeping the draft for Steve's play evaluation; these results do not support balance superiority or a promised recovery window. No QA blocker remains in the tested scope.
