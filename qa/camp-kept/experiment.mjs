/** Explicitly gated QA runner. Importing this file never advances a battle. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,readdirSync,existsSync,mkdirSync,realpathSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Game} from '../../dist/engine.js';
import {advanceObjectiveBattle} from '../../dist/objectives.js';
import {instrumentEconomy} from '../salt-stores/economy.mjs';
import {DESIGN,POLICIES,createPrototype,createPolicy,evaluatePrototype} from './prototype.mjs';
export const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
export const PLAN=JSON.parse(readFileSync(new URL('./PLAN.json',import.meta.url)));
export const hash=b=>createHash('sha256').update(typeof b==='string'||Buffer.isBuffer(b)?b:JSON.stringify(b)).digest('hex');
export function freeze(){
 const files={};function add(relative){const p=path.join(ROOT,relative);for(const d of readdirSync(p,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const f=relative+'/'+d.name;if(d.isDirectory())add(f);else files[f]=hash(readFileSync(path.join(ROOT,f)));}}add('dist');
 for(const f of ['package.json','qa/camp-kept/prototype.mjs','qa/camp-kept/experiment.mjs','qa/camp-kept/PLAN.json','qa/salt-stores/economy.mjs','tests/camp-kept-prototype.test.mjs','docs/CAMP_KEPT_PROTOTYPE.md'])files[f]=hash(readFileSync(path.join(ROOT,f)));
 const source={baselineCommit:DESIGN.baselineCommit,baselineTree:DESIGN.baselineTree,files,design:DESIGN,plan:PLAN};
 return {format:'camp-kept-source-v1',sha256:hash(source),source};
}
export function verifyApproval(packet){
 assert.equal(packet?.format,'camp-kept-reviewed-run-v1');assert.equal(packet?.status,'reviewed-and-authorized');
 for(const key of ['independentReviewer','coordinatorAuthorization'])assert.ok(typeof packet[key]==='string'&&packet[key].length>0,key+' required');
 assert.deepEqual(packet.freeze,freeze(),'Exact reviewed source/plan changed');return true;
}
export function validateOutputDirectory(output){
 const real=realpathSync(output),root=realpathSync(ROOT);assert.ok(real!==root&&!real.startsWith(root+path.sep),'Results must stay outside source');
 assert.equal(readdirSync(real).length,0,'New empty output directory required');return real;
}
function normalPrice(g,t){
 if(t.method==='build')return g.buildings[t.type].cost;
 if(t.method==='upgrade')return Math.round(g.buildings[t.type].cost*(.7+.35*(t.before.building.level-1)));
 if(t.method==='cast')return g.ruleset.spell.cost;
 if(t.method==='buyCitadelOption')return g.ruleset.citadel.cost;
 return -Math.floor(t.before.building.invested*.5*t.before.building.hp/t.before.building.maxHp);
}
export function runCase({seed,health,policy,packet,stop=()=>false}){
 verifyApproval(packet);assert.ok(PLAN.knownSeeds.includes(seed)&&PLAN.healthControls.includes(health)&&PLAN.policies.includes(policy));
 const g=createPrototype({seed,health}),s=g.state,initial=g.serialize(),economy=instrumentEconomy(g),p=createPolicy(policy);
 const originalIds=new Set(s.buildings.map(b=>b.id)),firstContact=[null,null],firstCoreDamage=[null,null],coreDamage=[0,0],losses=[],trace=[];
 const damage=g._damage;g._damage=function(target,amount,side){
  if(this.damageQueue)return damage.call(this,target,amount,side);
  const hp=target.hp,result=damage.call(this,target,amount,side),effective=hp-target.hp;
  if(effective>0){const row={tick:g.tick,time:s.time,id:target.id,type:target.type,lane:target.lane??null,side:target.side,effective};firstContact[target.side]??=row;
   if(target.type==='base'){firstCoreDamage[target.side]??=row;coreDamage[target.side]+=effective;}
   else if(target.hp<=0&&g.buildings[target.type])losses.push({...row,x:target.x,original:originalIds.has(target.id)});
  }return result;
 };
 let steps=0,nextTrace=0,minHP=s.bases.map(b=>b.hp);
 function observe(){minHP=minHP.map((hp,i)=>Math.min(hp,s.bases[i].hp));if(s.time>=nextTrace-1e-7){trace.push({tick:g.tick,time:s.time,hp:s.bases.map(b=>b.hp),healed:s.citadelOptions.sides.map(r=>r.healedTotal),gold:[...s.gold],income:[...s.income],units:[0,1].map(side=>s.units.filter(u=>u.side===side).length)});nextTrace+=5;}}
 observe();while(!evaluatePrototype(g).completed&&!evaluatePrototype(g).failed){
  if(g.tick%100===0&&stop())throw Object.assign(Error('Coordinator stop requested'),{code:'STOP',partial:{seed,health,policy,tick:g.tick,time:s.time}});
  assert.ok(++steps<=Math.ceil(DESIGN.timeLimit/.05)+2,'Finite tick guard');const tick=g.tick;
  p.step(g);advanceObjectiveBattle(g,.05,evaluatePrototype,DESIGN.timeLimit);assert.ok(g.tick>tick,'Battle did not advance');observe();
 }
 economy.reconcile();const ledger=economy.snapshot();const paid=ledger.transactions.filter(t=>t.side===0&&t.cost>0);for(let i=1;i<paid.length;i++)assert.ok(paid[i].time-paid[i-1].time>=DESIGN.cadenceSeconds-1e-7,'Declared player cadence');
 for(const t of ledger.transactions)assert.equal(t.cost,normalPrice(g,t),'Ordinary paid price');
 const final=g.serialize();assert.deepEqual(Game.restore(final).serialize(),final,'Final save roundtrip');assert.deepEqual(freeze(),packet.freeze,'Source changed while running');
 return {seed,health,policy,initial,commands:p.commands,ledger,firstContact,firstCoreDamage,coreDamage,losses,trace,minHP,healed:s.citadelOptions.sides.map(r=>r.healedTotal),outcome:evaluatePrototype(g),duration:s.time,final};
}
export function summarize(r){return {seed:r.seed,health:r.health,policy:r.policy,outcome:r.outcome,duration:r.duration,finalHP:r.final.state.bases.map(b=>b.hp),minHP:r.minHP,healed:r.healed,coreDamage:r.coreDamage,firstContact:r.firstContact,firstCoreDamage:r.firstCoreDamage,originalLosses:r.losses.filter(b=>b.original),spending:r.ledger.spending,economyError:r.ledger.maxError,paidPlayerActions:r.ledger.transactions.filter(t=>t.side===0).map(({time,method,type,cost})=>({time,method,type,cost}))};}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [mode,a,b]=process.argv.slice(2);
 if(mode==='--freeze'&&a&&!b){const parent=realpathSync(path.dirname(path.resolve(a)));assert.ok(parent!==ROOT&&!parent.startsWith(ROOT+path.sep));assert.ok(!existsSync(a),'Do not overwrite a freeze');writeFileSync(a,JSON.stringify(freeze(),null,2)+'\n');}
 else if(mode==='--run-reviewed'&&a&&b){
  const packet=JSON.parse(readFileSync(a));verifyApproval(packet);const parent=realpathSync(path.dirname(path.resolve(b)));assert.ok(parent!==ROOT&&!parent.startsWith(ROOT+path.sep),'Results must stay outside source');mkdirSync(b,{recursive:true});const output=validateOutputDirectory(b),rows=[];
  let interrupted=false;process.on('SIGINT',()=>{interrupted=true;});process.on('SIGTERM',()=>{interrupted=true;});
  const stop=()=>interrupted||existsSync(output+'.stop');
  try{for(const seed of PLAN.knownSeeds)for(const health of PLAN.healthControls)for(const policy of PLAN.policies){if(stop())throw Error('Stopped between cases');const r=runCase({seed,health,policy,packet,stop});writeFileSync(path.join(output,`${seed}-${health}-${policy}.json`),JSON.stringify(r));rows.push(summarize(r));writeFileSync(path.join(output,'summary.json'),JSON.stringify({status:'incomplete',freeze:packet.freeze.sha256,rows},null,2)+'\n');}writeFileSync(path.join(output,'summary.json'),JSON.stringify({status:'complete',freeze:packet.freeze.sha256,rows},null,2)+'\n');}
  catch(e){writeFileSync(path.join(output,'stopped.json'),JSON.stringify({message:e.message,partial:e.partial??null,completed:rows.length},null,2)+'\n');throw e;}
 }else throw Error('Usage: --freeze EXTERNAL_FILE | --run-reviewed APPROVAL_JSON EXTERNAL_EMPTY_DIRECTORY');
}
