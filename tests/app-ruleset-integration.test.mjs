import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createContext,runInContext} from 'node:vm';
import {Game,BUILDINGS} from '../dist/engine.js';
import {createCampaignProgress,getProgressionCampaignOverview as getCampaignOverview,isIntroMission,CAMPAIGN_PROGRESS_MISSIONS as CAMPAIGN_MISSIONS} from '../dist/campaign.js';
import {decodeBattle,encodeBattle,scenarioForBattle} from '../dist/battle-codec.js';
import {createStorage,createSaveSession,writeBattle,getBattleWriteFailure} from '../dist/persistence.js';
import {startupHarness} from './mobile-startup-fixture.mjs';
const app=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
const part=(a,b)=>app.slice(app.indexOf(a),app.indexOf(b,app.indexOf(a)));
const openGame=()=>new Game({rulesetId:'frontier-rootwarden-open',rulesetRevision:1,difficulty:'easy',seed:55});
function dom(){
 const nodes=new Map();const $=id=>{if(!nodes.has(id)){const classes=new Set();nodes.set(id,{id,children:[],classList:{contains:x=>classes.has(x),add:x=>classes.add(x),remove:x=>classes.delete(x),toggle(x,on){on?classes.add(x):classes.delete(x);}},disabled:false,attributes:{},setAttribute(k,v){this.attributes[k]=v;},focus(){},after(){},append(n){this.children.push(n);},set textContent(v){this.text=v;this.children=[];},get textContent(){return this.text||'';}});}return nodes.get(id);};return $;
}

test('real deck rebuilds from the active immutable roster and restores the original seven-card order',()=>{
 const $=dom(),selected=[],c={$,game:openGame(),BUILDINGS,labels:{},iconSVG:()=>'',selectBuild:type=>selected.push(type),document:{createElement:()=>({dataset:{},setAttribute(){},addEventListener(type,fn){this[type]=fn;}})}};
 createContext(c);runInContext(part('function populateBuildCards()','function canInteract()'),c);
 assert.deepEqual($('buildCards').children.map(n=>n.dataset.type),Object.keys(c.game.buildings));
 assert.equal($('buildCards').children.at(-1).dataset.type,'wardenLodge');assert.match($('buildingKeyHelp').textContent,/1–8/);
 $('buildCards').children.at(-1).click();assert.deepEqual(selected,['wardenLodge']);
 c.game=Game.restore(new Game({seed:55}).serialize());c.populateBuildCards();
 assert.deepEqual($('buildCards').children.map(n=>n.dataset.type),Object.keys(BUILDINGS));assert.match($('buildingKeyHelp').textContent,/1–7/);
});

test('real start selects new skirmish rules explicitly but cannot reinterpret a restored legacy battle or an intro',()=>{
 const h=startupHarness();h.c.mode='skirmish';h.c.selectedRuleset='frontier-rootwarden-open';h.c.start();
 assert.equal(h.c.game.schemaVersion,3);assert.equal(h.c.game.ruleset.id,'frontier-rootwarden-open');assert.ok(h.c.game.buildings.wardenLodge);
 h.c.selectedRuleset='frontier-rootwarden-timed';h.c.start();assert.equal(h.c.game.ruleset.id,'frontier-rootwarden-timed');
 const legacy=Game.restore(new Game({seed:8}).serialize()),before=legacy.serialize();h.c.start(legacy,null,null);
 assert.equal(h.c.game,legacy);assert.deepEqual(h.c.game.serialize(),before);assert.equal(h.c.game.buildings.wardenLodge,undefined);
 h.c.mode='campaign';h.c.selectedCampaign='first-watch';h.c.start();assert.equal(h.c.game.ruleset.id,'frontier-legacy');assert.equal(h.c.game.map.id,'intro-one-road');assert.equal(h.c.game.buildings.wardenLodge,undefined);
});

function safetyContext(game=openGame()){
 const $=dom(),log={saves:0,interrupts:0},c={$,game,started:true,paused:false,battleSafetyReason:null,coachingHold:false,document:{hidden:false},objectiveOutcome:null,recoveryHold:null,profileGate:null,
  viewportPause:{active:false},ui:{build:'barracks',spell:true},setCompactBuildOpen(){},pauseControl(){},syncDialogs(){},
  save(){log.saves++;return true;},interruptMobileInput(){log.interrupts++;},battleSession:{status:()=> 'current'},showRecoverySettings(){},showTitle(){},toast(){}};
 createContext(c);runInContext(part('function holdBattleSafety(','function start('),c);runInContext(part('function pause(value,',"$('pause').onclick ="),c);return {c,$,log};
}
test('prospective horizon refusal produces a latched safe pause without fabricating a winner or mutating a checkpoint',()=>{
 const game=openGame();game.tick=game.ruleset.limits.maxTick-1;game.state.time=game.tick*.05;
 assert.equal(game.limitReason,null,'the refusal may happen before the exact boundary');
 const before=game.serialize(),h=safetyContext(game);h.c.dt=.25;h.c.speed=1;
 const start=app.indexOf('      const step = game.update(dt * speed);');const end=app.indexOf('\n    }',start);
 runInContext(app.slice(start,end),h.c);
 assert.equal(h.c.paused,true);assert.ok(h.c.battleSafetyReason);assert.equal(h.$('resume').disabled,true);assert.equal(h.$('viewportResume').disabled,true);
 assert.equal(game.state.winner,null);assert.deepEqual(game.serialize(),before);assert.equal(h.log.saves,1);
 h.c.pause(false,{explicit:true});assert.equal(h.c.paused,true);assert.equal(h.log.saves,1);assert.deepEqual(game.serialize(),before);
});

