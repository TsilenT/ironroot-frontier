# Phone viewport native-browser QA

Date: 2026-11-06 UTC. Baseline and fixed-runtime verification completed. See the fixed-runtime section below for the current result.

## Scope and method

Native Chromium, supported managed preview at `http://127.0.0.1:4173/`, actual game UI and actual rendered DOM rectangles. The temporary `dist/__qa_phone.html` developer fixture loads the unmodified app HTML/CSS/modules into a responsive same-origin iframe. The iframe receives isolated in-memory localStorage/sessionStorage before app startup, so gameplay does not write the shared browser profile. No production tabs or pre-existing art-study tab were changed.

This is **not** physical-phone, iOS Safari, touchscreen, browser-chrome, or safe-area-device verification. The iframe accurately produces the measured CSS viewport dimensions. The synthetic visualViewport cases below deliberately replace only that interface in the developer fixture; they are distinctly synthetic, not observations of actual address-bar movement.

Runtime baseline SHA-256:
-  app.js: `b4fdc2702bf22bc7aeeb9c5fe1b210a1374b4fdb17728e7c3b2d266227095f42`
-  styles.css: `8eca0c80f80065cc02ae66b846ed33bcc8c16b4301336bafd1e599a9d55cd63c`
-  mobile-battlefield.js: `7344944d0203bfa7f22e669fb36e7f7bb31dc8440d695d08d75f9530b1f31f65`
-  index.html: `901a80e93200f09806f4ca772bef20949dcaf6e893237738b4f7131186e42522`

## Reproduced findings

### 1. Short effective viewports genuinely fail

Started First Watch through its actual Begin Mission button at 667×300. Actual canvas rect was left0, top48, right515, bottom240 (515×192). Header48px and dock60px leave only192px for the world, below the212px guard. The visible modal said **Battle paused for screen size**, reason **The battlefield needs more visible space**, Resume was disabled, and game time remained00:00.

Navigation is also genuinely overlapping at this size: Sound is x545–589/y104–148, Home is x536.09375–580.09375/y140–184. Their8px vertical intersection means lowering the world minimum alone is not a safe correction.

390×430 likewise leaves a390×206 canvas and is blocked for insufficient battlefield space.

Screenshots: [667×300 baseline](phone-qa/phone-667x300-baseline.jpg), [390×430 baseline](phone-qa/phone-390x430-baseline.jpg).

### 2. Ordinary phone sizes fit in the native iframe

All dimensions below are the measured iframe viewport, not merely the requested preset. Every safe row has its required navigation controls within the viewport at44px or larger, and no overlap reported by the game's geometry checker over actual DOM rects.

| Viewport | Canvas rectangle L,T,R,B | Canvas size | Geometry |
|---|---|---|---|
|320×480|0,72,320,328|320×256|Safe|
|360×640|0,72,360,488|360×416|Safe|
|390×650|0,72,390,498|390×426|Safe|
|393×700|0,72,393,548|393×476|Safe|
|667×375|0,48,515,315|515×267|Safe|
|740×320|0,48,588,260|588×212|Safe, minimum boundary|
|844×390|0,48,692,330|692×282|Safe|
|915×412|0,48,763,352|763×304|Safe|
|390×560|0,72,390,408|390×336|Safe|
|667×300|0,48,515,240|515×192|Blocked|
|390×430|0,72,390,278|390×206|Blocked|

The matrix was a resize/recovery test on the same First Watch instance after the initial blocked start. Safe rows correctly showed **Battle ready to resume**, enabled Resume, and retained00:00 rather than silently restarting. Initial fresh320×480 and390×650 starts were independently safe with no viewport modal. Explicit viewport Resume was clicked successfully after restoring the native390×650 viewport, removing the modal and returning the Pause control to its running label.

Raw exact rectangles, control dimensions, visible reason, profile checks and timestamps: [baseline measurements](phone-qa/baseline-measurements.json).

### 3. Synthetic visualViewport proves layout/safety mismatch

At native390×650, First Watch has canvas390×426, header y0–72, dock y498–554, navigation y554–650. It starts safely.

Using a developer-only visualViewport stub while leaving the iframe/layout dimensions unchanged:

