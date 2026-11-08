# Lanterns desktop acceptance

Bounded native Chromium review on 2026-11-08, at a 1180 × 757 content viewport. The local v0.24.0 candidate was served at `http://127.0.0.1:4173/`. Live v0.23.0 was not touched. No production source was edited by this reviewer.

## Evidence boundary

The preview disclosed synthetic prior campaign records and ordinary paid-engine checkpoints. Its storage was isolated, fixture-specific `sessionStorage`; service-worker installation was disabled. The reviewer used only visible UI through native CUA, with no storage injection, page evaluation, Playwright, DevTools or phone emulation. The fresh attempt included a real UI purchase; the eventual victory continued a supplied paid-engine checkpoint and **was not a browser-earned full mission win**.

Frozen source-runtime aggregate SHA-256: `6c760b4ffea13e93e4ee5ab720f76e1e4fb1c3dafe8a5a4add64895b21e7ba74`. Preview aggregate: `5935e92a455ce8f94473d20eb04c16824eaeab5ba983a3e6144f429d27441a5f`. The fixture manifest records 58 runtime files, with only the disclosed `app.js` and `index.html` preview wrappers differing. Subsequent source fixes require their own validation.

## Passed within this scope

- **Briefing and scouting:** visible 10:00 goal, both-originals-or-enemy-citadel route, own-citadel survival, ordinary adaptive paid enemy, 5:00 escalation, dispatch exception and replacement rule. Scouting showed known terrain/house positions but explicitly unknown enemy force, current HP, levels, upgrades and defenders.
- **Fresh battle:** 0/2 credit, both houses “Charted · HP unknown,” enemy core unknown, and zero last-seen buildings at 00:00. Two equal-width objective cards were readable without overlap. Focusing North panned the camera while both posts and core remained unknown; chart activation did not expose their HP.
- **Paid play at 1×:** keyboard 1 selected the 140-gold barracks. Clicking a legal north-road slot created it, reduced available gold despite ongoing income, displayed the success message and cleared placement mode. A naturally observed enemy barracks subsequently became a labelled stale marker.
- **Interruptions and persistence:** Pause stopped the fresh attempt at 00:16. Browser Back closed nested Options to the same paused battle; Back from resumed combat paused it. Save & return, same-tab reload and Resume retained the elapsed time, purchased barracks, fog and stale memory. These checks concern the isolated tab, not production-profile durability.
- **Real stale checkpoint:** the supplied 00:25 paid-route save showed North “Last seen · HP unknown” while River was “Visible · 100% HP.” Pause details gave North's old 0:23 observation and explicitly unknown current health/production. Save/reload retained those details. Later chart focus still displayed stale, unknown-HP North information.
- **One-original-cleared checkpoint:** at 01:23, North was disabled and “Cleared,” credit was 1/2, River was visibly 69% HP, and the enemy core remained unknown. The accessible dispatch statement identified original destruction and the replacement rule. No stale North original appeared on the field or memory list. This fixture's destruction occurred in sight; it does not prove native unseen-destruction behavior.
- **Terminal and replay:** the 01:37 checkpoint continued without player combat commands to a 01:39 three-star result. Result text and report disclosed post-battle full information; the report correctly limited chart coverage to 1:37–1:39 and showed 2/2 targets destroyed. Inspect revealed the full field and enemy core at 100%. Back returned to the briefing; Last battle report reopened the result. Replay mission returned to briefing, and starting replay restored 00:00, 0/2, both unknown charted posts, unknown core and zero memories.
- **Accessible presentation:** native accessibility output exposed descriptive chart buttons, unknown/current/stale distinctions, minimap descriptions, briefing chart alternatives and pause memory details. Keyboard build selection and native button activation worked. This was not a screen-reader usability audit.

## Findings at review completion

1. **Minor report wording mismatch:** Battle totals said “This open-ended battle has no automatic citadel decay,” although this mission has a 10:00 objective deadline. The no-decay claim is compatible; “open-ended” is misleading.
2. **Minor replay briefing mismatch:** result → Replay mission changed the route line from “Completes the current Chapter 6 route” to “Unlocks the campaign epilogue.”

Both findings were reported to the source owner and corrected after the initial frozen review. No gameplay, fog-reset, desktop layout or save-flow blocker was observed in the checked paths.

### Narrow correction retest

Only `campaign.js` and `report-view.js` were copied into the preview for the retest. Their source and preview SHA-256 values matched: `campaign.js` `7f6b261ee05e4efe82e8efe1c53467fa514ed67c9e627da7ea0787c8bba7f09b`; `report-view.js` `b21962253d38be38bb361932576113433845c392193fda732d9ee9667c7ff3c7`.

After same-tab reload, the completed mission's replay briefing visibly said “Completes the current Chapter 6 route.” The earlier terminal report was no longer available, so the reviewer did not recreate a result or repeat the result → Replay transition. The source owner reported **33 focused source/report/historical checks passed**, including the neutral “This battle has no automatic citadel decay” repair. That sentence's correction is source/Node evidence, not a second native result inspection. The browser was left safely on the title/briefing.

## Not run

Full human-earned victory/loss, deadline expiry, enemy-core victory, intentional same-site replacement, unseen original destruction, full strategy/balance matrix, sustained performance, physical phones, mobile emulation, other browsers, controller, audio listening, PWA/offline/update, production-profile persistence and complete accessibility testing remain outside this review.

Eight local screenshots were retained outside the repository in the sibling `local-evidence/desktop-qa/` directory: stale details/field, dispatch field, victory, terminal field, replay briefing, replay fresh field and corrected replay briefing. They are development evidence, not public runtime assets.
