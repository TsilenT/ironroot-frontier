/** Reproducible actual-mission legal-command checks. Never changes setup, RNG or cash. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,readdirSync,existsSync,realpathSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
import {Game} from '../../dist/engine.js';
import {createCampaignMission,evaluateCampaignMission,getCampaignMission} from '../../dist/campaign.js';
import {observe} from '../../dist/fog.js';
import {advanceObjectiveBattle} from '../../dist/objectives.js';
import {instrumentEconomy} from '../salt-stores/economy.mjs';
export const PLAN=JSON.parse(readFileSync(new URL('./PLAN.json',import.meta.url)));
export const ID=PLAN.missionId,MISSION=getCampaignMission(ID),POLICY_IDS=Object.keys(PLAN.policyDefinitions);
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
export const sha256=value=>createHash('sha256').update(typeof value==='string'||Buffer.isBuffer(value)?value:JSON.stringify(value)).digest('hex');
export function evidenceClosure(){const files={};for(const name of readdirSync(path.join(root,'dist')).sort())files['dist/'+name]=sha256(readFileSync(path.join(root,'dist',name)));for(const name of ['package.json','qa/long-screen/PLAN.json','qa/long-screen/simulate.mjs','qa/salt-stores/economy.mjs'])files[name]=sha256(readFileSync(path.join(root,name)));return{files,mission:MISSION,plan:PLAN};}
const evaluate=game=>evaluateCampaignMission(game,ID);
/** Terminal contract and finite guard stay shared with regression tests. */
export function advanceSimulation(game,beforeStep=()=>{},afterStep=()=>{}){
 let steps=0;const maximum=Math.ceil(MISSION.timeLimit/.05)+2;
 while(!evaluate(game).completed&&!evaluate(game).failed){
  assert.ok(++steps<=maximum,'Simulation exceeded finite step guard');
  const time=game.state.time,tick=game.tick,accumulator=game.accumulator;beforeStep();
  advanceObjectiveBattle(game,.05,evaluate,MISSION.timeLimit);
  assert.ok(game.state.time>time&&game.tick>tick||game.accumulator>accumulator||evaluate(game).completed||evaluate(game).failed,'Active simulation made no progress');
  afterStep();
 }
 return evaluate(game);
}
export function run({policy,seed,validationPlan}={}){
 assert.ok(POLICY_IDS.includes(policy),'Unknown declared policy');
 if(validationPlan){assert.equal(validationPlan.status,'independent-review-approved');assert.deepEqual(validationPlan.closure,evidenceClosure(),'Validation dependencies changed after independent approval');assert.ok(validationPlan.seeds.includes(seed)&&!PLAN.developmentSeeds.includes(seed),'Validation seed must be independently declared and untouched');}
 else assert.ok(PLAN.developmentSeeds.includes(seed),'Seed is not in the declared development phase');
 const g=createCampaignMission(ID,{seed}),s=g.state,def=PLAN.policyDefinitions[policy],initial=g.serialize(),economy=instrumentEconomy(g),attempts=[],losses=[],spawns=[],primaryFire=[],trace=[],aiCalls=[],unexpectedGoldWrites=[];
 let next=def.delay??0,successful=0,nextTrace=0,activeAI=false,depth=0,firstCoreDamage=[null,null];
 const originalGold=s.gold;s.gold=new Proxy(originalGold,{set(a,k,v){if(k!=='length'&&!depth)unexpectedGoldWrites.push({tick:g.tick,k,v});a[k]=v;return true;}});
 for(const method of ['_step','build','upgrade','cast','sell','buyCitadelOption']){const original=g[method];g[method]=function(...args){depth++;try{return original.apply(this,args);}finally{depth--;}};}
 for(const method of ['build','upgrade','cast','sell','buyCitadelOption']){const original=g[method];g[method]=function(...args){const side=method==='build'?(args[3]??0):method==='cast'?(args[2]??0):(args[1]??0),before=s.gold[side],output=original.apply(this,args);attempts.push({time:s.time,tick:g.tick,ai:activeAI,side,method,args,beforeGold:before,afterGold:s.gold[side],result:structuredClone(output)});return output;};}
 const damage=g._damage;g._damage=function(target,amount,side){const queued=!!this.damageQueue,before=target.hp,result=damage.call(this,target,amount,side);if(!queued&&before>target.hp){if(target.type==='base'&&firstCoreDamage[target.side]===null)firstCoreDamage[target.side]=s.time;if(target.hp<=0&&this.buildings[target.type])losses.push({time:s.time,id:target.id,side:target.side,type:target.type,x:target.x,lane:target.lane,level:target.level,original:initial.state.buildings.some(b=>b.id===target.id)});}return result;};
 const spawn=g._spawn;g._spawn=function(b){const id=this.nextId,result=spawn.call(this,b);for(const u of s.units.filter(u=>u.id>=id))spawns.push({time:s.time,side:b.side,buildingId:b.id,buildingType:b.type,unitId:u.id,unitType:u.type,x:b.x,lane:b.lane,level:b.level,original:initial.state.buildings.some(x=>x.id===b.id)});return result;};
 const fire=g._fire;g._fire=function(attacker,target,amount,type,extra){primaryFire.push({time:s.time,side:attacker.side,attackerType:attacker.type,attackerId:attacker.id,targetType:target.type,targetId:target.id,targetHPBeforeQueue:target.hp,requestedDamage:amount});return fire.call(this,attacker,target,amount,type,extra);};
 const ai=g._ai;g._ai=function(side=1){const start=attempts.length,before=s.gold[side];activeAI=true;try{return ai.call(this,side);}finally{activeAI=false;aiCalls.push({time:s.time,tick:g.tick,beforeGold:before,afterGold:s.gold[side],attemptStart:start,attemptCount:attempts.length-start});}};
 function player(){if(policy==='idle')return;const view=observe(g,0).state;if(view.time+1e-7<next||s.winner!==null)return;next=view.time+5;const own=view.buildings.filter(b=>b.side===0&&b.hp>0);if(def.pauseAfter&&successful>=def.pauseAfter&&view.time<def.resumeAt-1e-7)return;
  for(const item of def.plan){if(own.some(b=>Math.hypot(b.x-item.x,b.y-g.map.lanes[item.lane])<108))continue;const r=g.build(item.type,item.x,g.map.lanes[item.lane],0);if(r.ok)successful++;return;}
  const eligible=own.filter(b=>b.level<3).sort((a,b)=>a.level-b.level||def.priority.indexOf(a.type)-def.priority.indexOf(b.type)||b.x-a.x||a.lane-b.lane||a.id-b.id);if(eligible[0]){const r=g.upgrade(eligible[0].id,0);if(r.ok)successful++;}}
 advanceSimulation(g,player,()=>{economy.reconcile();if(s.time+1e-7>=nextTrace){trace.push({time:s.time,hp:s.bases.map(b=>b.hp),gold:[...s.gold],income:[...s.income],buildings:s.buildings.map(b=>({id:b.id,side:b.side,type:b.type,x:b.x,lane:b.lane,hp:b.hp,level:b.level}))});nextTrace+=5;}});
 const playerAttempts=attempts.filter(a=>a.side===0);for(let i=1;i<playerAttempts.length;i++)assert.ok(playerAttempts[i].time-playerAttempts[i-1].time>=5-1e-7,'Attempted player cadence <5s');
 assert.deepEqual(unexpectedGoldWrites,[],'No out-of-band treasury mutation');
 const ledger=economy.snapshot();for(const t of ledger.transactions){const expected=t.method==='build'?g.buildings[t.type].cost:t.method==='upgrade'?Math.round(g.buildings[t.type].cost*(.7+.35*(t.before.building.level-1))):t.method==='cast'?g.ruleset.spell.cost:t.method==='buyCitadelOption'?g.ruleset.citadel.cost:-Math.floor(t.before.building.invested*.5*t.before.building.hp/t.before.building.maxHp);assert.equal(t.cost,expected,'Ordinary paid price');}
 const finalState=g.serialize();assert.deepEqual(Game.restore(finalState).serialize(),finalState);
 return{validationEpoch:PLAN.validationEpoch,policy,seed,openingRole:seed===PLAN.publicAuthoredSeed?'exact-public-authored8404':'QA-constructor-seed',productionFactory:true,authoritativeEvaluator:true,campaignOutcome:evaluate(g),initial,startingInvestment:[0,1].map(side=>initial.state.buildings.filter(b=>b.side===side).reduce((n,b)=>n+b.invested,0)),outcome:evaluate(g).completed?'won':'lost',duration:s.time,finalHP:s.bases.map(b=>b.hp),finalGold:[...s.gold],firstCoreDamage,finalState,ledger,attempts,aiCalls,losses,spawns,primaryFire,trace,unexpectedGoldWrites};
}
export function summarize(runs){return runs.map(r=>{const births=new Map(r.spawns.map(s=>[s.unitId,s])),remaining=new Map(),roadDamage=[0,0,0];for(const f of r.primaryFire.filter(f=>f.side===0&&f.targetType==='base')){const key=f.time+'/'+f.targetId;if(!remaining.has(key))remaining.set(key,f.targetHPBeforeQueue);const amount=Math.min(remaining.get(key),f.requestedDamage);remaining.set(key,remaining.get(key)-amount);roadDamage[births.get(f.attackerId).lane]+=amount;}assert.ok(Math.abs(roadDamage.reduce((a,b)=>a+b,0)-(6000-r.finalHP[1]))<1e-6);return{policy:r.policy,seed:r.seed,outcome:r.outcome,duration:r.duration,hp:r.finalHP,stars:r.campaignOutcome.stars,coreDamageByBirthRoad:roadDamage,centralSpending:r.ledger.transactions.filter(t=>t.side===0&&t.lane===1).reduce((n,t)=>n+t.cost,0),centralLosses:r.losses.filter(l=>l.side===0&&l.lane===1),originalLodge:r.finalState.state.buildings.filter(b=>b.id===r.initial.state.buildings.find(b=>b.side===1&&b.type==='wardenLodge').id).map(b=>({hp:b.hp,maxHp:b.maxHp})),originalLodgeLoss:r.losses.find(l=>l.side===1&&l.original&&l.type==='wardenLodge')??null,enemySpending:r.ledger.spending[1],maxLedgerError:Math.max(...r.ledger.maxError)};});}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const out=process.argv[2];assert.ok(out,'External output directory required');const target=realpathSync(out);assert.ok(target!==root&&!target.startsWith(root+path.sep),'Generated evidence stays outside repository');const validationPath=process.argv[3],validationPlan=validationPath?JSON.parse(readFileSync(validationPath)):undefined,prefix=validationPlan?'validation':'development',rawPath=path.join(target,prefix+'-runs.ndjson');assert.ok(!existsSync(rawPath),'Never overwrite outcome receipts');const closure=evidenceClosure();writeFileSync(path.join(target,prefix+'-closure.json'),JSON.stringify(closure,null,2)+'\n');const runs=[];
 for(const policy of POLICY_IDS)for(const seed of validationPlan?.seeds??PLAN.developmentSeeds){const r=run({policy,seed,validationPlan});runs.push(r);writeFileSync(rawPath,runs.map(r=>JSON.stringify(r)).join('\n')+'\n');console.log(JSON.stringify({policy,seed,outcome:r.outcome,time:r.duration,hp:r.finalHP,stars:r.campaignOutcome.stars}));}
 assert.deepEqual(evidenceClosure(),closure,'Dependencies changed during runs');writeFileSync(path.join(target,prefix+'-summary.json'),JSON.stringify({scope:PLAN.scope,closureSha256:sha256(closure),rawSha256:sha256(readFileSync(rawPath)),runs:runs.length,results:summarize(runs)},null,2)+'\n');
}
