# Isolated 0.10 candidate: The Open Frontier

This checkout is isolated from the frozen 0.9 source and the public site. It is not a release announcement or a claim of production readiness.

## Implemented increment

- A fifth campaign chapter continues after Ironroot with four authored missions: Open Horizon, The River Charter, The Far Beacons and Common Ground. The chapter branches and converges across Long March and Twin Span, bringing the campaign to 16 missions and 48 optional stars.
- Missions combine protected deployments with assault, income, survival and citadel-health requirements. Initial formations, upgrade levels and adaptive enemy behavior are disclosed in the briefings. Combat, unit prices, normal income and skirmish AI have not been changed.
- The mission briefing includes an optional scouting report: actual map geometry, deployment counts and levels, lane-by-lane summaries and distinct protection/destruction markers. It is a static overview, not a battle prediction.
- Existing 12-mission progress is additive. Original campaign factories and simulation are checked against a hash-pinned pre-expansion oracle; the new chapter unlocks after the original finale.
- Campaign saves and portable backups require the mission's declared battlefield. New-map history records carry their map identity. Old portable formats and byte-shape goldens remain compatible.
- The new app explicitly opts into profile marker protocol 2. Verified ready legacy markers migrate without changing game data. Older open clients reject the new marker, preventing ordinary stale writes from dropping mission IDs they do not know. Failed/uncertain migrations block writes rather than silently adopting a changed profile.

## Verification status

The current dependency-free test run passes **446 tests**, with zero failures and one optional desktop-tooling skip (447 discovered). Runtime syntax checks pass. Integration and review are ongoing. Focused Resume tests admit all four unlocked expansion missions only on their declared maps, name the actual saved mission/trial, and preserve rejected bytes. Scouting tests compare all 132 starting buildings across all 16 actual mission factories against aggregate, road and SVG level labels. UI-function regressions verify whole-number health displays without changing simulation state and horizontal-only active-chapter navigation.

Authored campaign audit: 192/192 reference clears and 192/192 three-star mastery clears over 12 seeds across all 16 missions, including periodic strict restores. Independent review: 112 main executions plus four follow-ups, with honest policy failures and exact income accounting. In that main independent set the first three new missions cleared 60/60 counter-policy variants, while Common Ground cleared 12/20; these are not human win rates. See the full review for early-citadel shortcuts, income payback and weakly differentiated optional medals. Complete compressed traces and their hashes are retained in `qa/campaign-evidence/`.

The bounded native UI review opened all 16 scouting reports and checked desktop, 320/390 portrait and 844 landscape. Two Open Horizon openings failed before a third forward-tower opening won at 3:55 with two stars and 87% citadel health; a late external hint is disclosed in the review. One River Charter opening failed. Save/resume, branching and original-profile restoration were verified. These are practical usability observations, not a player study. That review prompted clearer opening guidance, saved-mission names, rounded HP text and active-chapter scrolling. Those four changes passed targeted native retests. Confirmation toasts now sit below the actual objective HUD height. The final native check passed at desktop, 320 and 844 layouts, and the original five save domains were restored with visible byte verification. No temporary QA fixtures remain in dist.

The separate primary-route audit executed 48 policy/seed scenarios and three exact uninterrupted controls. A rear-aerie economy route reaches River Charter’s actual 210s income checkpoint in all six tested scenarios; delayed-offense Far Beacons routes meet the actual hold with the enemy citadel still alive. Failed defense/economy policies and a faster alternate-core win remain in the report rather than being relabeled as primary success. See `CAMPAIGN_PRIMARY_ROUTES.md` and retained complete traces.

Full four-profile browser execution has not run on this candidate. The harness includes expansion progression, scouting, version migration and actual old-client write fencing. Syntax, fixtures and discovery are separate evidence from browser execution; consult `CAMPAIGN_EXPANSION_BROWSER_QA.md` for exact counts and the pinned runner.

The separately confirmed held-touch-to-result-action leak has a corrected input-scope guard integrated here. Its 21 focused state-machine tests pass, including immediate fresh input and bounded interruption history. The real four-profile regression is inherited from the dedicated fix and still requires exact-commit cloud execution.

## Limits

- LocalStorage is optimistic, not an atomic multi-tab database. Explicitly confirmed recovery in an old app can replace an incompatible profile marker; the protocol guard is not a security boundary against user-directed storage changes.
- Existing Long March Hard fast scripted rush weakness remains documented. Rejected AI prototypes have not been included.
- No new 3D models, unit classes, terrain collision/pathfinding, PvP, backend or Steam integration are implied by this campaign expansion.
- Physical phones/controllers, non-Chromium rendering, subjective audio listening and native packaged gameplay remain unverified.
- Do not publish this checkout until the corrected exact-commit browser gate, campaign balance review and responsive interaction review pass.

## Source and release boundary

All changes here are local in the isolated 0.10 checkout. The last verified public game remains 0.7. Corrected 0.8/0.9 candidate commit/ref operations were denied pending user-authored approval and are stopped; this checkout must not be used as an alternate transfer/publication route. No Steam-ready, physical-device, native package or multiplayer claim is made.

## Local artifact hygiene

`npm run check:release` verifies that source `dist` contains exactly the precached files plus the service worker, rejects stray QA/patch artifacts and symlinks, checks all relative module imports are cached, and emits SHA-256 hashes. The final local runtime has 26 files; an unused patch backup was removed rather than included in the candidate. This source-dist check does not upload anything or authorize publication. The reusable explicit profile safeguard is retained privately under `qa/manual/`, not in the runtime.

Local test logs and exact runtime hashes are under `qa/local-validation/`. Browser fixtures and traces remain separately labeled; the full four-profile execution is still pending.
