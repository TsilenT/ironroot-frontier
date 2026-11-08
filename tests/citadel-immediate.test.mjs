import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createContext,runInContext} from 'node:vm';
import {Game} from '../dist/engine.js';
import {citadelOptionStatus,supportsCitadelOptions,CITADEL_AI_TEXT} from '../dist/citadel-options.js';
import {citadelStatusText} from '../dist/citadel-view.js';
import {encodeBattle,decodeBattle,identityOf} from '../dist/battle-codec.js';
import {createBackup,parseBackup,BACKUP_STORAGE_KEYS as K} from '../dist/backup.js';
import {validateHistoryRow} from '../dist/history-codec.js';
import {createProfileSession,CURRENT_PROFILE_PROTOCOL_VERSION,PROFILE_MARKER_KEY as MARKER} from '../dist/profile-session.js';
import {createCampaignProgress,CAMPAIGN_PROGRESS_MISSIONS,createProgressionCampaignMission,campaignScenarioForGame} from '../dist/campaign.js';
import {CURRENT_CHALLENGES,createCurrentChallenge,challengeScenarioForGame} from '../dist/challenges.js';
import {protocolTen,protocolTenSource,protocolTenHash} from './fixtures/profile-session-v020-source.mjs';
const date='2026-11-07T00:00:00.000Z',clone=structuredClone;
const step=(g,n)=>{for(let i=0;i<n;i++)g.update(.05);};
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
const fresh=()=>new Game({rulesetId:'frontier-citadel-open',ai:false,seed:91});
const record=(g,s=0)=>g.state.citadelOptions.sides[s];
const checkpointText=readFileSync(new URL('./fixtures/citadel-v020-checkpoints.json',import.meta.url),'utf8');
const released=JSON.parse(checkpointText);

test('exact time zero and early fixed steps allow one 190-gold choice for each side, without an immediate effect',()=>{
 for(const ticks of [0,1,30,159,1799])for(const kind of ['arrows','regen'])for(const side of [0,1]){
  const g=fresh();step(g,ticks);g.state.gold[side]=190;g.state.bases[side].cooldown=.7;g._damage(g.state.bases[side],150,1-side);
  const before=g.serialize();assert.ok(g.canBuyCitadelOption(kind,side).ok);assert.ok(g.buyCitadelOption(kind,side).ok);
  const expected=clone(before);expected.state.gold[side]=0;Object.assign(expected.state.citadelOptions.sides[side],{choice:kind,purchasedAt:g.state.time,purchasedTick:g.tick});
  assert.deepEqual(g.serialize(),expected);assert.deepEqual(Game.restore(expected).serialize(),expected);
  for(const repeat of ['arrows','regen'])assert.equal(g.buyCitadelOption(repeat,side).code,'citadel-already-chosen');assert.deepEqual(g.serialize(),expected);
 }
});

test('time-zero regeneration waits the full eight seconds, damage restarts only the real recovery wait, and early healing restores',()=>{
 const g=fresh(),base=g.state.bases[0];g._damage(base,150,1);assert.ok(g.buyCitadelOption('regen').ok);
 assert.equal(record(g).purchasedAt,0);assert.equal(record(g).lastDamageAt,0);assert.equal(citadelOptionStatus(g).regenWait,8);
 step(g,159);near(base.hp,5850);assert.ok(citadelOptionStatus(g).regenWait>0);step(g,1);near(base.hp,5850);assert.equal(citadelOptionStatus(g).regenWait,0);
 step(g,1);near(base.hp,5850.15);near(record(g).healedTotal,.15);assert.deepEqual(Game.restore(g.serialize()).serialize(),g.serialize());
 const clock=record(g).lastDamageAt;g._damage(base,0,1);assert.equal(record(g).lastDamageAt,clock);
 g._damage(base,20,1);const damaged=base.hp;assert.equal(citadelOptionStatus(g).regenWait,8);step(g,160);near(base.hp,damaged);step(g,1);near(base.hp,damaged+.15);
 const saved=g.serialize(),restored=Game.restore(saved);step(g,100);step(restored,100);assert.deepEqual(restored.serialize(),g.serialize());
 for(const edit of [r=>r.purchasedAt=-.05,r=>r.purchasedTick=-1,r=>r.purchasedTick=.5,r=>r.purchasedAt=1,r=>r.healedTotal=Infinity,r=>r.healedTotal=-1,r=>r.healedTotal=3*(saved.state.time-8)+.01]){
  const bad=clone(saved);edit(bad.state.citadelOptions.sides[0]);assert.throws(()=>Game.restore(bad));
 }
});

