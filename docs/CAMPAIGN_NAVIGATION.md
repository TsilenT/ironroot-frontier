# Campaign selection and briefing

The local navigation integration adapts the presentation from source commit
`38108cb9188b6c2c09d7b5543b1a65afc2b10433` to the current campaign roster contract.
It is not a release or publication record.

## Screens

Entry, Continue and return from a saved battle open a single mission briefing.
The full chapter list appears after choosing **Story**.

- **Story** gives the campaign premise and chapter cards. Overall progress and
  roster unlock status live in a disclosure.
- **Chapter** shows its story or earned epilogue, progress and mission choices.
- **Mission** shows flavor, a plain goal and mandatory conditions. Previous and
  Next browse in campaign order, including chapter boundaries. Locked missions
  can be inspected but cannot launch. Completed missions say **Replay mission**.

The exact authored objective, starting conditions, available building list and
bonus-star criteria are in **Exact rules & bonus stars**. Scouting and hints are
separate disclosures. Selecting another mission folds these details. Mandatory
original-building protection, no salvage/replacement, income deadline, hold
duration and citadel health remain visible outside the disclosures. Far Beacons
shows both its hold duration and the overall time limit.

Navigation focuses the destination heading and resets only the campaign
content's scroll position. Chapter and mission cards use one column on narrow
phones. Start and saved-battle Resume remain outside the scrolling content.
Existing short-landscape layout and all battlefield/fullscreen code are kept.

## Progression and identity

The renderer consumes `getProgressionCampaignOverview`, including all nineteen
current missions and conditional legacy lessons. The mandatory opening is
Roadside Watch → Shield at the Fork → Open Three Roads, followed by the sixteen
revision-two main missions. The opening chapter is labeled **Start here**, not
optional. There is no introductory skip or All-buildings bypass on this path.

Existing main progress still gives returning players their next main mission
and full roster. Old First Watch/Forked Road records and saves remain separate
legacy lessons. Their **Return to current campaign** action uses the current
recommendation, which is Roadside Watch for an otherwise new profile.

`campaign-presentation.js` only supplies copy and derives facts from authored
objectives. It does not write storage, modify descriptors, change unlocks or
replace factories. Profile protocol 4, exact scenario identities, roster rules,
progress merge/admission, pinned Resume and earned-tier replay are unchanged.
See `CAMPAIGN_ROSTER_CONTRACT.md` for the underlying contract.

## Integration boundaries

- `dist/app.js`: presentation import/state, title-return page reset, mode launch
  visibility and campaign rendering/navigation block only.
- `dist/index.html`: only the `campaignConfig` subtree.
- `dist/styles.css`: campaign/welcome presentation rules only.
- `dist/service-worker.js`: adds the presentation module to the offline shell.
- Navigation QA routes now traverse Story and Chapter. Existing progression
  fixtures and revision assertions are retained. Horizontal chapter-strip tests
  are replaced by heading/page navigation coverage.
- The source branch's production-upgrade RNG comparison change is not imported.
  The current strict passive replay test is unchanged.
- Pause/options and authored-restart work are separate. No version, cache name,
  gameplay, mobile geometry or fullscreen change is included.

## Validation limits

Node tests exercise the real app functions against the repository's narrow DOM
fixture, actual rules, paid commands, codecs and storage. Presentation tests
cover every new and historical descriptor and assert descriptor/game immutability.
JavaScript syntax, runtime manifest and browser-fixture static checks are run.
The browser navigation spec is adapted for nineteen missions and current rules.

No browser, screenshots, physical-device pass or shared-browser action is part
of this local integration. Native keyboard behavior, touch, scroll/layout,
phone landscape and combined-head browser regression remain to be checked.
Do not publish these changed assets under the retained release/cache identity.
