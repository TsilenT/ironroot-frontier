# Player copy: sentence rhythm

Branch: `codex/player-copy-rhythm-2026-11-07`.
Base: **`46d324b94754fe88ed9d324456f284af0aa4537d`**, the integrated flight/mobile-feedback candidate for draft PR #2. This work does not use the older v0.12 copy branch as its base.

## What changed

Coaching often repeated a short fact followed by a short instruction, while dialogue and practice feedback split closely related events into equally weighted declarations. This pass rewrites passages in context: an instruction can explain its purpose, a character can respond to an immediate threat, and a practice result can connect the observation to its outcome. It retains short controls and alerts where scanning matters. There is no global sentence-joining transform or sentence-length rule.

The scope is campaign coaching and placement guidance, the three current opening missions and two compatible older introductions, chapter prose and campaign dialogue/debriefs, all five practice lessons, field-guide unit descriptions, flight-order help and warnings, and selected guide/story/fullscreen text. Prices, objectives, deadlines, optional stars, starting forces, unlocks, old-save identities and all battle mechanics are preserved.

The generic Roadside Watch teaching text also stopped telling players to spend what they want and then start manually. It now describes building the army without giving a start instruction. The existing first-build state still supplies the automatic-start message, while manual teaching replay keeps its own controls.

## Examples from the base candidate

| Surface | Before | After |
| --- | --- | --- |
| Rowan at Emberwatch | Build a barracks near the crossing. We need warriors there before the next raid. | We’ll need warriors at the crossing before the next raid, so get a barracks up there. |
| Sera at Three Roads | They’re coming around both sides of the village. Watch the north and south roads. | Watch the north and south roads for raiders coming around the village. |
| Live air-defense hint | Archers can hit air. Rootwardens cannot. Place an archery range on the north road. | Place an archery range on the north road to hit the flyers that Rootwardens cannot reach. |
| Mine placement guidance | A rear mine leaves forward sites for troops and defense. It still needs protection. | A mine at the rear still needs protection, but leaves forward sites free for troops and defenses. |
| Siege practice result | Your siege engines hit the marked tower. The tower fell. | After taking fire from your siege engines, the marked tower fell. |
| Flight-order help | Orders affect future launches. Airborne gryphons keep their route. Crossing takes time and leaves them open to archers. | New orders apply to future launches, while gryphons already in the air keep their route. Crossing between roads takes time and leaves them exposed to archers. |

## Preservation and tests

The [source audit](../qa/writing-rhythm/source-audit.json) compares runtime JavaScript tokens with the exact base: only 142 string/template tokens changed across eight JavaScript files, with every other JavaScript byte unchanged. Fixed numeric facts in those strings are also unchanged. The HTML keeps its tags and every attribute. Engine, rulesets, flight mechanics and visuals, rendering, controller/layout code, save codecs and profile/backup protocols are untouched.

The [exported-data comparison](../qa/writing-rhythm/data-parity.json) preserves every non-prose field across all 21 authored mission descriptors, seven chapter descriptors and five practice lessons, including speakers, objective/medal labels, original target sites, parameters, revisions and prerequisites.

Copy assertions now expect the authored wording. Practice feedback proofs still require both the attributable hit and target defeat and reject incomplete messages. Existing frozen campaign hashes remain unchanged; an explicit prose-only reversal restores the reviewed wording changes before those hashes are checked. Historical fixture bytes, mechanical assertions, browser geometry assertions, timeouts and skip declarations were not changed.

The final full Node suite passed 1,229 tests with one pre-existing optional desktop-tooling skip. Syntax, the 49-file runtime inventory and browser fixture/harness checks passed.

The first focused browser matrix finished with 72 passes and eight failures. A clean exact-base comparison reproduced all four income-occlusion failures; its other 24 cases passed. The final writing matrix finished with 23 passes and one unchanged field-guide scrolling timeout on phone. Every final dialogue/hint/fullscreen check and one-time flight-warning announcement passed on all four profiles. The timeout remains unresolved, and the complete integrated browser release gate is still required.

See [validation results](../qa/writing-rhythm/validation.json) for exact commands, outcomes and any base-candidate failures. The isolated writing PR must be reviewed with the coordinator before integration. No merge or deployment is part of this work.

## Mobile prompt amendment

The shared mobile composer prefixes build instructions with “Open Build, then”. The two Shield at the Fork hints now start with “Build a Warden lodge…” and “Place an archery range…” so that prefix forms a complete instruction. The composer and all battle values are unchanged.

Five new integration cases check the complete closed-drawer and open-drawer strings at both stages, including the real paid Warden-lodge purchase. All 62 focused Node checks passed. The existing real paid-planning browser case now also pins both complete strings and passed on all four profiles at two workers. The [amendment source audit](../qa/writing-rhythm/amendment-source-audit.json) verifies exactly two changed text tokens against `93f8e43bb1ae36c4ee3fb65a5dbce392586ac502`; every other JavaScript byte is unchanged.
