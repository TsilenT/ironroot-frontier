# Immediate projectile contact prototype

Base: rewritten public main `238a22c73d36d8ee0f24b3e564272fe15a96ebab` (runtime v0.40.7). Candidate identity: v0.40.8. This is a reviewable visual prototype, not a deployment claim. It starts from the rewritten history; no old branch ancestry is merged.

## What changes

The engine resolves ranged HP, hit reaction, splash and lethal removal in the same fixed step that launches the cosmetic projectile. Its old arrow/orb/stone then travelled for 0.28 simulation seconds, suggesting contact after the actual damage.

The renderer now draws the existing projectile glyph at its recorded target point from the first observed damage frame. Arrow tips end at that point. Source/target flight flags retain their existing endpoint heights and inform the short direction cue. Marks stay at the authored contact location and fade monotonically over the existing remaining lifetime; there is no second arrival. An early directional after-image is at most 40 world units long and appears only in normal motion/high detail. Low detail retains the contact mark. Reduced motion holds a static mark with no streak or opacity animation.

Archer, tower, siege, wizard and gryphon glyphs keep their existing shapes and palette. The extra citadel arrow retains its second chevron. No new particles, impact events, damage popups, shake, audio or target tracking are introduced. The only runtime behavior change is in `render.js`; release/cache metadata is advanced separately.

## Simulation and visibility boundaries

Combat, balance, RNG, targeting, prices, rewards, save encoding and profile protocol are unchanged. Projectiles still keep their exact engine fields, positions and lifetimes; drawing reads those values without changing them. The existing damage/death/splash effects and firing sounds retain their timing.

The marker uses the shot's recorded target snapshot, not a guessed association with a live unit. It can therefore remain visible after a lethal target disappears, and it does not chase a moving survivor. A target can move within the engine's same fixed-step movement/damage resolution; the immutable shot anchor preserves the existing recorded coordinate. Fog continues to emit immediate visible hit effects and retains no projectiles. The renderer acquires no hidden coordinates or entity IDs.

Pause holds the mark and fade at the current simulation instant. Restoring a partly expired projectile retains its remaining fade; it does not restart a launch effect. A zero-life stored cosmetic draws nothing, including in reduced motion. Very low frame rates cannot retroactively show a frame that was never rendered. Lifetime is simulation time, including the existing terminal-state freeze, rather than a new wall-clock timer.

## Tradeoffs for review

- This chooses an instantaneous strike/after-image visual language for existing instant damage. It removes the misleading later arrival, but sacrifices the long bow/orb flight and arcing siege-stone silhouette. The siege arm's existing firing pose and immediate splash remain.
- The brief, short streak communicates direction without a full-screen beam. Concentrated volleys can still overlap at the frontline; crowded-battle visual review is needed before calling the effect polished.
- True travel-time damage remains a separate combat change. It would alter simultaneous kills, target death/retargeting, moving targets, splash, income, outcomes and saved pending attacks. This prototype does not make those changes.
- The art is consistent with immediate HP loss, but perceived feel is a human judgment. Native browser evidence and deterministic checks are not human playtesting, physical-phone performance or photosensitivity certification.

## Review and evidence

Node checks cover all five ranged roles, both teams, air/ground heights, zero-distance shots, reduced motion, low detail, extra-arrow markings, real paid damage/lethal hits, restore behavior and exact deterministic continuation with and without rendering. The prior rewritten-main renderer is reconstructed through explicitly checked source hunks and its literal whole-source hash. Historical full-frame fixtures remain unchanged; unchanged actor/terrain/overlay/minimap commands are compared separately from the intentional projectile change.

The browser comparison uses the same paid encounter state for current and prior native Canvas rendering, captures launch/50/150/250 ms frames, and checks actual contact coordinates and paused pixel stability. Separate real UI cases resume an earned pre-shot save in normal and reduced-motion/low-detail settings, observe HP loss, and pause/save successfully.

Validation: 3,636 Node tests passed, zero failed, one optional tooling skip. All 50 focused impact/renderer/source checks and all 12 Chromium checks passed. JavaScript parsing, complete browser static/fixture validation, the 71-file runtime/offline inventory and whitespace checks passed. The native comparison was visually inspected. Human approval of the new visual language remains outstanding; this draft is not merged or deployed.

Generated logs, receipts, traces, frame images and comparison artifacts belong outside the repository at `/tmp/ironroot-impact-review/`. Earlier work is preserved separately in a local Git bundle; it is not uploaded or merged into the rewritten ancestry.