test('early paid saves, backup and history retain every domain and accept recovery before the old 98-second floor',()=>{
 for(const kind of ['arrows','regen'])for(const ticks of [0,1,161]){
  const g=fresh();g._damage(g.state.bases[0],150,1);assert.ok(g.buyCitadelOption(kind).ok);step(g,ticks);
  const history=[{won:true,draw:false,difficulty:g.difficulty,time:g.state.time,kills:0,built:0,date,identity:identityOf(g)}];
  assert.deepEqual(validateHistoryRow(history[0]),history[0]);
  const data={campaign:createCampaignProgress(),trials:{},settings:{volume:.4,skirmishBridgeIncome:true},history,battle:encodeBattle(g)};
  const storage={getItem:key=>JSON.stringify(data[Object.keys(K).find(d=>K[d]===key)])};
  const result=parseBackup(createBackup(storage,{createdAt:date}));assert.deepEqual(result.data,data);assert.deepEqual(decodeBattle(result.data.battle).game.serialize(),g.serialize());
 }
});

test('released bought records are state-equivalent and unbought early checkpoints gain availability without rewriting identity',()=>{
 assert.equal(released.sourceCommit,'cd63f7c543b7c8425dc304105e229ff09d01e043');
 assert.equal(createHash('sha256').update(checkpointText).digest('hex'),'2038fd94d9e0d74281f64c655054b125c69408dedc6888212cb26955c3440ac5');
 for(const {label,game} of released.cases){
  const g=Game.restore(game);assert.deepEqual(g.serialize(),game);assert.deepEqual(decodeBattle(encodeBattle(g)).game.serialize(),game);
  if(label==='unbought-early'){assert.ok(g.state.time<90);assert.ok(g.canBuyCitadelOption('regen').ok);assert.ok(g.buyCitadelOption('regen').ok);near(g.state.gold[0],game.state.gold[0]-190);}
  else {assert.equal(record(g).choice,label);assert.ok(label==='regen'?record(g).healedTotal>0:record(g).extraShots>0);assert.equal(g.buyCitadelOption('regen').code,'citadel-already-chosen');}
 }
});

const marker=(version,phase='ready')=>JSON.stringify({format:'ironroot-profile',version,epoch:'keep-earned-epoch',phase});
const storage=entries=>{const data=new Map(entries),writes=[];return {data,writes,getItem:k=>data.get(k)??null,setItem(k,v){writes.push(['set',k]);data.set(k,v);},removeItem(k){writes.push(['remove',k]);data.delete(k);}};};
const earned=()=>({campaign:{...createCampaignProgress(),missions:Object.fromEntries(CAMPAIGN_PROGRESS_MISSIONS.map((m,i)=>[m.id,{completed:true,stars:i%3+1,bestTime:60+i}]))},trials:Object.fromEntries(CURRENT_CHALLENGES.map((c,i)=>[c.id,{completed:true,bestTime:70+i}])),settings:{sound:false,music:false,sfx:true,volume:.3,reducedMotion:true,quality:'low',keyboard:{version:1,bindings:{build1:'KeyQ',volley:null}},skirmishBridgeIncome:true},history:[{won:true,draw:false,difficulty:'normal',time:101,kills:0,built:0,date,identity:identityOf(Game.restore(released.cases[0].game))}],battle:encodeBattle(Game.restore(released.cases[0].game))});
const domainBytes=()=>Object.entries(earned()).map(([d,v])=>[K[d],'  '+JSON.stringify(v)+'\n']);
const current=r=>createProfileSession(()=>r,{requiredProtocolVersion:CURRENT_PROFILE_PROTOCOL_VERSION});
const old=r=>protocolTen.createProfileSession(()=>r,{requiredProtocolVersion:10});

