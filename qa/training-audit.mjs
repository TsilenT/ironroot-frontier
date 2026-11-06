/** Independent local-only guided-practice audit.
 * Run: node qa/training-audit.mjs > qa/training-evidence/training-audit.json
 * No runtime edits, network, browser, server, commits or publication.
 * Positive paths use public paid actions and actual fixed-step simulation.
 * Deliberately synthetic adversarial fixtures are labeled separately.
 */
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {Game,MAPS,BUILDINGS,UNITS,SPELL,buildSites,upgradeCost} from '../dist/engine.js';

const root=new URL('../',import.meta.url);
const read=path=>readFileSync(new URL(path,root));
const source=path=>read(path).toString();
const digest=value=>createHash('sha256').update(value).digest('hex');
const hash=value=>digest(JSON.stringify(value));
const checks=[],failures=[],runs=[],adversarial=[],frozen=[];
const sourceFiles=['dist/index.html','dist/service-worker.js','dist/manifest.webmanifest','dist/styles.css','dist/engine.js','dist/training.js','dist/training-app.js','dist/training.html','dist/training.css','dist/input-scope.js','dist/render.js','dist/vfx.js','dist/app.js','dist/persistence.js','dist/campaign.js','dist/backup.js','dist/profile-session.js','qa/training-audit.mjs'];
const sourceHashesBefore=Object.fromEntries(sourceFiles.map(p=>[p,digest(read(p))]));
const near=(a,b,tolerance=1e-8)=>assert.ok(Math.abs(a-b)<=tolerance,`${a} != ${b}`);
function check(name,fn){try{const detail=fn();checks.push({name,passed:true,...(detail===undefined?{}:{detail})});}catch(error){checks.push({name,passed:false,error:error.message});failures.push(name);console.error('FAIL:',name,error.stack);}}
const baseline=JSON.parse(source('BASELINE_0_11.json'));
const protectedFiles=Object.keys(baseline.files).filter(path=>path.startsWith('dist/')&&!['dist/index.html','dist/service-worker.js','dist/manifest.webmanifest','dist/styles.css'].includes(path));
const preserved=()=>{for(const path of protectedFiles)assert.equal(digest(read(path)),baseline.files[path],path);};
function verifyFrozen(){for(const v of ['0_10','0_11']){const m=JSON.parse(source(`BASELINE_${v}.json`));const changed=[];for(const[path,expected]of Object.entries(m.files)){let actual;try{actual=digest(readFileSync(`${m.source}/${path}`));}catch(error){actual=error.message;}if(actual!==expected)changed.push({path,expected,actual});}assert.deepEqual(changed,[],`frozen ${m.version}`);frozen.push({version:m.version,source:m.source,checkedFiles:Object.keys(m.files).length,changedFiles:changed});}}
check('All protected 0.11 runtime bytes remain identical',preserved);
check('Frozen 0.10 and 0.11 source manifests remain identical',verifyFrozen);
check('Existing CSS differs only by the two explicit title training-link rules',()=>{const addition='.welcome-links .training-link {display: inline-flex; align-items: center; justify-content: center; min-height: 44px; color: #e8d39b; text-decoration: none;}\n.welcome-links .training-link:focus-visible {outline: 2px solid #f4d68d; outline-offset: 3px;}\n';const text=source('dist/styles.css');assert.ok(text.includes(addition));assert.equal(digest(text.replace(addition,'')),baseline.files['dist/styles.css']);});
const engineRules=JSON.stringify({MAPS,BUILDINGS,UNITS,SPELL});
const prototypeMethods=Object.fromEntries(Object.getOwnPropertyNames(Game.prototype).map(k=>[k,Game.prototype[k]]));
const costs={};
check('Reference engine charges real build and both upgrade prices',()=>{for(const[type,d]of Object.entries(BUILDINGS)){const g=new Game({seed:3,ai:false});g.state.gold[0]=2000;const before=g.state.gold[0],r=g.build(type,830,260);assert.equal(r.ok,true);near(before-g.state.gold[0],d.cost);const upgrades=[];for(const level of [1,2]){const cost=Math.round(d.cost*(.7+.35*(level-1)));assert.equal(upgradeCost(r.building),cost);const gold=g.state.gold[0];assert.equal(g.upgrade(r.building.id).ok,true);near(gold-g.state.gold[0],cost);upgrades.push(cost);}assert.equal(g.upgrade(r.building.id).ok,false);Game.restore(g.serialize());costs[type]={build:d.cost,upgrades};}});

// Training tests are intentionally below the independent engine reference tests.
// The final evidence identifies every audited source hash and every individual run.
/** Separate engine-side observer. Queue attribution is recorded at _damage enqueue,
 * then matched to actual HP removed when the real engine drains that same queue.
 * It does not infer a kill from a projectile, attack animation or side counter.
 */
