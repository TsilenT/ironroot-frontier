# Flight UI QA: partial browser pass, blocked release gate

Date: 2026-11-07. Local-only review of version 0.16.0. No production runtime was edited by this review and nothing was published.

## Result

The owned-aerie inspector passed the completed 390×650 responsive checks. No new game defect was confirmed. The browser renderer repeatedly crashed with Chromium **Aw, Snap! Error code: 9**, including once on `about:blank`. This is an observed browser-renderer failure; its cause was not established, so it is not evidence of a confirmed flight-feature defect. The requested full browser matrix remains **incomplete**, not passed.

## Isolation and preview

- Copied runtime to `/workspace/shared/ironroot-flight-ui-preview`, with its own static `.openai/hosting.json` and private QA `dist/index.html`. The unchanged application HTML is `dist/game.html` there.
- Used only the supported `sites-preview start /workspace/shared/ironroot-flight-ui-preview` URL, `http://127.0.0.1:4173/`, and CUA browser/native-browser controls. No separate HTTP server, shell browser, browser restart, security change, or production-tab operation.
- The fixture replaces iframe `localStorage` and `sessionStorage` with parent-owned Maps before application startup. Shared localStorage is only read for equality/fingerprinting. No shared profile was cleared or seeded.
- The “Paid aerie checkpoint” is synthetic checkpoint setup using a real `Game({rulesetId:'frontier-flight-open', ai:false, seed:1717})`, normal initial gold, and a successful paid `build('aerie',550,450)`. It spends 250 of 420 gold. It is not evidence of an ordinary UI purchase. Subsequent selection, flight-order clicks, Enter activation, simulation and autosave used the actual application UI/runtime with its ordinary live clock.
- A later, clearly labeled synthetic frozen-animation-clock option was added only to the private fixture to prevent a battle finishing during slow CUA calls. Its first attempted application load crashed before the intended tests. **No passing result below depends on that option.** Its cause was not diagnosed, and the option remains unverified.
- Production tabs 57 and 58 were left untouched. Private review tab was 64.
- `sites-preview stop` succeeded; subsequent `sites-preview status` returned **Sites preview stopped**.

## Completed browser observations

### 390×650 owned middle-road aerie

Restored the paid checkpoint through the real Resume button, used Home, selected the owned aerie on the canvas, and inspected its real mobile drawer. Screenshot captures in the CUA task show the title/resume screen, owned aerie, and open inspector.

Iframe-local CSS-pixel measurements:

| Element | x | y | width | height |
| --- | ---: | ---: | ---: | ---: |
| Battlefield canvas | 0 | 72 | 390 | 426 |
| Command drawer | 0 | 150.219 | 390 | 347.781 |
| Aerie inspector | 12 | 162.219 | 366 | 323.781 |
| North road | 25 | 333.406 | 109.328 | 44 |
| Hold road | 140.328 | 333.406 | 109.344 | 44 |
| South road | 255.672 | 333.406 | 109.328 | 44 |
| Close building details | 321 | 175.219 | 44 | 44 |
| Minimap | 54 | 604 | 282 | 44 |

- The full inspector and its text fit without an internal clipped region at this size. Drawer and inspector scroll heights matched their client heights. Document dimensions were exactly 390×650.
- Initial state read “Next launch: hold middle road.” Hold was selected.
- Clicking North changed the current-order text and `aria-pressed` to North and showed the “Future gryphons…” toast.
- Enter on South changed the selected plan. The actual South element retained focus and had a visible `rgb(255,244,201) solid 3px` outline.
- Future-only help was readable: “Orders affect future launches. Airborne gryphons keep their route. Crossing takes time and leaves them open to archers.”
- A later ordinary autosaved checkpoint at time 105.30s had aerie id 3, source lane 1, plan 2. Gryphons id 22 and 26 retained routes `{from:1,to:0,phase:'done',remaining:0}`, while id 29 had `{from:1,to:2,phase:'done',remaining:0}`. This supports future-only behavior across UI replanning and autosave. It does **not** establish a full UI reload round trip.

### 320×568 partial check

