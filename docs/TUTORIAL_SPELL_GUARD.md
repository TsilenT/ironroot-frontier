# First-barracks Volley guard

The v0.20.2 candidate is based on exact main
`f5bfe05144e0862d1b6bfb4237dacdf276e61fe8`, tree
`71745d53bcdf713cce21264760099565d892805a` (v0.20.1).

## Correction

During forced first-barracks teaching, the shared Volley handler previously
armed an unusable spell and cleared the selected barracks. Field casting was
already correctly blocked. The handler now refuses arming while
`firstBuildHold` is true, without spending or changing the player's order.

The existing card is disabled immediately and shows “Build a barracks / to
unlock.” Its accessible name remains “Arrow volley. Area damage to troops.”
The existing cost/status element supplies the accessible description, so a
cooldown update does not change the button's name. A successful paid barracks
placement restores the ordinary card and paid spell path immediately.

Later planning lessons retain their existing spell policy. Keyboard mappings,
controller mappings, cancellation, menu history, layout, balance, economy,
rulesets and profile/save protocols are unchanged. This does not implement the
separate held PR #14 access or history work. Version/cache metadata advances to
0.20.2; this candidate has not been merged or published.

## Checks

- New actual-handler regressions cover the card, shared handler, default and
  remapped shortcuts, controller action, untouched engine/profile/order state,
  missing and failed placements, successful release and paid cast, safety
  boundaries, cancellation, affordability/cooldown and later planning.
- The initial baseline reproduction had 11 failures and 8 passes. The final
  candidate passes all 19 new cases. Its accessibility assertions were refined
  during review to require a stable action name and separate status description.
- Focused regression set: 195 passed, no failures or skips.
- Final full Node suite: 1,523 passed, no failures, one existing skip.
- All runtime JavaScript parses. Runtime preflight inventories 54 files.

Logs, screenshots, native accessibility observations and the final runtime
inventory are in `qa/tutorial-spell-guard/`. No existing assertion or historical
fixture was removed; the older campaign mobile fixture only gains the `SPELL`
binding now read by the real deck update.

## Native desktop preview

The supported managed preview served isolated, verified baseline and candidate
directories. Native Chromium pointer/key input reproduced the baseline: select
Barracks, press R, see the Volley prompt at 420 gold and 00:00, then receive the
first-barracks refusal when clicking the field.

On the candidate, R and a pointer attempt on the disabled card preserved the
Barracks prompt, 420 gold and 00:00. An invalid enemy-territory placement also
preserved that state. A legal green-site placement spent 140 gold and changed
Teaching Pause to Battle Time. R then armed normally; a field click produced
“Arrow volley fired.” The paused HUD showed 25s Recharging, 233 gold and 00:05
after normal income had accrued. Exact resource arithmetic is asserted in the
real-engine Node tests, not inferred from the rounded browser HUD.

This was a fresh mission on an existing QA profile whose first teaching missions
were incomplete, not a clean-profile certification. The original preview profile
was exported locally first. The normal import-chooser restore attempt
was interrupted after 337.7 seconds. Read-only inspection then
showed the paused Options screen, with no chooser or import preview. No import
confirmation was sent; restoration remains pending. The original backup is
retained locally outside this repository and is not part of these artifacts.
Production tabs and their profile were not changed. The managed preview was
stopped and browser ownership released.

One preview renderer crash recovered with one ordinary browser reload before
the candidate sequence. No hidden game-state injection, clock acceleration,
direct browser sockets or security workaround was used. Physical phones,
physical controllers, screen readers, non-Chromium browsers and the full browser
matrix were not tested in this bounded check.
