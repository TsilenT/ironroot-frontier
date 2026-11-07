# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: restart-briefing.spec.mjs >> a delayed old removal event preserves an explicitly begun different battle
- Location: restart-briefing.spec.mjs:164:1

# Error details

```
Error: expect(received).toBeNull()

Received: undefined
```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e2]:
    - banner [ref=e3]:
      - link "Ironroot Frontier home" [ref=e4] [cursor=pointer]:
        - /url: ./
        - generic [ref=e5]: ♜
        - generic [ref=e6]:
          - text: IRONROOT
          - generic [ref=e7]: F R O N T I E R
      - generic [ref=e8]:
        - generic [ref=e10]: SOLO SKIRMISH
        - generic [ref=e11]: /
        - generic [ref=e12]: THE OUTRIDER
      - generic [ref=e13]:
        - generic [ref=e14]:
          - generic [ref=e15]: ◆
          - generic [ref=e16]: "421"
          - generic [ref=e17]: +5 /s
        - generic [ref=e18]:
          - generic [ref=e19]: ⚑
          - generic "0 / 70 army capacity" [ref=e20]: "0"
          - generic [ref=e21]: ARMY
        - generic [ref=e22]:
          - generic [ref=e23]: 00:00
          - generic [ref=e24]: BATTLE TIME
    - main [ref=e25]:
      - 'generic "Battlefield. Choose a building, then a green build slot to place it once. Hold Shift with a mouse click to keep building. Drag or middle mouse drag to explore. Right-click or Escape cancels placement. Pan left: Left arrow. Pan right: Right arrow. Battle keyboard controls are in Options." [ref=e26]'
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
      - status [ref=e27]
      - generic [ref=e28]:
        - button "Resume game" [ref=e29] [cursor=pointer]: ▶
        - button "Change battle speed" [ref=e30] [cursor=pointer]: 1×
        - button "Mute audio" [ref=e31] [cursor=pointer]: ♫
        - button "Open options" [ref=e32] [cursor=pointer]: ⚙
      - generic: DRAG to explore · TAP a building to manage it
      - status: Choose a building, then tap a green slot to place it.
      - generic [ref=e33]:
        - button "Go to your base" [ref=e34] [cursor=pointer]: ⌂
        - generic "Map overview. Tap to move the camera." [ref=e35] [cursor=pointer]
        - button "Follow the frontline" [ref=e36] [cursor=pointer]: ⚔
    - region "Building controls" [ref=e37]:
      - generic [ref=e38]:
        - generic [ref=e39]: BUILD YOUR FRONTIER
        - generic [ref=e40]: Scroll for more buildings. Choose one, then tap a green slot.
      - generic [ref=e41]:
        - generic [ref=e42]:
          - 'button "Barracks, 140 gold. Spawns shielded warriors. Absorbs arrows and protects your archers. Keyboard: 1." [ref=e43] [cursor=pointer]':
            - generic [ref=e44]: "1"
            - generic [ref=e52]:
              - heading "Barracks" [level=3] [ref=e53]
              - generic [ref=e54]: Shielded warriors
            - generic [ref=e55]: ◆ 140
          - 'button "Archery range, 175 gold. Spawns fragile ranged archers. Best behind a warrior screen. Keyboard: 2." [ref=e56] [cursor=pointer]':
            - generic [ref=e57]: "2"
            - generic [ref=e66]:
              - heading "Archery" [level=3] [ref=e67]
              - generic [ref=e68]: Ranged support
            - generic [ref=e69]: ◆ 175
          - 'button "Siege foundry, 270 gold. Slow siege engines crush towers and splash tightly packed troops. Keyboard: 3." [ref=e70] [cursor=pointer]':
            - generic [ref=e71]: "3"
            - generic [ref=e80]:
              - heading "Foundry" [level=3] [ref=e81]
              - generic [ref=e82]: Structure breaker
            - generic [ref=e83]: ◆ 270
          - 'button "Watchtower, 220 gold. Powerful defense, but no troops. Siege engines break its walls. Keyboard: 4." [ref=e84] [cursor=pointer]':
            - generic [ref=e85]: "4"
            - generic [ref=e93]:
              - heading "Watchtower" [level=3] [ref=e94]
              - generic [ref=e95]: Hold the line
            - generic [ref=e96]: ◆ 220
          - 'button "Gold mine, 190 gold. Adds 2.5 gold per second. Fragile economy; maximum 3 mines. Keyboard: 5." [ref=e97] [cursor=pointer]':
            - generic [ref=e98]: "5"
            - generic [ref=e106]:
              - heading "Gold mine" [level=3] [ref=e107]
              - generic [ref=e108]: Grow your economy
            - generic [ref=e109]: ◆ 190
          - 'button "Arcane sanctum, 230 gold. Spawns wizards. Ground splash ignores shields, but cannot target flyers. Keyboard: 6." [ref=e110] [cursor=pointer]':
            - generic [ref=e111]: "6"
            - generic [ref=e119]:
              - heading "Sanctum" [level=3] [ref=e120]
              - generic [ref=e121]: Magic & splash
            - generic [ref=e122]: ◆ 230
          - 'button "Gryphon aerie, 250 gold. Spawns flying gryphons. Evade melee and siege; vulnerable to archers. Keyboard: 7." [ref=e123] [cursor=pointer]':
            - generic [ref=e124]: "7"
            - generic [ref=e132]:
              - heading "Aerie" [level=3] [ref=e133]
              - generic [ref=e134]: Flying raiders
            - generic [ref=e135]: ◆ 250
          - 'button "Warden lodge, 210 gold. Durable melee screen. Low damage needs ranged support. Keyboard: 8." [ref=e136] [cursor=pointer]':
            - generic [ref=e137]: "8"
            - generic [ref=e144]:
              - heading "Warden lodge" [level=3] [ref=e145]
              - generic [ref=e146]: Durable front line
            - generic [ref=e147]: ◆ 210
        - button "✦ Arrow volley Area damage to troops ◆ 75 25s cooldown" [ref=e148] [cursor=pointer]:
          - generic [ref=e149]: ✦
          - generic [ref=e150]: Arrow volley
          - generic [ref=e151]: Area damage to troops
          - generic [ref=e152]:
            - text: ◆ 75
            - emphasis [ref=e153]: 25s cooldown
  - dialog "Paused" [ref=e155]:
    - banner [ref=e156]:
      - generic [ref=e157]: BATTLE MENU
      - heading "Paused" [level=2] [ref=e158]
      - paragraph [ref=e159]: Skirmish · 00:00 · 1× speed
    - generic [ref=e160]:
      - heading "Classic" [level=3] [ref=e161]
      - paragraph [ref=e162]: Destroy the enemy citadel.
    - button "Resume battle" [active] [ref=e163] [cursor=pointer]:
      - text: Resume battle
      - generic [aria-hidden] [ref=e164]: →
    - generic [ref=e165]:
      - button "Options Audio, display & saves" [ref=e166] [cursor=pointer]:
        - text: Options
        - generic [ref=e167]: Audio, display & saves
      - button "Open field guide" [ref=e168] [cursor=pointer]:
        - text: Field guide
        - generic [ref=e169]: Units, controls & economy
    - status [ref=e170]: Checkpoint saved on this device. You can return to this battle from the title screen.
    - generic [ref=e171]:
      - button "Save & return to title" [ref=e172] [cursor=pointer]
      - button "Restart battle…" [ref=e173] [cursor=pointer]
