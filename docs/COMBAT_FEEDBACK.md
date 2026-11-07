# Post-contact combat pose increment

Status: corrected source passed the bounded native synthetic comparison; ordinary gameplay and browser integration remain pending. The initial native comparison rejected removal of the original victim glow because compact normal-motion hit-only and dense mixed/grayscale scenes lost useful hit readability. That removal has been reverted; the corrected compact/dense/grayscale and preference retest passed. Contact/recovery and restrained recoil remain. Not a release or Steam-readiness claim. The immutable starting point is green v0.13.0 candidate3, private commit `76135e7b56077a661f67b0b5eeab7c118ec57844`. Its renderer SHA-256 is `d641e2b2a2ed8403441e98eb6ba5baa7455eb0cfb1795d804b00b73e491fa3aa`.

## Intent and timing

The engine applies damage when `_fire` runs and sets `attack = 0.22`; `_damage` sets the victim's `hit = 0.16`. These durations are observations of existing behavior, not a proposed combat rule. `combat-feedback.js` samples only those remaining timers. Fresh attacks start at contact, then settle monotonically with a bounded smoothstep. There is no anticipation after damage, extra attack event, queued animation, interpolation clock or new state in a save. Incoming hits take pose priority, matching Rootwarden's established treatment. An attack that outlasts the hit continues at its actual remaining timer rather than restarting.

## Artwork changes

- Warrior: the already extended weapon settles into its original rest pose, while its existing shield turns less sharply than the previous binary 0.5-radian attack pose. Maximum sword reach is unchanged.
- Archer: the released bow extends two model units and turns by at most 0.09 radians, then returns. There is no post-damage draw-back or new arrow.
- Siege: only the existing throwing arm finishes forward by at most 0.32 radians and recovers. The firing pose does not translate the wheels or chassis.
- Wizard: the existing staff follows through by at most 0.16 radians around its foot. No new flash, halo or projectile.
- Gryphon: the head extends by 2.5 model units and its talons by two. The existing body, wing silhouettes and flap are retained.
- Incoming hit: existing art leans away by at most 0.05 radians, or 0.025 for siege, around its grounded model position. The original victim glow is retained with its exact baseline condition, color `#fff3c9` and `shadowBlur = 9`. It remains suppressed in battlefield reduced motion and low detail. No new or stronger glow is introduced.
- Rootwarden: unchanged, including every tested action pose and the accepted original art bytes.

All marks and strokes use existing artwork/colors/outlines. No additional filled/stroked shapes or particles are emitted. Unit enlargement remains exactly the existing bounded readability rule. The change introduces no new terrain, camera, minimap, input, collision, attack range, selection, placement, health-bar or mission-badge geometry.

Actual unit coordinates, team markers, both flyer shadows, other shadows and health bars stay outside the new pose transforms. A recoil may alter the artwork's edge slightly; it never changes the ground anchor or hit geometry. Static field-guide portraits and all idle unit commands remain exact. Engine, rulesets, profile/save code, controller, audio and app/CSS are outside this increment.

## Reduced motion and detail settings

Reduced motion holds a single contact or hit pose while that real state is alive. It does not ease, oscillate, add a bob, shake, blur, flash or opacity change. Contact/hit/idle remain distinguishable states. Existing gryphon flap and walk bob remain disabled. Low and high detail use the same essential pose feedback, without adding particles. Normal-motion high detail retains the original victim glow; low detail and reduced motion retain its original suppression.

## Historical evidence and deterministic checks

Historical `renderer-classic-0.8.json`, `renderer-readability-lab.json`, all old manifests and all old validation records are retained. The accepted readability renderer still reproduces its original recorded full-frame hashes. Updated renderer assertions check those historical frames against that immutable source, then check calm current frames against the same source. The deliberately changed hit/attack frames use the separately labelled `tests/fixtures/renderer-combat-feedback.json`; it is a command regression record, not visual approval.

New coverage:

- 504 deterministic unit command snapshots: six roles × two teams × three scales (0.12, 0.32, 1) × two motion modes × seven states. Finite coordinates and balanced transforms are checked.
- Exact Rootwarden command parity against the pinned green v0.13.0 source across all seven states, both teams, both motion modes and all three scales. All other roles retain exact idle commands.
- Monotonic post-contact sampling, hit priority, invalid-input clamping, no dependence on cooldown or a wall clock, and fixed reduced-motion state commands across changing timers and times.
- Conservative silhouette bounds, unchanged shape counts, ground markers/shadows and left-to-right damaged health commands.
- 1,152 explicit victim-glow comparisons against the exact v0.13.0 baseline: all six roles, both teams, three detail values (including omitted/default), both motion modes, four hit ages and battlefield/static contexts. Original color, blur and suppression are asserted directly.
- Actual engine `_fire` damage and attack/hit timer observations for all six roles/both teams on all three maps. Rendering leaves serialized state, full state and RNG unchanged, including six subsequent simulation steps against an unrendered control. Camera/site transforms and minimaps retain parity.
- 540 paired baseline/candidate scene combinations across roster/single/crowd, action/hit/mixed, three recovery samples, five field sizes, two qualities and two motion settings. All states/cameras/scales/minimaps and VFX particles stay equal. Fully settled frames return to exact baseline commands.

Focused command:

```
node --test tests/combat-feedback.test.mjs tests/combat-feedback-preview.test.mjs tests/active-roster-views.test.mjs tests/renderer-maps.test.mjs tests/readability.test.mjs tests/portraits.test.mjs tests/rootwarden-art.test.mjs
```

