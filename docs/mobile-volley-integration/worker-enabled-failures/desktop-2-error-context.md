# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: volley-independent.spec.mjs >> independent: native history readiness >> candidate seeded-reload: Back/Forward markers, targeting, Resume and profile
- Location: qa/browser/volley-independent.spec.mjs:68:5

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 4
Received: 5
```

# Page snapshot

```yaml
- generic [ref=f1e1]:
  - generic [ref=f1e2]:
    - banner [ref=f1e3]:
      - link "Ironroot Frontier home" [ref=f1e4] [cursor=pointer]:
        - /url: ./
        - generic [ref=f1e5]: ♜
        - generic [ref=f1e6]:
          - text: IRONROOT
          - generic [ref=f1e7]: F R O N T I E R
      - generic [ref=f1e8]:
        - generic [ref=f1e10]: SOLO SKIRMISH
        - generic [ref=f1e11]: /
        - generic [ref=f1e12]: THE IRON MARSHAL
      - generic [ref=f1e13]:
        - generic [ref=f1e14]:
          - generic [ref=f1e15]: ◆
          - generic [ref=f1e16]: "425"
          - generic [ref=f1e17]: +5 /s
        - generic [ref=f1e18]:
          - generic [ref=f1e19]: ⚑
          - generic "0 / 70 army capacity" [ref=f1e20]: "0"
          - generic [ref=f1e21]: ARMY
        - generic [ref=f1e22]:
          - generic [ref=f1e23]: 00:01
          - generic [ref=f1e24]: BATTLE TIME
    - main [ref=f1e25]:
      - 'generic "Battlefield. Choose a building, then a green build slot to place it once. Hold Shift with a mouse click to keep building. Drag or middle mouse drag to explore. Right-click or Escape cancels placement. Pan left: Left arrow. Pan right: Right arrow. Battle keyboard controls are in Options." [ref=f1e26]'
      - generic:
        - generic:
          - generic: YOUR CITADEL
          - generic: 100%
        - generic:
          - text: THE LONG REACH
          - generic: THREE LANES · 24 SITES
        - generic:
          - generic: ENEMY CITADEL
          - generic: 100%
      - status [ref=f1e27]
      - generic [ref=f1e28]:
        - button "Resume game" [ref=f1e29] [cursor=pointer]: ▶
        - button "Change battle speed" [ref=f1e30] [cursor=pointer]: 1×
        - button "Enable audio" [ref=f1e31] [cursor=pointer]: ♪
        - button "Open options" [ref=f1e32] [cursor=pointer]: ⚙
      - generic: DRAG to explore · TAP a building to manage it
      - status: Battle resumed.
      - generic [ref=f1e33]:
        - button "Go to your base" [ref=f1e34] [cursor=pointer]: ⌂
        - generic "Map overview. Tap to move the camera." [ref=f1e35] [cursor=pointer]
        - button "Follow the frontline" [ref=f1e36] [cursor=pointer]: ⚔
    - region "Building controls" [ref=f1e37]:
      - generic [ref=f1e38]:
        - generic [ref=f1e39]: BUILD YOUR FRONTIER
        - generic [ref=f1e40]: Scroll for more buildings. Choose one, then tap a green slot.
      - generic [ref=f1e41]:
        - generic [ref=f1e42]:
          - 'button "Barracks, 140 gold. Spawns shielded warriors. Absorbs arrows and protects your archers. Keyboard: 1." [ref=f1e43] [cursor=pointer]':
            - generic [ref=f1e44]: "1"
            - generic [ref=f1e52]:
              - heading "Barracks" [level=3] [ref=f1e53]
              - generic [ref=f1e54]: Shielded warriors
            - generic [ref=f1e55]: ◆ 140
          - 'button "Archery range, 175 gold. Spawns fragile ranged archers. Best behind a warrior screen. Keyboard: 2." [ref=f1e56] [cursor=pointer]':
            - generic [ref=f1e57]: "2"
            - generic [ref=f1e66]:
              - heading "Archery" [level=3] [ref=f1e67]
              - generic [ref=f1e68]: Ranged support
            - generic [ref=f1e69]: ◆ 175
          - 'button "Siege foundry, 270 gold. Slow siege engines crush towers and splash tightly packed troops. Keyboard: 3." [ref=f1e70] [cursor=pointer]':
            - generic [ref=f1e71]: "3"
            - generic [ref=f1e80]:
              - heading "Foundry" [level=3] [ref=f1e81]
              - generic [ref=f1e82]: Structure breaker
            - generic [ref=f1e83]: ◆ 270
          - 'button "Watchtower, 220 gold. Powerful defense, but no troops. Siege engines break its walls. Keyboard: 4." [ref=f1e84] [cursor=pointer]':
            - generic [ref=f1e85]: "4"
            - generic [ref=f1e93]:
              - heading "Watchtower" [level=3] [ref=f1e94]
              - generic [ref=f1e95]: Hold the line
            - generic [ref=f1e96]: ◆ 220
          - 'button "Gold mine, 190 gold. Adds 2.5 gold per second. Fragile economy; maximum 3 mines. Keyboard: 5." [ref=f1e97] [cursor=pointer]':
            - generic [ref=f1e98]: "5"
            - generic [ref=f1e106]:
              - heading "Gold mine" [level=3] [ref=f1e107]
              - generic [ref=f1e108]: Grow your economy
            - generic [ref=f1e109]: ◆ 190
          - 'button "Arcane sanctum, 230 gold. Spawns wizards. Ground splash ignores shields, but cannot target flyers. Keyboard: 6." [ref=f1e110] [cursor=pointer]':
            - generic [ref=f1e111]: "6"
            - generic [ref=f1e119]:
              - heading "Sanctum" [level=3] [ref=f1e120]
              - generic [ref=f1e121]: Magic & splash
            - generic [ref=f1e122]: ◆ 230
          - 'button "Gryphon aerie, 250 gold. Spawns flying gryphons. Evade melee and siege; vulnerable to archers. Keyboard: 7." [ref=f1e123] [cursor=pointer]':
            - generic [ref=f1e124]: "7"
            - generic [ref=f1e132]:
              - heading "Aerie" [level=3] [ref=f1e133]
              - generic [ref=f1e134]: Flying raiders
            - generic [ref=f1e135]: ◆ 250
          - 'button "Warden lodge, 210 gold. Durable melee screen. Low damage needs ranged support. Keyboard: 8." [ref=f1e136] [cursor=pointer]':
            - generic [ref=f1e137]: "8"
            - generic [ref=f1e144]:
              - heading "Warden lodge" [level=3] [ref=f1e145]
              - generic [ref=f1e146]: Durable front line
            - generic [ref=f1e147]: ◆ 210
        - button "Arrow volley, 75 gold. Paused." [disabled] [ref=f1e148] [cursor=pointer]:
          - generic [aria-hidden] [ref=f1e149]: ✦
          - generic [ref=f1e150]: Arrow volley
          - generic [ref=f1e151]: Area damage to troops
          - generic [ref=f1e152]:
            - text: ◆ 75
            - emphasis [ref=f1e153]: Paused
  - dialog "Paused" [ref=f1e155]:
    - banner [ref=f1e156]:
      - generic [ref=f1e157]: BATTLE MENU
      - heading "Paused" [level=2] [ref=f1e158]
      - paragraph [ref=f1e159]: Skirmish · 00:01 · 1× speed
    - generic [ref=f1e160]:
      - heading "Classic" [level=3] [ref=f1e161]
      - paragraph [ref=f1e162]: Destroy the enemy citadel.
    - button "Resume battle" [active] [ref=f1e163] [cursor=pointer]:
      - text: Resume battle
      - generic [aria-hidden] [ref=f1e164]: →
    - generic [ref=f1e165]:
      - button "Options Audio, display & saves" [ref=f1e166] [cursor=pointer]:
        - text: Options
        - generic [ref=f1e167]: Audio, display & saves
      - button "Open field guide" [ref=f1e168] [cursor=pointer]:
        - text: Field guide
        - generic [ref=f1e169]: Units, controls & economy
    - status [ref=f1e170]: Checkpoint saved on this device. You can return to this battle from the title screen.
    - generic [ref=f1e171]:
      - button "Save & return to title" [ref=f1e172] [cursor=pointer]
      - button "Restart battle…" [ref=f1e173] [cursor=pointer]
