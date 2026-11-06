# Battlefield readability increment: isolated visual lab

Status: source-only candidate, not published or Steam-ready. This is an increment to original 2D Canvas models, not a 3D conversion. Frozen 0.12 and the AI lab are not modified. No engine, input/controller, practice-session, profile, save, audio, fonts, service-worker cache or release-version changes are part of this increment.

## Implemented

- Small battlefield scales enlarge unit artwork around its actual ground position: `clamp(0.55 / scale, 1, 1.65)`. A roughly 34-world-unit infantry silhouette becomes 17.952 CSS pixels tall at scale 0.32, versus 10.88 before. Scale means CSS pixels per world unit, independent of device-pixel ratio. This never changes collision, range, movement, hit testing, site snapping or camera geometry.
- Principal body/helmet/hat/wing/shield/frame shapes receive a dark outline, approximately 0.8 CSS pixels outside their fill. Existing model details and team colors remain.
- Ground markers add redundant team shape: allied ellipse, enemy diamond, with dark separation and a bright 1.25 CSS pixel inner stroke. Markers remain grounded even under flyers.
- Damaged units have at least 18 CSS pixel full health-bar width and 2.5 pixel fill height. Health grows left to right on both teams, outside the model's enemy-facing transform. Other health bars have a 2 pixel height floor. Backgrounds are stronger and the bar border has a 0.75 pixel floor.
- At scales below 0.65, a gradual neutral dark terrain wash reaches at most 18% opacity at scale 0.32. The cached terrain, roads, build-site geometry and themes are unchanged. At larger scales there is no wash.
- Impacts and particles render below the troops and buildings. Small-scale or low-quality rendering omits decorative dust, leaves and wisp halos, while retaining essential impact shapes/projectiles. Emission, particle lifecycle/RNG and the existing 200/80 particle budgets are unchanged.
- Mission badges render after troops/projectiles, with an outline and bounded 2× enlargement toward 10 CSS pixels. Build-site outlines have a 1 pixel floor, valid-site crosses span at least 7 pixels, and the placement ghost outline has a 2 pixel floor. Site areas remain exactly 110×110 world units.
- Frontier/citadel labels have a 10 CSS pixel font floor. This does not alter DOM copy or controls.
- Reduced motion holds base-effect geometry stationary while it fades, in addition to the existing stationary particles/no shake. Low quality uses seven rather than eighteen decorative volley streaks. Reduced-motion and low-quality battlefield hits do not add the blur halo.

## Deliberate limits

- No tactical zoom or collapsed command deck. The current camera and input are horizontal-only; practice has a separate landscape fit. Safe zoom needs inverse pointer/controller transforms, vertical bounds, minimap representation, focus handling and gesture testing together. Artwork enlargement is not described as tactical zoom.
- At practice's smallest permitted 0.12 world scale, a capped 1.65× model is still small. There is no claim this solves every phone layout.
- Dense armies still overlap. Bigger models and fixed-pixel health bars may trade individual separation for overall visibility. Native comparison must reject the change if it worsens crowd reading, markers or nearby buildings.
- No new attack anticipation/recoil was introduced. It should be reviewed separately, preserving engine timing and reduced motion.
- No new persistent preference, save migration, external asset/service or licensing decision.
- Ten-point/Steam-release quality is not established by these changes or by command-level tests.

## Regression coverage

`tests/readability.test.mjs` checks continuous bounded enlargement, real transformed health-bar direction and dimensions for all five units/both teams, non-color marker geometry, engine/state/RNG parity, map transforms/placement, effect/entity/mission-badge draw order, immutable terrain, text floors, particle draw suppression without state mutation, reduced motion and exact placement bounds.

`tests/readability-fixture.test.mjs` verifies baseline provenance, exact runtime scope, deterministic capped scenes, both renderers' identical input state/camera/effect particles/minimaps and balanced finite drawing across five field sizes, high/low quality and reduced motion on/off. These are canvas-command checks, not pixel review or device performance evidence.

