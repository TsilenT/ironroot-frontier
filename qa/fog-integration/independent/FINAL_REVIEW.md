# Independent review: optional fog prototype

## Verdict

No unresolved information-boundary or engine blocker was found in the reviewed final source and bounded executable checks. The prototype is suitable for its next isolated native playtest, subject to the separate native-browser acceptance pass. This is not release approval, a balance/fairness claim, a physical-device result, or a complete proof against all possible information channels.

The reviewed source hashes are in `reviewed-source-sha256.txt`. Main app/profile routes are explicitly fenced from the QA-only fog identity. The production manifest/service worker remains intentionally unprepared; do not deploy this tree as the live app.

## Findings caught and resolved

1. **AI citadel purchases blocked by unknown enemy HP.** The first candidate passed a partial observation to the old purchase helper, which interpreted `null <= 0` as a destroyed base. Both Extra Arrow and Regeneration failed. The fix separates authoritative purchase eligibility from observation-only strategy. Independently rechecked both choices for both sides, with the opposite base still unknown: all four purchases succeed and charge exactly 190 gold.
2. **Normal save admission could reach an unsanitized app.** The first candidate registered fog in the shared rules registry but normal codec admission accepted its saves. The final rule is `qaOnly`, and the normal identity boundary rejects it with `qa-only-ruleset`. Independently verified encode/decode rejection while direct lab `Game.restore` still round-trips exactly. Core worker also added storage/backup no-mutation coverage.
3. **Hidden traffic could evict visible effects at the shared event cap.** The final fog path uses independent 128-event audience budgets, bounded to 256 events in union. Independently injected 600 hidden effects for either side: the other observation stayed identical. For side 0, field/minimap draw transcripts and audio inputs also stayed identical. Restore rejects zero-audience events, one-side overflow and nonempty fog projectile arrays.
4. **Fog-off event audio/VFX disappeared.** Detached full-information observations initially had no event IDs, so the adapters skipped them. Both fog-off and terminal branches now project stable presentation-session IDs. Independently rechecked nonzero battle sounds and VFX emission in the default-off shell.
5. **Release displacement could spend an order without a move event.** `PointerGuard.up` now considers final coordinates. Independent release-displacement, cancellation, epoch invalidation and multitouch tests pass.
6. **Background interruption during a dialog could resume unexpectedly.** The shell now records a durable paused state when blur/hidden occurs with a modal open. Source inspection confirms closing that modal cannot restore its earlier running state. Native interaction verification remains the UI worker's responsibility.
7. **Last-seen citadel choice was not presented.** The hidden marker now displays only the frozen choice labelled LAST SEEN, retaining unknown HP and no private regeneration/shot timers or counters.
8. **New parity test depended on a sibling checkout.** The core worker replaced that import with six self-contained, hash-pinned release modules under `tests/fixtures/fog-baseline/`. Source metadata identifies the supplied v0.20.2 commit/tree.

## Independent executable coverage

- Both-side hidden-state differential across enemy construction/type/HP/progress, units, economy and citadel records: equal complete observations before physical interaction.
- Detached observation mutation cannot alter simulation; repeated reads preserve serialized state and RNG. No action/serialize methods are exposed.
- Last-seen building remains frozen through hidden upgrade, sale and replacement; re-observation clears stale identity and reports the replacement.
- Hidden-at-birth events do not replay on later sight; retained visible event IDs are stable across reads.
- Hidden Volley center rejects without state mutation. Visible-edge splash can award the documented own kill reward without emitting hidden victim coordinates.
- Both sides' memories restore exactly and continue identically for 80 fixed steps.
- Eleven malformed-memory variants reject without mutating submitted data, followed by three additional final event/projection admission cases.
- Twelve paired AI decision scenarios, covering both sides, all difficulties and two strategic times: same build/upgrade/cast/citadel journal, own spending and RNG despite hidden opposition changes.
- All 23 published ruleset definitions exactly match the supplied release.
- Nine predecessor cohorts with 5,400 paired updates preserved action/state/RNG/restore parity. After final hardening, two more current/citadel-bridge cohorts with 2,400 paired fixed steps also matched exactly.
- Final fog ranged damage produces a visible target-contact hit cue and retains no projectile source/target endpoint records.
- Independent event-saturation field/minimap comparison used the repository's finite-coordinate canvas recorder, not a real browser.

The first core pass intentionally recorded two failing citadel cases. Those failures were independently rechecked after correction; the earlier failure log is retained as evidence, not an unresolved status. One AI differential fixture initially generated a visible spawn effect before moving a synthetic enemy into hiding. That fixture was corrected to spawn in hidden territory; this was not an implementation bug.

## Architecture review

The side observation is a whitelist of detached state plus immutable definitions, without raw engine callbacks. The renderer's building validator closes over that sanitized state only. Enemy target locks and producer progress are omitted/neutralized; hidden base HP/resources/statistics are null. Structure memory contains only stable identity/type/side/position/lane/level/time. Current contacts, minimap, HUD/accessibility state, Front and audio all consume the same observation.

One pre-combat contact snapshot is shared for both sides. Queued damage and simultaneous movement remain intact. Post-resolution memory refresh and AI observation happen after movement/damage; direct paid commands refresh both sides. Automatic flyer acquisition/retention stays 300/420 with the old road/target restrictions. The normal old-rule path retains its semantics and exact tested RNG behavior.