```

# Test source

```ts
  29  |   await expect(page.locator('#rally')).toHaveAttribute('aria-pressed', 'true');
  30  |   await expect(page.locator('#battle')).toHaveClass(/placing/);
  31  |   await noDrawer(page);
  32  | }
  33  | async function unarmed(page) {
  34  |   await expect(page.locator('#rally')).toHaveAttribute('aria-pressed', 'false');
  35  |   await expect(page.locator('#battle')).not.toHaveClass(/placing/);
  36  | }
  37  | function noCast(checkpoint, gold = 420) {
  38  |   expect(checkpoint.game.state.spellCooldown[0]).toBe(0);
  39  |   expect(checkpoint.game.state.gold[0]).toBeCloseTo(gold + 5 * checkpoint.game.state.time, 1);
  40  | }
  41  | async function start(page) {
  42  |   const game = new Game({seed:77201, ai:false, rulesetId:DEFAULT_SKIRMISH_RULESET_ID});
  43  |   const fixture = trainingProfileFixture().values;
  44  |   fixture[SAVE] = JSON.stringify(encodeBattle(game, scenarioForBattle(null, null, game)));
  45  |   await seedOnce(page, fixture);
  46  |   const persistent = await profile(page);
  47  |   await press(page, '#resumeSaved');
  48  |   await expect(page.locator('#welcome')).toBeHidden();
  49  |   await expect(page.locator('#viewportModal')).toBeHidden();
  50  |   return persistent;
  51  | }
  52  | async function pause(page) {
  53  |   await press(page, '#pause');
  54  |   await expect(page.locator('#pauseVeil')).toBeVisible();
  55  |   return saved(page);
  56  | }
  57  | 
  58  | test.describe('independent: native history readiness', () => {
  59  |   // Both compared heads use the same storage, native timing and SW policy.
  60  |   const serviceWorkers = process.env.VOLLEY_HISTORY_SERVICE_WORKERS === 'allow' ? 'allow' : 'block';
  61  |   test.use({serviceWorkers});
  62  |   const heads = process.env.VOLLEY_HISTORY_COMPARE_BASE === '1' ? ['candidate','base'] : ['candidate'];
  63  |   // The shipping worker serves index.html for same-origin navigation, so the
  64  |   // plain-text prior-document exit fixture belongs to the blocked-worker slice.
  65  |   // Worker-controlled coverage keeps the complete seeded-reload assertions.
  66  |   const setups = serviceWorkers === 'allow' ? ['seeded-reload'] : ['fresh-document','seeded-reload'];
  67  |   for (const head of heads) for (const setup of setups) {
  68  |     test(`${head} ${setup}: Back/Forward markers, targeting, Resume and profile`, async ({page,context}, info) => {
  69  |       const trace = await observeVolleyHistory(page);
  70  |       const detail = {head,setup,serviceWorkers,base:VOLLEY_BASE,baseAccess:'Native KeyR on base because mobile Volley is hidden; no Build entry is added. Candidate uses its visible button.'};
  71  |       try {
  72  |         if (head === 'base') {
  73  |           expect(serviceWorkers, 'base diagnostics must stay isolated from service workers').toBe('block');
  74  |           detail.runtime = await serveVolleyBase(context);
  75  |         }
  76  |         const game = new Game({seed:77201,ai:false,rulesetId:DEFAULT_SKIRMISH_RULESET_ID});
  77  |         const fixture = trainingProfileFixture().values;
  78  |         fixture[SAVE] = JSON.stringify(encodeBattle(game,scenarioForBattle(null,null,game)));
  79  |         if (setup === 'fresh-document') {
  80  |           // Seed on a real same-origin prior document; first app load has no
  81  |           // stale app marker and must eventually Back out to this real page.
  82  |           await page.goto('/FONTS-NOTICES.txt?volley-history-exit');
  83  |           await page.evaluate(values => {for (const [key,value] of Object.entries(values)) localStorage.setItem(key,value);},fixture);
  84  |           await page.goto('/');
  85  |         } else await seedOnce(page,fixture);
  86  |         if (serviceWorkers === 'allow') {
  87  |           // app.js intentionally skips registration on localhost. Register the
  88  |           // unchanged shipped worker in this secure loopback context; this is
  89  |           // real worker/cache control, not production-origin certification.
  90  |           await page.evaluate(() => navigator.serviceWorker.register('/service-worker.js', {updateViaCache:'none'}));
  91  |           await page.evaluate(() => navigator.serviceWorker.ready);
  92  |           await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller?.scriptURL)).toMatch(/\/service-worker\.js$/);
  93  |           const keys = await page.evaluate(() => caches.keys());
  94  |           expect(keys).toContain('ironroot-v0.18.2');
  95  |           detail.shippingWorker = {controller:await page.evaluate(() => navigator.serviceWorker.controller.scriptURL),cacheKeys:keys,registration:'explicit loopback QA registration; app skips localhost'};
  96  |         }
  97  |         const persistent = await profile(page);
  98  |         await press(page,'#resumeSaved');
  99  |         await expect(page.locator('#welcome')).toBeHidden();
  100 |         await expect(page.locator('#viewportModal')).toBeHidden();
  101 |         await trace.ready();
  102 |         const baseline = await trace.mark('pre-arm baseline');
  103 |         if (head === 'candidate') await arm(page);
  104 |         else {
  105 |           await page.locator('#battle').focus();
  106 |           await page.keyboard.press('KeyR');
  107 |           await expect(page.locator('#rally')).toHaveClass(/active/);
  108 |           await expect(page.locator('#battle')).toHaveClass(/placing/);
  109 |           await noDrawer(page);
  110 |         }
  111 |         const armed = await trace.ready();
  112 |         expect(armed.length).toBe(baseline.length);
  113 |         const back = await trace.traverse('back');
  114 |         expect(back.state.ironrootNavigation.document === baseline.state.ironrootNavigation.document).toBe(setup === 'fresh-document');
  115 |         await expect(page.locator('#pauseVeil')).toBeVisible();
  116 |         if (head === 'candidate') await unarmed(page);
  117 |         else await expect(page.locator('#rally')).toHaveClass(/active/);
  118 |         const frozen = await bytes(page);
  119 |         noCast(JSON.parse(frozen));
  120 |         await page.waitForTimeout(180);
  121 |         expect(await bytes(page)).toBe(frozen);
  122 |         await trace.traverse('forward');
  123 |         await expect(page.locator('#pauseVeil')).toBeVisible();
  124 |         if (head === 'candidate') await unarmed(page);
  125 |         else await expect(page.locator('#rally')).toHaveClass(/active/);
  126 |         expect(await bytes(page)).toBe(frozen);
  127 |         const beforeResume = await trace.mark('strict pre-Resume');
  128 |         // Retain the original strict assertion, now after actual Forward.
> 129 |         expect(beforeResume.length).toBe(baseline.length);
      |                                     ^ Error: expect(received).toBe(expected) // Object.is equality
  130 |         expect(beforeResume.state).toEqual(baseline.state);
  131 |         await press(page,'#resume');
  132 |         await expect(page.locator('#pauseVeil')).toBeHidden();
  133 |         await trace.ready();
  134 |         const resumed = await trace.mark('explicit Resume');
  135 |         // Stale-document ancestry can add one slot here on BOTH heads. This
  136 |         // later effect does not explain the original pre-Resume failure.
  137 |         expect(resumed.length).toBe(baseline.length + (setup === 'seeded-reload' ? 1 : 0));
  138 |         if (head === 'candidate') await unarmed(page);
  139 |         else await expect(page.locator('#battle')).toHaveClass(/placing/);
  140 |         const box = await page.locator('#battle').boundingBox();
  141 |         await tapPoint(page,{x:box.x + box.width / 2,y:box.y + box.height / 2});
  142 |         const afterTouch = await pause(page);
  143 |         if (head === 'candidate') noCast(afterTouch);
  144 |         else {
  145 |           expect(afterTouch.game.state.spellCooldown[0]).toBeGreaterThan(20);
  146 |           expect(afterTouch.game.state.gold[0]).toBeCloseTo(420 - 75 + 5 * afterTouch.game.state.time,1);
  147 |         }
  148 |         expect(await profile(page)).toEqual(persistent);
  149 |         await trace.ready();
  150 |         await trace.mark('fresh battlefield input checked', {paidCast:head === 'base'});
  151 |         if (setup === 'fresh-document') {
  152 |           await press(page,'#resume');await trace.ready();
  153 |           for (let cycle = 0; cycle < 2; cycle++) {
  154 |             await trace.traverse('back');await expect(page.locator('#pauseVeil')).toBeVisible();
  155 |             await trace.traverse('forward');await expect(page.locator('#pauseVeil')).toBeVisible();
  156 |             expect((await trace.mark('repeat pre-Resume',{cycle})).length).toBe(baseline.length);
  157 |             await press(page,'#resume');await trace.ready();
  158 |             expect((await trace.mark('repeat resumed',{cycle})).length).toBe(baseline.length);
  159 |           }
  160 |           // The bound is the observed finite native stack, never a history trap.
  161 |           let steps = 0;
  162 |           while (!page.url().includes('volley-history-exit') && steps < baseline.length) {
  163 |             await trace.traverse('back');steps++;
  164 |           }
  165 |           await expect(page).toHaveURL(/FONTS-NOTICES\.txt\?volley-history-exit$/);
  166 |           await trace.mark('finite Back exit',{steps,bound:baseline.length});
  167 |           expect(await profile(page)).toEqual(persistent);
  168 |         }
  169 |         trace.assertOpaqueStates();
  170 |       } finally {
  171 |         await trace.attach(info,detail);
  172 |       }
  173 |     });
  174 |   }
  175 | });
  176 | 
  177 | test('independent: remapped V, Escape and native button cancellation retain menu input scope', async ({page}) => {
  178 |   const persistent = await start(page);
  179 |   await press(page, '#settings');
  180 |   await press(page, '#keyboardSettings > summary');
  181 |   await page.locator('[data-keyboard-action="volley"] [data-keyboard-change]').click();
  182 |   await page.keyboard.press('KeyV');
  183 |   await expect(page.locator('[data-keyboard-action="volley"] .keyboard-key')).toHaveText('V');
  184 |   await press(page, '#settingsDone');
  185 |   await page.locator('#battle').focus();
  186 |   await page.keyboard.press('KeyR');
  187 |   await unarmed(page);
  188 |   await page.keyboard.press('KeyV');
  189 |   await expect(page.locator('#rally')).toHaveAttribute('aria-pressed', 'true');
  190 |   await noDrawer(page);
  191 |   await page.keyboard.press('Escape');
  192 |   await unarmed(page);
  193 |   await arm(page); await direct(page); await unarmed(page);
  194 |   await page.locator('#rally').focus();
  195 |   await page.keyboard.press('Enter');
  196 |   await expect(page.locator('#rally')).toHaveAttribute('aria-pressed', 'true');
  197 |   await page.keyboard.press('Space');
  198 |   await unarmed(page);
  199 |   noCast(await pause(page));
  200 |   await page.keyboard.press('KeyV');
  201 |   await unarmed(page); await expect(page.locator('#pauseVeil')).toBeVisible();
  202 |   await press(page, '#pauseSettings');
  203 |   const frozen = await bytes(page);
  204 |   await page.keyboard.press('KeyV');
  205 |   await page.keyboard.press('KeyR');
  206 |   await unarmed(page);
  207 |   expect(await bytes(page)).toBe(frozen);
  208 |   const current = await profile(page);
  209 |   for (const key of DOMAINS.filter(key => key !== SETTINGS)) expect(current[key]).toBe(persistent[key]);
  210 |   expect(JSON.parse(current[SETTINGS]).keyboard.bindings.volley).toBe('KeyV');
  211 | });
  212 | 
  213 | test('independent: controller Y arms, B cancels, and Y/A casts once without opening Build', async ({page}) => {
  214 |   await installPad(page);
  215 |   const persistent = await start(page);
  216 |   await page.locator('#battle').focus();
  217 |   await neutralPad(page);
  218 |   await padButton(page, 3);
  219 |   await expect(page.locator('#rally')).toHaveAttribute('aria-pressed', 'true');
  220 |   await noDrawer(page);
  221 |   await padButton(page, 1);
  222 |   await unarmed(page);
  223 |   noCast(await pause(page));
  224 |   await press(page, '#resume');
  225 |   await page.locator('#battle').focus();
  226 |   await neutralPad(page);
  227 |   await padButton(page, 3);
  228 |   await expect(page.locator('#rally')).toHaveAttribute('aria-pressed', 'true');
  229 |   await noDrawer(page);
```