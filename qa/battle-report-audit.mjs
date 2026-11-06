/** Independent, local-only Battle Report truth and noninterference audit.
 * node qa/battle-report-audit.mjs [--fixtures-only]
 * No browser, server, network, publication, or runtime writes. Output is JSON.
 * Synthetic fixtures are explicitly separate from real paid-action simulations.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createContext, runInContext} from 'node:vm';
import {Game, MAPS, BUILDINGS, UNITS, buildSites} from '../dist/engine.js';
import {CAMPAIGN_MISSIONS, createCampaignMission, evaluateCampaignMission, getCampaignTargets} from '../dist/campaign.js';
import {CHALLENGES, createChallenge, evaluateChallenge, getChallengeTargets} from '../dist/challenges.js';
import {advanceObjectiveBattle} from '../dist/objectives.js';
import {parseBackup} from '../dist/backup.js';
import {campaignPolicy, productionPolicy} from '../tests/campaign-policies.mjs';
import {createBattleJournal, exportBattleReport} from '../dist/battle-report.js';
import {renderBattleReport} from '../dist/report-view.js';
import {writeBattle} from '../dist/persistence.js';

const digest = x => createHash('sha256').update(x).digest('hex');
const source = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const expected = {
  'engine.js':'e47a168c099c2a4e1f45b238d5224cb44a02433a7cff06adbfb87095c4d56bc7',
  'campaign.js':'49ec88047efdf66f88a677a3f3a4de5b0067f97fef4df8a71cef05044da66781',
  'challenges.js':'e6f91be9cf1741fe16273baf606a500005ef66d7e7aa4b786bd0c6b48f2c7e08',
  'objectives.js':'9a23b9a63a1b61a6fcb2b0a0ff806421b1a8926a0e312991f350cdd7029edbe4',
  'persistence.js':'8ce2338429ad1ade80cccae5c6987b76b3ec448f8018cc5dd8bd1b2229192512',
  'backup.js':'f16de6ad26420dc448b3802b480e890b91d1b1b5ebe31f0eee6012ca2b5dc331',
  'profile-session.js':'54cc0361a71511ee0d34b9f79e73463e6856a1a99af0ff08d23fe1634f1ea04d',
};
const checks = [], runs = [], failures = [], rosterSeen = new Set(), buildingsSeen = new Set();
function check(name, fn) {
  try { fn(); checks.push({name, passed:true}); }
  catch (error) { checks.push({name, passed:false, error:error.message}); failures.push(name); console.error('FAIL:', name, error.stack); }
}
function near(a,b) { assert.ok(Math.abs(a-b)<1e-9, `${a} != ${b}`); }
function freeze(value) { if(value && typeof value === 'object' && !Object.isFrozen(value)){Object.values(value).forEach(freeze);Object.freeze(value);} return value; }
function allFrozen(value) { if(value && typeof value === 'object'){assert.ok(Object.isFrozen(value));Object.values(value).forEach(allFrozen);} }
function finiteTree(value, path='report', depth=0) {
  assert.ok(depth<16, 'bounded report nesting');
  if(typeof value === 'number')assert.ok(Number.isFinite(value),path+' is finite');
  if(Array.isArray(value))assert.ok(value.length<=256,path+' is bounded');
  if(value && typeof value === 'object')for(const [key,entry] of Object.entries(value))finiteTree(entry,path+'.'+key,depth+1);
}
// Independent engine-field projection. Never use the implementation's helpers.
function reference(g) {
  return {time:g.state.time,sides:[0,1].map(side=>{
    const units=g.state.units.filter(u=>u.side===side&&u.hp>0), buildings=g.state.buildings.filter(b=>b.side===side&&b.hp>0);
    const mineIncome=buildings.filter(b=>b.type==='mint').reduce((n,b)=>n+2.5*(1+.5*(b.level-1)),0);
    return {side,label:side?'Enemy':'You',gold:g.state.gold[side],income:5+mineIncome,mineIncome,armyCount:units.length,
      unitComposition:Object.entries(UNITS).map(([type,u])=>({type,name:u.name,count:units.filter(x=>x.type===type).length})),
      buildingCount:buildings.length,buildingComposition:Object.entries(BUILDINGS).map(([type,b])=>({type,name:b.name,count:buildings.filter(x=>x.type===type).length})),
      baseHp:g.state.bases[side].hp,baseMaxHp:g.state.bases[side].maxHp};
  })};
}
function reportTruth(report,g,observations) {
  assert.deepEqual(report.initial,observations[0]);
  assert.deepEqual(report.final,reference(g));
  assert.equal(report.map.id,g.map.id);assert.equal(report.map.width,g.map.width);assert.deepEqual(report.map.lanes,g.map.lanes);
  assert.deepEqual(report.cumulativeStats,[0,1].map(side=>({side,kills:g.state.stats.kills[side],built:g.state.stats.built[side],damage:g.state.stats.damage[side]})));
  assert.ok(report.timeline.length>=1&&report.timeline.length<=256);
  assert.equal(report.sampling.retainedPoints,report.timeline.length);
  assert.equal(report.sampling.observationCount,observations.length);
  const points=new Set(observations.map(x=>JSON.stringify(x)));
  for(const point of report.timeline)assert.ok(points.has(JSON.stringify(point)),'retained point must be an actual captured observation');
  assert.deepEqual(report.timeline[0].time,observations[0].time);
  assert.deepEqual(report.timeline.at(-1),reference(g));
  for(let i=1;i<report.timeline.length;i++)assert.ok(report.timeline[i].time>report.timeline[i-1].time,'retained times strictly increase');
  for(const side of [0,1])for(const field of ['gold','income','armyCount','buildingCount']) {
    const peak=observations.reduce((best,p)=>p.sides[side][field]>best.sides[side][field]?p:best,observations[0]);
    assert.deepEqual(report.observedPeaks[side][field],{value:peak.sides[side][field],time:peak.time});
  }
  allFrozen(report);finiteTree(report);
  const json=exportBattleReport(report);
  assert.deepEqual(JSON.parse(json),report);
  assert.ok(Buffer.byteLength(json)<2000000,'even pretty JSON remains bounded');
  for(const key of ['seed','nextId','aiTimer','accumulator','tick','state'])assert.equal(Object.hasOwn(report,key),false,'not replay/save state');
  assert.throws(()=>Game.restore(JSON.parse(json)));
  assert.throws(()=>parseBackup(json));
}
const terminal = {completed:true,failed:false,label:'Synthetic audit terminal.'};
const finishFixture = (j,g,extra={}) => j.finish(g,{objectiveOutcome:terminal,...extra});

check('Frozen engine, objective, save, and backup modules match the 0.10 baseline',()=>{
  for(const [file,hash] of Object.entries(expected))assert.equal(digest(source('dist/'+file)),hash,file);
});
check('Creation, observation, finalization and export read a deeply frozen Game without mutation',()=>{
  const g=freeze(new Game({ai:false})),before=JSON.stringify(g.serialize()),keys=Reflect.ownKeys(g);
  const j=createBattleJournal(g);assert.equal(j.sample(g),false);const r=finishFixture(j,g);
  exportBattleReport(r);assert.equal(JSON.stringify(g.serialize()),before);assert.deepEqual(Reflect.ownKeys(g),keys);
  allFrozen(r);assert.throws(()=>{r.final.sides[0].gold=0;},TypeError);
});
check('Live-mine income ignores stale HUD rate after paid build, upgrade, sale and destruction',()=>{
  const g=new Game({ai:false}),j=createBattleJournal(g);
  const a=g.build('mint',270,g.map.lanes[0]);assert.ok(a.ok);assert.equal(g.state.income[0],5);
  assert.ok(g.upgrade(a.building.id).ok);assert.equal(g.state.income[0],5);
  const b=g.build('mint',g.map.width-270,g.map.lanes[0],1);assert.ok(b.ok);assert.ok(g.upgrade(b.building.id,1).ok);
  const r=finishFixture(j,g);near(r.final.sides[0].income,8.75);near(r.final.sides[1].income,8.75);
  const j2=createBattleJournal(g);assert.ok(g.sell(a.building.id).ok);near(finishFixture(j2,g).final.sides[0].income,5);
  // Synthetic death fixture: verifies exclusion before the engine removes dead entities.
  const j3=createBattleJournal(g);b.building.hp=0;near(finishFixture(j3,g).final.sides[1].income,5);
});
check('Free starting allocations are cumulative placements, not paid spending or lifetime production',()=>{
  for(const m of CAMPAIGN_MISSIONS){
    const g=createCampaignMission(m.id),j=createBattleJournal(g,{mode:'campaign',id:m.id,name:m.name}),r=finishFixture(j,g);
    assert.equal(r.cumulativeStats[0].built,m.playerBuildings.length);assert.equal(r.cumulativeStats[1].built,m.enemyBuildings.length);
    assert.equal(r.final.sides[0].gold,m.startingGold);assert.equal(r.final.sides[0].armyCount,0);
    assert.match(r.limitations.join(' '),/starting allocations/);assert.match(r.limitations.join(' '),/not lifetime production/);
    for(const b of g.state.buildings)buildingsSeen.add(b.type);
  }
});
check('Zero-time, single-point, subinterval and same-time final snapshots remain truthful',()=>{
  for(const dt of [0,.05,1.95]){
    const g=new Game({ai:false}),j=createBattleJournal(g),observations=[reference(g)];
    for(let i=0;i<Math.round(dt/.05);i++)g.update(.05);
    assert.equal(j.sample(g),false);
    if(dt===0)assert.ok(g.build('archery',690,g.map.lanes[0]).ok);
    const final=reference(g);if(JSON.stringify(final)!==JSON.stringify(observations.at(-1)))observations.push(final);
    const r=finishFixture(j,g);reportTruth(r,g,observations);assert.equal(r.scope.observedDuration,g.state.time);
    assert.equal(r.timeline.length,dt===0?1:2);
  }
});
check('Sampling is based on simulated time, rejects backwards time, and never interpolates',()=>{
  const g=new Game({ai:false}),j=createBattleJournal(g);for(let i=0;i<39;i++)g.update(.05);
  assert.equal(j.sample(g),false);g.update(.05);assert.equal(j.sample(g),true);assert.equal(j.sample(g),false);
  g.state.time=1;assert.throws(()=>j.sample(g),/backwards/);
});
check('One-game identity holds before and after finish; same-game finish is immutable/idempotent',()=>{
  const g=new Game({ai:false}),other=Game.restore(g.serialize()),j=createBattleJournal(g);
  assert.throws(()=>j.sample(other),/one game/);assert.throws(()=>finishFixture(j,other),/one game/);
  const r=finishFixture(j,g);assert.equal(finishFixture(j,g),r);assert.equal(j.sample(g),false);
  assert.throws(()=>j.sample(other),/one game/);assert.throws(()=>finishFixture(j,other),/one game/);
  const before=exportBattleReport(r);g.state.gold[0]=0;assert.equal(exportBattleReport(r),before);
});
check('Resume and late observation disclose missing timeline but retain whole-match engine counters',()=>{
  const g=new Game({ai:false});for(let i=0;i<1200;i++)g.update(.05);
  const restored=Game.restore(g.serialize()),j=createBattleJournal(restored,{resumed:true}),r=finishFixture(j,restored);
  assert.equal(r.scope.fullTimeline,false);assert.equal(r.scope.resumed,true);assert.equal(r.scope.missingBefore,g.state.time);
  assert.deepEqual(r.cumulativeStats[0],{side:0,kills:g.state.stats.kills[0],built:g.state.stats.built[0],damage:g.state.stats.damage[0]});
  assert.match(r.limitations.join(' '),/Earlier timeline observations are unavailable/);
  const late=finishFixture(createBattleJournal(g),g);assert.equal(late.scope.fullTimeline,false);
  const zero=new Game({ai:false});assert.equal(finishFixture(createBattleJournal(zero,{resumed:true}),zero).scope.fullTimeline,false);
});
check('Synthetic long timeline stays <=256, preserves actual endpoints and discarded-sample peaks',()=>{
  const g=new Game({ai:false}),j=createBattleJournal(g),observations=[reference(g)];
  for(let t=2;t<=10000;t+=2){g.state.time=t;g.state.gold[0]=t===2?999999:100+t%97;if(j.sample(g))observations.push(reference(g));}
  if(JSON.stringify(reference(g))!==JSON.stringify(observations.at(-1)))observations.push(reference(g));
  const r=finishFixture(j,g);reportTruth(r,g,observations);assert.ok(r.sampling.thinned);assert.ok(r.sampling.thinningPasses>=4);
  assert.equal(r.observedPeaks[0].gold.time,2);assert.equal(r.timeline.some(p=>p.time===2),false);
  assert.match(r.limitations.join(' '),/thinned/);assert.match(r.limitations.join(' '),/events between observations may be missed/);
});
check('Mandatory original protection and health outrank a simultaneous enemy-citadel win',()=>{
  for(const id of ['winter-stores','furnace-heart']){
    const g=createCampaignMission(id),j=createBattleJournal(g,{mode:'campaign',id});
    if(id==='winter-stores'){
      const t=getCampaignTargets(g,id).find(t=>t.kind==='protect');assert.ok(g.sell(t.building.id).ok);
      assert.ok(g.build(t.type,t.x,g.map.lanes[t.lane]).ok,'paid replacement at same site');
      assert.equal(getCampaignTargets(g,id).find(x=>x.originalId===t.originalId).building,null,'replacement must not restore original protection');
    } else g.state.bases[0].hp=1999;
    // Explicit synthetic simultaneous terminal state, not a playability proof.
    g.state.bases[1].hp=0;g.state.winner=0;
    const outcome=evaluateCampaignMission(g,id);assert.ok(outcome.failed);assert.equal(outcome.completed,false);
    const r=j.finish(g,{objectiveOutcome:outcome,targets:getCampaignTargets(g,id)});
    assert.equal(r.outcome.result,'defeat');assert.equal(r.outcome.engineWinner,0);assert.equal(r.outcome.source,'objective');
    if(id==='winter-stores')assert.equal(r.objectives.targets.filter(t=>t.kind==='protect'&&!t.alive).length,1);
  }
});
check('Objective win, alternate citadel win, pure draw and authored draw have truthful sources',()=>{
  const g=createCampaignMission('emberwatch'),j=createBattleJournal(g);g.state.buildings=g.state.buildings.filter(b=>b.side===0||b.type!=='barracks');
  let o=evaluateCampaignMission(g,'emberwatch');assert.ok(o.completed);let r=j.finish(g,{objectiveOutcome:o,targets:getCampaignTargets(g,'emberwatch')});
  assert.equal(r.outcome.result,'victory');assert.equal(r.outcome.engineWinner,null);assert.equal(r.outcome.source,'objective');
  const alt=createCampaignMission('emberwatch');alt.state.bases[1].hp=0;alt.state.winner=0;o=evaluateCampaignMission(alt,'emberwatch');
  r=createBattleJournal(alt).finish(alt,{objectiveOutcome:o,targets:getCampaignTargets(alt,'emberwatch')});
  assert.equal(r.outcome.result,'victory');assert.ok(r.objectives.items.some(x=>!x.met));assert.match(r.outcome.label,/citadel/);
  const d=new Game({ai:false});d.state.bases.forEach(b=>b.hp=0);d.state.winner='draw';r=createBattleJournal(d).finish(d);assert.equal(r.outcome.result,'draw');
  const c=createCampaignMission('emberwatch');c.state.bases.forEach(b=>b.hp=0);c.state.winner='draw';o=evaluateCampaignMission(c,'emberwatch');
  r=createBattleJournal(c).finish(c,{objectiveOutcome:o,targets:getCampaignTargets(c,'emberwatch')});assert.equal(r.outcome.result,'defeat');assert.equal(r.outcome.engineWinner,'draw');
});
check('Invalid/nonterminal input cannot poison the journal or leak nonfinite/arbitrary export fields',()=>{
  const g=new Game({ai:false}),j=createBattleJournal(g);assert.throws(()=>j.finish(g),/terminal/);
  assert.throws(()=>finishFixture(j,g,{objectiveOutcome:{...terminal,completed:true,failed:true}}));
  assert.throws(()=>finishFixture(j,g,{objectiveOutcome:{...terminal,objectives:new Array(1)}}),'sparse objective items must not become null JSON');
  assert.throws(()=>finishFixture(j,g,{targets:new Array(1)}),'sparse targets must not become null JSON');
  const r=finishFixture(j,g,{objectiveOutcome:{...terminal,unused:{secret:'must not copy'}}});assert.equal(exportBattleReport(r).includes('must not copy'),false);
  assert.throws(()=>exportBattleReport(JSON.parse(exportBattleReport(r))),/completed report/);
  for(const value of [NaN,Infinity,-1]){const bad=new Game({ai:false});bad.state.gold[0]=value;assert.throws(()=>createBattleJournal(bad));}
  const bad=new Game({ai:false});bad.state.units=[{side:0,type:'invented',hp:1}];assert.throws(()=>createBattleJournal(bad));
  const sparse=new Game({ai:false});sparse.state.buildings=new Array(1);assert.throws(()=>createBattleJournal(sparse));
});

// Execute the actual integration functions with minimal DOM/storage doubles.
// This is a behavior-level Node check, not browser/layout/device validation.
function appFixture({campaign=true,brokenRenderer=false}={}) {
  const app=source('dist/app.js'), elements=new Map(), events={history:0,rewards:0,persist:0,removed:0,downloads:0};
  function element(){
    const classes=new Set(['hidden']),listeners={};
    const node={textContent:'',innerHTML:'',scrollTop:0,scrollHeight:800,clientHeight:300,rectTop:0,open:false,focusCalls:[],
      focus(options){node.focusCalls.push(options);},getBoundingClientRect(){return {top:node.rectTop};},scrollIntoView(){throw Error('Reveal must only scroll the result body');},append(){},remove(){},click(){events.downloads++;},
      classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x),toggle(x,force){if(force===undefined? !classes.has(x):force)classes.add(x);else classes.delete(x);}},
      addEventListener(type,fn){listeners[type]=fn;},querySelector(selector){if(['details','details.battle-report'].includes(selector))return node.detail??null;if(selector==='summary')return node;return node.status??node;},listeners};
    return node;
  }
  const $=id=>{if(!elements.has(id))elements.set(id,element());return elements.get(id);};
  const game=campaign?createCampaignMission('emberwatch'):new Game({ai:false});
  const context=createContext({$,game,createBattleJournal,exportBattleReport,renderBattleReport:brokenRenderer?()=>{throw Error('Synthetic view failure');}:renderBattleReport,
    getCampaignTargets,getChallengeTargets,CAMPAIGN_MISSIONS,CHALLENGES,currentCampaign:campaign?'emberwatch':null,currentChallenge:null,
    battleJournal:null,lastBattleReport:null,hasLastResult:false,reportFault:false,resultShown:false,objectiveOutcome:null,
    recoveryHold:null,profileGate:null,progressDirty:false,knownHistory:[],knownHistoryAvailable:false,campaignProgress:{},trialRecords:{},
    storage:{set(key,value){assert.equal(key,'ironroot.history.v1');events.history++;context.historyJSON=value;return true;}},HISTORY:'ironroot.history.v1',
    readHistory:()=>[],recordCampaignResult(progress,id,g){events.rewards++;assert.equal(id,'emberwatch');assert.equal(g,game);return progress;},
    battleSession:{remove(){events.removed++;}},persistProgress(){events.persist++;},renderCampaign(){},renderChallenge(){},
    cancel(){},sound(){},timeText:t=>String(t),syncDialogs(){},keepDialogFocus(){},requestAnimationFrame:fn=>fn(),
    document:{querySelector:()=>element(),createElement:()=>element(),body:{append(){}}},location:{protocol:'https:'},URL:{createObjectURL:()=>'/local-object',revokeObjectURL(){}},Blob,setTimeout:()=>0,
  });
  const start=app.indexOf('function beginBattleReport('),end=app.indexOf("\n$('start').onclick",start);
  const finishStart=app.indexOf('function finish()'),finishEnd=app.indexOf('\nlet pointer =',finishStart);
  assert.ok(start>=0&&end>start&&finishStart>=0&&finishEnd>finishStart,'actual integration slices available');
  runInContext(app.slice(start,end)+'\n'+app.slice(finishStart,finishEnd),context);
  runInContext('beginBattleReport(false)',context);
  game.state.bases[1].hp=0;game.state.winner=0;
  context.objectiveOutcome=campaign?evaluateCampaignMission(game,'emberwatch'):null;
  return {context,events,$,game,app,element};
}
check('Actual finish and result re-open paths award history/progress exactly once',()=>{
  const f=appFixture(),before=JSON.stringify(f.game.serialize());
  runInContext('finish(); finish();',f.context);
  const report=f.context.lastBattleReport;assert.ok(report);assert.equal(f.context.hasLastResult,true);
  const detail=f.element(),body=f.$('resultBody');f.$('resultReport').detail=detail;
  body.rectTop=20;detail.getBoundingClientRect=()=>({top:120-body.scrollTop});
  for(let i=0;i<5;i++)f.$('lastResult').onclick();
  runInContext('finish()',f.context);
  assert.deepEqual(f.events,{history:1,rewards:1,persist:1,removed:1,downloads:0});
  assert.equal(detail.open,true);assert.equal(f.context.lastBattleReport,report);assert.equal(JSON.stringify(f.game.serialize()),before);
  assert.equal(body.scrollTop,100,'only the result body scrolls to align the report summary');
  assert.equal(detail.focusCalls.length,5);for(const options of detail.focusCalls)assert.equal(options.preventScroll,true);
  assert.equal(JSON.parse(f.context.historyJSON).length,1);assert.equal(JSON.parse(f.context.historyJSON)[0].battleReport,undefined);
});
check('Actual new/Resume journal initialization clears old results and fails closed',()=>{
  const f=appFixture();runInContext('finish()',f.context);const old=f.context.lastBattleReport;assert.ok(old);
  f.context.game=new Game({ai:false,mapId:'twin-span'});f.context.currentCampaign=null;
  runInContext('beginBattleReport(true)',f.context);
  assert.equal(f.context.lastBattleReport,null);assert.equal(f.context.hasLastResult,false);assert.equal(f.$('lastResult').classList.contains('hidden'),true);
  assert.equal(f.$('resultReport').textContent,'');assert.equal(f.$('resultReport').classList.contains('hidden'),true);
  const before={...f.events};f.$('lastResult').onclick();assert.deepEqual(f.events,before);
  f.context.game.state.bases[1].hp=0;f.context.game.state.winner=0;f.context.objectiveOutcome=null;
  runInContext('finishBattleReport()',f.context);
  assert.notEqual(f.context.lastBattleReport,old);assert.equal(f.context.lastBattleReport.map.id,'twin-span');assert.equal(f.context.lastBattleReport.scope.resumed,true);
  f.context.game={state:{time:0}};runInContext('beginBattleReport(false)',f.context);
  assert.equal(f.context.reportFault,true);assert.equal(f.context.lastBattleReport,null);assert.equal(f.context.hasLastResult,false);
});
check('Actual report failure preserves valid battle result and does not interrupt its one-time reward',()=>{
  const f=appFixture({brokenRenderer:true});runInContext('finish();finish();',f.context);
  assert.equal(f.context.lastBattleReport,null);assert.equal(f.$('resultReportIssue').classList.contains('hidden'),false);
  assert.match(f.$('resultReportIssue').textContent,/battle result is still valid/);
  assert.equal(f.events.history,1);assert.equal(f.events.rewards,1);assert.equal(f.events.persist,1);
});
check('Actual sample fault is isolated, stops observation, and preserves engine/result behavior',()=>{
  const f=appFixture(),before=JSON.stringify(f.game.serialize());
  runInContext('sampleBattleReport()',f.context);assert.equal(f.context.reportFault,false);
  f.context.battleJournal={sample(){throw Error('Synthetic observer failure');}};
  runInContext('sampleBattleReport();sampleBattleReport();',f.context);
  assert.equal(f.context.reportFault,true);assert.equal(f.context.battleJournal,null);assert.equal(JSON.stringify(f.game.serialize()),before);
  assert.deepEqual(f.events,{history:0,rewards:0,persist:0,removed:0,downloads:0});
  runInContext('finish();finish();',f.context);
  assert.equal(f.context.lastBattleReport,null);assert.equal(f.events.history,1);assert.equal(f.events.rewards,1);
});
check('Actual save function keeps the existing envelope and never includes a report',()=>{
  const app=source('dist/app.js'),start=app.indexOf('function save()'),end=app.indexOf('\nfunction updateResume()',start);
  assert.ok(start>=0&&end>start);const writes=[];const game=new Game({ai:false,mapId:'long-march'});
  const session={status:()=> 'current',set:(key,value)=>{writes.push([key,value]);return true;}};
  const context=createContext({recoveryHold:null,profileGate:null,started:true,game,objectiveOutcome:null,battleSession:session,
    writeBattle,SAVE:'ironroot.battle.v1',currentChallenge:null,currentCampaign:null,saveWarning:false,toast(){},
    lastBattleReport:{format:'must-not-be-saved'},battleJournal:{secret:'must-not-be-saved'}});
  runInContext(app.slice(start,end)+'\nsave()',context);assert.equal(writes.length,1);
  const saved=JSON.parse(writes[0][1]);assert.equal(saved.game.mapId,'long-march');assert.deepEqual(saved.game,game.serialize());
  assert.equal(writes[0][1].includes('must-not-be-saved'),false);
  assert.deepEqual(saved,{format:'ironroot-save',version:2,challengeId:null,campaignId:null,game:game.serialize()});
});
check('Polished display times match main-result tolerance without changing observed timestamps',()=>{
  for(const [time,label] of [[59.99999999999,'1:00'],[119.99999999999,'2:00'],[149.99999999999,'2:30'],[119.999998,'1:59'],[120.000001,'2:00'],[3599.99999999999,'1:00:00']]){
    const g=new Game({ai:false}),j=createBattleJournal(g);g.state.time=time;g.state.winner=0;g.state.bases[1].hp=0;
    const r=j.finish(g),before=exportBattleReport(r),save=JSON.stringify(g.serialize()),html=renderBattleReport(r);
    assert.ok(html.includes(' '+label+' battle time'),`${time} should display ${label}`);
    assert.equal(r.scope.endedAt,time);assert.equal(r.final.time,time);assert.equal(r.timeline.at(-1).time,time);
    assert.equal(exportBattleReport(r),before);assert.equal(JSON.stringify(g.serialize()),save);
  }
});
check('Polished totals lead the report while Resume, allocation and sampled-history caveats remain truthful',()=>{
  const g=new Game({ai:false});for(let n=0;n<1200;n++)g.update(.05);
  const j=createBattleJournal(g,{resumed:true}),r=finishFixture(j,g),html=renderBattleReport(r);
  assert.ok(html.indexOf('<h3>Battle totals</h3>')<html.indexOf('What this report covers'));
  assert.match(html,/Battle totals above still include that earlier play/);
  assert.match(html,/including play before a resume/);assert.match(html,/buildings each side started with/);
  assert.match(html,/Upgrades do not count as new placements/);assert.match(html,/automatically during overtime is not counted for either side/);
  assert.match(html,/they do not reconstruct events between samples/);assert.match(html,/not total production/);
});

function skirmishPolicy() {
  let cursor=0,sold=false;
  const order=['archery','barracks','mint','watchtower','foundry','sanctum','aerie'];
  return g=>{
    const own=g.state.buildings.filter(b=>b.side===0&&b.hp>0);
    if(!sold&&g.state.time>=30){const b=own.find(b=>b.type==='mint');if(b){assert.ok(g.sell(b.id).ok);sold=true;}}
    if(g.state.spellCooldown[0]===0){const foes=g.state.units.filter(u=>u.side===1&&u.x<1400);const u=foes.find(u=>foes.filter(v=>Math.hypot(u.x-v.x,u.y-v.y)<170).length>=3);if(u)g.cast(u.x,u.y);}
    for(let tries=0;tries<order.length;tries++){
      const type=order[cursor%order.length];
      const sites=buildSites(g.map,0).sort((a,b)=>b.x-a.x||a.lane-b.lane);
      const target=sites.find(s=>g.canBuild(type,s.x,s.y).ok);
      if(target){assert.ok(g.build(type,target.x,target.y).ok);cursor++;return;}
      if(type==='mint'&&own.filter(b=>b.type==='mint').length>=3)cursor++;else break;
    }
    const target=own.filter(b=>b.level<3).sort((a,b)=>a.level-b.level||a.id-b.id).find(b=>g.state.gold[0]>=Math.round(BUILDINGS[b.type].cost*(.7+.35*(b.level-1))));
    if(target)assert.ok(g.upgrade(target.id).ok);
  };
}
function trialPolicy(id) {
  if(id==='shieldbreaker')return productionPolicy(['barracks','sanctum','foundry'],[1]);
  if(id==='skyguard')return productionPolicy(['archery'],[0,2]);
  if(id==='siegecraft')return productionPolicy(['barracks','foundry'],[1]);
  if(id==='goldrush')return campaignPolicy('winter-stores');
  return campaignPolicy('long-vigil');
}
function run(spec,observe) {
  let g=spec.mode==='campaign'?createCampaignMission(spec.id):spec.mode==='challenge'?createChallenge(spec.id):new Game({mapId:spec.mapId,seed:spec.seed,difficulty:spec.difficulty,ai:!spec.idle});
  // Explicit seed choice before the first tick only; no economy/combat injection.
  if(spec.mode!=='skirmish')g.seed=spec.seed;
  const policy=spec.idle?()=>{}:spec.mode==='campaign'?campaignPolicy(spec.id):spec.mode==='challenge'?trialPolicy(spec.id):skirmishPolicy();
  const definition=spec.mode==='campaign'?CAMPAIGN_MISSIONS.find(m=>m.id===spec.id):spec.mode==='challenge'?CHALLENGES.find(m=>m.id===spec.id):null;
  const evaluate=x=>spec.mode==='campaign'?evaluateCampaignMission(x,spec.id):evaluateChallenge(x,spec.id);
  const context={mode:spec.mode,id:spec.id??null,name:definition?.name??'Audit skirmish'};
  let j=observe?createBattleJournal(g,context):null,observations=observe?[reference(g)]:[],restored=false,o=null;
  const actions=[],seen=new Set(),seenBuildings=new Set();let nextDecision=0;
  for(let tick=0;tick<14000;tick++){
    if(g.tick>=nextDecision){
      nextDecision=g.tick+20;
      const proxy=new Proxy(g,{get(target,key){
        if(['build','upgrade','cast','sell'].includes(key))return (...args)=>{
          const before=target.state.gold[args[key==='build'?3:key==='cast'?2:1]??0],out=target[key](...args);
          actions.push({tick:target.tick,name:key,args,ok:out.ok,reason:out.reason??null,id:out.building?.id??null,level:out.building?.level??null,refund:out.refund??null});
          if(out.ok&&key!=='cast'&&key!=='sell')assert.ok(before>target.state.gold[args[key==='build'?3:1]??0],'successful construction/upgrade is paid');
          return out;
        };
        return Reflect.get(target,key);
      }});
      policy(proxy);
    }
    if(definition)o=advanceObjectiveBattle(g,.05,evaluate,definition.timeLimit);else g.update(.05);
    for(const u of g.state.units)seen.add(u.type);for(const b of g.state.buildings)seenBuildings.add(b.type);
    if(j?.sample(g))observations.push(reference(g));
    if(o?.completed||o?.failed||g.state.winner!==null)break;
    if(spec.restore&&g.state.time>=60&&!restored){
      const saved=g.serialize();g=Game.restore(saved);assert.deepEqual(g.serialize(),saved);restored=true;
      if(observe){j=createBattleJournal(g,{...context,resumed:true});observations=[reference(g)];}
    }
  }
  assert.ok(o?.completed||o?.failed||g.state.winner!==null,'must run to a normal endpoint');
  const saved=g.serialize();assert.deepEqual(Game.restore(saved).serialize(),saved,'final saves still restore exactly');
  let report=null;
  if(observe){
    const targets=spec.mode==='campaign'?getCampaignTargets(g,spec.id):spec.mode==='challenge'?getChallengeTargets(g,spec.id).map(t=>({...t,kind:'destroy',side:1})):[];
    const end=reference(g);if(JSON.stringify(end)!==JSON.stringify(observations.at(-1)))observations.push(end);
    const before=JSON.stringify(saved);report=j.finish(g,{objectiveOutcome:o,targets});reportTruth(report,g,observations);
    assert.equal(JSON.stringify(g.serialize()),before,'report operations do not mutate final save');
    assert.equal(j.finish(g),report,'opening report repeatedly is idempotent');
    assert.equal(report.scope.resumed,restored);
    if(o){assert.equal(report.outcome.result,o.completed?'victory':'defeat');assert.equal(report.outcome.label,o.label);}
  }
  return {saved,actions,report,outcome:o,seen,seenBuildings,restored};
}
if(!process.argv.includes('--fixtures-only')){
  const specs=[];
  for(const mapId of Object.keys(MAPS))for(const [index,seed] of [733,91237,7281901].entries())specs.push({mode:'skirmish',mapId,seed,difficulty:['easy','normal','hard'][index],restore:index===1});
  specs.push({mode:'skirmish',mapId:'classic',seed:3940101199,difficulty:'normal',idle:true});
  for(const m of CAMPAIGN_MISSIONS)specs.push({mode:'campaign',id:m.id,seed:m.seed,restore:m.number%3===0});
  for(const c of CHALLENGES)specs.push({mode:'challenge',id:c.id,seed:c.seed,restore:c.mode==='survive'});
  for(const spec of specs)check('Paired paid full-endpoint simulation '+JSON.stringify(spec),()=>{
    const plain=run(spec,false),observed=run(spec,true);
    assert.deepEqual(observed.saved,plain.saved,'exact final serialized engine state including RNG');
    assert.deepEqual(observed.actions,plain.actions,'exact attempted/accepted paid action trace');
    assert.deepEqual(observed.outcome,plain.outcome,'exact objective result');
    observed.seen.forEach(t=>rosterSeen.add(t));observed.seenBuildings.forEach(t=>buildingsSeen.add(t));
    runs.push({...spec,time:observed.saved.state.time,winner:observed.saved.state.winner,result:observed.report.outcome.result,restored:observed.restored,
      actionCount:observed.actions.length,successfulActions:observed.actions.filter(a=>a.ok).length,saveSha256:digest(JSON.stringify(observed.saved)),actionsSha256:digest(JSON.stringify(observed.actions)),
      retainedPoints:observed.report.timeline.length,observations:observed.report.sampling.observationCount,exportBytes:Buffer.byteLength(exportBattleReport(observed.report)),
      stats:observed.report.cumulativeStats,finalIncome:observed.report.final.sides.map(s=>s.income)});
    console.error('PASS simulation',spec.id||spec.mapId,spec.seed,observed.report.outcome.result,observed.saved.state.time.toFixed(2)+'s');
  });
  check('Every map, five unit types and seven buildings are covered in normal paid simulations',()=>{
    assert.deepEqual([...rosterSeen].sort(),Object.keys(UNITS).sort());assert.deepEqual([...buildingsSeen].sort(),Object.keys(BUILDINGS).sort());
    assert.deepEqual([...new Set(runs.filter(r=>r.mode==='skirmish').map(r=>r.mapId))].sort(),Object.keys(MAPS).sort());
  });
}
check('Protected runtime hashes remain unchanged after audit',()=>{for(const [file,hash] of Object.entries(expected))assert.equal(digest(source('dist/'+file)),hash,file);});
const result={scope:'Local Node audit only. Synthetic boundary fixtures are not playability evidence. Paired games use public paid actions and normal endpoints. No browser, server, external transfer or publication.',
  node:process.version,engineSha256:expected['engine.js'],moduleSha256:digest(source('dist/battle-report.js')),viewSha256:digest(source('dist/report-view.js')),appSha256:digest(source('dist/app.js')),harnessSha256:digest(source('qa/battle-report-audit.mjs')),
  passed:checks.filter(c=>c.passed).length,failed:failures.length,simulationPairs:runs.length,simulations:runs.length*2,checks,runs};
console.log(JSON.stringify(result,null,2));
if(failures.length)process.exitCode=1;
