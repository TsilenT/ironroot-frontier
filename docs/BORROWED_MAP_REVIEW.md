# Borrowed Ground: bounded independent source review

Reviewed on 2026-11-08. Scope: the authored mission, QA formation and paid policies, progression/profile integration, and existing app/renderer consumers. This is source and Node-harness evidence, not browser, physical-device, human-difficulty, release, or full balance-matrix certification.

## Finding and resolution

The first review reproduced a post-deadline evaluator win: at 600.05 seconds, destroying the enemy citadel still returned `completed: true`. The app's fixed-step objective wrapper already stopped at 600 seconds, so this was an evaluator/recording boundary rather than a demonstrated gameplay overrun.

The mission author added an upper-time guard only for Borrowed Ground. Independent retesting confirmed that both original-roadblock and enemy-citadel victories work at exactly 600 seconds and fail at 600.05. Simultaneous loss of the player's citadel fails at either time. Historical missions retain their earlier evaluator behavior. No remaining blocker was found in the bounded review below.

## Formation, economy and choice

- Production factory bytes match `qa/borrowed-ground/scenario.mjs` exactly for the default seed.
- Player assets cost 1,620 gold: three towers (660), three barracks (420), two archery ranges (350), and one mine (190). Enemy assets cost 1,495: two towers (440), three barracks (420), one archery range (175), one foundry (270), and one mine (190).
- Opening treasuries are 420/160. Both sides begin at 7.5 gold/second, including their real mine. The temporary authoring bank is replaced before play. Policies use ordinary build, upgrade, volley, and sell calls; no runtime resource grants or health edits were found.
- Nine player assets occupy twelve legal plots. The actual empty plots are home x410 on the north and south roads and x690 on the middle road. The inherited towers occupy the front x1250 plots, so replacing one changes deployment position rather than merely raising an arbitrary building limit.
- All nine inherited player buildings were independently sold through ordinary engine actions without failing the mission. The real app's salvage handler also permitted an inherited tower and paid its normal 110-gold full-health refund in the Node DOM harness. No player structure is a protected objective; no salvage action or composition is part of the win condition.
- Enemy roadblock originals are IDs 12 and 13. Player salvage leaves these IDs unchanged. Selling one enemy original and buying a replacement at the same location leaves destruction credit intact and gives the replacement a different ID.

## Independent production sample

These are three fixed policies at seed 6401 only, with at most one ordinary command per five simulated seconds. They are evidence that keeping and selective salvage are both feasible, not a comparative difficulty certification.

| Policy | Result | Time | Player HP | Own sales | Inherited assets remaining | Enemy purchases |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Keep support | Enemy citadel | 401.00 s | 6,000 | 0 | 9 | 29 |
| Keep mass | Both original roadblocks | 289.60 s | 6,000 | 0 | 9 | 17 |
| Selective salvage | Both original roadblocks | 194.45 s | 6,000 | 2 | 7 | 15 |

The selective route refunded 220 gold. The keep-mass route bought only additional barracks/archery and ordinary upgrades, demonstrating that no new siege, wizard, flyer, Rootwarden, or citadel purchase is required for this sampled win. Both-side income, kill bounty, refund and spending conservation checks stayed within the harness's 1e-6 tolerance; reported rounded error was zero. The policies do not inspect seed values or predicted outcomes.

## Integration checks

- The new mission follows Lanterns, resolves to its exact revision-1 authored identity, and uses the already-earned full roster. New overview totals are 23 missions/69 stars, including four Chapter 6 encounters. Prior earned records are preserved rather than rewritten.
- The historical Lanterns descriptor still says it completes the then-current Chapter 6 route. Current launch presentation alone says “Unlocks Borrowed Ground.” The legacy sixteen-mission catalog remains separate.
- The existing app uses the progression catalog for launch, deadlines and result labels. Node DOM startup/HUD checks at 1180×757 and 390×844 selected the correct yard/rules, displayed `0/2 targets`, and created no protected-objective controls or fog state.
- The existing app's fixed-step wrapper supplies the 600-second deadline. Target markers use authored original IDs. The generic briefing fallback accurately uses the new mission objective. The ordinary salvage guard only blocks protected objectives and therefore does not block this camp.
- The existing renderer consumes the registered map's lanes and site columns. Geometry remains 3200×900 with the existing three lane centers, so no new camera, minimap, lane-label, or world-bound assumption is needed. The Skirmish picker still enumerates the unchanged public `MAPS` registry.
- Protocol 16 advances only marker admission and description. Focused profile tests passed for old-writer fencing, exact retained domain bytes, rollback after each domain failure, old backup round trips, and the new checkpoint/history/progress identities. The campaign schema and all five storage keys remain unchanged.

## Verification performed

- Independent formation/factory, salvage/original-ID, deadline/own-loss, and app startup/salvage probes described above.
- Three production policy samples above; no output was written to a profile or remote service.
- `tests/borrowed-ground-profile.test.mjs`: 8 passed.
- `tests/borrowed-mission.test.mjs` and `tests/borrowed-app.test.mjs`: 22 passed after the deadline fix.

Browser rendering, physical touch/controller behavior, and human balancing remain outside this review. The Node DOM/canvas harness does not prove native layout or playability.

## Final fixture-change review

Compared both affected tests with the unchanged UI-integration and Lanterns source trees. The diffs contain exactly three fixture adjustments and remove no assertions:

- The non-flight rejection loop now constructs the new Borrowed ruleset on its required Borrowed Yard map. Every historical ruleset still uses its previous constructor arguments. Borrowed remains included in the same `setFlightPlan` rejection and unchanged-state assertions, rather than being skipped.
- The historical pre-Lanterns ruleset hash excludes the newly added Borrowed entry as well as Lanterns. The expected SHA-256 is unchanged. A separate Node equality check confirmed that removing only Borrowed from the current registry produces the exact baseline registry; the new map-identity suite also pins that complete v0.24.1 registry.
- The pre-Lanterns earned-progress fixture excludes Borrowed because its prerequisite Lanterns is intentionally unfinished. A separate Node equality check confirmed the repaired fixture is byte-equivalent under JSON serialization to the baseline fixture and is preserved unchanged by current normalization. All backup, identity-rejection, round-trip and no-storage-access assertions remain intact.

These repairs restore historical fixture scope without broadening runtime admission or weakening the tested invariants. No additional aggregate run was started for this review; the final aggregate remains the coordinating validation pass's responsibility.