test('current protocol marker-only upgrade fences actual released protocol-10 stale and reopened writers across all five domains',()=>{
 assert.equal(CURRENT_PROFILE_PROTOCOL_VERSION,18);assert.equal(protocolTen.CURRENT_PROFILE_PROTOCOL_VERSION,10);assert.equal(createHash('sha256').update(protocolTenSource).digest('hex'),protocolTenHash);
 const domains=domainBytes(),r=storage([[MARKER,marker(10)],...domains,['unrelated','untouched']]),stale=old(r);assert.ok(stale.status().canWrite);
 assert.ok(current(r).status().canWrite);assert.deepEqual(r.writes,[['set',MARKER]]);assert.deepEqual(JSON.parse(r.data.get(MARKER)),JSON.parse(marker(CURRENT_PROFILE_PROTOCOL_VERSION)));
 for(const [k,v] of domains)assert.equal(r.data.get(k),v);const before=[...r.data];r.writes.length=0;
 for(const client of [stale,old(r)]){
  assert.equal(client.status().canWrite,false);
  for(const key of Object.values(K))for(const adapter of [client.storage,client.importStorage])for(const action of [()=>adapter.getItem(key),()=>adapter.setItem(key,'{}'),()=>adapter.removeItem(key)])assert.throws(action);
  assert.equal(client.beginImport().ok,false);assert.equal(client.beginImport({recover:true}).code,'unsupported-protocol');
 }
 assert.deepEqual([...r.data],before);assert.deepEqual(r.writes,[]);
});

test('protocol-10 interrupted and unverified upgrades preserve earned domains; future protocol recovery is fenced',()=>{
 for(const prior of [marker(10,'restoring'),marker(10,'failed'),marker(CURRENT_PROFILE_PROTOCOL_VERSION+1)]){
  const r=storage([[MARKER,prior],...domainBytes()]),before=[...r.data],p=current(r);assert.equal(p.status().canWrite,false);assert.deepEqual([...r.data],before);assert.deepEqual(r.writes,[]);
  if(prior===marker(CURRENT_PROFILE_PROTOCOL_VERSION+1))assert.equal(p.beginImport({recover:true}).code,'unsupported-protocol');
 }
 for(const fault of ['drop','throw','readback']){
  const domains=domainBytes(),r=storage([[MARKER,marker(10)],...domains]),read=r.getItem,write=r.setItem;let blocked=false;
  r.getItem=k=>{if(k===MARKER&&blocked)throw Error('readback denied');return read(k);};r.setItem=(k,v)=>{if(k!==MARKER)return write(k,v);if(fault==='drop')return;if(fault==='throw')throw Error('quota');write(k,v);blocked=true;};
  const p=current(r);assert.equal(p.status().canWrite,false);for(const [k,v] of domains){assert.throws(()=>p.storage.setItem(k,'{}'));assert.equal(r.data.get(k),v);}
 }
});

