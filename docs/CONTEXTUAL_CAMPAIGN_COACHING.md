# Contextual campaign coaching

This draft is based on private main `b8b2e6d1b200b9550803f5cb16b8d96ccc28f222`. It is a focused UI/presentation patch. It does not merge the pending phone/fullscreen, pause/options, campaign navigation, or campaign roster progression work.

Fresh, incomplete First Watch, Forked Road, Emberwatch, Three Roads and Winter Stores open a teaching dialog before the first simulation tick. Emberwatch omits its redundant opening when First Watch is complete. A player can start immediately, or build while battle time, income, production, combat and visual effects stay stopped. Every purchase still goes through the existing engine and costs normal gold. Resume is available in the build controls, on the persistent toolbar and through the existing Space/controller action. Hiding hints also releases the teaching hold. Insufficient-gold feedback explains how to resume income.

The teaching hold is separate from the existing manual pause. Help/preferences retain it; a visibility, viewport, profile, storage or engine-safety interruption still requires the existing safe resume path. Starting or releasing a teaching hold interrupts held gestures. Escape/controller Back closes the explanation into planning, without running time. The dialog uses the shared focus trap and inert background. Its controls have a 44px minimum height; its content can scroll.

Automatic teaching occurs only at a fresh opening. Changing hints or completing construction never interrupts active combat. Optional **Pause to learn** can replay the explanation during that same mission. Completed mission replays and restored battles start normally, retaining their actual roster. No tutorial completion flag, pause reason, preference, timer, save schema, scenario ID or campaign result is added. A save made from planning resumes the purchased layout in an ordinary running battle. Existing progress, awards and target evaluation remain authoritative.

## Site suggestions

The old shared "one column behind the barracks" rule is replaced by `recommendCampaignSite(game, type, preferredLane)` in `dist/campaign-flow.js`:

- Towers prefer threatened roads and a legal forward position ahead of allied production. Without production, the default remains forward. If no suitable forward site exists, the hint explains that rear towers only defend a fallback line and does not ring a rear site.
- Archery, foundries and sanctums prefer a legal position behind a barracks or Warden lodge on their road. Mines prefer rear positions in defended roads. Other production keeps forward room for defense.
- Every candidate passes the actual game's `canBuild`; costs, occupancy, map sites, roster, building/mine caps, terminal states and engine safety remain authoritative. Nearby enemies influence site ranking and exposed choices get an explicit notice. A switch away from a specifically requested road is disclosed.
- Suggestions explain their role and remain optional. A different selected building receives its own contextual suggestion; purchases and placements do not depend on the recommended order. Selecting a building while teaching brings its suggested site into view. Away from planning, offscreen hints direct the player to pan or use the minimap.

These are practical opening heuristics, not an optimizer or a guarantee of safety or victory. Ranged troops can move away from their producer; a rear ranged building does not guarantee a permanent shield screen.

## Integration points

1. Keep the roster/progression branch authoritative for `campaignBuildChoices`, mission availability and campaign `Game` rulesets. This patch leaves `CAMPAIGN_BUILD_INTRODUCTIONS` and all campaign/intro/ruleset/engine data unchanged. Current main intentionally retains the legacy roster in authored missions; Rootwardens exist in fresh skirmishes. The separate 2 → 5 → 8 progression and Rootwarden campaign introduction need an integrated playtest after their real data lands. Do not interpret this branch's legacy campaign suite as that future progression's balance approval.
2. `campaignTeaching` is an opening-copy policy. If a mission's available roster or starting deployment changes, update its teaching copy and corresponding `campaignCoach` goal together. The site helper reads `game.buildings`/`game.units`; it already handles `wardenLodge` as a screen producer. The new air hint uses the actual troop `canAttackAir` capability.
3. Preserve `coachingHold` in the shared frame/audio/visual freeze conditions and the `toggleBattlePause()` route when integrating pause/options or desktop controls. Explicit Resume clears teaching only after the existing storage/stale/viewport/engine guards succeed. Automatic dialog closes do not clear it. The coaching dialog is first in `dialogLayers`; viewport and recovery/settings dialogs retain higher priority. Keep its Escape/controller Back handling and the activation-scope interruption.
4. The HTML changes add a teaching dialog, two build-toolbar controls and a clock-label ID. The CSS changes only style that dialog, allow tool wrapping and fix the old toolbar selector that hid all tools whenever any adjacent pair was hidden. Keep the shared battle row budgets and mobile geometry fixes from their owning branch. No release identity/cache version is bumped here; the eventual combined release owns that atomic change.
5. Existing campaign/onboarding browser cases explicitly choose **Start battle now** through `startRunning()` where the scenario needs live combat. `contextual-coaching.spec.mjs` tests the planning path itself and actual paid construction. Node UI fixtures supply the new teaching policy/state and dialog count; these fixture updates are not native layout evidence.

## Verification and limits

See `qa/contextual-coaching-evidence/validation.json` and the committed logs for final counts, source hashes and exact commands. Browser evidence is Linux Chromium with emulated desktop/touch viewports. Visibility changes are an explicit document-state adapter paired with native pointer/touch release. No physical phone, installed PWA, Safari/WebKit, Firefox, packaged desktop, controller hardware, screen-reader session or human difficulty certification is claimed. The separate isolated guided-practice page is unchanged. No merge or deployment is performed.