Effects require creation-time and current sight. The VFX adapter deduplicates stable IDs, removes particles whose source/current position loses sight and disables fog shake. Projectiles are intentionally suppressed and replaced with generic visible hit cues. This is a disclosed presentation limitation, not a claim that the full-information visual experience is unchanged.

## Remaining gates and limitations

- I performed no browser/computer actions, implementation edits, external writes, uploads or publication. Only local report files were written.
- Native checks at 320x430, 390x650, 844x390 and desktop are still required: readable unknown-base/memory glyphs, full action visibility, minimap behavior, build/Volley/selection flows, actual blur/modal interruption, reduced motion, low quality and maximum-army behavior. The UI worker is handling these; source and canvas-recorder checks do not substitute for them.
- I did not repeat the aggregate suite or release preflight. The parent/core workers own that final integration result, including additive enumeration updates without weakening existing-rule assertions.
- Own rewards, damage, resources and terminal outcomes deliberately allow coarse inference after physical interaction. Local authoritative saves are not anti-cheat protection. Session event IDs reset on restore; deterministic continuation refers to simulation/memory, not equality of those opaque presentation tokens.
- Future campaign, bridge, timed, profile/save UI and production-offline integration are outside this slice. No supported path silently changes those modes.

## Evidence files

- `INITIAL_REVIEW.md`
- `independent-core-pass1.txt`
- `citadel-fix-recheck.txt`
- `independent-parity-ai.txt`
- `independent-ai-differential.txt`
- `independent-ui-boundaries-pass1.txt`
- `independent-isolation-events.txt`
- `final-boundary-rechecks.txt`
- `reviewed-source-sha256.txt`

## Native verification update from the parent

The parent reports that the native desktop lab loaded, a paid build completed, unknown enemy HP remained hidden, and pause was verified. Desktop checks/evidence were still being finalized when this update was received; this reviewer did not execute those browser actions.

**Native mobile verification is BLOCKED / UNRUN.** During responsive emulation the browser returned the explicit organization denial `DevTools not allowed on this page`. The UI worker stopped, and no alternative emulation route was authorized. The 320x430, 390x650 and 844x390 native visual/interaction gates therefore remain open. Canvas/source tests are not substitutes. Do not describe this prototype as mobile-verified or ready for wider playtesting without disclosing this gap.

## Bounded crowded-state CPU sanity check

At the parent's request, ran one synthetic Node benchmark without changing runtime. Environment: Linux x64, Node v24.22.1, AMD EPYC 9V74; the container reported 9 logical CPUs. The measured pass took 1.672 seconds. Each mode began with the native maximum 140 troops and 48 structures plus 256 effects, using a dense mixed-unit encounter. Five warmed samples measured observation, fixed steps and effect ingestion separately; restoring a fresh snapshot was outside the timed region. AI and paid economy were excluded.

Median per-operation times:

- Fog observation: 0.340 ms. Released no-fog observation adapter: 0.470 ms.
- Fog fixed step: 2.295 ms. Released no-fog fixed step: 0.745 ms, about 3.1 times less CPU per step in this fixture.
- Fog effect ingestion: 0.0187 ms. Released no-fog effect ingestion: 0.00044 ms. A batch of 1,000 fog events took 18.692 ms at the median.

No obvious unbounded event-scan blow-up appeared, but fog's measured step overhead is material. This is a coarse CPU sanity result, not an optimization claim. The modes project different amounts of public data, so the lower fog observation time is not an equal-output speed comparison. Each 20-step combat sample spans one simulated second; casualties reduced both armies from 140 to 108 total troops. This is therefore not a sustained 140-troop worst case, a browser render measurement, a fast-speed assurance, a mobile FPS result or a balance test. Native mobile remains blocked as described above. Full initial/final counts and all samples: `node-performance-sanity.json`.

## Final desktop evidence review

Read the UI worker's finalized `../ironroot-fog-prototype/reports/NATIVE_SHELL_QA.md` and independently viewed the two final desktop screenshots plus the earlier hidden-Volley/forward-combat captures. The final 1180x757 screenshots visibly show the fog-on identity, unknown enemy HP, ordinary gold, complete controls/minimap, an explicit Paused/Resume state and a newly placed forward barracks. The earlier captures visibly show rejection of a hidden Volley center, the unknown-health enemy citadel marker, and visible local combat. Those earlier captures are clearly labelled as pre-final panel-close handling in the native report; they are not evidence of the final interruption behavior.

The UI worker's native checks exposed another interruption/close sequence that could resume despite the earlier blur handler. Final code now keeps every ordinary panel Close/Cancel paused; only explicit building selection can request a resume, and a previously paused/interrupted state still wins. I inspected that final source. The final native report records repeated Help-close, setup Cancel and build Cancel checks requiring Resume, plus a deliberate building choice and paid placement. I did not reproduce those interactions myself; the screenshots corroborate the visible final state rather than proving the full sequence.

Independently hashed the current 20 staged runtime/assets files and matched every source hash to the native staging manifest. Refreshed `reviewed-source-sha256.txt` to include the final shell hash `b94d1c9913791bb7bdefaebadedac7ccd5500f4ffd15b7a7e6aace12a4edb0aa`.

**Final disposition:** desktop feasibility smoke and bounded source/model checks pass within their stated scope. Native mobile/short-landscape remains BLOCKED/unrun. A full paid match, live structure-memory transition, sustained maximum-army browser behavior, physical touch/gamepad, audio listening quality and balance remain unverified. The preview was stopped and the lab left paused; nothing was published. No further source change is requested from this review.