test('fresh campaign and trial identities allow affordable time-zero choice while earned rosters and revisions stay intact',()=>{
 const progress=earned().campaign;
 for(const m of CAMPAIGN_PROGRESS_MISSIONS){const g=createProgressionCampaignMission(m.id,progress),ref=campaignScenarioForGame(g,m.id),gold=g.state.gold[0];assert.equal(g.state.time,0);assert.equal(ref.revision,['shared-crossing','one-signal-is-enough','lanterns-on-the-water','borrowed-ground','a-river-between-us','false-quiet'].includes(m.id)?1:5);assert.ok(g.buyCitadelOption('regen').ok);near(g.state.gold[0],gold-190);assert.deepEqual(decodeBattle(encodeBattle(g,ref,{campaignProgress:progress}),{campaignProgress:progress}).game.serialize(),g.serialize());}
 for(const t of CURRENT_CHALLENGES){const g=createCurrentChallenge(t.id),ref=challengeScenarioForGame(g,t.id),gold=g.state.gold[0];assert.equal(ref.revision,3);assert.equal(g.state.time,0);assert.ok(g.buyCitadelOption('arrows').ok);near(g.state.gold[0],gold-190);assert.deepEqual(decodeBattle(encodeBattle(g,ref)).game.serialize(),g.serialize());}
});

test('AI has no waiting privilege and pays the identical price at time zero on either side',()=>{
 for(const side of [0,1]){
  const g=fresh(),b=g.state.bases[side];for(const distance of [70,120]){const x=b.x+(side?-1:1)*distance;g._spawn({type:'archery',side:1-side,x,y:b.y,lane:1,level:1});}
  g.state.gold[side]=189;g._ai(side);assert.equal(record(g,side).choice,null);
  g.state.gold[side]=190;g._ai(side);assert.equal(record(g,side).choice,'arrows');assert.equal(record(g,side).purchasedAt,0);assert.equal(g.state.gold[side],0);g._ai(side);assert.equal(g.state.gold[side],0);
 }
});

// Executes the actual modal/purchase/save handlers with a small DOM fixture.
// This verifies handler behavior, not native layout, trusted events or browser rendering.
const app=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
function modal(g=fresh()){
 const nodes=new Map(),calls={sounds:0,saves:0,toasts:[],saved:null},$=id=>{if(!nodes.has(id)){const classes=new Set(['citadelModal'].includes(id)?['hidden']:[]);nodes.set(id,{textContent:'',disabled:false,focus(){calls.focus=id;},classList:{contains:n=>classes.has(n),add:n=>classes.add(n),remove:n=>classes.delete(n),toggle(n,on){if(on)classes.add(n);else classes.delete(n);}}});}return nodes.get(id);};
 const c=createContext({game:g,$,started:true,paused:true,coachingHold:false,firstBuildHold:false,document:{hidden:false},objectiveOutcome:null,recoveryHold:null,profileGate:null,viewportPause:{active:false},battleSafetyReason:null,battleSession:{status:()=> 'current'},supportsCitadelOptions,citadelOptionStatus,citadelStatusText,CITADEL_AI_TEXT,syncProfileSafety(){},cancel(){},setCompactBuildOpen(){},syncDialogs(){},sound(){calls.sounds++;},toast:t=>calls.toasts.push(t),saveOK:true});
 c.battleView=()=>c.game; c.refreshPresentation=()=>c.game;
 c.dialogLayers=[$('pauseModal'),$('citadelModal')];c.pause=(on)=>{c.paused=on;};
 c.save=()=>{calls.saves++;if(c.saveOK){calls.saved=encodeBattle(c.game);c.citadelUnsavedGame=null;return true;}return false;};
 runInContext(app.slice(app.indexOf('var citadelNoticeGame ='),app.indexOf('// The pause menu is a top-level dialog')),c);
 return {c,$,calls,run:code=>runInContext(code,c)};
}