```

# Test source

```ts
  69  |   await page.goto('/FONTS-NOTICES.txt');await page.goto('/');await begin(page);await confirm(page);await briefing(page);
  70  |   await page.waitForTimeout(150);const length=await page.evaluate(()=>history.length);
  71  |   for(let i=0;i<3;i++){
  72  |     await page.evaluate(()=>history.forward());await page.waitForTimeout(150);
  73  |     await expect(page.locator('#welcome')).toBeVisible();expect(await saved(page)).toBeNull();
  74  |   }
  75  |   for(let i=0;i<8&&!page.url().endsWith('/FONTS-NOTICES.txt');i++){
  76  |     await page.evaluate(()=>history.back());await page.waitForTimeout(150);
  77  |     if(!page.url().endsWith('/FONTS-NOTICES.txt'))expect(await saved(page)).toBeNull();
  78  |   }
  79  |   await expect(page).toHaveURL(/\/FONTS-NOTICES\.txt$/);expect(await page.evaluate(()=>history.length)).toBe(length);
  80  | });
  81  |
  82  | for(const kind of ['campaign-failure','trial-failure'])test(`${kind}: result Retry shows its briefing before a new attempt`,async({page})=>{
  83  |   const fixture=reportFixture(kind);
  84  |   await seedOnce(page,{...values(3),[PROGRESS]:JSON.stringify(fixture.progress),[SAVE]:JSON.stringify(fixture.envelope)});
  85  |   await press(page,'#resumeSaved');await expect(page.locator('#resultTitle')).toContainText('FAILED');
  86  |   const profile=await domains(page);await page.locator('#playAgain').focus();await page.keyboard.press('Enter');await briefing(page);
  87  |   if(kind.startsWith('campaign'))await expect(page.locator('#campaignMissionTitle')).toHaveText('Emberwatch');
  88  |   else await expect(page.locator('#challengeChoices .active')).toContainText('Shieldbreaker');
  89  |   await page.waitForTimeout(200);expect(await saved(page)).toBeNull();expect(await domains(page)).toEqual(profile);
  90  |   await begin(page);const fresh=await saved(page);expect(fresh.game.state.time).toBe(0);
  91  |   expect(fresh.game.state.gold[0]).toBeGreaterThan(0);expect(await domains(page)).toEqual(profile);
  92  | });
  93  |
  94  | test('result Continue advances and optional Replay retains the completed mission',async({page})=>{
  95  |   const fixture=reportFixture('campaign-alternate');
  96  |   fixture.envelope.game.state.time=160; // Miss the optional speed star; still a valid imminent victory.
  97  |   await seedOnce(page,{[PROGRESS]:JSON.stringify(fixture.progress),[SAVE]:JSON.stringify(fixture.envelope)});
  98  |   await press(page,'#resumeSaved');await expect(page.locator('#resultTitle')).toHaveText('MISSION COMPLETE');
  99  |   await expect(page.locator('#replayMission')).toBeVisible();const profile=await domains(page);
  100 |   await press(page,'#playAgain');await expect(page.locator('#campaignMissionTitle')).toHaveText('Three Roads');
  101 |   await press(page,'#lastResult');await press(page,'#replayMission');await expect(page.locator('#welcome')).toBeHidden();
  102 |   const battle=await saved(page);expect(battle.campaignId??battle.scenario?.id).toBe('emberwatch');expect(await domains(page)).toEqual(profile);
  103 | });
  104 |
  105 | for(const fault of ['throw','noop','readback'])test(`checkpoint removal ${fault}: honest warning retains paused attempt`,async({page})=>{
  106 |   await page.goto('/');await begin(page);const before=await pause(page);await press(page,'#restartBattle');
  107 |   await page.evaluate(({key,fault})=>{
  108 |     const remove=Storage.prototype.removeItem,read=Storage.prototype.getItem;let removed=false;
  109 |     window.__restartFault=true;
  110 |     Storage.prototype.removeItem=function(k){
  111 |       if(k===key&&window.__restartFault){if(fault==='throw')throw new DOMException('Denied','SecurityError');if(fault==='noop')return;removed=true;}
  112 |       return remove.call(this,k);
  113 |     };
  114 |     Storage.prototype.getItem=function(k){if(k===key&&removed&&window.__restartFault)throw new DOMException('Denied','SecurityError');return read.call(this,k);};
  115 |   },{key:SAVE,fault});
  116 |   await press(page,'#confirmRestart');await expect(page.locator('#restartStatus')).toContainText('could not be saved or verified');
  117 |   await expect(page.locator('#welcome')).toBeHidden();await expect(page.locator('#restartModal')).toBeVisible();
  118 |   await page.evaluate(()=>{window.__restartFault=false;});
  119 |   if(fault==='readback')expect(await saved(page)).toBeNull();else expect(await saved(page)).toEqual(before);
  120 |   await press(page,'#cancelRestart');await expect(page.locator('#pauseVeil')).toBeVisible();
  121 |   if(fault==='readback'){
  122 |     await expect(page.locator('#restartBattle')).toBeDisabled();
  123 |     expect(await page.locator('#pauseVeil').evaluate(el=>el.contains(document.activeElement))).toBe(true);
  124 |   }else await expect(page.locator('#restartBattle')).toBeFocused();
  125 | });
  126 |
  127 | test('Begin write failure stays on briefing and can retry without resurrecting old attempt',async({page})=>{
  128 |   await page.goto('/');await begin(page);await confirm(page);await briefing(page);
  129 |   await page.evaluate(key=>{
  130 |     const set=Storage.prototype.setItem;window.__restartFault=true;
  131 |     Storage.prototype.setItem=function(k,v){if(k===key&&window.__restartFault)throw new DOMException('Full','QuotaExceededError');return set.call(this,k,v);};
  132 |   },SAVE);
  133 |   await press(page,'#start');await expect(page.locator('#briefingRestartStatus')).toContainText('could not be saved or verified');
  134 |   expect(await saved(page)).toBeNull();await expect(page.locator('#welcome')).toBeVisible();
  135 |   await page.evaluate(()=>{window.__restartFault=false;});await begin(page);expect((await saved(page)).game.state.time).toBe(0);
  136 | });
  137 |
  138 | for(const phase of ['confirmation','briefing'])test(`newer tab checkpoint survives ${phase}`,async({page,context})=>{
  139 |   await page.goto('/');await begin(page);await pause(page);await press(page,'#restartBattle');
  140 |   if(phase==='briefing'){await press(page,'#confirmRestart');await briefing(page);}
  141 |   const other=await context.newPage();await other.goto('/');await press(other,'[data-mode="skirmish"]');await press(other,'#start');await pause(other);
  142 |   const newer=await saved(other);await page.bringToFront();await press(page,phase==='briefing'?'#start':'#confirmRestart');
  143 |   await expect(page.locator(phase==='briefing'?'#briefingRestartStatus':'#restartStatus')).toContainText('checkpoint changed');
  144 |   expect(await saved(page)).toEqual(newer);await page.waitForTimeout(200);expect(await saved(page)).toEqual(newer);
  145 | });
  146 |
  147 | test('a resumed stale copy cannot autosave after another tab confirms restart',async({page,context})=>{
  148 |   await page.goto('/');await begin(page);await pause(page);
  149 |   const other=await context.newPage();await other.goto('/');await press(other,'#resumeSaved');await pause(other);
  150 |   await press(other,'#restartBattle');await press(other,'#confirmRestart');await briefing(other);
  151 |   await page.bringToFront();await expect(page.locator('#restartBattle')).toBeDisabled();await page.waitForTimeout(200);
  152 |   expect(await saved(page)).toBeNull();await press(page,'#saveExit');expect(await saved(page)).toBeNull();
  153 | });
  154 |
  155 | test('queued removal retires a tab even when a fresh opening already has identical checkpoint bytes',async({page,context})=>{
  156 |   await page.goto('/');await begin(page);await pause(page);const opening=await saved(page);
  157 |   const other=await context.newPage();await other.goto('/FONTS-NOTICES.txt');
  158 |   // Model two sequential owner operations before the old tab handles storage events.
  159 |   await other.evaluate(key=>{const bytes=localStorage.getItem(key);localStorage.removeItem(key);localStorage.setItem(key,bytes);},SAVE);
  160 |   await page.bringToFront();await expect(page.locator('#restartBattle')).toBeDisabled();
  161 |   expect(await saved(page)).toEqual(opening);await press(page,'#saveExit');expect(await saved(page)).toEqual(opening);
  162 | });
  163 |
  164 | test('a delayed old removal event preserves an explicitly begun different battle',async({page})=>{
  165 |   await page.goto('/');await begin(page);await pause(page);
  166 |   const removedBytes=await page.evaluate(key=>localStorage.getItem(key),SAVE);
  167 |   await press(page,'#restartBattle');await press(page,'#confirmRestart');await briefing(page);
  168 |   await press(page,'[data-mode="skirmish"]');await press(page,'#start');await pause(page);
> 169 |   const newer=await saved(page);expect(newer.campaignId).toBeNull();
      |                                                          ^ Error: expect(received).toBeNull()
  170 |   // Bounded delayed-event reproduction, while navigation and saving stay native.
  171 |   await page.evaluate(({key,oldValue})=>window.dispatchEvent(new StorageEvent('storage',
  172 |     {key,oldValue,newValue:null,storageArea:localStorage})),{key:SAVE,oldValue:removedBytes});
  173 |   await expect(page.locator('#restartBattle')).toBeEnabled();expect(await saved(page)).toEqual(newer);
  174 |   await press(page,'#resume');await page.waitForTimeout(120);await pause(page);
  175 |   expect((await saved(page)).game.state.time).toBeGreaterThan(newer.game.state.time);
  176 | });
  177 |
  178 | test('held controller confirm reaches briefing once; a fresh activation explicitly begins',async({page})=>{
  179 |   await installPad(page);await page.goto('/');await begin(page);await pause(page);
  180 |   await page.locator('#restartBattle').focus();await padButton(page,0);await padButton(page,1);
  181 |   await expect(page.locator('#restartBattle')).toBeFocused();await padButton(page,0);
  182 |   await page.locator('#confirmRestart').focus();await page.evaluate(()=>{window.__qaPad.buttons[0]=true;});await briefing(page);
  183 |   await page.waitForTimeout(700);expect(await saved(page)).toBeNull();await expect(page.locator('#welcome')).toBeVisible();
  184 |   await page.evaluate(()=>{window.__qaPad.buttons[0]=false;});await padButton(page,0);
  185 |   await expect(page.locator('#welcome')).toBeHidden();expect((await saved(page)).game.state.time).toBe(0);
  186 | });
  187 |
  188 | test('native keyboard Restart and held Enter confirm cannot also activate Begin',async({page})=>{
  189 |   await page.goto('/');await begin(page);await pause(page);await page.locator('#restartBattle').focus();
  190 |   await page.keyboard.press('Enter');await expect(page.locator('#cancelRestart')).toBeFocused();
  191 |   await page.keyboard.press('Escape');await expect(page.locator('#restartBattle')).toBeFocused();
  192 |   await page.keyboard.press('Enter');await page.locator('#confirmRestart').focus();
  193 |   await page.keyboard.down('Enter');await briefing(page);await page.keyboard.down('Enter');
  194 |   await page.waitForTimeout(200);expect(await saved(page)).toBeNull();await page.keyboard.up('Enter');
  195 |   await page.keyboard.press('Enter');await expect(page.locator('#welcome')).toBeHidden();expect((await saved(page)).game.state.time).toBe(0);
  196 | });
  197 |
  198 | for(const activation of ['keyboard','controller'])test(`current finale offers Skirmish setup and optional three-star Replay via ${activation}`,async({page},info)=>{
  199 |   if(activation==='controller')await installPad(page);
  200 |   const id=getProgressionCampaignOverview(progressionProfile(3)).missions.at(-1).id;
  201 |   expect(id).toBe('common-ground');expect(id).not.toBe('ironroot');
  202 |   const fixture=currentVictory(id);expect(fixture.outcome.stars).toBe(3);
  203 |   await seedOnce(page,{...values(3),[PROGRESS]:JSON.stringify(fixture.progress),[SAVE]:JSON.stringify(fixture.envelope)});
  204 |   await press(page,'#resumeSaved');await expect(page.locator('#resultTitle')).toHaveText('MISSION COMPLETE');
  205 |   await expect(page.locator('#playAgain')).toHaveText('SKIRMISHES →');await expect(page.locator('#playAgain')).toBeFocused();
  206 |   await expect(page.locator('#replayMission')).toHaveText('Replay mission');await expect(page.locator('#replayMission')).toBeVisible();
  207 |   const profile=await domains(page);expect(JSON.parse(profile[PROGRESS]).missions[id].stars).toBe(3);
  208 |   if(activation==='keyboard')await page.keyboard.press('Enter');else await padButton(page,0);
  209 |   await expect(page.locator('#skirmishConfig')).toBeVisible();await expect(page.locator('#start')).toBeFocused();
  210 |   await expect(page.locator('#start')).toHaveText('BEGIN SKIRMISH →');expect(await saved(page)).toBeNull();
  211 |   await page.waitForTimeout(200);expect(await saved(page)).toBeNull();expect(await domains(page)).toEqual(profile);
  212 |   if(activation==='keyboard')await page.screenshot({path:info.outputPath('finale-skirmish-setup.png'),fullPage:true});
  213 |   await press(page,'#welcomeSettings');await page.evaluate(()=>history.back());await expect(page.locator('#welcomeSettings')).toBeFocused();
  214 |   await expect(page.locator('#skirmishConfig')).toBeVisible();expect(await saved(page)).toBeNull();
  215 |   await press(page,'#lastResult');await page.locator('#replayMission').focus();
  216 |   if(activation==='keyboard')await page.keyboard.press('Enter');else await padButton(page,0);
  217 |   await expect(page.locator('#welcome')).toBeHidden();const replay=await saved(page);
  218 |   expect(replay.scenario.id).toBe(id);expect(replay.scenario.revision).toBe(4);expect(replay.game.state.time).toBe(0);
  219 |   expect(await domains(page)).toEqual(profile);
  220 |   // Retire the replay before reload: no old Resume should be manufactured.
  221 |   await confirm(page);await briefing(page);await page.reload();
  222 |   await expect(page.locator('#skirmishConfig')).toBeVisible();expect(await saved(page)).toBeNull();
  223 |   await press(page,'[data-mode="campaign"]');await expect(page.locator('#campaignMissionTitle')).toHaveText('Common Ground');
  224 |   await expect(page.locator('#start')).toHaveText('REPLAY MISSION →');expect(await domains(page)).toEqual(profile);
  225 | });
  226 |
  227 | test('Ironroot is an earlier story victory and still continues to Open Horizon',async({page})=>{
  228 |   const fixture=currentVictory('ironroot');
  229 |   await seedOnce(page,{[PROGRESS]:JSON.stringify(fixture.progress),[SAVE]:JSON.stringify(fixture.envelope)});
  230 |   await press(page,'#resumeSaved');await expect(page.locator('#resultTitle')).toHaveText('MISSION COMPLETE');
  231 |   await expect(page.locator('#playAgain')).toHaveText('CONTINUE CAMPAIGN →');await press(page,'#playAgain');
  232 |   await expect(page.locator('#campaignMissionTitle')).toHaveText('Open Horizon');expect(await saved(page)).toBeNull();
  233 | });
  234 |
  235 | test('profile change during restart confirmation preserves the recovery hold and all stored bytes',async({page,context})=>{
  236 |   await page.goto('/');await begin(page);await pause(page);await press(page,'#restartBattle');
  237 |   const other=await context.newPage();await other.goto('/FONTS-NOTICES.txt');
  238 |   await other.evaluate(()=>{const key='ironroot.profile.v1',m=JSON.parse(localStorage.getItem(key));m.epoch='restart-other-profile';localStorage.setItem(key,JSON.stringify(m));});
  239 |   const before=await domains(other),battle=await saved(other);await page.bringToFront();
  240 |   await expect(page.locator('#profileRecovery')).toBeVisible();await expect(page.locator('#settingsDone')).toBeDisabled();
  241 |   await page.evaluate(()=>history.back());await expect(page.locator('#profileRecovery')).toBeVisible();
  242 |   expect(await saved(page)).toEqual(battle);expect(await domains(page)).toEqual(before);
  243 | });
  244 |
```
