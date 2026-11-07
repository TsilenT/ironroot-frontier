# Volley v0.18.2 integration

PR14 integrates private main `495cf2563f8b9f06723e27e06ae77dcdc5d9b2ca`, tree `da748165d0d2948c317eb43d4191fe1e20c6011d`, into the existing `codex/mobile-volley` branch. The previous reviewed head was `28356b0762676f874b9d902615b34dc939fe5422`. A merge preserves both ancestries and all prior review evidence.

The candidate identity is **v0.18.2 / ironroot-v0.18.2**, with profile protocol 8 unchanged. The release coordinator separately verified merged v0.18.1 live. This branch does not merge or deploy production. **Keep PR14 draft: two strict seeded-reload history assertions remain unresolved.** This is a bounded source-review handoff, not a clean validation or merge recommendation.

The selected UI remains one 44px Volley action in compact mobile Sound's slot, with cost and Ready/recharge/Cancel state. Desktop retains its card and Sound; audio stays in mobile Options. Field dimensions and safety thresholds are unchanged. The original design, measurements and failures remain in [MOBILE_VOLLEY.md](MOBILE_VOLLEY.md).

Confirmed campaign and Field Trial Restart, failed-result Retry, explicit briefing Begin, Common Ground's primary Skirmishes and optional Replay, and save-session removal matching are preserved from main. `dist/persistence.js` is byte-identical to that baseline. No other gameplay or economy work is included.

The historical original pre-Resume history.length 4→5 failure remains unexplained; the full original trace is unavailable. The strengthened native-marker readiness checks do not establish a cause or proven fix. Earlier blocked-service-worker base/candidate diagnostic results remain distinct from new integration checks.

## Scope and measured fit

Only four runtime files differ from main: `dist/app.js`, `dist/index.html`, `dist/styles.css`, and `dist/service-worker.js`. Root/desktop package versions are 0.18.2; the desktop lockfile changes only its two application-version fields. Merge conflicts were limited to README and the browser-check script list. Main's restart/finale code, persistence module and original restart tests were preserved. [Preserved-main hashes](mobile-volley-integration/preserved-main.json) identify unchanged engine, persistence, history and profile modules.

The authoritative release-coordinator inventory is [runtime.json](mobile-volley-integration/runtime.json): **51 files / 998,322 bytes**, each with SHA-256. [Changed files](mobile-volley-integration/changed-files.txt) lists the complete diff from the new main. [Validation](mobile-volley-integration/validation.json) records source hashes, commands, results and limitations. The tested source head is `be73fdcf643dd5a66c3d781f80be4ccb4f9cc99c`; its subsequent handoff commits add only documentation/evidence. Runtime bytes have remained fixed since integration merge `89213aa83decf03594ea576198702066a5809086`.

The compact slot measures 44×44 CSS px with a 14px name/status and 12px cost. Minimum measured text contrast is 6.39:1. Mobile geometry observations retain income and objective labels at 390×650, 320×568, 320×430 and 844×390, with visible/hidden hints, ordinary and protected objectives, and Ashen Crossroads. The smallest observed supported field is 216px wide / 226px high; the original 128px width / 212px height safety minima remain unchanged, with shorter unsafe layouts held by the existing safety overlay. No utility row or field space was added. [Geometry summary](mobile-volley-integration/geometry-summary.json) links the detailed measurements. The cost of this bounded layout is that mobile audio requires Options; desktop Sound and its Volley card remain visible.

Nine selected images were inspected: [desktop Ashen](mobile-volley-integration/desktop-ashen-1180x757.png), [phone Ashen](mobile-volley-integration/phone-ashen-390x650.png), [320×430 Ashen](mobile-volley-integration/narrow-phone-ashen-320x430.png), [320×430 protected/hidden hints](mobile-volley-integration/narrow-phone-protected-320x430-hidden.png), [844×390 protected/hidden hints](mobile-volley-integration/landscape-protected-844x390-hidden.png), [Ready](mobile-volley-integration/volley-ready.png), [recharge](mobile-volley-integration/volley-recharge.png), [restart briefing](mobile-volley-integration/restart-briefing-320x430.png), and [finale to Skirmish setup](mobile-volley-integration/finale-skirmishes-844x390.png). The final two images are scrolled menu states with the explicit Begin action visible.

## Completed checks

| Check | Result |
| --- | --- |
| Aggregate `npm test` | 1,441 passed, 0 failed; 1 optional installed-desktop-tooling check skipped |
| Root syntax, release preflight, browser syntax/fixture validators | Passed; new narrow integration config also parses |
| [Primary Volley browser slice](mobile-volley-integration/primary.json) | 13 passed; 15 intentional project exclusions |
| [Initial independent browser slice](mobile-volley-integration/independent-initial.json) | 13 passed, 1 observer-readiness failure retained |
| [Native-key history slice](mobile-volley-integration/history-native-keys.json) | 3 passed, 1 strict pre-Resume failure retained |
| [Exact merged-base controls](mobile-volley-integration/merged-base-control.json) | 2 passed |
| [Worker-controlled history slice](mobile-volley-integration/worker-enabled.json) | 1 passed, 1 strict pre-Resume failure retained |
| [Merged restart/finale/persistence slice](mobile-volley-integration/restart-final.json) | 33 passed at desktop 1180×757, portrait 320×430, landscape 844×390 |

Primary and independent checks cover visible direct Volley access, one paid cast, gold/cooldown/first-build gates, free cancel, menu scope, remapped V/Escape, controller Y/A/B, Options audio, inspector/drawer transitions, held touch/pan/multitouch/resize, hidden hints, profile/recovery/visibility holds, and deterministic cooldown state parity. Touch, history and storage waits stay real time; only the separate cooldown simulation uses a virtual clock. Persistent profile equality passes in completed cases; failed history cases stop before that assertion as detailed below.