Observed source checks after restoring the glow:

- Focused command above: 54 tests passed, no failures or skips.
- `npm run check`: all game JavaScript modules parse.
- `npm run check:release`: passed, 43 runtime files with no temporary QA mount.
- Exactly 90 of 504 newly labelled unit snapshots changed: the five legacy roles' normal-motion hit, hit-recovery and overlapping hit/attack commands on both teams at all three scales. Rootwarden, idle/contact/recovery, reduced-motion samples, full-frame command records and all historical files/hashes are unchanged.
- The earlier six objective-alert app-harness failures were resolved by the parent before this repair. This worker has not claimed a new full-suite result for the restored-glow candidate; the parent owns final aggregate validation.

The revised candidate renderer SHA-256 is `fb26e8abede80e760fc3f88eec47d2e63a47b29ba371d15f19f6b9c1dbf41878`; unchanged helper SHA-256 is `6e6a6d7478fc7cb76ee92273101b4e5aa2b2bbf817046d279a79a9cd92f30c96`. The initial candidate hash `7c0fcc874c056f172f88b23ca657fe6c02aaec8ebe1f21330ece1c7d16cac1e4` identifies the version whose glow removal was rejected, not the revised version. These hashes identify comparison sources, not acceptance decisions.

Full integration gates remain `npm test`, `npm run check`, and `npm run check:release` on the final combined source after temporary QA cleanup. Native observations, not command hashes, decide acceptance.

## Native comparison fixture

`qa/combat-feedback/` is developer-only. Its baseline is a copy of the exact tested v0.13.0 candidate3 renderer. For campaign compatibility maintenance, its dependency closure is now independently frozen: three renderer import substitutions select the copied engine, VFX and Rootwarden art; two engine import/re-export occurrences select copied rulesets. The original source hashes remain unchanged, and rulesets are byte-identical to that release. `baseline-manifest.json` records every substitution and source/copy hash. Tests reverse them to recover the exact released bytes and also reconstruct the prior renderer-copy hash. Current runtime engine/rulesets are no longer required to have historical hashes. No runtime or command-snapshot file changed in this maintenance.

The fixture now builds separate historical/current Classic, `frontier-rootwarden-open` revision 1 scenes and rejects differing serialized state/RNG, map/ruleset definitions, UI or camera before drawing. This preserves the six-role comparison while allowing legitimate campaign-only admission changes. It does not validate the new campaign rosters, save admission or combat policy; those need their own integration evidence. This maintenance passed 55 focused renderer/fixture tests and fixture syntax checks; no native browser or full campaign validation was rerun.

No browser, server, asset upload or publication was started by this worker. The parent may copy this directory into a separately coordinated review candidate at `dist/__qa_combat_feedback/`, then open `/__qa_combat_feedback/` on its approved private preview. Never add the fixture to the offline shell. Use a fresh preview origin without an old service worker. Remove only that temporary mount after review and rerun runtime preflight. The frozen baseline is not modified or hosted independently.

Controls:

- Six-role roster; single selected role; or 70 troops per team with nearby objective structures.
- Both teams, allied only, or enemy only.
- Contact/recovery, incoming hit/recoil, overlapping hit/attack, mixed states, or idle parity.
- Samples at 0, 50, 100, 150, 200 and 220 milliseconds after contact, with a “Next recovery frame” button. These are synthetic timer samples, not recorded gameplay.
- Canvas sizes 320×220, 390×302, 844×240, 1180×757 and 534×190. These are field sizes, not claimed physical device viewports.
- Four terrain themes, high/low detail, reduced motion, practice landscape scale and grayscale.

Both renderers receive independent, byte-identical scene inputs with matching camera and settings. There is no simulation ticking, outcome generation, profile/save access or retained progress. Visible status checks state and RNG after each draw. Node tests additionally check minimaps and all recorded commands.

### Acceptance checklist

1. Compare each role at contact, midway recovery and settled states at compact and desktop scales, both sides. Reject a false anticipation impression or loss of a clear weapon/body silhouette.
2. Recheck compact normal-motion hit-only and dense mixed/grayscale scenes with the restored baseline glow. Confirm useful hit readability is retained alongside restrained recoil, without a stronger glow or new motion. Also confirm low detail and reduced motion still suppress it.
3. Compare the 140-troop crowd in ordinary and reduced motion, high and low detail, and grayscale. Reject extra army noise, objective masking or worsened frontmost unit/health/marker reading. No claim is made that rear units become individually readable.
4. Rootwarden, every idle pose, static portraits, shadows and ground markers should remain unchanged. Small practice-scale artwork is still small; there is no new tactical zoom.
5. Separately observe real ordinary combat and pause/resume. The fixture does not prove visual cadence, engine timing perception, frame-time, mobile touch behavior or gameplay feel.

Limits: no pixel/native review, physical-device performance, full campaign run, browser matrix, accessibility certification or subjective audio evaluation is established by these source tests. The pose change can be rejected without discarding the independently implemented objective warnings or the accepted v0.13 baseline.

## Combined PR checkpoint

The corrected integration subsequently passed 882 root tests with one optional desktop-dependency skip, runtime syntax and the strict 43-file inventory. Native correction evidence is in `COMBAT_FEEDBACK_VISUAL_REVIEW.md`; unreleased PR scope and remaining gates are in `FEEDBACK_PR.md`. These supersede earlier intermediate counts without rewriting their history.
