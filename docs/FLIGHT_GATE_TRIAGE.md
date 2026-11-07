# Flight candidate review findings

The exact uploaded candidate is `598925cbfea60acc734513d05dc14eeafe80a57d`. Its frozen source and cloud run remain unchanged. Repairs and the user's latest feedback are being combined locally for a subsequent update to the same PR.

## Focused cloud results

The initial flight suite passed 113 and failed 11 cases. All 16 actual-v0.15 upgrade cases passed. The full matrix was still running when this note was written, so these are not a final release gate.

- Six mobile planning cases completed the first North order and exact-state check, then tried another order after Options had intentionally collapsed the inspector. The setup must inspect the same real aerie again, not force-click hidden controls or change the expected order state.
- One desktop Stonegate case tried to focus South before its post-Options enabled state had rendered. Focus stayed on Options and Space reopened it. The test must wait for enabled state and assert actual focus before Space; later state and save checks remain required.
- Four 320×430 cases found the North control only 99.18% inside the clipped viewport. This is a real geometric finding. Keep the complete-visibility and center-hit checks while correcting the scroll/layout boundary.
- Supplemental visual review found selected-aerie NEXT and committed YOU AIR labels overlapping on phone and landscape. Signals need separate placement without changing combat or route mechanics.

Supplemental paid order → launch → warning → transit and archer damage checks passed. A legally produced Rootwarden within 7.7 world pixels of a transiting gryphon did not damage the air unit. These checks do not certify all crowded visual states or physical devices.

## Controller timing investigation

An early full-run phone failure in `accessibility-backup.spec.mjs` expected Archery after a bumper press. The exact failing line, active card, resource total and trace remain necessary to establish the cause.

Read-only source review passed 59 controller/input tests. Two pure timing mechanisms were reproduced without modifying runtime:

- The helper waits for two polls and then holds another 100ms. Under slow sampling that can cross the intentional 350ms autorepeat delay, selecting Archery and then Mint in one helper call.
- The fixture starts at 190 gold and earns 5 per second. At six simulated seconds Watchtower becomes affordable, changing the later reverse-order expectation.

These are proven helper vulnerabilities, not yet the demonstrated cause of this failure. A scope interruption has a different signature: the edge can be suppressed and Barracks stays selected. Passive sample timestamps, active-card changes, focus/visibility and current gold distinguish them.

## Release rule

Do not merge or publish from focused or local results. Preserve downstream assertions, rerun the repaired groups, and run the full exact next candidate. The held local source also includes portrait income, first-paid-barracks automatic start and complete hint-banner hiding, which require their own combined verification.
