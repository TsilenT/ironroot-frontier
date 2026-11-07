# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: restart-briefing.spec.mjs >> result Continue advances and optional Replay retains the completed mission
- Location: restart-briefing.spec.mjs:79:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator:  locator('#replayMission')
Expected: visible
Received: hidden
Timeout:  5000ms

Call log:
  - Expect "toBeVisible" locator('#replayMission') with timeout 5000ms
  - waiting for locator('#replayMission')
    13 × locator resolved to <button id="replayMission" class="secondary-button hidden">Replay for more stars</button>
       - unexpected value "hidden"

```

```yaml
- banner:
  - link "Ironroot Frontier home":
    - /url: ./
    - text: ♜ IRONROOT F R O N T I E R
  - text: CAMPAIGN / EMBERWATCH ◆ 460 +5 /s ⚑ 1 ARMY 00:40 BATTLE TIME
- main:
  - text: YOUR CITADEL 100% EMBERWATCH CAMPAIGN ENEMY CITADEL 0%
  - status
  - button "Pause game"
  - button "Change battle speed": 1×
  - button "Mute audio": ♫
  - button "Open options": ⚙
  - text: DRAG to explore · TAP a building to manage it
  - status
  - button "Go to your base": ⌂
  - button "Follow the frontline": ⚔
  - region "Mission objectives": Enemy citadel destroyed. 02:20 remaining
- region "Building controls":
  - text: BUILD YOUR FRONTIER Choose a building, then place it in your territory.
  - 'button "Barracks, 140 gold. Spawns shielded warriors. Absorbs arrows and protects your archers. Keyboard: 1."':
    - text: "1"
    - heading "Barracks" [level=3]
    - text: Shielded warriors ◆ 140
  - 'button "Archery range, 175 gold. Spawns fragile ranged archers. Best behind a warrior screen. Keyboard: 2."':
    - text: "2"
    - heading "Archery" [level=3]
    - text: Ranged support ◆ 175
  - 'button "Siege foundry, 270 gold. Slow siege engines crush towers and splash tightly packed troops. Keyboard: 3."':
    - text: "3"
    - heading "Foundry" [level=3]
    - text: Structure breaker ◆ 270
  - 'button "Watchtower, 220 gold. Powerful defense, but no troops. Siege engines break its walls. Keyboard: 4."':
    - text: "4"
    - heading "Watchtower" [level=3]
    - text: Hold the line ◆ 220
  - 'button "Gold mine, 190 gold. Adds 2.5 gold per second. Fragile economy; maximum 3 mines. Keyboard: 5."':
    - text: "5"
    - heading "Gold mine" [level=3]
    - text: Grow your economy ◆ 190
  - 'button "Arcane sanctum, 230 gold. Spawns wizards. Ground splash ignores shields, but cannot target flyers. Keyboard: 6."':
    - text: "6"
    - heading "Sanctum" [level=3]
    - text: Magic & splash ◆ 230
  - 'button "Gryphon aerie, 250 gold. Spawns flying gryphons. Evade melee and siege; vulnerable to archers. Keyboard: 7."':
    - text: "7"
    - heading "Aerie" [level=3]
    - text: Flying raiders ◆ 250
  - button "✦ Arrow volley Area damage to troops ◆ 75 25s cooldown":
    - text: ✦ Arrow volley Area damage to troops ◆ 75
    - emphasis: 25s cooldown
- dialog "MISSION COMPLETE":
  - text: MISSION WON ⚑
  - heading "MISSION COMPLETE" [level=2]
  - paragraph: The crossing is ours. Families begin to leave their hiding places, following the light of Emberwatch.
  - text: ★★★
  - paragraph: ✓ Win in 1:40 or less
  - paragraph: ✓ Keep at least 5,400 citadel HP
  - paragraph: "New buildings: Siege foundry, Watchtower, Gold mine, Arcane sanctum, Gryphon aerie, Warden lodge."
  - text: 00:40 BATTLE TIME 17 ENEMIES FELLED 23 BUILDINGS RAISED
  - group: Battle report Forces, economy & objectives
  - button "CONTINUE CAMPAIGN →"
  - button "Campaign missions"
  - button "Inspect the battlefield"
