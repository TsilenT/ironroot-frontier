# Battle VFX

Original procedural Canvas2D effects, no assets, dependencies, DOM or gameplay writes. `BattleVFX` owns an independent seeded cosmetic PRNG and a WeakSet of observed engine effect identities. Never clone effects before handing them in: stable object identity is how one burst is emitted per event.

## Integration

1. Import `BattleVFX` from `./vfx.js` in `render.js` and construct `this.vfx = new BattleVFX({reducedMotion: this.reducedMotion})` after reading the media query.
2. At the start of `Renderer.draw(game, ui, dt)`, call `this.vfx.update(game.state.effects, dt, {paused: !!ui.paused})`. If the app does not put pause state on `ui`, pass its actual pause state explicitly. Update once per rendered frame, using seconds, not once per entity or fixed simulation step.
3. After drawing entities/projectiles and the existing effect rings, but before restoring the world transform, call `this.vfx.draw(c)`. Existing rings can remain for targeting clarity. Optional `draw(c, {x, y, width, height})` culls particles against a world-space viewport.
4. Optional shake: `const shake = this.vfx.getShake()`; add `shake.x` and `shake.y` to the renderer's **screen-space** center translation before world scale. Do not alter camera position, hit testing, minimap or UI transforms. Shake is at most two CSS pixels per axis. Omit this step if screen shake is not wanted.
5. Call `renderer.vfx.reset()` on new battles, retry, restored save load, campaign transitions and returning to the title screen. Pausing must not reset the effect pool.
6. On reduced-motion preference change call `setPreferences({reducedMotion: value})`. Low quality is `setPreferences({quality: 'low'})`; high quality is `'high'`. Preferences merge, so supplying one keeps the other. Existing particles stop moving immediately when reduced motion is enabled, and only fade thereafter.
7. If the service worker precaches module paths, include `/vfx.js` (using the site's existing path convention) and bump its cache version. Add `node --check dist/vfx.js` to the check script if desired.

## Visual language

Construction uses quiet earthy dust and teal/red pennants; upgrades lift gold diamond glints; salvage dissolves into dust and coins. Spawn uses low teal/red motes. Hits flash short pale-gold shield sparks. Siege adds heavy chips and embers; structure deaths (radius greater than 30) use a richer rubble burst. Magic uses violet ribbons and diamonds. Volley adds distributed arrow-impact sparks and wood chips across its supplied radius. These are cosmetic events, not damage indicators or independent attack resolution.

## Budgets and accessibility

High quality: 200 total particles, including at most 30 rubble chips. Low quality: 80 total, including at most 12 rubble. Bursts drop excess particles without growing queues. Lifetime is bounded; no particle textures or offscreen surfaces are allocated. Invalid coordinates and unknown event types are ignored. Optional view culling happens at draw time only so cosmetic state is camera-independent.

`update` clamps finite positive delta to 0.1 seconds; negative/nonfinite delta is treated as zero. Zero delta may ingest new effects but never advances existing ones. Pause returns without ingesting or aging effects; unseen effects still present on resume emit then. Large tab-resume deltas therefore do not teleport particles. Reduced motion disables shake, velocity, gravity, rotation and size animation; particles use static marks with smooth fades. There are no full-screen flashes.

`getStats()` returns a new summary object: current particles/rubble, limits, cumulative accepted particle spawns, accepted effect count and preferences. `reset()` clears both identity history and diagnostic counters and restores the cosmetic seed. No global `Math.random()` calls are made.

## Verification

Run `node --test tests/vfx.test.mjs` and `node --check dist/vfx.js`. Tests use a DOM-free Canvas2D proxy and cover all families, finite draw operations, engine immutability, effect deduplication, long stress caps, zero/invalid delta, pause, reduced motion, preference changes, deterministic reset and viewport culling. These tests do not replace integrated browser visual review at phone and desktop sizes.