test('Pause opens choices immediately; cancel and low gold never spend; only explicit Resume restarts play',()=>{
 const h=modal();h.run('showCitadelOptions()');assert.equal(h.c.paused,true);assert.equal(h.$('buyCitadelArrows').disabled,false);assert.doesNotMatch(h.$('citadelReadiness').textContent,/1:30|available in/i);
 const untouched=h.c.game.serialize();h.$('citadelBack').onclick();assert.equal(h.c.paused,true);assert.deepEqual(h.c.game.serialize(),untouched);assert.equal(h.calls.saves,0);
 h.c.game.state.gold[0]=189;h.run('showCitadelOptions()');h.$('buyCitadelRegen').onclick();assert.match(h.$('citadelReadiness').textContent,/Need 190 gold/);assert.equal(h.c.game.state.gold[0],189);assert.equal(record(h.c.game).choice,null);
 h.c.game.state.gold[0]=190;h.$('buyCitadelRegen').onclick();assert.equal(h.c.game.state.gold[0],0);assert.equal(h.c.paused,true);assert.equal(h.calls.saves,1);assert.equal(h.calls.sounds,1);assert.equal(citadelOptionStatus(h.c.game).regenWait,8);
 h.$('buyCitadelRegen').onclick();h.$('buyCitadelArrows').onclick();assert.equal(h.calls.saves,1);assert.equal(h.c.game.state.gold[0],0);assert.deepEqual(decodeBattle(h.calls.saved).game.serialize(),h.c.game.serialize());
 h.$('citadelBack').onclick();assert.equal(h.c.paused,true);h.run('showCitadelOptions()');h.$('citadelResume').onclick();assert.equal(h.c.paused,false);assert.equal(h.$('citadelModal').classList.contains('hidden'),true);
});

test('failed purchase save retains warning through reopen and retries saving without a second debit',()=>{
 const h=modal();h.c.saveOK=false;h.run('showCitadelOptions()');h.$('buyCitadelArrows').onclick();const bought=h.c.game.serialize();assert.equal(h.$('citadelSaveWarning').classList.contains('hidden'),false);assert.match(h.$('citadelSaveWarning').textContent,/paid for and active.*not saved/);assert.equal(h.calls.focus,'citadelSaveWarning');
 h.$('citadelBack').onclick();h.run('showCitadelOptions()');assert.equal(h.$('citadelSaveWarning').classList.contains('hidden'),false);h.$('citadelRetrySave').onclick();assert.equal(h.$('citadelSaveWarning').classList.contains('hidden'),false);assert.deepEqual(h.c.game.serialize(),bought);
 h.c.saveOK=true;h.$('citadelRetrySave').onclick();assert.equal(h.$('citadelSaveWarning').classList.contains('hidden'),true);assert.deepEqual(h.c.game.serialize(),bought);assert.equal(h.calls.sounds,1);assert.equal(h.calls.saves,3);
});

test('teaching holds and current-checkpoint safety still hide or block immediate choices without a replacement timer',()=>{
 for(const flag of ['coachingHold','firstBuildHold']){const h=modal();h.c[flag]=true;h.run('updateCitadelUI();showCitadelOptions()');assert.equal(h.$('pauseCitadel').classList.contains('hidden'),true);assert.equal(h.$('citadelModal').classList.contains('hidden'),true);const before=h.c.game.serialize();h.$('buyCitadelArrows').onclick();assert.deepEqual(h.c.game.serialize(),before);h.c[flag]=false;h.run('updateCitadelUI();showCitadelOptions()');assert.equal(h.$('pauseCitadel').classList.contains('hidden'),false);assert.equal(h.$('buyCitadelArrows').disabled,false);}
 for(const block of [h=>h.c.document.hidden=true,h=>h.c.profileGate={},h=>h.c.recoveryHold={},h=>h.c.viewportPause.active=true,h=>h.c.battleSafetyReason='unsafe',h=>h.c.battleSession.status=()=> 'stale',h=>h.c.objectiveOutcome={},h=>h.c.game.state.winner=1]){
  const h=modal();h.run('showCitadelOptions()');block(h);const before=h.c.game.serialize();h.$('buyCitadelRegen').onclick();assert.deepEqual(h.c.game.serialize(),before);assert.equal(h.calls.saves,0);
 }
 assert.doesNotMatch(app,/citadelReadyNoticed|own\.readyWait|Ready from 1:30/);
});
