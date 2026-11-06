# Campaign selection and briefing

This branch addresses the playtest complaint that moving between missions requires too much scanning. Entry, Continue and return from a saved battle open a single mission briefing. The campaign's full chapter list appears only after choosing **Story**.

The hierarchy is **Story → Chapter → Mission**:

- **Story** gives the campaign premise and chapter cards, with aggregate progress in an optional disclosure.
- **Chapter** shows that chapter's story or earned epilogue, progress and mission choices.
- **Mission** shows its subtitle, flavor, plain goal and mandatory conditions. Previous/Next browse in story order, including across chapter boundaries. Locked missions can be inspected but cannot launch. Completed missions say **Replay mission**.

The exact authored objective, starting conditions and bonus-star criteria remain in **Exact rules & bonus stars**. Scouting and the commander's hint are separate disclosures. Choosing a different mission folds these details. Protected original buildings, their no-salvage/no-replacement requirement, required citadel health, income deadline and hold duration remain prominent. Far Beacons shows both the hold duration and the overall time limit.

Navigation focuses the destination heading and resets only the campaign content's scroll position. Breadcrumb buttons and native disclosures support keyboard activation. Chapter cards and mission cards use a vertical layout on narrow phones, with no horizontal chapter strip. Launch and saved-battle resume remain outside the scrolling content. The existing short-landscape layout is retained.

## Preservation

`campaign-presentation.js` contains presentation copy and derives mandatory facts from authored objectives. It does not write storage or change campaign rules. No mission IDs, prerequisites, scenarios, formations, economy, battle codecs, stars, result actions or profile formats changed. Existing version-2 campaign saves still resume. Main-campaign battles retain their version-2 envelope; introductory battles keep their version-3 scenario identity. Browsing does not write a battle or campaign progress.

The optional opening and existing direct-entry route remain as they are on main. This branch does not implement 2→5→8 progression, Rootwarden availability, teaching behavior, pause/options behavior or fullscreen fixes.

## Integration boundaries

Base: `b8b2e6d` (latest main when the isolated worktree was created).

- `dist/app.js`: one presentation import, two local UI state variables, a return-to-title presentation reset, `setMode` launch visibility, and the campaign rendering/navigation block. Preserve the progression task's mission catalog, `getCampaignOverview`/unlock behavior and initial recommendation; the renderer consumes those existing results. Quick navigation must use introduction missions followed by main campaign missions, rather than the save-stable `ALL_CAMPAIGN_MISSIONS` catalog order.
- `dist/index.html`: only the `#campaignConfig` subtree. Preserve its destination IDs when reconciling other welcome-screen changes. `#skipIntroduction` remains in the mission briefing and should be reconciled with the separately owned progression decision.
- `dist/styles.css`: added rules are scoped to campaign/welcome content. Coordinate with phone/fullscreen work around `.campaign-mode`, its header/footer, `#campaignConfig`, `#start`, `#resumeSaved`, and the existing short-landscape grid. No battlefield geometry, protected HUD, fullscreen code or pause overlay changed.
- `dist/service-worker.js`: new presentation module in the offline shell and a cache suffix for these assets. Combine all concurrent module additions and choose one final cache version when integrating.
- When the new progression catalog arrives, review `GOALS` for new/changed IDs and semantics. Unknown IDs fall back to the authored exact objective, so they retain correct instructions. Chapter/mission counts come from the existing overview; the new browser audit's 18-mission expectation describes this branch's main-based catalog.
- Existing browser tests that selected always-visible chapter/mission cards now explicitly traverse Story and Chapter. Their focus assertions expect the destination heading, and scouting folds for a newly selected mission. The obsolete horizontal-strip reveal implementation and its two geometry tests were removed.

No other feature branch was overwritten, merged, or deployed.

## Validation

See `qa/campaign-navigation-evidence/README.md` for commands, results and browser limits. The dedicated browser suite covers the hierarchy, keyboard focus, all authored briefings, mandatory conditions, cross-chapter navigation, locked launch, best-progress preservation, legacy-save resume, result Continue and narrow/landscape/desktop geometry.