| Synthetic change | Safety viewport | Result |
|---|---|---|
|Clip50px from bottom|x0–390,y0–600|Blocked: navigation extends to650|
|offsetTop1px|x0–390,y1–650|Blocked: header starts at0|
|Clip50px + offsetTop10px|x0–390,y10–610|Blocked: header/navigation outside viewport|
|Restore native|x0–390,y0–650|Ready to resume; no automatic restart|

All three synthetic unsafe cases showed the actual size-pause modal, disabled Resume and the reason **Part of the battlefield or its controls is outside the visible screen**, despite the unchanged426px battlefield. This corroborates a layout/safety-coordinate mismatch: layout uses the full available root, while the guard uses visualViewport bounds. It does not establish that a particular physical browser currently presents those values.

[Clip screenshot](phone-qa/phone-synthetic-clip-baseline.jpg), [synthetic raw measurements](phone-qa/synthetic-viewport-baseline.json).

## Preservation and limits

Initial and final shared-profile verification found exactly the same five ironroot.* keys, SHA-256 `a9c9b81a8ab25736ac9d1117cbcba27443990d65d2111088b2d3d4d801ae1104`. All shared keys, including unrelated keys, remained exact. No profile replacement or restoration was necessary.

Protected-objective-specific dock testing was pending during the baseline pass and was completed during fixed-runtime verification below. No claims are made about physical safe-area insets, iOS fullscreen, or touch gestures.

A fixture implementation issue in the earliest exploratory667×375 reading allowed flex shrink to618px. It was corrected with `flex:none`; that exploratory reading is excluded. All table rows and exported baseline measurements come after correction and match the stated dimensions.


## Fixed-runtime verification

### Result

The reproduced false size blocks are repaired in native Chromium using actual rendered game DOM. At 390×650, synthetic50px visualViewport clipping,1px top offset, and combined50px clipping/10px top offset all remain safe with no viewport modal. The world changes to match visible bounds rather than being compared against mismatched coordinates. Clock advanced00:00→00:02 during these changes.

The two genuine short-size blockers now fit through reflow:
- 667×300 ordinary battle:391×300 world,276px sidebar, no modal.
- 390×430 ordinary battle:390×242 world, no modal.

[First fixed measurements](phone-qa/phone-first-fix-evidence.json), [fixed clipping screenshot](phone-qa/phone-synthetic-clip-fixed.jpg), [fixed landscape](phone-qa/phone-667x300-fixed.jpg), [fixed short portrait](phone-qa/phone-390x430-fixed.jpg).

### Actual UI interactions

At 667×300, First Watch:
1. Opened Build and selected Barracks.
2. Clicked a visible green site. The game showed “Barracks raised. First troops in a moment.” Gold decreased consistently with its140gold cost plus intervening income; a warrior subsequently spawned.
3. Used Cancel placement, which returned the control to Build.
4. Paused at 00:40.
5. Save & return to title produced “RESUME MISSION · FIRST WATCH ·00:40” in the actual menu. This save remained only in fixture memory.

[Paid-build/pause screenshot](phone-qa/phone-paid-build-paused.jpg).

Winter Stores in a synthetic unlocked, memory-only campaign profile was entered through actual chapter/mission/Begin controls. The Aerie card at the end of the build list was reachable, selectable, and cancellable at 667×300. The drawer sits over the391px world next to the276px persistent sidebar; it does not occupy the sidebar itself.

### Protected-objective matrix

All rows below used a running Winter Stores mission, with actual protected originals and actual44px-or-larger target controls. Every row returned safe geometry with no viewport modal.

|Viewport|Canvas size|Protected target button size|
|---|---|---|
|320×480|320×276|151×45.578125|
|360×640|360×388|171×45.578125|
|390×650|390×398|186×45.578125|
|393×700|393×448|187.5×45.578125|
|667×375|515×267|194×47|
|740×320|464×320|129×44|
|844×390|692×282|253×47|
|915×412|763×304|276.671875×47|
|390×430|390×226|186×45.578125|
|667×300|391×300|129×44|