function observeEngine(g){
  const events={spawns:[],hits:[],paid:[]},origin=new Map(),pending=[];
  const original={spawn:g._spawn,fire:g._fire,damage:g._damage};let firing=null;
  Object.defineProperty(g,'_spawn',{configurable:true,writable:true,value:function(b){const ids=new Set(this.state.units.map(u=>u.id));const result=original.spawn.call(this,b);for(const u of this.state.units)if(!ids.has(u.id)){origin.set(u.id,b.id);events.spawns.push({time:this.state.time,id:u.id,type:u.type,level:u.level,side:u.side,buildingId:b.id,buildingType:b.type});}return result;}});
  Object.defineProperty(g,'_fire',{configurable:true,writable:true,value:function(attacker,target,amount,type){const prior=firing;firing={id:attacker.id,type:attacker.type,side:attacker.side,x:attacker.x,lane:attacker.lane,origin:origin.get(attacker.id)??null};try{return original.fire.call(this,attacker,target,amount,type);}finally{firing=prior;}}});
  Object.defineProperty(g,'_damage',{configurable:true,writable:true,value:function(target,amount,side){if(this.damageQueue){pending.push({target,amount,side,attacker:firing&&{...firing}});return original.damage.call(this,target,amount,side);}const queued=pending.length?pending.shift():null;if(queued){assert.equal(queued.target,target,'observed damage queue identity');assert.equal(queued.amount,amount);assert.equal(queued.side,side);}const hp=target.hp;const result=original.damage.call(this,target,amount,side);if(hp>target.hp)events.hits.push({time:this.state.time,targetId:target.id,targetType:target.type,targetSide:target.side,hpBefore:hp,hpAfter:target.hp,damage:hp-target.hp,attacker:queued?.attacker??firing??null,livingWarriors:this.state.units.filter(u=>u.type==='warrior'&&u.side===0&&u.hp>0).map(u=>({id:u.id,x:u.x,lane:u.lane}))});return result;}});
  return {events,origin};
}
function validEngine(g){const copy=Game.restore(g.serialize());assert.deepEqual(copy.serialize(),g.serialize());for(const b of g.state.buildings){near(b.maxHp,BUILDINGS[b.type].hp*(1+.4*(b.level-1)));assert.ok(b.hp<=b.maxHp);}for(const u of g.state.units){near(u.maxHp,UNITS[u.type].hp*(1+.12*(u.level-1)));assert.equal(u.flying,UNITS[u.type].flying);}return true;}
const {TrainingSession,TRAINING_LESSONS}=await import('../dist/training.js');
const seeds=[0,1,7,42,12012,4294967295];
const snapshot=s=>s.snapshot();
function rejectUnchanged(s,action,label){const before=s.game.serialize(),state=snapshot(s);const result=action();assert.equal(result?.ok,false,label);assert.deepEqual(s.game.serialize(),before,label+' changed engine');const after=snapshot(s);for(const key of ['lessonIndex','stepIndex','status','attemptId','evidence','results'])assert.deepEqual(after[key],state[key],label+' changed '+key);return result;}
function advanceTo(s,predicate,max=10000){for(let n=0;n<max;n++){const p=snapshot(s);if(predicate(p))return p;if(p.status==='step-complete'||p.status==='lesson-complete'||(p.status==='instruction'&&p.step.kind==='watch')){assert.equal(s.continue().ok,true);continue;}if(p.status==='active'){s.update(.05);continue;}if(p.status==='instruction'&&p.step.kind==='build'){const h=p.targetHints.find(h=>h.side===0);assert.equal(s.build(p.step.type,h.x,h.y).ok,true);continue;}if(p.status==='instruction'&&p.step.kind==='upgrade'){assert.equal(s.upgrade(p.targetHints[0].buildingId).ok,true);continue;}throw new Error('Cannot advance '+JSON.stringify({status:p.status,step:p.step.id}));}throw new Error('Advance bound exceeded');}
function startWatch(s){return advanceTo(s,p=>p.status==='active');}
function fresh(lessonId,seed=12012){return new TrainingSession({lessonId,seed});}
function runLesson(lesson,seed){
  const s=fresh(lesson.id,seed),g=s.game,observer=observeEngine(g),shadow=Game.restore(g.serialize());
  const initial=g.serialize(),trace=[];let ticks=0;
  for(let iterations=0;iterations<10000;iterations++){
    const p=snapshot(s);validEngine(g);
    if(p.status==='lesson-complete'){
      assert.equal(p.lastResult.outcome,'completed');assert.equal(p.lastResult.lessonId,lesson.id);
      assert.deepEqual(g.serialize(),shadow.serialize(),'terminal pure-engine parity');
      const run={lessonId:lesson.id,seed,initialSha256:hash(initial),finalSha256:hash(g.serialize()),simulationTime:g.state.time,ticks,paidActions:trace,engineEvents:observer.events,evidence:p.evidence,sourceBuildingIds:trace.filter(a=>a.kind==='build').map(a=>a.id),result:p.lastResult};runs.push(run);return {s,run};
    }
    assert.notEqual(p.status,'failed',`${lesson.id} failed: ${p.feedback}`);
    if(p.status==='instruction'&&p.step.kind==='build'){
      const h=p.targetHints.find(h=>h.side===0),gold=g.state.gold[0],time=g.state.time;
      assert.equal(g.canBuild(p.step.type,h.x,h.y).ok,true,'recommended site engine legal');
      const result=s.build(p.step.type,h.x,h.y),control=shadow.build(p.step.type,h.x,h.y,0);assert.equal(result.ok,true);assert.equal(control.ok,true);
      near(gold-g.state.gold[0],BUILDINGS[p.step.type].cost);assert.equal(time,g.state.time);
      assert.equal(result.building.invested,BUILDINGS[p.step.type].cost);trace.push({kind:'build',step:p.step.id,type:p.step.type,id:result.building.id,x:h.x,y:h.y,cost:gold-g.state.gold[0],time});
    }else if(p.status==='instruction'&&p.step.kind==='upgrade'){
      const id=p.targetHints.find(h=>h.side===0).buildingId,b=g.state.buildings.find(b=>b.id===id),cost=upgradeCost(b),gold=g.state.gold[0],time=g.state.time,level=b.level;
      assert.equal(s.upgrade(id).ok,true);assert.equal(shadow.upgrade(id,0).ok,true);near(gold-g.state.gold[0],cost);assert.equal(b.level,level+1);assert.equal(time,g.state.time);trace.push({kind:'upgrade',step:p.step.id,id,type:b.type,cost,time,level:b.level});
    }else if(p.status==='step-complete'||(p.status==='instruction'&&p.step.kind==='watch')){
      const saved=g.serialize();assert.equal(s.continue().ok,true);assert.deepEqual(g.serialize(),saved,'continue must not simulate or place');
    }else if(p.status==='active'){
      const tick=g.tick;s.update(.05);const delta=g.tick-tick;assert.ok(delta===0||delta===1);shadow.update(.05);ticks+=delta;
    }else throw new Error('Unexpected lesson state '+p.status);
    assert.deepEqual(g.serialize(),shadow.serialize(),'exact per-action/per-tick engine and RNG parity');
  }throw new Error('Positive path exceeded bounded iteration count');
}
check('Exactly five immutable, isolated lesson definitions use Classic and disclosed setups',()=>{
  assert.equal(TRAINING_LESSONS.length,5);assert.ok(Object.isFrozen(TRAINING_LESSONS));for(const l of TRAINING_LESSONS){assert.ok(Object.isFrozen(l));assert.ok(l.briefing.length>=3);const s=fresh(l.id),g=s.game;assert.equal(g.ai,false);assert.equal(g.map.id,'classic');assert.equal(g.state.gold[0],l.startingGold);assert.equal(g.state.gold[1],0);assert.equal(g.state.time,0);assert.equal(g.state.units.length,0);assert.equal(g.state.bases[0].hp,6000);assert.equal(g.state.bases[1].hp,6000);assert.equal(g.state.buildings.length,l.playerBuildings.length+l.enemyBuildings.length);validEngine(g);assert.deepEqual(g.state.stats.built,[l.playerBuildings.length,l.enemyBuildings.length]);}
});
check('Lesson constructors reject unknown IDs and invalid seeds without changing global rules',()=>{for(const lessonId of ['','unknown','constructor',null,42])assert.throws(()=>new TrainingSession({lessonId}));for(const seed of [-1,4294967296,NaN,Infinity,1.1,'1',null])assert.throws(()=>new TrainingSession({seed}));});
for(const lesson of TRAINING_LESSONS)for(const seed of seeds)check(`Positive paid-action path and exact engine parity: ${lesson.id}, seed ${seed}`,()=>{const {run}=runLesson(lesson,seed);return {simulationTime:run.simulationTime,paidActions:run.paidActions.length,ticks:run.ticks};});
for(const l of TRAINING_LESSONS)check(`Wrong, early, off-site, unaffordable and duplicate actions never advance: ${l.id}`,()=>{
  const s=fresh(l.id),p=snapshot(s),type=p.step.type,h=p.targetHints[0];
  rejectUnchanged(s,()=>s.continue(),'early Continue');rejectUnchanged(s,()=>s.upgrade(-1),'early upgrade');rejectUnchanged(s,()=>s.recoverGold(),'unneeded recovery');
  for(const wrong of [...Object.keys(BUILDINGS).filter(t=>t!==type),'unknown','__proto__',null,42])rejectUnchanged(s,()=>s.build(wrong,h.x,h.y),'wrong type '+String(wrong));
  let legalAlternatives=0;for(const point of buildSites(s.game.map,0))if(!p.step.sites.some(a=>a.x===point.x&&a.y===point.y)&&s.game.canBuild(type,point.x,point.y).ok){rejectUnchanged(s,()=>s.build(type,point.x,point.y),'unhighlighted engine-legal site');legalAlternatives++;}
  assert.ok(legalAlternatives>0);for(const [x,y]of [[NaN,h.y],[Infinity,h.y],[h.x,NaN],[h.x,Infinity],[0,0],[-1,450],[1950,450],[h.x+.001,h.y],[h.x,h.y+.001]])rejectUnchanged(s,()=>s.build(type,x,y),'invalid point');
  const gold=s.game.state.gold[0];s.game.state.gold[0]=BUILDINGS[type].cost-.01;rejectUnchanged(s,()=>s.build(type,h.x,h.y),'insufficient gold');s.game.state.gold[0]=gold;
  const before=s.game.serialize();for(const dt of [undefined,null,'1',NaN,Infinity,-1,0])rejectUnchanged(s,()=>s.update(dt),'invalid dt');s.update(.25);assert.deepEqual(s.game.serialize(),before,'instruction freezes time');
  assert.equal(s.setPaused(true).ok,true);rejectUnchanged(s,()=>s.build(type,h.x,h.y),'paused build');s.update(.25);assert.deepEqual(s.game.serialize(),before);assert.equal(s.setPaused(false).ok,true);
  assert.equal(s.build(type,h.x,h.y).ok,true);rejectUnchanged(s,()=>s.build(type,h.x,h.y),'duplicate build');rejectUnchanged(s,()=>s.upgrade(s.game.state.buildings.find(b=>b.side===0).id),'step-complete upgrade');
  return {legalNonrecommendedSitesRejected:legalAlternatives,recommendedSitesTested:p.step.sites.length};
});
check('Only the paid original mine can receive the instructed real-price upgrade',()=>{
  const s=fresh('mine-and-upgrade');advanceTo(s,p=>p.status==='instruction'&&p.step.kind==='upgrade');const id=snapshot(s).targetHints[0].buildingId;
  for(const bad of [-1,0,999999,'3',null,undefined,{},NaN])rejectUnchanged(s,()=>s.upgrade(bad),'invalid mine ID');
  const other=s.game._place('mint',690,450,0);rejectUnchanged(s,()=>s.upgrade(other.id),'unrelated allied mine');s.game.state.buildings=s.game.state.buildings.filter(b=>b!==other);
  const gold=s.game.state.gold[0];s.game.state.gold[0]=132.99;rejectUnchanged(s,()=>s.upgrade(id),'unaffordable mine upgrade');s.game.state.gold[0]=gold;
  const mine=s.game.state.buildings.find(b=>b.id===id),before=s.game.state.gold[0];assert.equal(s.upgrade(id).ok,true);near(before-s.game.state.gold[0],133);assert.equal(mine.level,2);near(mine.maxHp,532);rejectUnchanged(s,()=>s.upgrade(id),'duplicate mine upgrade');
});
check('Instruction, Continue, watch, explicit pause and completion have distinct timing',()=>{
  const s=fresh('first-barracks'),g=s.game;const h=snapshot(s).targetHints[0];s.update(.25);assert.equal(g.state.time,0);s.build('barracks',h.x,h.y);s.update(.25);assert.equal(g.state.time,0);s.continue();s.update(.25);assert.equal(g.state.time,0);s.continue();assert.equal(snapshot(s).shouldRun,true);rejectUnchanged(s,()=>s.continue(),'active observation Continue');rejectUnchanged(s,()=>s.build('barracks',h.x,h.y),'active observation build');
  s.update(.25);near(g.state.time,.25);assert.equal(s.setPaused(true).ok,true);const saved=g.serialize();for(let i=0;i<50;i++)s.update(.25);assert.deepEqual(g.serialize(),saved);assert.equal(snapshot(s).shouldRun,false);rejectUnchanged(s,()=>s.continue(),'paused Continue');assert.equal(s.setPaused(false).ok,true);advanceTo(s,p=>p.status==='lesson-complete');const done=g.serialize();for(let i=0;i<10;i++)s.update(.25);assert.deepEqual(g.serialize(),done);assert.equal(snapshot(s).shouldRun,false);assert.equal(snapshot(s).canContinue,true);
});
check('Income recovery uses ordinary engine time, stops at affordability and never buys automatically',()=>{
  for(const id of ['first-barracks','mine-and-upgrade']){const s=fresh(id),p=snapshot(s),price=BUILDINGS[p.step.type].cost;s.game.state.gold[0]=price-.25;const before=s.game.serialize(),shadow=Game.restore(before);assert.equal(snapshot(s).canRecoverGold,true);assert.equal(s.recoverGold().ok,true);assert.equal(snapshot(s).shouldRun,true);s.update(.25);shadow.update(.05);assert.deepEqual(s.game.serialize(),shadow.serialize());assert.equal(snapshot(s).status,'instruction');assert.equal(snapshot(s).recovering,false);assert.equal(s.game.state.buildings.length,before.state.buildings.length);near(s.game.state.gold[0],price);rejectUnchanged(s,()=>s.recoverGold(),'repeated recovery when affordable');}
});
check('Retry and lesson changes create pristine engines, isolate old references and clear current evidence',()=>{
  const s=fresh('first-barracks',42),initial=s.game.serialize(),first=s.game;startWatch(s);s.update(.25);assert.equal(s.retry().ok,true);assert.notEqual(s.game,first);assert.deepEqual(s.game.serialize(),initial);assert.deepEqual(snapshot(s).evidence,{});const saved=s.game.serialize();for(let i=0;i<50;i++)first.update(.25);assert.ok(first.state.units.length>0,'old observed game really spawns after retry');assert.deepEqual(s.game.serialize(),saved);assert.deepEqual(snapshot(s).evidence,{});
  for(const l of TRAINING_LESSONS){const old=s.game,attempt=snapshot(s).attemptId;assert.equal(s.startLesson(l.id).ok,true);assert.equal(snapshot(s).attemptId,attempt+1);assert.deepEqual(s.game.serialize(),fresh(l.id,42).game.serialize());assert.deepEqual(snapshot(s).evidence,{});assert.equal(snapshot(s).paused,false);assert.equal(snapshot(s).recovering,false);assert.notEqual(s.game,old);}
  rejectUnchanged(s,()=>s.startLesson('unknown'),'unknown lesson');const other=fresh('first-barracks',42);assert.deepEqual(snapshot(other).results,[]);assert.equal(snapshot(other).summary.completed,0);advanceTo(other,p=>p.status==='lesson-complete');assert.equal(snapshot(other).summary.completed,1);other.retry();assert.equal(snapshot(other).summary.completed,0);assert.deepEqual(snapshot(other).results,[]);assert.deepEqual(snapshot(other).evidence,{});
});
check('Snapshots are detached; caller edits cannot change lesson state, evidence or definitions',()=>{const s=fresh('first-barracks');const p=snapshot(s);p.lesson.steps[0].sites[0].x=0;p.step.sites[0].x=0;p.targetHints[0].x=0;p.evidence.injected=true;p.results.push({outcome:'completed'});const now=snapshot(s);assert.equal(now.step.sites[0].x,1110);assert.equal(now.targetHints[0].x,1110);assert.deepEqual(now.evidence,{});assert.deepEqual(now.results,[]);});
check('Exact time limit, defeat, draw and unrelated citadel win fail honestly, then retry resets',()=>{
  for(const kind of ['timeout','defeat','draw','win']){const s=fresh('first-barracks'),initial=s.game.serialize();startWatch(s);if(kind==='timeout')s.game.state.time=s.lesson.timeLimit-.05;else{if(kind==='defeat'||kind==='draw')s.game.state.bases[0].hp=0;if(kind==='win'||kind==='draw')s.game.state.bases[1].hp=0;s.game.state.winner=kind==='draw'?'draw':kind==='win'?0:1;}s.update(.05);assert.equal(snapshot(s).status,'failed',kind);assert.equal(snapshot(s).lastResult.outcome,'failed');assert.equal(snapshot(s).summary.completed,0);const ended=s.game.serialize();s.update(.25);assert.deepEqual(s.game.serialize(),ended);rejectUnchanged(s,()=>s.continue(),'failed Continue');assert.equal(s.retry().ok,true);assert.deepEqual(s.game.serialize(),initial);assert.deepEqual(snapshot(s).evidence,{});adversarial.push({kind,fixture:'synthetic terminal engine state',passed:true});}
});
check('Skip, final review and Exit never fabricate completions or carry gameplay state',()=>{
  const s=fresh('first-barracks');for(let i=0;i<TRAINING_LESSONS.length;i++){assert.equal(s.skip().ok,true);assert.equal(snapshot(s).summary.completed,0);assert.equal(snapshot(s).summary.skipped,i+1);}assert.equal(snapshot(s).status,'finished');assert.equal(snapshot(s).shouldRun,false);rejectUnchanged(s,()=>s.continue(),'finished Continue');assert.equal(s.startLesson('first-barracks').ok,true);startWatch(s);const before=s.game.serialize();assert.equal(s.exit().ok,true);assert.equal(s.exit().ok,true);s.update(.25);assert.deepEqual(s.game.serialize(),before);assert.equal(snapshot(s).status,'exited');for(const fn of [()=>s.retry(),()=>s.skip(),()=>s.startLesson('first-barracks'),()=>s.continue(),()=>s.setPaused(false)])rejectUnchanged(s,fn,'closed session action');
});
const {bootTraining}=await import('../dist/training-app.js');
const {BattleVFX}=await import('../dist/vfx.js');
check('Practice dependency closure excludes every persistence, profile, backup and main-app path',()=>{
  const visited=new Set();function visit(path){if(visited.has(path))return;visited.add(path);const text=source(path);assert.doesNotMatch(text,/\b(?:localStorage|sessionStorage|indexedDB|fetch|XMLHttpRequest|WebSocket|BroadcastChannel|sendBeacon)\b|document\.cookie/,path);for(const match of text.matchAll(/\bfrom\s*['"]\.\/([^'"]+)['"]/g))visit('dist/'+match[1]);}
  visit('dist/training-app.js');assert.deepEqual([...visited].sort(),['dist/engine.js','dist/input-scope.js','dist/render.js','dist/training-app.js','dist/training.js','dist/vfx.js']);assert.doesNotMatch(source('dist/training.html'),/src=["'](?:https?:)?\/\//);return {modules:[...visited].sort()};
});
check('Actual UI boot, paid lessons, pause/visibility, replay, exit and bfcache reset never access storage or network (stub DOM, not browser)',()=>{
  const saved=new Map(),accesses=[],listeners=new Map(),elements=new Map();let queued=null,now=100,vfxResets=0;const originalVfxReset=BattleVFX.prototype.reset;BattleVFX.prototype.reset=function(...args){vfxResets++;return originalVfxReset.apply(this,args);};
  const ctx=new Proxy({createLinearGradient:()=>({addColorStop(){}})}, {get:(t,k)=>k in t?t[k]:(()=>{}),set:(t,k,v)=>(t[k]=v,true)});
  const element=id=>{if(elements.has(id))return elements.get(id);const handlers=new Map(),e={id,dataset:{},style:{},textContent:'',innerHTML:'',value:'',hidden:false,disabled:false,classList:{add(){},remove(){}},focus(){},closest:()=>null,isConnected:true,setAttribute(k,v){this[k]=v;},addEventListener(k,f){if(!handlers.has(k))handlers.set(k,[]);handlers.get(k).push(f);},getBoundingClientRect:()=>({left:0,top:0,width:700,height:id==='trainingMinimap'?44:400}),getContext:()=>ctx,querySelectorAll:()=>[],setPointerCapture(){},handlers};elements.set(id,e);return e;};
  const doc={hidden:false,body:{dataset:{}},documentElement:{style:{setProperty(){}}},getElementById:element,createElement:()=>element('scratch-'+elements.size),addEventListener(k,f){if(!listeners.has(k))listeners.set(k,[]);listeners.get(k).push(f);}};
  Object.defineProperty(doc,'cookie',{get(){accesses.push('cookie');throw Error('Forbidden cookie read');},set(){accesses.push('cookie write');throw Error('Forbidden cookie write');}});
  const forbidden=label=>new Proxy({}, {get(){accesses.push(label);throw Error('Forbidden '+label);},set(){accesses.push(label);throw Error('Forbidden '+label);}});
  const win={innerHeight:900,scrollBy(){},addEventListener(k,f){if(!listeners.has(k))listeners.set(k,[]);listeners.get(k).push(f);},localStorage:forbidden('window.localStorage'),sessionStorage:forbidden('window.sessionStorage')};
  const globals={document:doc,window:win,devicePixelRatio:1,matchMedia:()=>({matches:true}),ResizeObserver:class{observe(){}},requestAnimationFrame:fn=>{queued=fn;},localStorage:forbidden('localStorage'),sessionStorage:forbidden('sessionStorage'),indexedDB:forbidden('indexedDB'),fetch:()=>{accesses.push('fetch');throw Error('Forbidden network');}};
  for(const[k,v]of Object.entries(globals)){saved.set(k,Object.getOwnPropertyDescriptor(globalThis,k));Object.defineProperty(globalThis,k,{value:v,writable:true,configurable:true});}
  const emit=(name,event={})=>{for(const f of listeners.get(name)||[])f(event);};
  const stepFrame=()=>{assert.ok(queued);const cb=queued;queued=null;now+=50;cb(now);};
  const choose=type=>element('buildDeck').onclick({target:{closest:()=>({disabled:false,dataset:{build:type},closest:()=>null})}});
  const place=()=>element('siteActions').onclick({target:{closest:()=>({disabled:false,dataset:{siteIndex:'0'},closest:()=>null})}});
  try{
    bootTraining(doc);assert.equal(doc.body.dataset.lessonId,'first-barracks');assert.equal(element('gold').textContent,'280');const initialVfxResets=vfxResets;assert.ok(initialVfxResets>=1);
    choose('barracks');place();assert.equal(element('gold').textContent,'140');element('continueLesson').onclick();element('continueLesson').onclick();stepFrame();stepFrame();element('pauseLesson').onclick();assert.equal(doc.body.dataset.trainingPaused,'true');assert.doesNotMatch(element('feedback').textContent,/\brunning\b/i,'paused feedback must not say running');element('pauseLesson').onclick();emit('blur');assert.equal(doc.body.dataset.trainingPaused,'true');const time=element('battleTime').textContent;for(let i=0;i<20;i++)stepFrame();assert.equal(element('battleTime').textContent,time);element('pauseLesson').onclick();assert.equal(vfxResets,initialVfxResets,'ordinary same-game steps and pause do not reset VFX');
    for(const lesson of TRAINING_LESSONS){const resetsBefore=vfxResets;element('lessonPicker').value=lesson.id;element('lessonPicker').onchange();assert.equal(vfxResets,resetsBefore+1,'a new lesson Game resets VFX exactly once');assert.equal(doc.body.dataset.lessonId,lesson.id);for(let n=0;n<5000&&doc.body.dataset.trainingStatus!=='lesson-complete';n++){
        const status=doc.body.dataset.trainingStatus,stepId=doc.body.dataset.stepId,def=lesson.steps.find(s=>s.id===stepId);
        assert.notEqual(status,'failed');
        if(status==='instruction'&&def.kind==='build'){choose(def.type);place();if(def.type==='mint')assert.equal(element('income').textContent,'+7.5/s','paused paid mine HUD');}
        else if(status==='instruction'&&def.kind==='upgrade'){const match=element('buildingActions').innerHTML.match(/data-building-id="(\d+)"/);assert.ok(match);element('buildingActions').onclick({target:{closest:()=>({disabled:false,dataset:{buildingId:match[1]},closest:()=>null})}});element('upgradeBuilding').onclick();assert.equal(element('income').textContent,'+8.75/s','paused upgraded mine HUD');}
        else if(status==='step-complete'||(status==='instruction'&&def.kind==='watch'))element('continueLesson').onclick();
        else stepFrame();
      }assert.equal(doc.body.dataset.trainingStatus,'lesson-complete');assert.equal(vfxResets,resetsBefore+1,'same-game lesson steps preserve VFX');}
    element('continueLesson').onclick();assert.equal(doc.body.dataset.trainingStatus,'finished');assert.match(element('lessonSubtitle').textContent,/5 completed/);
    const beforeRetry=vfxResets;element('restartLesson').onclick();assert.equal(doc.body.dataset.trainingStatus,'instruction');assert.equal(vfxResets,beforeRetry+1,'retry creates a fresh visual state');
    for(const f of element('returnGame').handlers.get('click')||[])f({});emit('pagehide');const beforeBfcache=vfxResets;emit('pageshow',{persisted:true});assert.equal(vfxResets,beforeBfcache+1,'bfcache resets even when fresh attempt IDs repeat');assert.equal(doc.body.dataset.lessonId,'first-barracks');assert.equal(doc.body.dataset.trainingStatus,'instruction');assert.equal(element('gold').textContent,'280');const beforeRepeatedId=vfxResets;emit('pagehide');emit('pageshow',{persisted:true});assert.equal(vfxResets,beforeRepeatedId+1,'second fresh page session repeats attemptId1 but resets by Game identity');assert.equal(doc.body.dataset.lessonId,'first-barracks');assert.equal(element('gold').textContent,'280');assert.deepEqual(accesses,[]);
  }finally{BattleVFX.prototype.reset=originalVfxReset;for(const[k,d]of saved){if(d)Object.defineProperty(globalThis,k,d);else delete globalThis[k];}}
  return {storageAndNetworkAccesses:accesses.length,vfxResets,scope:'Actual controller with fake canvas/DOM. No rendering, layout or real browser claim.'};
});
check('Every completed lesson evidence matches independently credited producer/attacker/target IDs and actual HP loss',()=>{
  assert.equal(runs.length,TRAINING_LESSONS.length*seeds.length);
  for(const r of runs){const e=r.evidence,ev=r.engineEvents,paid=r.sourceBuildingIds[0];
    if(r.lessonId==='first-barracks'){const spawn=ev.spawns.find(a=>a.id===e.spawnedWarriorId);assert.ok(spawn);assert.equal(spawn.buildingId,paid);assert.equal(e.producerId,paid);assert.equal(spawn.type,'warrior');assert.equal(spawn.side,0);near(spawn.time,1.25);}
    if(r.lessonId==='shield-and-arrow'){
      assert.ok(ev.hits.some(h=>h.targetId===e.shieldHit.warriorId&&h.attacker?.type==='archer'&&h.attacker.side===1&&h.damage===e.shieldHit.damage&&h.time===e.shieldHit.time));
      const h=ev.hits.find(h=>h.targetId===e.supportShot.targetId&&h.attacker?.id===e.supportShot.archerId&&h.attacker.origin===paid&&h.damage===e.supportShot.damage&&h.time===e.supportShot.time);assert.ok(h);assert.ok(h.livingWarriors.some(u=>u.id===e.supportShot.warriorId&&u.lane===h.attacker.lane&&u.x>h.attacker.x));assert.equal(e.supportShot.producerId,paid);near(e.shieldHit.damage,17*.55);near(e.supportShot.damage,17);
    }
    if(r.lessonId==='mine-and-upgrade'){assert.equal(e['watch-income'].mineId,paid);assert.equal(e['watch-upgraded-income'].mineId,paid);near(e['watch-income'].income,7.5);near(e['watch-upgraded-income'].income,8.75);near(e['watch-income'].time,2);near(e['watch-upgraded-income'].time,4);assert.deepEqual(r.paidActions.map(a=>a.cost),[190,133]);}
    if(r.lessonId==='siege-the-tower'){
      const h=ev.hits.find(h=>h.targetId===e.siegeHit.targetId&&h.attacker?.id===e.siegeHit.attackerId&&h.attacker.origin===paid&&h.damage===e.siegeHit.damage&&h.time===e.siegeHit.time);assert.ok(h);assert.equal(h.targetType,'watchtower');assert.equal(h.attacker.type,'siege');assert.equal(e.siegeHit.producerId,paid);assert.equal(e.towerDestroyed.targetId,h.targetId);assert.ok(ev.hits.some(a=>a.targetId===h.targetId&&a.hpAfter===0&&a.time===e.towerDestroyed.time));near(ev.hits.filter(a=>a.targetId===h.targetId).reduce((n,a)=>n+a.damage,0),1000);assert.ok(ev.hits.some(a=>a.targetId===h.targetId&&a.damage===90),'ordinary siege applies triple30 damage to a structure');assert.ok(!ev.hits.some(a=>a.attacker?.type==='watchtower'&&a.targetType==='siege'),'ordinary siege remains outside tower reach');
    }
    if(r.lessonId==='answer-the-air'){
      const spawn=ev.spawns.find(a=>a.id===e.airTargetId);assert.ok(spawn);assert.equal(spawn.type,'gryphon');assert.equal(spawn.side,1);assert.equal(spawn.buildingType,'aerie');const h=ev.hits.find(a=>a.targetId===e.airTargetId&&a.attacker?.id===e.archerAirHit.attackerId&&a.attacker.origin===paid&&a.damage===e.archerAirHit.damage&&a.time===e.archerAirHit.time);assert.ok(h);assert.equal(h.attacker.type,'archer');assert.equal(e.archerAirHit.producerId,paid);assert.ok(ev.hits.some(a=>a.targetId===e.airTargetId&&a.attacker?.origin===paid&&a.damage===25.5),'ordinary archer applies1.5x air damage');assert.ok(ev.hits.some(a=>a.targetId===e.airTargetId&&a.hpAfter===0&&a.time===e.gryphonDefeated.time));assert.ok(!ev.hits.some(a=>a.targetType==='gryphon'&&['warrior','siege'].includes(a.attacker?.type)));
    }
  }
});
function synthetic(name,fn){check('Synthetic adversarial fixture: '+name,()=>{const detail=fn();adversarial.push({kind:name,fixture:'Deliberate isolated engine-state/method injection; not a reachable UI claim',passed:true,...detail});return detail;});}
synthetic('unrelated allied warrior spawn cannot complete paid-producer observation',()=>{
  const s=fresh('first-barracks');const h=snapshot(s).targetHints[0];s.build('barracks',h.x,h.y);s.continue();const unrelated=s.game.build('barracks',270,450,0);assert.equal(unrelated.ok,true);s.game._spawn(unrelated.building);const unrelatedId=s.game.state.units[0].id;s.continue();s.update(.05);assert.equal(snapshot(s).status,'active');assert.equal(snapshot(s).evidence.spawnedWarriorId,undefined);advanceTo(s,p=>p.status==='lesson-complete');assert.notEqual(snapshot(s).evidence.spawnedWarriorId,unrelatedId);assert.notEqual(snapshot(s).evidence.producerId,unrelated.building.id);return {unrelatedId,evidence:snapshot(s).evidence};
});
synthetic('same-type replacement tower does not inherit original target identity',()=>{
  const s=fresh('siege-the-tower');startWatch(s);const original=s.game.state.buildings.find(b=>b.side===1);s.game._damage(original,original.hp,0);const replacement=s.game._place('watchtower',original.x,original.y,1);for(let i=0;i<1800&&snapshot(s).status==='active';i++)s.update(.05);assert.notEqual(snapshot(s).status,'lesson-complete');assert.equal(snapshot(s).evidence.towerDestroyed,undefined);assert.ok(!s.game.state.buildings.some(b=>b.id===replacement.id),'actual siege destroys replacement without completing original target');return {originalId:original.id,replacementId:replacement.id,status:snapshot(s).status,evidence:snapshot(s).evidence};
});
synthetic('unrelated kill counter and target disappearance cannot fake air success',()=>{
  const s=fresh('answer-the-air');startWatch(s);advanceTo(s,p=>!!p.evidence.airTargetId);const targetId=snapshot(s).evidence.airTargetId,t=s.game.state.units.find(u=>u.id===targetId);s.game._damage(t,t.hp,0);s.update(.05);assert.ok(s.game.state.stats.kills[0]>0);assert.equal(snapshot(s).evidence.archerAirHit,undefined);assert.notEqual(snapshot(s).status,'lesson-complete');for(let i=0;i<2400&&snapshot(s).status==='active';i++)s.update(.05);assert.equal(snapshot(s).status,'failed');assert.equal(snapshot(s).summary.completed,0);return {targetId,kills:s.game.state.stats.kills[0],status:snapshot(s).status,evidence:snapshot(s).evidence};
});
for(const lessonId of ['siege-the-tower','answer-the-air'])synthetic('uncredited queued shot cannot claim damage or victory: '+lessonId,()=>{
  const s=fresh(lessonId);startWatch(s);advanceTo(s,p=>s.game.state.units.some(u=>u.side===0&&u.type===(lessonId==='siege-the-tower'?'siege':'archer'))&&(lessonId==='siege-the-tower'||!!p.evidence.airTargetId));
  const g=s.game,type=lessonId==='siege-the-tower'?'siege':'archer',attacker=g.state.units.find(u=>u.side===0&&u.type===type),target=lessonId==='siege-the-tower'?g.state.buildings.find(b=>b.side===1):g.state.units.find(u=>u.id===snapshot(s).evidence.airTargetId);
  g.damageQueue=[];g._damage(target,target.hp,0);g._fire(attacker,target,type==='siege'?90:25.5,type);const queued=g.damageQueue;g.damageQueue=null;for(const hit of queued)g._damage(...hit);assert.equal(target.hp,0);assert.ok(g.state.projectiles.some(p=>p.type===type));s.update(.05);assert.equal(snapshot(s).evidence[type==='siege'?'siegeHit':'archerAirHit'],undefined);assert.notEqual(snapshot(s).status,'lesson-complete');return {targetId:target.id,attackerId:attacker.id,status:snapshot(s).status,evidence:snapshot(s).evidence};
});
synthetic('wrong-producer archer hit and unrelated unit kill cannot satisfy designated air proof',()=>{
  const s=fresh('answer-the-air');startWatch(s);advanceTo(s,p=>!!p.evidence.airTargetId);const g=s.game,t=g.state.units.find(u=>u.id===snapshot(s).evidence.airTargetId);const wrong=g._place('archery',550,450,0);g._spawn(wrong);const wrongArcher=g.state.units.at(-1);g._fire(wrongArcher,t,25.5,'archer');s.update(.05);assert.equal(snapshot(s).evidence.archerAirHit,undefined);assert.notEqual(snapshot(s).status,'lesson-complete');const own=g.state.units.find(u=>u.type==='archer'&&u.side===0&&u.id!==wrongArcher.id);g._fire(own,t,25.5,'archer');const aerie=g.state.buildings.find(b=>b.type==='aerie');g._spawn(aerie);const unrelated=g.state.units.at(-1);assert.notEqual(unrelated.id,t.id);g._damage(unrelated,unrelated.hp,0);s.update(.05);assert.equal(snapshot(s).evidence.archerAirHit.targetId,t.id);assert.equal(snapshot(s).evidence.gryphonDefeated,undefined);assert.notEqual(snapshot(s).status,'lesson-complete');return {targetId:t.id,unrelatedId:unrelated.id,wrongProducerId:wrong.id,evidence:snapshot(s).evidence};
});
synthetic('a substituted mine or fake cached income cannot replace the paid mine',()=>{
  const s=fresh('mine-and-upgrade');startWatch(s);const paid=s.game.state.buildings.find(b=>b.type==='mint');s.game.state.buildings=[];s.game._place('mint',690,450,0);s.game.state.income[0]=7.5;for(let i=0;i<60;i++)s.update(.05);assert.equal(snapshot(s).status,'active');assert.equal(snapshot(s).evidence['watch-income'],undefined);return {removedPaidMineId:paid.id,replacementId:s.game.state.buildings[0].id,evidence:snapshot(s).evidence};
});

check('Fractional frame times and capped long frames preserve exact observed/unobserved engine semantics',()=>{
  const frames=[1/60,.1,.25,.007,.043,.15,2];let calls=0;
  for(const l of TRAINING_LESSONS){const session=fresh(l.id,7),g=session.game,shadow=Game.restore(g.serialize());for(const method of ['build','upgrade','update']){const original=g[method];Object.defineProperty(g,method,{configurable:true,writable:true,value:function(...args){const control=shadow[method](...args),result=original.apply(this,args);assert.deepEqual(this.serialize(),shadow.serialize(),method+' parity');if(method!=='update')assert.deepEqual(result,control);else calls++;return result;}});}for(let n=0;n<15000;n++){const p=snapshot(session);if(p.status==='lesson-complete')break;assert.notEqual(p.status,'failed');if(p.status==='instruction'&&p.step.kind==='build'){const h=p.targetHints[0];session.build(p.step.type,h.x,h.y);}else if(p.status==='instruction'&&p.step.kind==='upgrade')session.upgrade(p.targetHints[0].buildingId);else if(p.status==='active')session.update(frames[n%frames.length]);else session.continue();}assert.equal(snapshot(session).status,'lesson-complete');validEngine(g);}return {pairedEngineCalls:calls,frameDurations:frames};
});

synthetic('zero-treasury recovery uses real income/combat and preserves honest retry limits',()=>{
  const outcomes=[];for(const l of TRAINING_LESSONS){const s=fresh(l.id,7);s.game.state.gold[0]=0;const payments=[];for(let n=0;n<15000;n++){const p=snapshot(s);if(['lesson-complete','failed'].includes(p.status))break;if(p.status==='instruction'&&['build','upgrade'].includes(p.step.kind)){if(p.canRecoverGold){assert.equal(s.recoverGold().ok,true);continue;}const before=s.game.state.gold[0];let result;if(p.step.kind==='build'){const h=p.targetHints[0];result=s.build(p.step.type,h.x,h.y);}else result=s.upgrade(p.targetHints[0].buildingId);assert.equal(result.ok,true);payments.push({step:p.step.id,cost:before-s.game.state.gold[0],time:s.game.state.time});}else if(p.status==='active')s.update(.05);else assert.equal(s.continue().ok,true);}const p=snapshot(s);assert.equal(p.status,l.id==='shield-and-arrow'?'failed':'lesson-complete');validEngine(s.game);outcomes.push({lessonId:l.id,status:p.status,time:s.game.state.time,payments,reason:p.lastResult.reason});if(p.status==='failed'){assert.equal(p.summary.completed,0);assert.equal(s.retry().ok,true);assert.deepEqual(s.game.serialize(),fresh(l.id,7).game.serialize());}}
  return {outcomes,interpretation:'Zero-gold injected defensive states are outside ordinary funded lessons. Composition can lose its enemy practice target while saving for support; it correctly fails and retry resets instead of inventing evidence.'};
});
check('Observer and all sessions leave engine constants, Game prototype and protected bytes untouched',()=>{assert.equal(JSON.stringify({MAPS,BUILDINGS,UNITS,SPELL}),engineRules);for(const[k,v]of Object.entries(prototypeMethods))assert.equal(Game.prototype[k],v,k);preserved();});
check('Frozen 0.10 and 0.11 source manifests remain identical after audit',verifyFrozen);
check('Every audited source file remains identical throughout this audit invocation',()=>{for(const[p,h]of Object.entries(sourceHashesBefore))assert.equal(digest(read(p)),h,p);});
const report={scope:'Independent local Node source, engine truth, isolation and synthetic control-flow audit. No browser, server, network, transfer, commit, hosting or publication.',passed:checks.filter(c=>c.passed).length,failed:failures.length,positiveRuns:runs.length,seeds,lessons:TRAINING_LESSONS.map(l=>({id:l.id,startingGold:l.startingGold,playerBuildings:l.playerBuildings,enemyBuildings:l.enemyBuildings,timeLimit:l.timeLimit,buildSites:l.steps.filter(s=>s.kind==='build').flatMap(s=>s.sites)})),sourceHashes:Object.fromEntries(sourceFiles.map(p=>[p,digest(read(p))])),protectedRuntimeFiles:protectedFiles.length,enginePrices:costs,checks,frozen,runs,adversarial,limitations:['Prescribed scripted learning paths with explicit authored starting gold, forces and no enemy AI. Not human balance evidence.','Six deterministic seeds and all current recommended sites (one per build step), with every other engine-legal marked site rejected. Not unconstrained player-site choice.','Actual controller exercised with a stub DOM and no-op canvas; native browser layout/touch/keyboard accessibility testing belongs to a separate review.','Synthetic adversarial fixtures intentionally manipulate isolated engine state or invoke engine methods; these do not claim reachable player inputs.','Engine serialization remains valid at every positive simulation step; training result/evidence is deliberately not persisted or restored.','Parity compares identical actual engine.update subcalls, not one unsplit caller frame: training intentionally observes per fixed tick and stops on a completed objective.','Gold recovery runs ordinary combat. A long artificial shortfall can let the shield lesson enemy be destroyed before support is bought; retry is the honest recovery, not fabricated completion.','No physical device, hardware controller, mobile performance, non-Chromium, packaged desktop or release certification.']};
console.log(JSON.stringify(report,null,2));if(failures.length)process.exitCode=1;