The historical `renderer-classic-0.8.json`, `BASELINE_0_11.json`, `BASELINE_V012_FROZEN.json` and previous validation records are not rewritten. The Classic regression still requires their original terrain, portraits, camera and minimap command hashes. Only main battlefield frame hashes now use a separately labelled `renderer-readability-lab.json`. The historical practice integration hash guard now excludes the deliberately changed renderer while continuing to pin app input, simulation, reports and every profile/save subsystem.

Run from this isolated lab:

```
npm test
npm run check
npm run check:release
```

## Synthetic native comparison fixture

`qa/readability/` is developer-only and is never in the offline shell. `index.html` clearly labels the poses as synthetic, not played outcomes. There is no simulation ticking, profile/save access or outcome generation. Controls select:

- Five unit classes on both teams, with static partial health.
- 140 units at the real 70-per-team cap, six bounded effects, four projectiles and protected/enemy objective markers.
- A legal build ghost and an occupied/invalid build ghost with the real `game.canBuild` checks.
- Exact physical **canvas** sizes 320×220, 390×302, 844×240, 1180×757 and 534×190. These are field-size stress presets, not claims about exact device viewport layouts.
- Themes, quality, effect age, reduced motion, practice landscape scale and grayscale.

The baseline renderer is pinned to private commit `181c859e8c47a2497e190ee39874ff3fedda4b98`. Full hashes are in `qa/readability/baseline-manifest.json`. `baseline-vfx.js` is byte-identical. The copied renderer has precisely two import-only substitutions, reversible and tested:

1. `from './vfx.js'` → `from './baseline-vfx.js'`
2. `from './engine.js'` → `from '../engine.js'`

Both renderer versions use the same unchanged candidate engine, shared synthetic state, CSS size, camera, theme, particle-step sequence, quality and motion flag. Their terrain generation and model implementations otherwise remain their own. The fixture checks engine-state bytes and camera/scale equality after each redraw. It does not use either app's input handlers.

### Parent-coordinated temporary mount only

No browser or server was started by the implementer. After separate preview coordination, copy `qa/readability/` to `dist/__qa_readability/` **only in this lab candidate** and open `/__qa_readability/` through the approved private preview. Use a fresh preview origin without an older registered service worker, otherwise that worker may substitute its cached index or scripts. Do not replace the normal index and do not add these files to the service worker.

After review, remove only that temporary `dist/__qa_readability/` directory and run strict runtime preflight again. Preflight is expected to reject the extra directory while mounted. Final runtime validation must happen after removal. Neither baseline source nor the frozen candidate needs to be hosted or changed. The parent owns mounting, browser review, cleanup and any hosting decision.

### Native review checklist

1. Compare roster baseline/candidate at compact, landscape and desktop field sizes. Inspect the five roles, outline weight, team distinction in grayscale, damaged health direction and clipping.
2. Compare dense scenes at all four terrain themes, high/low quality, reduced motion and three effect ages. Reject masks over objectives/buildings or unreadable health bands. This is a worst-case synthetic crowd, not performance certification.
3. Compare valid/occupied build ghosts. Confirm the outlined geometry matches the same site and legality in both versions.
4. Separately use normal gameplay at 320×568, 390×650, 844×390 and desktop: tap placement, drag without building, cancel/held gestures, camera/minimap, keyboard/controller paths where supported, objective selection and pause/preferences.
5. Separately use actual practice pages at portrait and landscape, including site buttons, unit observation, scrolling, reduced motion and return-to-game persistence.
6. Reopen field-guide portraits. Their canvas commands remain baseline-identical, but normal app presentation still needs a visual check.

The native reviewer should record screenshots, actual viewport and canvas sizes, source manifest/hash and remaining blockers. Physical phone performance, controller hardware and subjective music listening remain separate release gates.
