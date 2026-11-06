# Original visual assets

All battlefield art is drawn from original Canvas2D/SVG shapes in render.js, icon.svg and vfx.js. No third-party game sprites, character likenesses, downloaded textures or asset packs are used.

## Models and silhouettes

- Warriors: helmets, team-colored tunics, shield/cross and sword.
- Archers: hood, bow and visible arrow projectiles.
- Siege engines: wooden frame, wheels, throwing arm and arcing ammunition.
- Wizards: pointed hat, robe, staff/orb, violet bolts and ground splash.
- Gryphons: broad animated wings, hooked beak, airborne body and grounded shadow.
- Seven original buildings repeat the associated unit/economy silhouette.
- Citadels: crenellated towers, gates, team flags and defensive bolts.

These are original 2D vector/canvas models, not 3D meshes.

## Campaign environment themes

The same physical three-lane battlefield supports four visual treatments: woodland, snowy highland, ashlands and stone-paved citadel approaches. Themes alter appearance only. They do not secretly change movement, range, income or combat geometry. Terrain is prepared on a separate canvas once per theme transition; at most the base and active terrain canvases are retained.

The UI requests Barlow Condensed and DM Sans through Google Fonts with system fallbacks. Font files are not redistributed in the current package; desktop/offline play uses fallback fonts when network access is blocked. A fully self-contained licensed font bundle remains a polish task.
