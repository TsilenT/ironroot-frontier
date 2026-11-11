# Immediate projectile contact prototype

Base: rewritten public main `238a22c73d36d8ee0f24b3e564272fe15a96ebab` (runtime v0.40.7). Candidate identity: v0.40.8. This is a reviewable visual prototype, not a deployment claim. It starts from the rewritten history; no old branch ancestry is merged.

## What changes

The engine resolves ranged HP, hit reaction, splash and lethal removal in the same fixed step that launches the cosmetic projectile. Its old arrow/orb/stone then travelled for 0.28 simulation seconds, suggesting contact after the actual damage.

The renderer draws the existing projectile glyph at its recorded target point from the first observed damage frame. Arrow tips end at that point. Source/target flight flags retain their existing endpoint heights. Marks stay at the authored contact location; there is no second arrival.

The revised draft adds a static dotted source-to-contact link and a small open source ring in every effects mode. The complete link appears at once, stays at its recorded endpoints and never advances a dash phase. Its restrained dark under-stroke separates it from terrain. Low effects retains this causal information. Reduced motion holds the entire cue at fixed opacity and size, without a moving streak or travelling element.

Normal-motion contact opacity decreases from 1 to a floor of .65 over the existing lifetime, then disappears when that cosmetic expires. Contact art retains a minimum scale equivalent to .65 CSS pixels per authored glyph unit (a wizard core has at least a 2.6px radius). Link strokes have a .9 CSS pixel minimum and source rings a 1.75 CSS pixel minimum radius. These screen-size floors apply at small battlefield scales without displacing the recorded contact point. They are presentation sizes, not hitboxes.

Archer, tower, siege, wizard and gryphon glyphs keep their existing shapes and palette. The extra citadel arrow retains its second chevron. No new particles, impact events, damage popups, shake, audio or target tracking are introduced. The only runtime behavior change is in `render.js`; release/cache metadata is advanced separately.

## Simulation and visibility boundaries

Combat, balance, RNG, targeting, prices, rewards, save encoding and profile protocol are unchanged. Projectiles still keep their exact engine fields, positions and lifetimes; drawing reads those values without changing them. The existing damage/death/splash effects and firing sounds retain their timing.

The marker uses the shot's recorded target snapshot, not a guessed association with a live unit. It can therefore remain visible after a lethal target disappears, and it does not chase a moving survivor. A target can move within the engine's same fixed-step movement/damage resolution; the immutable shot anchor preserves the existing recorded coordinate. Fog continues to emit immediate visible hit effects and retains no projectiles. The renderer acquires no hidden coordinates or entity IDs.

Pause holds the mark and fade at the current simulation instant. Restoring a partly expired projectile retains its remaining fade; it does not restart a launch effect. A zero-life stored cosmetic draws nothing, including in reduced motion. Very low frame rates cannot retroactively show a frame that was never rendered. Lifetime is simulation time, including the existing terminal-state freeze, rather than a new wall-clock timer.

## Tradeoffs for review

- This chooses an instantaneous linked-strike visual language for existing instant damage. It removes the misleading later arrival, but sacrifices the long bow/orb flight and arcing siege-stone silhouette. The siege arm's existing firing pose and immediate splash remain.
- Review of the first draft found weak source attribution, especially round wizard/siege glyphs and gryphon marks in low/reduced effects, plus faint late marks on phones. The complete static link and screen-size/opacity floors address those omissions. The first renderer is retained through a literal whole-source hash for direct comparisons.
- Complete links add visual information across the frontline, including in low effects, and require three extra strokes per nonzero-length shot. In the synthetic 140-actor/32-mark stress view, individual source-target relationships still compete and overlap. This draft makes origins available; it does not establish that every shot is individually traceable in a crowded fight. Human review should weigh this clutter against the first draft's missing origins. Physical-phone performance remains unmeasured.
- A persistent dotted link could resemble a targeting indicator rather than a strike. It lasts only the existing 0.28 simulation seconds and has no moving element, but that interpretation and the sharper disappearance at expiry require human playtesting. It is not a claim that an arcing stone travelled instantaneously.
- True travel-time damage remains a separate combat change. It would alter simultaneous kills, target death/retargeting, moving targets, splash, income, outcomes and saved pending attacks. This prototype does not make those changes.
- The art is consistent with immediate HP loss, but perceived feel is a human judgment. Native browser evidence and deterministic checks are not human playtesting, physical-phone performance or photosensitivity certification.

## Review and evidence

Node checks cover all five ranged roles, both teams, air/ground heights, zero-distance shots, reduced motion, low detail, extra-arrow markings, real paid damage/lethal hits, restore behavior and exact deterministic continuation with and without rendering. The prior rewritten-main renderer is reconstructed through explicitly checked source hunks and its literal whole-source hash. Historical full-frame fixtures remain unchanged; unchanged actor/terrain/overlay/minimap commands are compared separately from the intentional projectile change.

The browser comparison uses the same paid encounter state for current and prior native Canvas rendering, captures launch/50/150/250 ms frames, and checks actual contact coordinates and paused pixel stability. Separate real UI cases resume an earned pre-shot save in normal and reduced-motion/low-detail settings, observe HP loss, and pause/save successfully.

Revision comparisons additionally cover five isolated ranged roles and a declared synthetic frozen 140-actor/32-mark stress scene. Stress targets stay on the shooter's road and inside its role's range, respecting anti-air eligibility; these are presentation inputs, not earned combat outcomes. Each is captured at launch and 250 ms in normal, low and reduced-motion/low effects across 320px/390px phones, landscape and desktop browser viewports. Native transparent-canvas pixel probes verify nonempty source and contact marks for every role, including the late tail. Pixel presence is evidence of drawing, not proof of human recognition.

Validation of revised rendering: 3,638 Node tests passed, zero failed, one optional tooling skip. All 40 focused impact/renderer checks and all 36 Chromium cases passed. JavaScript parsing, the 71-file runtime/offline inventory and whitespace checks passed. Native phone-scale and crowded comparisons were visually inspected. Human approval of the new visual language remains outstanding; this draft is not merged or deployed.

Generated logs, receipts, traces, frame images and comparison artifacts belong outside the repository at `/tmp/ironroot-impact-review/`; revised evidence is in its `revised/` subdirectory. The revised comparison displays the 320px phone's 296 × 240px battlefield at original CSS size without enlargement or cropping. Earlier work is preserved separately in a local Git bundle; it is not uploaded or merged into the rewritten ancestry.