- Resizing the live iframe to 320×568 succeeded, and the document remained exactly 320×568. Battlefield rect was `(0,72,320,344)`, ending at y=416. The viewport safety modal was not shown.
- Resize dismissed the current selection. The ordinary build drawer could open and close. Captured screenshots show the battlefield and navigation at this size.
- The intended owned-aerie reselection/measurement was not completed before the live battle ended. A later fresh fixture attempt crashed. **There is no 320×568 inspector pass.**

## Profile integrity evidence

Initial read-only SHA-256 of the complete sorted shared localStorage snapshot:

`a9c9b81a8ab25736ac9d1117cbcba27443990d65d2111088b2d3d4d801ae1104`

Every completed measurement reported `memoryStorage:true` and `allSharedKeysExact:true`. The fixture's subsequent top-level reload captured the **same** SHA-256 before the final failed load. That is the last successful fingerprint observation. The final crash prevented a separate final Verify-button run. Report the shared profile as unchanged **through the last successful read**, rather than claiming an after-crash comparison. No action attempted a shared-profile write.

## Browser failure sequence

1. Binding the existing private tab 62 timed out in `Runtime.addBinding`; it was not navigated or edited.
2. New private tab 64 was created. Its first supported preview navigation timed out in `Page.enable`; native CUA screenshot showed Error 9 even though the address was still `about:blank`.
3. One native CUA address-bar navigation to the exact supported preview URL recovered the tab. The browser binding then worked, and the live-clock checks above completed.
4. After fixture refresh, selecting the narrow paid-checkpoint fixture succeeded as an attempted UI action, but Resume evaluation timed out. Native screenshot showed Error 9 at the preview URL. No further browser routes were attempted.
5. Sent CUA completion summary **Reviewed flight controls before crash**, then stopped the preview.

Screenshots were captured inline by CUA, including the successful 390px inspector and the final renderer-error page. They were not exported as local image files. Do not treat source-derived rectangles as screenshot evidence for unvisited sizes.

## Source and focused-test follow-up

Read the flight kernel/visual contracts and reviewed the inspector/route presentation integration. The source keeps mobile inspectors in the existing scrolling command drawer. Order buttons specify 44px minimum width and height; mobile close/actions also specify 44px. Desktop inspector overflow is separately bounded. These rules are useful implementation evidence, **not a substitute for uncompleted actual layout checks**.

The lead subsequently fixed grouped countdown consistency and delayed enemy-warning announcement retention. Copied `app.js`, `flight-orders-view.js`, and `flight-visuals.js` into the isolated preview at the refresh boundary. No completed browser pass of these final copies followed the refresh. The final focused test run was:

```text
node --test tests/flight-campaign-teaching.test.mjs tests/flight-orders-view.test.mjs tests/flight-visuals.test.mjs
30 passed; 0 failed
```

This covers source/VM contracts for future-only orders, blocked modal/paused/profile actions, read-only Pause route rows, legacy gating, optional fresh revision-3 Wings/Stonegate teaching versus restored/completed attempts, earliest positive-tenths warning text, retained announcements, all flight-map geometry, grouped/crowded signal computation, fixed-pixel labels, reduced-motion essentials, and nonmutating canvas calls. It does not establish native focus trapping, actual screen-reader output, animation readability, touch handling, physical-phone behavior, or audio quality.

## Remaining browser release gates

- Own-aerie North/Hold/South inspector and reachable 44px controls at 320×568, 844×390, and desktop; repeat final-copy 390×650 after the two feedback fixes.
- Ordinary UI-paid construction, outer-road option hiding, and actual Save/Return/Resume or reload continuity.
- Native keyboard traversal/focus restoration and disabled order controls behind Pause/options/other dialogs.
- Expanded read-only Pause **Air routes**, with mixed approach/warning/transit groups and latest earliest-countdown text.
- Actual two-second warning, transit, selected NEXT preview, minimap, crowded banners and objective layering at all required sizes; reduced-motion comparison.
- Fresh Wings and Stonegate optional paused teaching UI, paid planning/resume, and resumed-old-battle behavior in the browser.

Do not close these gates from the passing focused suite or this partial responsive check.
