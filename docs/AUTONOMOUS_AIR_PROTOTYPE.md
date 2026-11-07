# Autonomous air: bounded local combat prototype

Status: isolated DOM-free prototype in `ironroot-autonomous-air-next`. No deployment, default selection, campaign revision or UI change. The original nine immutable rule identities remain unchanged. The first home-return experiment is superseded, not a recommended design.

## Selected mechanic

The opt-in identities are `frontier-air-local-open`, `frontier-air-local-timed` and `frontier-campaign-air-local`, revision 1. All are marked experimental.

- A flyer sees enemy units within 300 world pixels on its current nearest road or one neighboring road. A physically in-range opponent remains eligible regardless of bookkeeping.
- It retains a living target while physically within 420 pixels and locally eligible. A nearer distraction cannot steal the lock. Equal-distance acquisition uses stable numeric entity IDs.
- It moves physically at the existing 84 pixels/second and fires only within the existing 110-pixel range. Damage, cooldown, health, prices, production, escalation and structure modifiers are unchanged.
- Its road is the actual nearest road after movement. A flyer cannot acquire a two-roads-away enemy directly. Physically reaching the intermediate road naturally makes the next road adjacent.
- Target death or actual escape clears the lock. The flyer seeks locally again or continues ordinary forward movement from the nearest road. There is no birth-road binding, forced return, anchor, gateway, warning, crossing immunity or special no-attack phase.
- Both sides use exactly the same unit logic. The producer/decision AI source remains byte-for-byte identical to the frozen predecessor. It sees the flyer's current nearest-road identity, not a hidden future route.
- Ground anti-air can engage a flyer by actual distance even between roads, but moves only toward a point on its own road. It ignores pursuit targets outside that road's reachable vertical range unless already in actual attack range. Its approach step is clamped to avoid a zero-distance goal oscillation. Towers and paid volleys retain their ordinary physical behavior.

Only one additional scalar is saved on a flyer: `airTargetId`, a numeric live enemy ID or null. Admission rejects missing/malformed/foreign fields, dead or friendly references, nonlocal locks and incorrect physical lane identity. Immediate between-tick target deaths, including paid volleys, clear references before serialization. The normal death-cleanup, fixed-step and terminal boundaries remain intact. No new random draw is introduced.

## Why the first experiment was rejected

`integration-inputs/autonomous-air-anchor-prototype/` preserves the initial code and evidence. Its 420-pixel encounter anchor and forced home return caused a nearby moving Rootwarden to be abandoned at 110.83 pixels, and repeated return/reacquire detours in an ordinary paid-producer encounter. Another returning flyer ignored an opponent only 10 pixels away because of its birth-road boundary. These were invented constraints, not the player's request. The selected mechanic deletes them rather than adding more phases or timers.

## Evidence

Run `npm test`, `node scripts/check.mjs`, `node scripts/verify-runtime.mjs`, and `node scripts/measure-autonomous-air.mjs`. The reproducible measurement output is `AUTONOMOUS_AIR_PROTOTYPE_VALIDATION.json`; it pins the exact four changed runtime files.

Final exact-source checks: **1,299 passed, zero failed, one optional skip** across 1,300 Node tests. Syntax and offline/runtime checks passed. `AUTONOMOUS_AIR_FINAL_CHECKS.json` pins final runtime and test source hashes. The full test output and runtime manifest are preserved under `integration-inputs/autonomous-air-validation/`.

The full suite caught an intermediate legacy arithmetic regression: regrouping speed × timestep changed old floating-point trajectories. The new-policy movement clamp was isolated and the old fallback arithmetic restored verbatim. The original 14 failing historical checks then passed without changes. This rejected result is preserved rather than counted as a pass.

The focused checks cover:

- All 24 adjacent map/side/direction combinations across the five existing one-, two- and three-road maps; no remote or direct nonadjacent acquisition; ordinary travel distance and attack reach.
- Stable locks, physical lane transitions and locally continuing after death, actual-distance escape, mutual air defense at a road boundary and immediate save after a target-killing volley.
- Targeted malformed snapshots and deterministic continuation through idle, pursuit, firing, target death, fractional accumulator and AI timing states.
- Real paid aerie/archery/tower outcomes, mirrored sides, paid Warden pursuit with both standard 420-gold/default-barracks starts and the initial isolated 1,000-gold reproduction.
- 140 living units, bounded scans, no new spawn RNG, side caps and safe terminal/time/counter behavior.
- All nine old identities × five maps × three difficulties: 135 exact predecessor comparisons with paid construction/upgrades/volleys, AI, legacy manual routes, complete serialized states, RNG and cross-restores. Existing frozen v0.15 and raw v1/v2 checks remain unchanged.

At 45 seconds, a paid aerie opposite a neighboring barracks killed four warriors without taking troop damage. A paid archery range and a paid tower each killed three gryphons. Side-swapped kills, damage and gold were exactly mirrored. These are tactical examples, not balance certification.

The revised 120-second paid-Warden regression recorded **zero nearby living-target abandonments** in all four mirrored/starting-economy cases. Targets were released on genuine deaths instead. A flyer can still be drawn longitudinally backward by an enemy it is fighting; that is continuous ordinary pursuit, not a hidden return cycle.

The local cap measurement retained all 140 units for nine simulated seconds. Maximum distance evaluations were 10,360 per tick for all flyers and 4,654 for the mixed roster. Shared-machine Node timing is recorded in the JSON; it is not mobile/browser/rendering certification.

## Integration implications and remaining work

This prototype deliberately does not select the new rules in the app or authored campaigns. `docs/AUTOMATIC_AIR_INTEGRATION_PLAN.md` belongs to the parent integration work.

For fresh battles, select the new immutable identities and a deliberate new campaign descriptor revision. Remove or replace manual-aerie controls, Hold/North/South instructions, route warnings, Air routes panels, gateway/minimap signals, build toasts and flight-order lessons. Preserve old active attempts under their original identities and corresponding legacy presentation; do not silently change their movement. Keep prior progression and stars. Evaluate profile-protocol fencing against actual older clients before integration. The helper was added to the offline manifest only because the engine imports it; a future release must choose a new coherent cache/version identity.

The campaign-only experimental identity is registered for engine experiments but deliberately has no authored campaign revision that selects it yet. It cannot be admitted as a standard skirmish. No player controls, renderer changes, authored scenario changes, balance claims or release authority are included here. Human playtesting, integrated browser coverage and a deliberate release decision remain open.
