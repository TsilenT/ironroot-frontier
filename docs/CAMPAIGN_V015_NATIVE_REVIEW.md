# Combined campaign and menu native review

Local v0.15.0 preview, 6 November 2026. This was not a production deployment. The game ran in native Chromium through the supported managed preview, inside a sized same-origin iframe whose local/session storage was replaced with isolated in-memory stores before application startup. Browser dimensions are responsive checks, not physical-device certification. The production origin was not operated.

## Actual earned play

- Roadside Watch won in 00:59 with three stars, using normal paid barracks and archery construction.
- Shield at the Fork won in 01:25 with three stars, using a Warden lodge and archery on the north road, plus barracks and archery on the south. Rootwardens were visibly fighting on the northern road.
- The first result naturally unlocked five buildings. The second result unlocked the third briefing and its siege, magic and flying additions.

These were consecutive earned wins before the browser connection interrupted the isolated session. They were not synthetic victory fixtures.

## Observed behavior

- A fresh teaching dialog offers planning before the first tick. The real two-card bar spent 140 gold for a barracks and 175 for archery while time, income and army remained stopped.
- The second mission exposed the actual five-building roster. Purchases reduced gold from 740 to 530, 355, 215 and 40 while time remained 00:00 and army zero.
- Explicit Resume started the battle. Options and Hide hints retained the planning hold. Suggestions put the Warden forward, archers behind, towers ahead of production, and changed the camera to the suggested road.
- Story → Chapter → Mission navigation, plain goals, expandable exact rules and Continue worked.
- Save & return → retained-memory reload → Resume restored Roadside Watch at 00:14 with its two-building roster.
- Options focus wrapping, content scrolling, opener restoration, return to pause, and fullscreen enter/exit worked.
- Responsive checks passed at 390×650, 320×568, 320×480, 667×375 and 740×320. Controls were usable; result actions remained reachable while their body scrolled.

## Limits and interruption

The browser connection first dropped after the two wins. A replacement native tab recovered, and the shared-preview profile hash still matched its original value. Continuation used an explicitly synthetic prerequisite profile after the isolated memory session was lost. That verified the third mission's eight-card bar, short-landscape layout, Start battle now, and voluntary Pause to learn. It does not count as an earned three-mission route.

The replacement tab later showed Chromium's “Can't open this page”, error code 9, during third-mission planning. A similar error appeared before gameplay. No game console exception or causal diagnosis was established. The reviewer stopped rather than loop browser resets. Third-mission completion and replay were therefore **not verified natively**. The preview was stopped at handoff.

One observed copy mismatch was fixed afterward in source: Options opened during planning now says “Back to planning” rather than “Resume battle”. The hold already behaved correctly. That label has an actual-app Node assertion and a prepared browser assertion; this source-only wording adjustment was not visually rerun in the interrupted browser.

The cloud gate must execute the combined final bytes. A new native-input browser case plays the full third mission at 1× with paid purchases, checks a two-star win, and uses Replay without changing the earned profile. Its prerequisite records are explicitly fixtures; the battle itself must run normally. This test is prepared, not reported as passed here.

Physical phone/PWA, non-Chromium behavior, screen readers, hardware controllers and packaged desktop runtime remain unverified.