Actual +10/s income text in the667×300 sidebar occupied x450.28125–471.796875, y4–24, inside its72px header. Full names, health, time and objective text were visually checked. [Protected measurements](phone-qa/protected-fix-measurements.json).

### Synthetic safe-area CSS and tiny-screen negatives

These are deliberately synthetic CSS inset overrides, not device safe-area measurements:
- 667×300 with left24/right24/bottom16 gives a343×284 world, safe.
- 390×650 with top24/bottom20 gives a390×354 world, safe.

Safety remains active where space truly runs out:
- 320×300 yields a44px-wide world, blocks with Resume disabled and frozen00:00.
- 667×240 protected layout requires252px height, extends outside the viewport and remains blocked.
- Restoring667×300 presents “Battle ready to resume”; the game stays paused until explicit Resume.

[Protected and boundary measurements](phone-qa/protected-fix-and-boundaries.json).

### Missing and critical labels

An actual undefended Winter Stores run lost both mines at 00:43.70. Inspect battlefield showed the original names and “Original missing” state. This exposed a minor text-layout issue: the two-line missing label pushed each name1.375px above its44px target button. [Actual missing-state evidence before correction](phone-qa/phone-protected-missing.jpg).

After the CSS correction, the exact previously observed names/missing label were rendered in a **synthetic static presentation** cloned from the game DOM with all app scripts removed. Both names fit at y113.21875–127.609375 and the now single-line missing label at y130.609375–143.796875 within buttons y108–152. The hidden Focus hint no longer reserves a column.

The same static presentation rendered20% HP · Critical. Both names, critical text and focus arrows were visibly readable within the same129×44 controls. This verifies critical **presentation**, not a captured live critical transition; the short live critical interval was not captured. [Synthetic label measurements](phone-qa/phone-synthetic-labels-fixed.json), [missing label fixed](phone-qa/phone-synthetic-lost-labels-fixed.jpg), [critical label presentation](phone-qa/phone-synthetic-critical-labels-fixed.jpg).

### Final identities, cleanup and verification limits

Final runtime SHA-256:
- app.js:15c94620a526ad43afe5d3e0a801b27436089fd85176997c36d18e8072e3c519
- styles.css:e69bcb4c566437cbc9fd971d489bc0c4e7fa6b4d6026d03d9b5a2f103a670b9e
- mobile-battlefield.js:2abe208e1a68c75969a6776f0a9f41b95c1f6dbe7f0091b7adb56817ebc9f3dd
- index.html:901a80e93200f09806f4ca772bef20949dcaf6e893237738b4f7131186e42522

The initial ordinary interaction check preceded a small fractional-viewport fit-cache correction. The protected matrix and bounds checks ran after that correction. The final synthetic label check ran after the lost-label CSS correction. Fractional visualViewport hardware behavior itself was not exercised.

Final shared-profile comparison remained exact for all keys; the five game keys retain the original SHA-256 a9c9b81a8ab25736ac9d1117cbcba27443990d65d2111088b2d3d4d801ae1104. No restoration was needed. QA tab 45 was closed. Browser inventory then contained only the original two production tabs and the art-study tab, all untouched. The temporary dist fixture was removed, with its generic reproducible source retained at qa/phone-viewport/native-fixture.html and mount instructions alongside it. The fixture contains no captured profile values or user-uploaded screenshot.

Not verified: physical Android/iOS browsers, touch input, real address-bar movement, device safe-area behavior, installed-PWA display mode, OS fullscreen or fullscreen controls. The browser tool exposes no standalone-display emulation. These native desktop/iframe results must not be presented as physical-phone or installed-PWA certification. Fullscreen/mouse controls were outside this worker's scope.

### Subsequent bounded source-review correction

After native cleanup, two explicit short-portrait ordinary-mode grid-column declarations corrected a selector-specificity conflict between objective progress and its countdown. This did not change the protected layouts exercised above. The final stylesheet hash is `20d6b490387b078e2338f95b2a9204bdd5f920ceceb854b7d0034ab1563d8d5a`; this two-line delta was source-reviewed and receives new browser non-overlap assertions, but was not included in the native UI pass. The other three runtime hashes above are unchanged. This distinction is intentional.
