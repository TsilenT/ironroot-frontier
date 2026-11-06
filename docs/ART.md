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

Barlow Condensed and DM Sans are bundled locally as WOFF2 files under the SIL Open Font License 1.1. The full notices are in `dist/FONTS-NOTICES.txt` and linked from Preferences. The UI makes no Google Fonts request; desktop/offline play can use the bundled fonts, with system fallbacks for unavailable glyphs. Earlier reviews that observed remote fonts describe historical builds, not this candidate.
