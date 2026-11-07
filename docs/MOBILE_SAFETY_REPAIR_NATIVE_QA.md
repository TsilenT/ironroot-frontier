# Mobile safety repairs: bounded native review

Date: 2026-11-07 UTC. Independent, local-only review of the frozen repair candidate in `ironroot-flight-layout-repair-next`. **All requested bounded native checks passed.** No runtime edits, production interaction, upload, commit, PR, merge, or deployment occurred.

## Candidate and method

The parent explicitly froze both the mobile and flight repairs before source copying or preview startup. The supported `sites-preview start` command served an external temporary fixture at its exact returned URL, `http://127.0.0.1:4173/`. Original runtime files were copied unchanged; the original index was retained as `game.html` and loaded into an isolated iframe. The wrapper alone supplied viewport controls, CSS safe-area overrides, pre-start in-memory storage, observation, and explicitly labeled geometry checkpoints.

| Runtime file | SHA-256 |
| --- | --- |
| app.js | `3c6f021b864c9eea3311e159efb0357fe5f9b9370691368619ee1fd9392d1398` |
| styles.css | `f9a133decc1f3aef5515af2b7d796f765c4eb2b01fedfa3271ad71e896bb340f` |
| mobile-battlefield.js | `1c2a0d492e5bbaaca7e7788b97b18edd2d2993a967235014051e32dcd9d605b3` |
| render.js | `5d567675c6f1c523ea85233de8f4365e4bfb8312371715dfc8247be9b36d8dc2` |
| flight-visuals.js | `10eb5e93a6ea3ddd0ae29cecdd91e5f0833e898d60fb6376693c38a002c4e622` |

The final comparison covered all 49 runtime files against both the frozen source and copied preview: **zero mismatches**. Tests/docs could change independently; no test result is represented here as native browser evidence.

## 320×568: live safe-area changes

Used a valid saved Winter Stores mission with its two protected original mines and active coaching. The app resumed normally; its clock, simulation, and autosaving remained live. Applied top 12px, bottom 21px, left/right 8px through the existing inset variables **without changing the iframe size**.

| State | Header | Battlefield | Income rectangle |
| --- | --- | --- | --- |
| No insets | 72px high | x0, y72, 320×228 | x62.71875, y6, 29.59375×16 |
| Insets applied | 48px high | x8, y60, 200×383 | x60.546875, y14, 29.59375×16 |
| Insets removed | 72px high | x0, y72, 320×228 | Same as initial no-inset state |

- Insets immediately selected `protected-short-portrait`; removal returned to the taller portrait tracks.
- Income remained `+10 /s`, 11px font, complete and visibly inside the header/safe bounds. Its glyph center hit the income element. No collision with gold, coin, army, clock, or base-status row was found.
- All 11 observed controls were at least 44px in both dimensions, inside safe bounds, mutually noncolliding, and center-hit-testable. None covered the battlefield.
- Two apply/remove cycles produced the same geometry, with an advancing clock and no safety or ordinary Pause overlay. No accumulated drift occurred.
- Initial startup with the same insets passed. A bounded 1180×650 desktop transition and return to 320×568, while retaining the inset override, also returned to the same safe short layout without pausing.

Native screenshots confirmed the complete visible income and layout. The wrapper initially put the startup override before the app stylesheet, so that first attempt did not actually apply insets. Its selector precedence was corrected in the external fixture and the initial-inset check rerun with computed safe bounds verified. A wrapper-only measurement typo was also corrected before collecting these results. Neither change touched runtime source.

## 320×370 blocked, 320×400 explicit recovery

Started the protected coached save at 320×430, where the field was 216×278 and the coach was visible. Changed to 320×370 through the wrapper's native-click control.

**Unsafe 370 remains unsafe.** The field was 216×218, but the visible Hide control and minimap still intersected by 44×24px. The app correctly displayed “Battle paused for screen size” and “The controls need more space.” Resume was disabled. The ordinary Pause veil remained present but inert; a native screenshot and hit testing showed the safety prompt and actions above it. Both layers computed z-index 10, with the safety layer visibly winning the stack.

A 30-sample, three-second observation held all of the following throughout:

