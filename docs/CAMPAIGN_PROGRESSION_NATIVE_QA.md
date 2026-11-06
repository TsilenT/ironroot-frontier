# Campaign progression: native browser QA

Date: 2026-11-06. This is a partial, independently operated native-browser review of the managed local preview at `http://127.0.0.1:4173/`. Nothing was published or deployed. Production tabs were not operated.

## Scope and interruption

The intended review covered the three new opening battles, earned-roster continuation into Emberwatch, and small-screen menus and field guide. Work was stopped at the parent's request to prioritize the user's urgent phone screen-size blocker. The original local preview profile was restored and verified before releasing the browser.

**Do not treat this report as a full campaign, release, balance, or mobile pass.** The native runs do not establish novice success rates or human balance.

## Verified through normal UI

- A fresh temporary profile opens **Campaign**, not Skirmish. The title displays **19 missions**, **0/57 stars**, and **Company roster: 2/8 buildings**. Roadside Watch is selected.
- Selecting the locked Shield at the Fork card shows its briefing but disables the launch button as **MISSION LOCKED**. Its unlock text names Roadside Watch.
- Roadside Watch has one visible lane and only two ordinary paid build cards: Barracks (140) and Archery (175). Its coaching is integrated into the normal command deck, with highlighted choices and a suggested site. No separate free-construction path was used.
- Three barracks were placed and a level-2 upgrade was purchased through normal controls. Gold changed and the regular construction/upgrade messages appeared. No scripted gameplay moves, injected engine calls, free gold, or altered simulation speed beyond the normal 1×/2× control were used.
- Mid-battle Pause → Field guide → Units & economy listed only Warrior and Archer for the restricted active roster. The guide opened without an observed crash.
- Save & return to title → reload → Resume retained the Roadside battle at approximately 00:24, its three barracks, and its two-card active roster. The resumed battle used 1× until the normal speed button was pressed again.
- A barracks-only clear recorded **2 stars** and unlocked **Company roster: 5/8 buildings** plus Shield at the Fork. The first result dialog was not observed reliably because of a managed-preview live-reload interruption described below.
- A second, uninterrupted barracks-only Roadside replay won at **00:52**, with three buildings raised and six enemies felled. Its result showed **★★☆**, the completed barracks objective, the unmet archery objective, **CONTINUE CAMPAIGN**, and **Replay for more stars** simultaneously.
- Pressing **Replay for more stars** immediately launched a new Roadside battle with 420 gold and the earned five-card roster: Barracks, Archery, Watchtower, Gold mine, and Warden lodge. No extra stars were required for that roster.
- After pausing and saving that optional replay, Shield at the Fork could be selected and started. It displayed two roads, 740 starting gold, three marked targets, and five paid build cards. Its coaching pointed to Warden lodge and explained its low damage and need for ranged support. It was stopped and paused at approximately 00:06, before construction, when the urgent task arrived.

## Explicitly not verified

- The result screen's **Continue Campaign** button was present but not clicked. Replay was tested instead.
- A paid Rootwarden-plus-archer clear of Shield at the Fork.
- The second win's unlock reward, Open Three Roads, its full eight-card roster, or continuing into Emberwatch with Rootwarden retained.
- Small portrait/landscape usability, mobile pause recovery, touch controls, physical devices, or controller behavior. A responsive fixture was prepared but no iframe was opened.
- The **All buildings** expansion path. It was not presented in the observed first-battle desktop controls. The native UI showed only the earned roster, but engine gating and hidden-control behavior remain separate source-test coverage.
- Native inspection of protocol-4 bytes. The task owner has separate foundation/codec tests; this review did not use hidden application state to verify the new marker.
- Existing ongoing historical battle compatibility. The original preview profile had no battle key, and its data was preserved rather than used as a migration test.
- Full console-error coverage, aggregate tests, offline/service-worker release integrity, or final runtime hashes after later integration fixes.

## QA interference and limits

A temporary responsive-fixture file was created inside the isolated preview copy during the first battle. The managed preview's live reload returned the page to the title, where the completed two-star record and new five-building roster were visible. That run therefore supports a recorded clear/unlock, but not a reliable observation of the result transition. No further preview files were written during the clean 00:52 replay. The second result dialog was directly observed and captured.

A locator wait for the result heading returned a selector-deadline error before the heading appeared. The next ordinary UI observation showed the completed mission. This was not treated as an application failure.

The parent later mentioned a field-guide fix being synchronized. This report only claims behavior directly observed in the tested preview; it does not claim verification of all later code changes. The restricted guide had opened successfully during this review.

## Profile preservation and cleanup

The browser API did not expose an isolated browser context. Before any game profile replacement:

1. The existing preview art-study tab was inspected without changing it. It showed a static study with no embedded game, and its visible description explicitly stated no storage/profile access. Production tabs remained untouched.
2. A preview-only fixture with explicit UI controls captured the raw strings of all `ironroot.*` keys. It had no automatic storage writes and imported no application code.
3. The original snapshot was exported to a private local file, parsed as JSON, and independently checked for exact byte length and SHA-256 before activation.
4. Only the captured `ironroot.*` keys were removed to activate the empty temporary QA profile. There were no unrelated keys, and the fixture verified that unrelated storage remained unchanged.
5. On interruption, the QA game tab was closed. No QA iframe had been opened. The fixture restored every original key and string, removed temporary game keys absent from the original, then compared the restored data byte-for-byte.

**Restoration verified:** game keys match `true`; unrelated keys match `true`; the before/after SHA-256 is `a9c9b81a8ab25736ac9d1117cbcba27443990d65d2111088b2d3d4d801ae1104`.

The original capture contains five keys and is 2,405 UTF-8 bytes. It includes historical campaign, history, settings, trials, and the original protocol-2 profile marker. It is private QA recovery data, not a user deliverable.

## Private artifacts

- Screenshot: `/workspace/scratch/d86b57250ea4/qa-roadside-two-stars.jpg` (clean 00:52 two-star result with Continue and Replay).
- Recovery snapshot: `/workspace/scratch/d86b57250ea4/ironroot-preview-original-exact.json` (do not publish).
- Preview-only helper: `/workspace/shared/ironroot-campaign-preview/dist/__qa_profile.html`.
- Unused responsive helper: `/workspace/shared/ironroot-campaign-preview/dist/__qa_profile_responsive.html`.

The two helper files are outside source runtime and were not added to precache. They remain for the parent to remove at a safe time because deleting preview files can also trigger live reload. This worker made no further preview writes after the stop instruction.
