# Battlefield renderer integration and verification

The renderer consumes the engine's immutable registry geometry per instance.
It does not change `WORLD`, `LANES`, unit models or portrait drawing.

## API and integration order

- `new Renderer(canvas, minimap)` begins on Classic with the woodland theme.
- `renderer.setMap(mapOrId = 'classic')` accepts a registered ID or the exact
  descriptor returned as `game.map` / `getMap(id)`. It returns the descriptor.
  Unknown IDs and reconstructed or foreign descriptors throw before changing
  the active map. Arbitrary geometry is not an input format.
- Switching maps retains the active theme, replaces terrain and clamps the
  current camera. Re-selecting the same map does not rebuild terrain.
- On Start, Retry and Resume, call `renderer.setMap(game.map)` before assigning
  and clamping the initial or saved camera. Campaign and trial games stay
  Classic. Existing VFX reset and other battle-start lifecycle work stay in app.
- `renderer.setTheme(theme)` remains independent of map selection. Unsupported
  themes resolve to woodland as before.
- `renderer.snap(point, side = 0)` returns `{x,y}` on the selected map's sites.
  Both build preview and pointer/controller activation must use this method.
  It does not inspect occupancy or find another free site. The chosen site's
  `game.canBuild` result is authoritative.
- Snap midpoint ties preserve the shipped input behavior: later home-distance
  column and higher y row win. Engine `laneFor` has a different lower-index tie
  for free-form legacy coordinates; do not substitute it for input snapping.
- Minimap input must multiply the normalized pointer x by `game.map.width`.
  Home navigation stays at x=450. Front navigation uses `game.state.frontline`.
  Vertical world center remains 450 with no added vertical panning or zoom.

## Artwork and bounded terrain retention

Classic's terrain drawing, random sequence, map coordinates, scene geometry,
minimap symbols and unit portraits are preserved. Long March extends roads and
terrain to 4,000 pixels, moves the river and bridges to its midpoint, and keeps
frontier markers attached to the fixed-depth owned territories. Twin Span draws
exactly two roads and bridges at y=340/560 and offers 16 player-side slots.
New-map minimap citadels use the real base positions; Classic retains its old
fixed-edge citadel symbols exactly.

Terrain identity includes map ID, revision and theme. Only the active map's
woodland base and, when needed, its active themed copy remain retained. Replaced
canvases have width and height reset to zero to release their backing stores.
No map or theme history is retained. Steady logical RGBA storage is at most
28.8 MB for two 4,000-by-900 canvases. Rebuilding has a transient allocation;
actual browser/GPU retention and performance require profiling, not inference
from these dimensions.

## Automated checks

Run `node --test tests/renderer-maps.test.mjs`.

The 13 mocked-canvas tests cover:

- Frozen 0.8 Classic operation hashes for four terrain themes, complete scene
  and minimap frames at 1180x757, 390x650, 320x568, 844x390 and a whole-world
  4000x600 viewport, and all ten type/side unit portraits.
- Exact map dimensions, road/bridge counts, river midpoint, extended road
  endpoints, owned-territory boundary markers/tints and enemy frontier label.
- All viewport camera ends, oversized-view centering and coordinate round trips.
- Original Classic snap math, exact ties and extreme inputs; all new-map sites,
  mirrored coordinates, occupied-slot rejection and shared ghost validation.
- Long March entities beyond x=3200, true right-base minimap projection,
  viewport rectangle, and Twin Span's two minimap rows.
- Current-map/theme cache reuse and bounded retained backing stores after
  repeated switches, plus simultaneous independent renderer instances.
- Citadel theme's real lane rows, extended-width coverage and complete finite,
  balanced drawing operations for every map at all five viewport sizes.

The Classic fixture was recorded from the unchanged 0.8 `dist/render.js`,
SHA-256 `ef5ebcbed466bdd829ab34b12adaddf262d4627d31bd1ddbd4c99dd793701251`.
Its JSON hashes are regression expectations, not screenshots. The original
fixture source and one-time generator remain isolated and are not runtime code.
Do not regenerate expectations from a changed renderer merely to pass a test.

## Remaining browser and device gates

No browser, server, remote repository or deployment was used for this renderer
work. Canvas mocks verify drawing instructions, not browser rasterization,
legibility, filter support, device memory, pointer routing or enjoyment.

Before exposure, validate all three maps at the four target responsive sizes:

1. Start/Retry/Resume and switching back to Classic campaign; same-theme map
   switches must show fresh geometry. Verify Long March's 4,000-pixel world and
   Twin Span's two roads visually, including all chapter themes.
2. Legal and occupied placement, ghost feedback, controller confirm, cancel,
   dragging without purchase, multi-touch, spells, upgrades and salvage.
3. Both minimap ends, Home and Front navigation; the Long March right citadel
   must be reachable. Verify no hidden/phantom Twin Span third row.
4. Pause, resize/rotation, Save & return, reload/Resume, victory/defeat/retry,
   offline update and old/new-map backup lifecycle after app integration.
5. Profile terrain allocation during repeated map/theme switching, frame time
   and a long maximum-unit match. Validate physical iOS Safari and Android
   Chrome separately; mocked canvas tests are not a device pass.

Gameplay balance, full engine parity, save admission and UI routing are separate
workstreams. These renderer checks do not certify those gates or public release.