- Clock `00:03`; saved time `3.349999999999996`.
- Exact saved string unchanged, SHA-256 `2945a74e6cd08488ac73ab0bb0ce82bd8149742bb9d0117f67696513d1cc1ee4`.
- Resume disabled and the blocked title unchanged, with no transient Ready state observed.

**Recovery at the original 400px boundary passed.** The field became 216×248. The overlay changed to “Battle ready to resume,” with an enabled, hit-testable 304×44 Resume. A second 30-sample, three-second observation retained the same save and clock until explicit input.

One actual native mouse click on Resume restored live play, visible coaching, 44px controls, no control collisions, and no Pause/safety overlay. The clock progressed `00:03 → 00:26` before the next deliberate Pause. Two further 30-sample windows (`00:03 → 00:06` and `00:11 → 00:13`) kept coaching visible and never showed the safety overlay. The previously confirmed Resume/re-pause loop did not recur.

An additional ordinary **Pause → 370 unsafe → 400 safe** sequence also held the save/clock for three seconds at Ready. Explicit keyboard Enter on the safety Resume dismissed both overlays. A subsequent unsafe-screen **Save & return to title** preserved the exact held save and exposed `RESUME MISSION · WINTER STORES · 00:27` on the title screen. This is a bounded recovery/input check, not a full focus-traversal audit.

## Crowded flight labels: portrait and landscape

This was a clearly labeled **authored geometry checkpoint**, not ordinary play, balance, production timing, or AI evidence. Ordinary income funded eight paid aeries in addition to the two starting buildings. The checkpoint then supplied 128 engine-validated gryphons across every adjacent direction, eight warning and eight transit units per direction and side, alongside six existing ordinary units. Both sides stayed below the legal unit cap. The normal decoder admitted the save. A fixture-only frozen animation timestamp kept the geometry stable; the app runtime was unchanged.

At 390×650 and 844×390, native mouse selection chose a middle-road aerie, and the real Close button hid its inspector while preserving selection. Screenshots showed four two-direction YOU/FOE banners and selected-aerie `NEXT ↑`. All rows retained full 12px text: `↑ 1.2s×8 / AIR×8` and `↓ 1.2s×8 / AIR×8`. Labels remained distinct and visibly in front of building pennants and crowded actors.

Observed native Canvas2D pass-through bounds, in battlefield CSS pixels:

| Viewport | Committed banner x positions | Committed y positions | NEXT rectangle |
| --- | --- | --- | --- |
| 390×650 | 4.000, 221.406 | 149.533, 239.467 | x4.000, y125.533, 70×20 |
| 844×390 | 104.425, 423.019 | 92.100, 152.900 | x199.019, y68.100, 70×20 |

Every committed box was approximately 164.594×37. All five boxes stayed within the field, with 4px or greater separation apart from native matrix roundoff. Native transform roundoff was only a few millionths of a pixel. Pass-through observations showed the committed boxes/text after the actor draw calls and NEXT after the committed banners. This closes the reported crowded pennant occlusion at these two checkpoints; it is not an exhaustive route/camera matrix.

## Isolation and cleanup

- Inspected the existing browser inventory first. Only new review tab 77 was used. Original tabs 65–70, including both production tabs, were never opened or manipulated.
- Before the app started, iframe localStorage and sessionStorage were replaced by parent-owned in-memory Maps. Real storage was read only. Every completed measurement reported the memory backends and exact real-storage equality.
- Canonical all-key fingerprints were identical before and after the complete review:
  - Real localStorage: `a9c9b81a8ab25736ac9d1117cbcba27443990d65d2111088b2d3d4d801ae1104`.
  - Real sessionStorage: `44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a` (empty object).
- Closed review tab 77 and confirmed that the final inventory contained exactly original tabs 65–70. Stopped the supported preview and removed the temporary fixture. No browser reset, security setting change, alternate server/browser route, or production action occurred.
- Screenshots and measured observations are retained inline in the native review transcript, not exported/uploaded.

**Limits:** Cloud Chromium with real CSS-pixel iframe sizes and native/browser mouse and keyboard input. Insets were CSS-injected, not physical device safe-area signals. No physical touch/pen/controller, phone browser chrome, PWA/fullscreen, non-Chromium, or complete accessibility certification. No broad replay of the previously passed 124 flight checks. The final exact-candidate cloud gate and its original assertions remain separate requirements; this review does not authorize merge or deployment.
