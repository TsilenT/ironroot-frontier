# Add Chapter 6: Shared Crossing

## Player-facing change

A new mission follows Common Ground. Choose any two of three crossings and keep them uncontested for 60 cumulative seconds within 4:30, or break the enemy citadel. Losing control pauses the timer; an empty bridge keeps its owner. Ground troops capture and enemy flyers deny. Bridges do not pay gold here, and this mission does not use fog.

The map, minimap, goal HUD, scout and Pause rules identify ownership and progress. Chapter 6 currently contains only this preview encounter. Existing campaign records remain intact; the current path grows to 20 missions/60 optional stars. Common Ground now continues into the new mission, whose completion offers Skirmishes and optional Replay.

## Engineering scope

Additive immutable campaign identity; strict saved control state and exact deadline behavior; profile protocol 13 fences older writers; historical mission descriptors and frozen production fixtures remain unchanged. Current-only reward copy and catalog expectations updated. Version/cache 0.22.0. The base already contains merged, unreleased fog; public v0.20.3 remains unchanged by this proposed PR.

## Evidence

- Complete Node suite: 1,674 passed, 0 failed, 1 optional desktop-tooling skip.
- Full dependency-free browser syntax/fixture/harness preflight passed; new Playwright spec added but not executed here.
- 36 paid simulations: 20 wins (12 control, 8 citadel), 16 losses; all three road pairs have control-win routes. Not player win-rate or balance evidence.
- Independent mechanic/save/profile review including fractional boundaries and restored deadline checks found no blocker.
- Native desktop paid placement, pause/options/Back, same-tab save/reload, defeat and restart-to-briefing passed. That attempt lost at 1:33.
- Separate real paid-engine checkpoint previews showed nonzero control/ownership, save/reload and control victory → Skirmishes / Replay. Not a native-earned victory.

## Limits and publication

Native previews use isolated synthetic sessionStorage profiles, not user data or real-localStorage/cross-tab certification. Phone/PWA/gamepad/non-Chromium and full browser matrix remain unverified. Fog's existing performance/offline/device limitations remain distinct. No deployment is performed by this handoff. Review docs/SHARED_CROSSING_VALIDATION.md and preserve all unspecified historical files when applying the sparse overlay.
