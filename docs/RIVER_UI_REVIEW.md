# A River Between Us UI review

## Implemented scope

The existing objective progress line displays cumulative supply time, the current clear-crossing count, and the named North Command Post's standing/destroyed state. The target resolves through `getCampaignTargets`, so only the authored original counts; neither its coordinates nor its entity ID are duplicated in the UI. No new HUD row, focus control, manual air order, fog, or income behavior was added.

At 60 secured seconds with the post still standing, the progress line remains active and its accessible description explicitly says the supply goal alone does not win. The description also states both goals, either order, the citadel alternative, own-citadel survival and replacement identity. The existing bridge description still exposes current ownership and contest state. Terminal text comes from the authoritative campaign outcome.

Pause keeps the brief objective visible and detailed capture rules in the existing expandable section. It uses the mission's actual objective/deadline, not Shared Crossing's 4:30 copy. Shared Crossing still receives its original labels, description and rules without alteration. Scouting shows three capture rectangles plus the original post's destruction ring and name. The field guide uses the active mission roster and autonomous-air rules.

The existing battle report already records and renders both objective rows, including each met flag, progress and the named original-post objective. No report schema or renderer change was needed.

## Automated evidence

`node --test tests/river-between-ui.test.mjs` passes 11 tests:

- Actual app start/HUD/Pause source at 320×430, 390×650, 844×390 and 1180×768, with focus retained across progress updates.
- Supply-first pending state with an explicitly still-standing post, followed by both-goal completion.
- Post-first pending state with a replacement at the same location, checkpoint restore and mission restart.
- Same-page transitions back to Shared Crossing and ordinary play, without stale compound text or ARIA descriptions.
- Authored briefing and actual scout markup showing both goals, the deadline and all three physical capture zones.
- Actual `populateFieldGuide` source using the active roster, plus generated codex data.
- Reports for compound victory, citadel alternative, own-citadel loss and deadline failure. Each retains both objective facts even when control alone is already complete.

These synthetic state boundaries are UI/identity evidence, not paid-route balance claims. The Shared Crossing behavioral tests and shared mobile-shell tests pass; at the time of the focused run only the separately owned current campaign-count assertion still expected 23 rather than 24.

## Source geometry review

No CSS or HTML changes were made. The existing ordinary mobile dock permits normal wrapping. Short portrait uses a 44 px dock with 4 px vertical padding and 12 px progress line height; up to three lines fit its existing budget. The compound label is about 60 characters, so 320 px short portrait remains the important native check, especially beside the remaining-time text. The existing Build/navigation controls and measured visible-world safety guard are unchanged. DOM fixture dimensions are synthetic and do not establish native font wrapping or touch acceptance.

## Bounded native desktop acceptance

Completed against the supported managed preview at its exact returned `http://127.0.0.1:4173/` URL. Actual browser viewport was 1180×757. The preview used synthetic prerequisites and per-fixture namespaced session storage; production profile and source runtime were untouched. The preview differs only in its disclosed storage/navigation wrapper and disabled service-worker installation.

Verified through native browser interaction:

- Fresh mission briefing and expanded scouting exposed both goals, original north-road post, either order, 10:00, no bridge gold and three physical zones. The field guide exposed the active roster and automatic cross-road air behavior.
- A fresh ordinary foundry placement spent gold and produced the “Siege foundry raised” confirmation. Selecting another building then Escape canceled placement and returned ordinary build controls.
- Fresh HUD and Pause were readable. Pause kept the short goal visible, with detailed capture rules expandable. Save & return to title offered the saved 00:16 attempt.
- The naturally paid 84.25-second checkpoint resumed with 60/60 secured and North Command Post still standing. It did not stop or claim victory. North ownership subsequently changed from enemy to contested to yours while the supply goal remained banked.
- Native HUD measurement: progress 273.86×14 px, timer 72.66×13 px, enclosing HUD 396.52×36 px. Each element's scroll width equaled its client width; the named post and timer did not overlap or clip at this desktop size.
- Pausing at displayed 01:36, reloading, and choosing Resume restored 01:36, banked 60 seconds and the standing post.
- Ordinary continuation at the UI's 2× speed naturally reached Mission Complete at displayed 02:09. The report visibly marked both “Secure any two bridges for 60 cumulative seconds” (60.0/60, 3/2 clear) and “Destroy the original North Command Post” (1/1) as met. Both citadels remained at 6,000 HP. The report correctly disclosed resumed recording from 01:36.
- Replay returned to briefing and began with 0/60, standing post and fresh treasury. Restart Cancel preserved the paused 00:03 attempt. Confirmed Restart returned to briefing. Browser Back returned to Chapter 6, reselecting the mission worked, and beginning again reset to fresh goals.

The final replay was left paused at 00:03. `sites-preview stop` confirmed shutdown and the browser was released. External screenshot evidence is under `../local-evidence/ui/banked-desktop.png` and `../local-evidence/ui/terminal-report-desktop.png`, outside source.

Limits: this is a fresh-action plus paid-checkpoint-to-terminal desktop pass, not a full from-zero browser win. The fixture generator's natural policy completed at 130.05 seconds; native continuation displayed 02:09 and is recorded separately rather than claimed identical. No phone emulation, physical touch/controller validation, native short-screen resizing, production-profile persistence or deployment was performed. Short-screen evidence remains Node/source geometry only. Browser logs contained extension metadata errors, not an observed app error; no broad console-clean claim is made.

## Reviewed source identity

Fixture metadata source runtime SHA-256: `6a25c6a0a9966e591b2e58c9aad309606c03d8cf4bb797ed9c1420ce63828323`.

Frozen UI runtime file SHA-256 values after native acceptance:

- `dist/app.js`: `862ce74956de742521394bda6acebeae0eb85ba1490e23c44c6fef5d12d157fe`
- `dist/campaign-control-view.js`: `bb126e5ba8c2a350cfb2506a42145c875c3ffa1320cb7957d5ae58cce6b8dede`
- `dist/campaign-presentation.js`: `0babfd96153fff8523a075a92a8c8f186fca787c8626f7e96ba9f94dea21c6b9`
- `dist/scouting.js`: `80bf27050c8ba066bbe652045810ab58c9ec46ef24c21947637c715c211582d5`