```

# Test source

```ts
  1   | // Native navigation/input; only persisted fixtures and storage faults are synthetic.
  2   | // No virtual clock: history reconciliation and held activation run in real time.
  3   | import {expect} from '@playwright/test';
  4   | import {test,press,pause,saved,seedOnce} from './map-browser-helpers.mjs';
  5   | import {progressionProfile} from './campaign-progression-fixtures.mjs';
  6   | import {reportFixture} from './battle-report-fixtures.mjs';
  7   | import {installPad,padButton} from './map-controller-helpers.mjs';
  8   | import {createProgressionCampaignMission,getCampaignLaunchMission} from '../../dist/campaign.js';
  9   | import {encodeBattle,scenarioForBattle} from '../../dist/battle-codec.js';
  10  | const SAVE='ironroot.battle.v1',PROGRESS='ironroot.campaign.v1';
  11  | const DOMAINS=[PROGRESS,'ironroot.trials.v1','ironroot.settings.v1','ironroot.history.v1'];
  12  | const domains=page=>page.evaluate(keys=>Object.fromEntries(keys.map(key=>[key,localStorage.getItem(key)])),DOMAINS);
  13  | const values=tier=>({[PROGRESS]:JSON.stringify(progressionProfile(tier)),
  14  |   'ironroot.trials.v1':JSON.stringify({shieldbreaker:{completed:true,bestTime:20}}),
  15  |   'ironroot.settings.v1':JSON.stringify({sound:false,music:false,sfx:true,volume:.25,reducedMotion:true,quality:'low'}),
  16  |   'ironroot.history.v1':JSON.stringify([{won:false,draw:false,challengeId:null,campaignId:null,difficulty:'easy',time:60,kills:0,built:1,date:'2026-11-06T11:00:00.000Z'}])});
  17  | async function begin(page){
  18  |   await press(page,'#start');
  19  |   if(await page.locator('#coachingModal').isVisible())await press(page,'#coachingPlay');
  20  | }
  21  | async function confirm(page){await pause(page);await press(page,'#restartBattle');await press(page,'#confirmRestart');}
  22  | async function briefing(page){
  23  |   await expect(page.locator('#welcome')).toBeVisible();await expect(page.locator('#pauseVeil')).toBeHidden();
  24  |   await expect(page.locator('#restartModal')).toBeHidden();await expect(page.locator('#resumeSaved')).toBeHidden();
  25  |   await expect(page.locator('#start')).toBeFocused();expect(await saved(page)).toBeNull();
  26  | }
  27  |
  28  | for(const [tier,id] of [[0,'roadside-watch'],[1,'shield-at-the-fork'],[2,'open-three-roads'],[3,'emberwatch']])
  29  | test(`${id}: real launch, cancel, confirm, same briefing and explicit fresh Begin`,async({page},info)=>{
  30  |   await seedOnce(page,values(tier));
  31  |   const title=await page.locator('#campaignMissionTitle').textContent(),goal=await page.locator('#campaignGoal').textContent();
  32  |   expect(title).toBe(getCampaignLaunchMission(id,progressionProfile(tier)).name);
  33  |   const profile=await domains(page);await begin(page);await page.waitForTimeout(220);
  34  |   const before=await pause(page);await press(page,'#restartBattle');await expect(page.locator('#cancelRestart')).toBeFocused();
  35  |   await page.evaluate(()=>history.back());await expect(page.locator('#restartModal')).toBeHidden();
  36  |   await expect(page.locator('#restartBattle')).toBeFocused();expect(await saved(page)).toEqual(before);
  37  |   await press(page,'#restartBattle');await press(page,'#cancelRestart');expect(await saved(page)).toEqual(before);
  38  |   await press(page,'#restartBattle');await press(page,'#confirmRestart');await briefing(page);
  39  |   await expect(page.locator('#campaignMissionTitle')).toHaveText(title);await expect(page.locator('#campaignGoal')).toHaveText(goal);
  40  |   const frozen=await page.locator('#time').textContent(),gold=await page.locator('#gold').textContent();
  41  |   await page.waitForTimeout(5500);expect(await saved(page)).toBeNull();
  42  |   await expect(page.locator('#time')).toHaveText(frozen);await expect(page.locator('#gold')).toHaveText(gold);
  43  |   expect(await domains(page)).toEqual(profile);
  44  |   if(tier===1)await page.screenshot({path:info.outputPath('restart-briefing.png'),fullPage:true});
  45  |   await begin(page);
  46  |   // start() saves at zero before the real animation loop; inspect that checkpoint.
  47  |   const fresh=await saved(page),initial=createProgressionCampaignMission(id,progressionProfile(tier)).serialize();
  48  |   expect(fresh.game.state.time).toBe(0);expect(fresh.game.state.gold).toEqual(initial.state.gold);
  49  |   expect(fresh.game.state.buildings).toEqual(initial.state.buildings);expect(fresh.scenario).toEqual(before.scenario);
  50  |   expect(await domains(page)).toEqual(profile);
  51  | });
  52  |
  53  | test('restart retires history attempt markers; Back/Forward cannot resume and Back can leave',async({page})=>{
  54  |   await page.goto('/FONTS-NOTICES.txt');await page.goto('/');await begin(page);await confirm(page);await briefing(page);
  55  |   await page.waitForTimeout(150);const length=await page.evaluate(()=>history.length);
  56  |   for(let i=0;i<3;i++){
  57  |     await page.evaluate(()=>history.forward());await page.waitForTimeout(150);
  58  |     await expect(page.locator('#welcome')).toBeVisible();expect(await saved(page)).toBeNull();
  59  |   }
  60  |   for(let i=0;i<8&&!page.url().endsWith('/FONTS-NOTICES.txt');i++){
  61  |     await page.evaluate(()=>history.back());await page.waitForTimeout(150);
  62  |     if(!page.url().endsWith('/FONTS-NOTICES.txt'))expect(await saved(page)).toBeNull();
  63  |   }
  64  |   await expect(page).toHaveURL(/\/FONTS-NOTICES\.txt$/);expect(await page.evaluate(()=>history.length)).toBe(length);
  65  | });
  66  |
  67  | for(const kind of ['campaign-failure','trial-failure'])test(`${kind}: result Retry shows its briefing before a new attempt`,async({page})=>{
  68  |   const fixture=reportFixture(kind);
  69  |   await seedOnce(page,{...values(3),[PROGRESS]:JSON.stringify(fixture.progress),[SAVE]:JSON.stringify(fixture.envelope)});
  70  |   await press(page,'#resumeSaved');await expect(page.locator('#resultTitle')).toContainText('FAILED');
  71  |   const profile=await domains(page);await page.locator('#playAgain').focus();await page.keyboard.press('Enter');await briefing(page);
  72  |   if(kind.startsWith('campaign'))await expect(page.locator('#campaignMissionTitle')).toHaveText('Emberwatch');
  73  |   else await expect(page.locator('#challengeChoices .active')).toContainText('Shieldbreaker');
  74  |   await page.waitForTimeout(200);expect(await saved(page)).toBeNull();expect(await domains(page)).toEqual(profile);
  75  |   await begin(page);const fresh=await saved(page);expect(fresh.game.state.time).toBe(0);
  76  |   expect(fresh.game.state.gold[0]).toBeGreaterThan(0);expect(await domains(page)).toEqual(profile);
  77  | });
  78  |
  79  | test('result Continue advances and optional Replay retains the completed mission',async({page})=>{
  80  |   const fixture=reportFixture('campaign-alternate');
  81  |   await seedOnce(page,{[PROGRESS]:JSON.stringify(fixture.progress),[SAVE]:JSON.stringify(fixture.envelope)});
  82  |   await press(page,'#resumeSaved');await expect(page.locator('#resultTitle')).toHaveText('MISSION COMPLETE');
> 83  |   await expect(page.locator('#replayMission')).toBeVisible();const profile=await domains(page);
      |                                                ^ Error: expect(locator).toBeVisible() failed
  84  |   await press(page,'#playAgain');await expect(page.locator('#campaignMissionTitle')).toHaveText('Three Roads');
  85  |   await press(page,'#lastResult');await press(page,'#replayMission');await expect(page.locator('#welcome')).toBeHidden();
  86  |   const battle=await saved(page);expect(battle.campaignId??battle.scenario?.id).toBe('emberwatch');expect(await domains(page)).toEqual(profile);
  87  | });
  88  |
  89  | for(const fault of ['throw','noop','readback'])test(`checkpoint removal ${fault}: honest warning retains paused attempt`,async({page})=>{
  90  |   await page.goto('/');await begin(page);const before=await pause(page);await press(page,'#restartBattle');
  91  |   await page.evaluate(({key,fault})=>{
  92  |     const remove=Storage.prototype.removeItem,read=Storage.prototype.getItem;let removed=false;
  93  |     window.__restartFault=true;
  94  |     Storage.prototype.removeItem=function(k){
  95  |       if(k===key&&window.__restartFault){if(fault==='throw')throw new DOMException('Denied','SecurityError');if(fault==='noop')return;removed=true;}
  96  |       return remove.call(this,k);
  97  |     };
  98  |     Storage.prototype.getItem=function(k){if(k===key&&removed&&window.__restartFault)throw new DOMException('Denied','SecurityError');return read.call(this,k);};
  99  |   },{key:SAVE,fault});
  100 |   await press(page,'#confirmRestart');await expect(page.locator('#restartStatus')).toContainText('could not be saved or verified');
  101 |   await expect(page.locator('#welcome')).toBeHidden();await expect(page.locator('#restartModal')).toBeVisible();
  102 |   await page.evaluate(()=>{window.__restartFault=false;});
  103 |   if(fault==='readback')expect(await saved(page)).toBeNull();else expect(await saved(page)).toEqual(before);
  104 |   await press(page,'#cancelRestart');await expect(page.locator('#pauseVeil')).toBeVisible();await expect(page.locator('#restartBattle')).toBeFocused();
  105 | });
  106 |
  107 | test('Begin write failure stays on briefing and can retry without resurrecting old attempt',async({page})=>{
  108 |   await page.goto('/');await begin(page);await confirm(page);await briefing(page);
  109 |   await page.evaluate(key=>{
  110 |     const set=Storage.prototype.setItem;window.__restartFault=true;
  111 |     Storage.prototype.setItem=function(k,v){if(k===key&&window.__restartFault)throw new DOMException('Full','QuotaExceededError');return set.call(this,k,v);};
  112 |   },SAVE);
  113 |   await press(page,'#start');await expect(page.locator('#briefingRestartStatus')).toContainText('could not be saved or verified');
  114 |   expect(await saved(page)).toBeNull();await expect(page.locator('#welcome')).toBeVisible();
  115 |   await page.evaluate(()=>{window.__restartFault=false;});await begin(page);expect((await saved(page)).game.state.time).toBe(0);
  116 | });
  117 |
  118 | for(const phase of ['confirmation','briefing'])test(`newer tab checkpoint survives ${phase}`,async({page,context})=>{
  119 |   await page.goto('/');await begin(page);await pause(page);await press(page,'#restartBattle');
  120 |   if(phase==='briefing'){await press(page,'#confirmRestart');await briefing(page);}
  121 |   const other=await context.newPage();await other.goto('/');await press(other,'[data-mode="skirmish"]');await press(other,'#start');await pause(other);
  122 |   const newer=await saved(other);await page.bringToFront();await press(page,phase==='briefing'?'#start':'#confirmRestart');
  123 |   await expect(page.locator(phase==='briefing'?'#briefingRestartStatus':'#restartStatus')).toContainText('checkpoint changed');
  124 |   expect(await saved(page)).toEqual(newer);await page.waitForTimeout(200);expect(await saved(page)).toEqual(newer);
  125 | });
  126 |
  127 | test('a resumed stale copy cannot autosave after another tab confirms restart',async({page,context})=>{
  128 |   await page.goto('/');await begin(page);await pause(page);
  129 |   const other=await context.newPage();await other.goto('/');await press(other,'#resumeSaved');await pause(other);
  130 |   await page.bringToFront();await press(page,'#restartBattle');await press(page,'#confirmRestart');await briefing(page);
  131 |   await other.bringToFront();await expect(other.locator('#restartBattle')).toBeDisabled();await page.waitForTimeout(200);
  132 |   expect(await saved(other)).toBeNull();await press(other,'#saveExit');expect(await saved(other)).toBeNull();
  133 | });
  134 |
  135 | test('held controller confirm reaches briefing once; a fresh activation explicitly begins',async({page})=>{
  136 |   await installPad(page);await page.goto('/');await begin(page);await pause(page);
  137 |   await page.locator('#restartBattle').focus();await padButton(page,0);await padButton(page,1);
  138 |   await expect(page.locator('#restartBattle')).toBeFocused();await padButton(page,0);
  139 |   await page.locator('#confirmRestart').focus();await page.evaluate(()=>{window.__qaPad.buttons[0]=true;});await briefing(page);
  140 |   await page.waitForTimeout(700);expect(await saved(page)).toBeNull();await expect(page.locator('#welcome')).toBeVisible();
  141 |   await page.evaluate(()=>{window.__qaPad.buttons[0]=false;});await padButton(page,0);
  142 |   await expect(page.locator('#welcome')).toBeHidden();expect((await saved(page)).game.state.time).toBe(0);
  143 | });
  144 |
```