test('actual save rejects an invalid candidate before storage and holds the in-memory battle',()=>{
 const game=openGame(),key='ironroot.battle.v1',old=JSON.stringify(encodeBattle(game,scenarioForBattle())),data=new Map([[key,old]]);let writes=0;
 const storage=createStorage(()=>({getItem:k=>data.get(k)??null,setItem(k,v){writes++;data.set(k,v);},removeItem:k=>data.delete(k)}));
 const session=createSaveSession(storage,key);session.claim();const h=safetyContext(game);
 Object.assign(h.c,{battleSession:session,SAVE:key,currentCampaign:null,currentChallenge:null,campaignProgress:createCampaignProgress(),writeBattle,getBattleWriteFailure,saveWarning:false,holdRecovery(message,reason){h.c.recoveryHold={message,reason};h.c.paused=true;},showRecoverySettings(){}});
 runInContext(part('function save()','function updateResume()'),h.c);
 game.state.buildings[0].type='unknown';assert.equal(h.c.save(),false);
 assert.equal(writes,0);assert.equal(data.get(key),old);assert.equal(h.c.paused,true);assert.match(h.c.recoveryHold.message,/previous checkpoint is unchanged/);
});

test('Resume uses the shared decoder, discloses new endgame rules and retains unsupported original bytes',()=>{
 for(const invalid of [false,true]){
  const $=dom(),game=openGame(),raw=invalid?'{"format":"ironroot-save","version":99}':JSON.stringify(encodeBattle(game,scenarioForBattle()));
  let writes=0,download=null,restored=null;const c={$,SAVE:'ironroot.battle.v1',resumeProblem:null,decodeBattle,campaignProgress:createCampaignProgress(),CAMPAIGN_MISSIONS,CHALLENGES:[],
   storage:{get:()=>raw,set(){writes++;}},timeText:String,downloadBackup:text=>download=text,start:g=>restored=g};
  createContext(c);runInContext(part('function updateResume()','\nupdateResume();')+'\nupdateResume();',c);
  assert.equal(writes,0);
  if(!invalid) assert.equal(c.resumeProblem,null,JSON.stringify(c.resumeProblem));
  if(invalid){assert.ok(c.resumeProblem);assert.equal($('resumeSaved').classList.contains('hidden'),true);$('exportUnreadableBattle').onclick();assert.equal(download,raw);}
  else {assert.match($('resumeSaved').textContent,/OPEN-ENDED/);$('resumeSaved').onclick();assert.deepEqual(restored.serialize(),game.serialize());}
 }
 const h=startupHarness();h.c.resumeProblem={code:'unsupported-version'};h.c.showSettings=()=>{};const before=h.c.game;h.c.start();assert.equal(h.c.game,before);assert.equal(h.log.claims,0);assert.equal(h.log.saves,0);
});

test('legacy intro Continue preserves stars and leads an intro-only profile into the new opening',()=>{
 const $=dom(),progress=createCampaignProgress();progress.missions['first-watch']={completed:true,stars:1,bestTime:70};
 const c={$,CAMPAIGN_MISSIONS,isIntroMission,getCampaignOverview,campaignProgress:progress,currentCampaign:'first-watch',currentChallenge:null,objectiveOutcome:{completed:true,stars:1},
  selectedCampaign:'first-watch',selectedChapter:'first-roads',mode:'campaign',battleSession:{remove(){}},showTitle(){},start(){}};
 createContext(c);runInContext(part("$('playAgain').onclick", "$('inspectBattle').onclick"),c);$('playAgain').onclick();assert.equal(c.selectedCampaign,'forked-road');
 progress.missions['forked-road']={completed:true,stars:2,bestTime:90};c.currentCampaign='forked-road';$('playAgain').onclick();assert.equal(c.selectedCampaign,'roadside-watch');
 assert.deepEqual(progress.missions['first-watch'],{completed:true,stars:1,bestTime:70});assert.deepEqual(progress.missions['forked-road'],{completed:true,stars:2,bestTime:90});
});