The 33 merged-route cases retain all original assertions: mission Restart cancel/confirm to the same briefing and explicit Begin; campaign/trial failed Retry; held keyboard/controller confirm; Common Ground Skirmish setup and optional Replay through keyboard/controller; queued identical-checkpoint removal and delayed old removal; and Ashen's earned partial-objective save/Back/restart identity. Original restart tests are byte-identical to main. This is focused coverage, not the full browser matrix.

## Retained history failures and bounded comparison

The initial integration phone seeded-reload check timed out awaiting a reconstructed previous marker `:3`, while the actual native destination carried `:2`. The old push-derived observer ledger was not authoritative across reload. That failure stopped at Back readiness: subsequent stale/current-document, pause/unarmed, no-spend/frozen checkpoint, Forward, strict pre-Resume, Resume, fresh-input, profile and opaque-state assertions were unrun. The QA-only repair now selects the destination by actual `window.navigation` entry key/index, then requires a **new** popstate with that key and the complete expected document/entry marker. It retains strict pre-Resume length equality and every downstream assertion. It does not establish a runtime fix.

With that observer, `volley-independent.spec.mjs:129` fails **Expected 4, Received 5** in two bounded cases:

- Phone, seeded reload, service workers **blocked**: first differing observation is current-document sequence 15, Back `popstate`, at 2000.1ms since time origin (previous sequence 14 `after back`, 1981.7ms, length 4).
- Desktop, seeded reload, service workers **allowed and controlling**: first differing observation is sequence 15, Back `popstate`, at 2325.4ms (previous sequence 14 `after back`, 2321.1ms, length 4).

In both, the Navigation API's exposed top-level entry-key list remains the same three entries. Forward reaches the exact baseline full marker/key at length 5. No post-baseline current-document `pushState` is recorded. **CDP `Page.getNavigationHistory` was not captured**; there is no full browser entries/currentIndex comparison. The Navigation API can omit inaccessible entries, so unchanged exposed keys do not establish that no native entry was added. Actual addition and renderer history-length catch-up remain unproven hypotheses. These facts are observations, **not an established browser bug, proven runtime regression or proven fixture-only problem**. [Exact findings](mobile-volley-integration/history-findings.json) retain full identities/times, the first divergent records, and frame-observation metadata. All received native traces are attached in `finally`, including failures: [blocked-worker traces](mobile-volley-integration/history-native-keys-traces.json.gz), [worker-controlled traces](mobile-volley-integration/worker-enabled-traces.json.gz), and [initial observer failure](mobile-volley-integration/independent-initial-traces.json.gz).

The retained Playwright snapshots show only the main frame (136 phone / 146 desktop snapshots), with no iframe element or child-frame navigation observed. There was no dedicated continuous frame-attach/navigation observer. There is also an old-document capture gap: the reloaded document begins with previous marker `:4`, while delivered old-document records end at `:3`. Exposed-binding delivery across document destruction may omit the tail; the underlying cause is not established. Full Playwright bundles remain locally under `/tmp/volley-integration-playwright-traces/`; compact native traces, frame metadata, exact failures and screenshots are committed without duplicate runtime bundles.

Before each strict failure, assertions passed for arm without Build, unchanged arming history length, actual Back and Forward identities, paused/unarmed state, no spend/cooldown, a frozen checkpoint across a real 180ms interval, and the same checkpoint after Forward. **Unrun after the failure:** the separate explicit baseline-state equality, Resume, post-Resume length, fresh field input/no-spend, persistent-profile equality, and final opaque-state assertion. The traversal observer had already checked full marker equality. No failures or downstream checks were suppressed.

In the native-key candidate slice, both fresh-document cases passed 5→5→5 through baseline/pre-Resume/Resume, two repeated navigation cycles, and finite Back exit in three steps. Desktop reload passed 4→4→5. The exact-main blocked-worker controls used the identical observer/readiness: phone passed 4→4→5 and desktop 5→5→6. Base uses native KeyR because its mobile Volley is hidden; candidate uses the visible action. Base retains targeting and subsequently casts; candidate disarms. [Base traces](mobile-volley-integration/merged-base-control-traces.json.gz) are separate. The worker-enabled phone reload passed 4→4→5. These single bounded controls neither reproduce nor explain the failing candidate observations.

No history case was repeatedly rerun until green. No runtime history change was made in response. The earlier historical pre-Resume 4→5 cause remains unexplained; the new traces do not retroactively establish its cause.

## Limits and handoff

Worker coverage uses the unchanged shipped worker, explicitly registered on secure loopback because the app skips localhost registration. Both cases confirm a controlling `/service-worker.js` and `ironroot-v0.18.2` cache. This is ordinary real worker/cache execution, not production-origin installation or upgrade certification. Finite Back exit remains in the blocked-worker fresh-document slice because the shipping worker serves index.html for same-origin navigations; the worker slice uses seeded reload only.

Tests use Chromium 155 / Playwright 1.65 with emulated touch and the existing synthetic gamepad provider. Physical devices/controllers, non-Chromium engines, OS-driven visibility, production smoke and the full broad matrix are unrun. All earlier `mobile-volley-evidence` files remain unchanged from reviewed `28356b`; the inventory in this integration directory supersedes the historical one for this candidate.

Recommendation: review this exact integrated source and the retained failure mechanism independently while **keeping PR14 draft**. The root, geometry, input and merged-route slices provide useful evidence; the strict seeded-reload history check is still a validation blocker. The parent/repository worker owns any later merge and release.
