/**
 * Frozen-candidate battlefield diagnostic. No injected state, units, gold or private placement.
 * Standalone Node >=20; runtime module is imported from its verified bytes, not edited.
 * node qa/maps-balance.mjs --out /tmp/maps-balance
 * See --help. Defaults: 8 seeds, 2 maps, 3 difficulties, 6 policies, 2 sides,
 * 2 first-event orders, every legal single-lane target: 1,440 complete games.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,appendFileSync,mkdirSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const EXPECTED='e47a168c099c2a4e1f45b238d5224cb44a02433a7cff06adbfb87095c4d56bc7';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const hash=v=>createHash('sha256').update(v).digest('hex');
const argv=process.argv.slice(2),opt={};
for(let i=0;i<argv.length;i++){assert.ok(argv[i].startsWith('--'),'Use named options');const key=argv[i].slice(2);opt[key]=argv[i+1]&&!argv[i+1].startsWith('--')?argv[++i]:true;}
if(opt.help){console.log(`Options: --out DIR --tag NAME --engine PATH --expected-hash HASH
--seeds COUNT (8) --first-seed INT (51001) --maps comma,list (long-march,twin-span)
--difficulties comma,list (easy,normal,hard) --policies comma,list
--sides comma,list (0,1) --orders comma,list (alternating,opening-flip)
--one-lanes all|starting (all) --delays comma,list (0) --restore-interval SECONDS (30)
--specs PATH runs explicit JSON specs instead of the generated matrix.
--resume skips complete specs already present in TAG-games.jsonl.
Six base policies: burst,one-lane,mixed-aa,screened-siege,mine-after2,greed.
Economy follow-ups: screen3-mine,screen3-no-mine,front-mine,front-no-mine.\nExploratory weak-screen controls: mixed3-mine,mixed3-no-mine,secured-mine,secured-no-mine.\nAdditional controls: no-mine-after2,idle,mirror-ai. All bot actions use public paid APIs.
Opening-flip changes ONLY the first decision event, not later actor ordering.
Both normal/hard actors initially act at 0.05s; easy AI first acts after its 7s delay.
Changing --delays shifts player decisions, not AI. These are diagnostic bots, not people.
Every result includes action sequence, all structures, actual mine receipts, and invariants.`);process.exit(0);}
const enginePath=resolve(String(opt.engine||resolve(ROOT,'dist/engine.js'))),source=readFileSync(enginePath,'utf8'),engineHash=hash(source);
assert.equal(engineHash,String(opt['expected-hash']||EXPECTED),'Frozen engine changed: stop and explicitly review a new hash');
const E=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const {Game,BUILDINGS,SPELL,upgradeCost}=E;
// These exact Classic descriptors only support optional historical-engine parity controls.
const classic={id:'classic',width:3200,height:900,lanes:[260,450,640],startingLane:1,siteColumns:[270,410,550,690,830,970,1110,1250],buildLimit:24};
const getMap=id=>E.getMap?E.getMap(id):(assert.equal(id,'classic'),classic);
const worldX=(map,side,h)=>side?map.width-h:h;
const round=n=>Number(n.toFixed(4));
const allPolicies=['burst','one-lane','mixed-aa','screened-siege','mine-after2','greed'];
const list=(key,fallback)=>String(opt[key]??fallback).split(',');
const output=resolve(String(opt.out||'/tmp/ironroot-map-balance')),tag=String(opt.tag||'matrix');mkdirSync(output,{recursive:true});
const restoreInterval=Number(opt['restore-interval']||30);assert.ok(restoreInterval>0&&restoreInterval<=60);
const meta={schemaVersion:2,harnessHash:hash(readFileSync(fileURLToPath(import.meta.url))),engineHash,enginePath,node:process.version,createdAt:new Date().toISOString(),stepSeconds:.05,maxSeconds:600,restoreInterval,meaning:'Player policy win rates in deterministic scripted diagnostics, not human balance certification.',orderMeaning:'alternating starts absolute side 0 first at t=0.05; opening-flip reverses only that first event. Later ordering is identical. Easy AI has the unchanged 7s opening delay.',rules:'Starting free barracks and 420 gold are unmodified. Public build/upgrade/cast only. No injected units/gold, private placement or state mutation.',options:opt};
writeFileSync(resolve(output,`${tag}-metadata.json`),JSON.stringify(meta,null,2));
const idOf=s=>[s.mapId,s.difficulty,s.policy,s.lane??'-',s.seed,s.playerSide,s.order,s.delay??0].join('/');
function selectPlan(g,map,side,spec,bot){
 const own=g.state.buildings.filter(b=>b.side===side),count=t=>own.filter(b=>b.type===t).length;
 const production=own.filter(b=>BUILDINGS[b.type].unit),forward=production.filter(b=>(side?map.width-b.x:b.x)>550);
 const laneCounts=l=>production.filter(b=>b.lane===l).length;
 const balanced=map.lanes.map((_,l)=>l).sort((a,b)=>laneCounts(a)-laneCounts(b)||a-b);
 let type='barracks',lanes=balanced,preferMineUpgrade=false,opening=false,mineDecision=false;
 switch(spec.policy){
  case 'idle':return null;
  case 'burst':break;
  case 'one-lane':lanes=[spec.lane??map.startingLane];break;
  case 'mixed-aa':{
   const uncovered=balanced.filter(l=>!forward.some(b=>b.type==='barracks'&&b.lane===l));
   if(uncovered.length)lanes=uncovered;
   else {const plan=['archery','aerie','barracks','archery','sanctum','barracks'];type=plan[bot.supportBuilt%plan.length];}
   break;
  }
  case 'screened-siege':{
   const uncovered=balanced.filter(l=>!forward.some(b=>b.type==='barracks'&&b.lane===l));
   if(uncovered.length)lanes=uncovered;
   else {const plan=['foundry','archery','barracks','foundry','barracks','archery'];type=plan[bot.supportBuilt%plan.length];}
   break;
  }
  case 'mine-after2':case 'no-mine-after2':{
   // Two PAID forward barracks, then exactly one paid mine. Initial barracks does not count.
   if(bot.screenBuilt<2){lanes=[bot.screenBuilt%map.lanes.length];}
   else if(!bot.mineSlotDone){
    if(spec.policy==='no-mine-after2'){
      // Preserve the exact savings threshold and empty decision of the mine branch.
      if(g.state.gold[side]>=BUILDINGS.mint.cost)bot.mineSlotDone=true;
      return null;
    }
    type='mint';lanes=[map.startingLane];
   }else if(count('mint')&&g.state.time>=100&&forward.length>=6&&own.some(b=>b.type==='mint'&&b.level===1)){preferMineUpgrade=true;}
   break;
  }
  case 'screen3-mine':case 'screen3-no-mine':case 'front-mine':case 'front-no-mine':{
   // Reuse the established successful mixed-AA policy before and after the mine.
   // Twin Span: two forward barracks, one on EACH road, then forward archery.
   const uncovered=balanced.filter(l=>!forward.some(b=>b.type==='barracks'&&b.lane===l));
   if(uncovered.length){lanes=uncovered;opening=true;break;}
   if(bot.supportBuilt===0){type='archery';break;}
   const secured=g.state.time>=75&&forward.length>=map.lanes.length+1&&!g.state.units.some(u=>u.side!==side&&(side?map.width-u.x:u.x)<1550)&&map.lanes.every((_,lane)=>g.state.units.some(u=>u.side===side&&u.lane===lane&&(side?map.width-u.x:u.x)>map.width/2-100));
   if(!bot.mineSlotDone&&(spec.policy.startsWith('screen3')||secured)){
    bot.mineTriggerAt??=g.state.time;
    if(g.state.gold[side]<BUILDINGS.mint.cost)return null;
    bot.mineDecisionAt=g.state.time;
    if(spec.policy.endsWith('no-mine')){bot.mineSlotDone=true;return null;}
    type='mint';lanes=[map.startingLane];mineDecision=true;break;
   }
   type=['archery','aerie','barracks','archery','sanctum','barracks'][bot.supportBuilt%6];
   break;
  }
  case 'mixed3-mine':case 'mixed3-no-mine':case 'secured-mine':case 'secured-no-mine':{
   // Three paid forward producers: both outer roads screened, one supported by archery.
   // Twin Span's outer roads ARE its two roads. Classic uses the same outer-road plan.
   const roads=[0,map.lanes.length-1];
   if(bot.openingStep<3){type=bot.openingStep===2?'archery':'barracks';lanes=[bot.openingStep===1?roads[1]:roads[0]];opening=true;break;}
   const secured=g.state.time>=75&&forward.length>=3&&!g.state.units.some(u=>u.side!==side&&(side?map.width-u.x:u.x)<1550)&&roads.every(lane=>g.state.units.some(u=>u.side===side&&u.lane===lane&&(side?map.width-u.x:u.x)>map.width/2-100));
   if(!bot.mineSlotDone&&(spec.policy.startsWith('mixed3')||secured)){
    bot.mineTriggerAt??=g.state.time;
    if(g.state.gold[side]<BUILDINGS.mint.cost)return null;
    bot.mineDecisionAt=g.state.time;
    if(spec.policy.endsWith('no-mine')){bot.mineSlotDone=true;return null;}
    type='mint';lanes=[map.startingLane];mineDecision=true;break;
   }
   type=['barracks','archery','sanctum','foundry','barracks','archery'][bot.supportBuilt%6];
   break;
  }
  case 'greed':
   if(bot.minesBuilt<3)type='mint';
   else if(production.length<4)type='barracks';
   else if(own.some(b=>b.type==='mint'&&b.level<3))preferMineUpgrade=true;
   else {type=['barracks','archery','foundry','sanctum','aerie'][bot.supportBuilt%5];}
   break;
  default:throw new Error('Unknown policy '+spec.policy);
 }
 return {type,lanes,preferMineUpgrade,own,opening,mineDecision};
}
function act(g,map,side,spec,bot){
 const plan=selectPlan(g,map,side,spec,bot);if(!plan)return;
 if(plan.preferMineUpgrade){const mine=plan.own.filter(b=>b.type==='mint'&&b.level<(spec.policy==='greed'?3:2)).sort((a,b)=>a.level-b.level||a.id-b.id)[0];if(mine)g.upgrade(mine.id,side);return;}
 const {type,lanes,own}=plan;
 // SAVE for the intended type. No upgrade fallback consumes this earmarked gold.
 if(g.state.gold[side]<BUILDINGS[type].cost)return;
 for(const lane of lanes)for(const h of type==='mint'?[270,410,550]:[1250,1110,970,830,690,550,410,270]){
  if(g.build(type,worldX(map,side,h),map.lanes[lane],side).ok){
   if(type==='mint'){bot.minesBuilt++;bot.mineSlotDone=true;}
   else if(plan.opening){bot.openingStep++;if(bot.openingStep===3)bot.openingCompletedAt=g.state.time;}
   else if(['mixed3-mine','mixed3-no-mine','secured-mine','secured-no-mine','screen3-mine','screen3-no-mine','front-mine','front-no-mine'].includes(spec.policy)){bot.supportBuilt++;}
   else {if(type==='barracks'&&(spec.policy==='mine-after2'||spec.policy==='no-mine-after2'))bot.screenBuilt++;if(!['barracks'].includes(type)||['mixed-aa','screened-siege','greed'].includes(spec.policy)&&own.filter(b=>BUILDINGS[b.type].unit&&(side?map.width-b.x:b.x)>550).length>=map.lanes.length)bot.supportBuilt++;}
   return;
  }
 }
 // Only a genuine lack of legal sites permits producer upgrades; no mine-saving loophole.
 for(const b of own.filter(b=>BUILDINGS[b.type].unit&&b.level<3&&lanes.includes(b.lane)).sort((a,b)=>a.level-b.level||a.id-b.id))if(g.upgrade(b.id,side).ok)return;
}
function paidSpell(g,map,side,spec){
 if(!['mixed-aa','screened-siege','greed','screen3-mine','screen3-no-mine','front-mine','front-no-mine'].includes(spec.policy)||g.state.gold[side]<SPELL.cost||g.state.spellCooldown[side]>0)return;
 const foes=g.state.units.filter(u=>u.side!==side&&(side?map.width-u.x:u.x)<1650);let target=null,best=3;
 for(const u of foes){const n=foes.filter(v=>Math.hypot(v.x-u.x,v.y-u.y)<SPELL.radius).length;if(n>best){target=u;best=n;}}
 if(target)g.cast(target.x,target.y,side);
}
function match(spec){
 const map=getMap(spec.mapId),player=spec.playerSide,ai=1-player;
 assert.ok([0,1].includes(player));assert.ok(['easy','normal','hard'].includes(spec.difficulty));assert.ok(['alternating','opening-flip'].includes(spec.order));
 if(spec.policy==='one-lane')assert.ok(Number.isInteger(spec.lane)&&spec.lane>=0&&spec.lane<map.lanes.length);
 let g=new Game({mapId:spec.mapId,difficulty:spec.difficulty,seed:spec.seed,ai:false});
 const income=[0,0],spent=[0,0],refund=[0,0],actions=[],structures=new Map(),mines=new Map();
 const bot={screenBuilt:0,minesBuilt:0,mineSlotDone:false,supportBuilt:0,openingStep:0};
 const timers=[0,0];timers[ai]=spec.difficulty==='easy'?7:0;timers[player]=spec.delay??0;
 let openingActor=null,openingSide=null,maxLedgerError=0,checkpoints=0,restoredSteps=0,firstContact=null,firstBuildingLoss=null;
 let peak=[0,0],capSeconds=[0,0],spawnCapBlocks=[0,0],peakBuildings=[1,1],buildCapSeconds=[0,0],firstOvertime=null,firstCollapse=null;
 const failureCounts={invalidSaves:0,illegalLanes:0,worldBounds:0,illegalSites:0,capViolations:0,ledgerViolations:0,nonfiniteOrNegativeGold:0};
 const failures=[];let verificationStep=false;
 const fail=(kind,message)=>{failureCounts[kind]++;if(failures.length<20)failures.push({t:round(g.state.time),kind,message});};
 const recordStructure=(b,initial=false)=>structures.set(b.id,{id:b.id,side:b.side,type:b.type,lane:b.lane,x:b.x,y:b.y,builtAt:g.state.time,initial,paidInvestment:initial?0:BUILDINGS[b.type].cost});
 for(const b of g.state.buildings)recordStructure(b,true);
 const install=game=>{
  for(const name of ['build','upgrade','cast','sell']){
   const orig=game[name];game[name]=function(...args){
    const side=args[name==='build'?3:name==='cast'?2:1]??0,before=name==='upgrade'||name==='sell'?this.state.buildings.find(b=>b.id===args[0]):null;
    const oldGold=this.state.gold[side],oldKills=this.state.stats.kills[side],oldLevel=before?.level;
    const cost=name==='build'?BUILDINGS[args[0]]?.cost:name==='cast'?SPELL.cost:name==='upgrade'&&before?upgradeCost(before):0;
    const result=orig.apply(this,args);
    if(result.ok){
     const delta=oldGold-this.state.gold[side]+2*(this.state.stats.kills[side]-oldKills);
     assert.ok(name==='sell'||Math.abs(delta-cost)<1e-7,'Wrong paid price');assert.ok(this.state.gold[side]>=0,'Purchased without sufficient gold');
     if(name==='sell')refund[side]+=result.refund;else spent[side]+=cost;
     const b=result.building||before,action={t:round(this.state.time),side,name,type:name==='build'?args[0]:b?.type??null,id:b?.id??null,cost:name==='sell'?-result.refund:cost,lane:b?.lane??null,x:name==='cast'?args[0]:b?.x??null,y:name==='cast'?args[1]:b?.y??null,level:b?.level??null};actions.push(action);
     if(name==='build'){
      recordStructure(b);
      if(!map.siteColumns.includes(side?map.width-b.x:b.x)||!map.lanes.includes(b.y)||b.lane!==map.lanes.indexOf(b.y))fail('illegalSites',JSON.stringify(action));
      if(b.type==='mint')mines.set(b.id,{id:b.id,side,lane:b.lane,x:b.x,y:b.y,builtAt:this.state.time,purchase:cost,upgradeInvestment:0,investment:cost,income:0,levelOneEquivalentIncome:0,baseRepaidAt:null,fullRepaidAt:null,upgrades:[],refund:0});
     }
     if(name==='upgrade'){
      const r=structures.get(b.id);assert.ok(r);r.paidInvestment+=cost;
      if(b.type==='mint'){const m=mines.get(b.id);assert.ok(m);m.investment+=cost;m.upgradeInvestment+=cost;m.fullRepaidAt=null;m.upgrades.push({at:this.state.time,fromLevel:oldLevel,toLevel:b.level,cost,incrementalIncome:0,incrementRepaidAt:null});}
     }
     if(name==='sell'){const r=structures.get(b.id);r.soldAt=this.state.time;r.refund=result.refund;if(b.type==='mint')mines.get(b.id).refund+=result.refund;}
    }else assert.equal(this.state.gold[side],oldGold,'Rejected action changed gold');
    return result;
   };
  }
  const spawn=game._spawn;game._spawn=function(b){if(!verificationStep&&this.state.units.filter(u=>u.side===b.side&&u.hp>0).length>=70)spawnCapBlocks[b.side]++;return spawn.call(this,b);};
  return game;
 };
 install(g);
 const checkLedger=()=>{
  for(const side of [0,1]){const gold=g.state.gold[side],error=Math.abs(gold-(420+income[side]+g.state.stats.kills[side]*2-spent[side]+refund[side]));maxLedgerError=Math.max(error,maxLedgerError);if(!Number.isFinite(gold)||gold<0)fail('nonfiniteOrNegativeGold',`${side}: ${gold}`);if(error>1e-6)fail('ledgerViolations',`${side}: ${error}`);}
 };
 const checkpoint=()=>{
  checkpoints++;
  try{
   const saved=g.serialize(),serialized=JSON.stringify(saved),restored=Game.restore(saved);
   assert.equal(JSON.stringify(saved),serialized,'Restore mutated input');assert.deepEqual(restored.serialize(),saved,'Round trip changed state');
   // A real next-step equivalence test, including engine RNG, not only a JSON roundtrip.
   verificationStep=true;g.update(.05);restored.update(.05);assert.deepEqual(restored.serialize(),g.serialize(),'Restored continuation diverged');restoredSteps++;verificationStep=false;
   g=install(Game.restore(saved));
  }catch(e){fail('invalidSaves',String(e.stack||e));}
 };
 checkpoint();
 const checkpointFrames=Math.round(restoreInterval/.05);
 for(let frame=0;frame<12000&&g.state.winner===null;frame++){
  const liveMines=g.state.buildings.filter(b=>b.type==='mint'&&b.hp>0);
  for(const side of [0,1])income[side]+=.05*(5+liveMines.filter(b=>b.side===side).reduce((n,b)=>n+2.5*(1+.5*(b.level-1)),0));
  for(const b of liveMines){const m=mines.get(b.id);assert.ok(m);m.income+=.05*2.5*(1+.5*(b.level-1));m.levelOneEquivalentIncome+=.125;for(const u of m.upgrades){u.incrementalIncome+=.0625;if(u.incrementRepaidAt===null&&u.incrementalIncome+1e-7>=u.cost)u.incrementRepaidAt=g.state.time+.05;}if(m.baseRepaidAt===null&&m.income+1e-7>=m.purchase)m.baseRepaidAt=g.state.time+.05;if(m.fullRepaidAt===null&&m.income+1e-7>=m.investment)m.fullRepaidAt=g.state.time+.05;}
  g.update(.05);
  if(firstContact===null&&g.state.stats.damage.some(v=>v>0))firstContact=g.state.time;
  if(g.state.overtime&&firstOvertime===null)firstOvertime=g.state.time;
  if(g.state.time>420&&firstCollapse===null)firstCollapse=g.state.time;
  const alive=new Set(g.state.buildings.map(b=>b.id));
  for(const r of structures.values())if(r.destroyedAt===undefined&&r.soldAt===undefined&&!alive.has(r.id)){r.destroyedAt=g.state.time;if(firstBuildingLoss===null)firstBuildingLoss=g.state.time;const m=mines.get(r.id);if(m)m.destroyedAt=g.state.time;}
  const units=[0,0],buildings=[0,0];
  for(const u of g.state.units){units[u.side]++;if(!Number.isInteger(u.lane)||u.lane<0||u.lane>=map.lanes.length)fail('illegalLanes',`unit ${u.id} lane ${u.lane}`);if(!Number.isFinite(u.x)||!Number.isFinite(u.y)||u.x<75||u.x>map.width-75||u.y<180||u.y>720)fail('worldBounds',`unit ${u.id} at ${u.x},${u.y}`);}
  for(const b of g.state.buildings){buildings[b.side]++;if(!Number.isInteger(b.lane)||b.lane<0||b.lane>=map.lanes.length)fail('illegalLanes',`building ${b.id} lane ${b.lane}`);}
  for(const side of [0,1]){peak[side]=Math.max(peak[side],units[side]);peakBuildings[side]=Math.max(peakBuildings[side],buildings[side]);if(units[side]===70)capSeconds[side]+=.05;if(buildings[side]===map.buildLimit)buildCapSeconds[side]+=.05;if(units[side]>70||buildings[side]>map.buildLimit)fail('capViolations',String(side));}
  checkLedger();
  if(g.state.winner===null){
   const sides=(frame+(spec.order==='opening-flip'&&frame===0?1:0))%2?[1,0]:[0,1];
   for(const side of sides){timers[side]-=.05;if(timers[side]>0)continue;if(openingActor===null){openingActor=side===player?'player':'ai';openingSide=side;}
    if(side===ai||spec.policy==='mirror-ai'){g._ai(side);timers[side]=(spec.difficulty==='easy'?14:spec.difficulty==='hard'?3:5)+g.random()*3;}
    else{paidSpell(g,map,side,spec);for(let n=0;n<(spec.policy==='burst'?3:1);n++)act(g,map,side,spec,bot);timers[side]=5;}
   }
  }
  checkLedger();if((frame+1)%checkpointFrames===0)checkpoint();
 }
 checkpoint();
 const minesOut=[...mines.values()].map(m=>({...m,aliveAtEnd:m.destroyedAt===undefined,survivalSeconds:round((m.destroyedAt??g.state.time)-m.builtAt),income:round(m.income),levelOneEquivalentIncome:round(m.levelOneEquivalentIncome),baseCostRepaid:m.income+1e-7>=m.purchase,fullInvestmentRepaid:m.income+1e-7>=m.investment,netIncomeLessInvestment:round(m.income-m.investment),netIncludingRefund:round(m.income+m.refund-m.investment),upgrades:m.upgrades.map(u=>({...u,incrementalIncome:round(u.incrementalIncome),incrementRepaid:u.incrementalIncome+1e-7>=u.cost}))}));
 const purchaseCount=side=>Object.fromEntries(Object.keys(BUILDINGS).map(type=>[type,actions.filter(a=>a.side===side&&a.name==='build'&&a.type===type).length]));
 return {id:idOf(spec),...spec,policyState:{...bot},winner:g.state.winner,playerWin:g.state.winner===player,draw:g.state.winner==='draw',timeout:g.state.winner===null,seconds:round(g.state.time),openingActor,openingSide,firstContact:round(firstContact??0),firstBuildingLoss:firstBuildingLoss===null?null:round(firstBuildingLoss),overtime:firstOvertime!==null,collapse:firstCollapse!==null,baseHp:g.state.bases.map(b=>round(b.hp)),gold:g.state.gold.map(round),income:income.map(round),spent,refund,kills:g.state.stats.kills,damage:g.state.stats.damage.map(round),maxLedgerError,peak,capSeconds:capSeconds.map(round),spawnCapBlocks,peakBuildings,buildCapSeconds:buildCapSeconds.map(round),checkpoints,restoredSteps,failureCounts,failures,mines:minesOut,structures:[...structures.values()].map(r=>({...r,lifetime:round((r.destroyedAt??r.soldAt??g.state.time)-r.builtAt)})),builds:[0,1].map(purchaseCount),buildsByLane:[0,1].map(side=>map.lanes.map((_,lane)=>actions.filter(a=>a.side===side&&a.name==='build'&&a.lane===lane).length)),spells:[0,1].map(side=>actions.filter(a=>a.side===side&&a.name==='cast').length),actions,stateHash:hash(JSON.stringify(g.serialize()))};
}
function summarize(games){
 const groups=new Map();for(const g of games){const key=[g.mapId,g.difficulty,g.policy,g.lane??'-',g.order,g.delay??0].join('/');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(g);}
 const stats=gs=>({runs:gs.length,wins:gs.filter(g=>g.playerWin).length,draws:gs.filter(g=>g.draw).length,timeouts:gs.filter(g=>g.timeout).length,meanSeconds:round(gs.reduce((n,g)=>n+g.seconds,0)/gs.length),minSeconds:Math.min(...gs.map(g=>g.seconds)),maxSeconds:Math.max(...gs.map(g=>g.seconds)),meanFirstContact:round(gs.reduce((n,g)=>n+g.firstContact,0)/gs.length),overtime:gs.filter(g=>g.overtime).length,collapse:gs.filter(g=>g.collapse).length,unitCapGames:gs.filter(g=>g.capSeconds.some(x=>x>0)).length,buildingCapGames:gs.filter(g=>g.buildCapSeconds.some(x=>x>0)).length,maxLedgerError:Math.max(...gs.map(g=>g.maxLedgerError)),restoreChecks:gs.reduce((n,g)=>n+g.checkpoints,0),invalidSaves:gs.reduce((n,g)=>n+g.failureCounts.invalidSaves,0),failures:gs.reduce((n,g)=>n+Object.values(g.failureCounts).reduce((a,b)=>a+b,0),0),mines:[0,1].map(actor=>{const ms=gs.flatMap(g=>g.mines.filter(m=>m.side===(actor===0?g.playerSide:1-g.playerSide)));return {actor:actor===0?'player':'ai',bought:ms.length,baseRepaid:ms.filter(m=>m.baseCostRepaid).length,fullInvestmentRepaid:ms.filter(m=>m.fullInvestmentRepaid).length,totalIncome:round(ms.reduce((n,m)=>n+m.income,0)),totalInvestment:ms.reduce((n,m)=>n+m.investment,0),upgrades:ms.reduce((n,m)=>n+m.upgrades.length,0),upgradesIncrementRepaid:ms.reduce((n,m)=>n+m.upgrades.filter(u=>u.incrementRepaid).length,0),net:round(ms.reduce((n,m)=>n+m.netIncomeLessInvestment,0))};})});
 return {total:stats(games),rows:[...groups].map(([key,gs])=>({key,...stats(gs),bySide:[0,1].map(side=>{const ss=gs.filter(g=>g.playerSide===side);return {side,runs:ss.length,wins:ss.filter(g=>g.playerWin).length};}),byOpeningActor:['player','ai'].map(actor=>{const ss=gs.filter(g=>g.openingActor===actor);return {actor,runs:ss.length,wins:ss.filter(g=>g.playerWin).length};})}))};
}
let specs=[];
if(opt.specs)specs=JSON.parse(readFileSync(resolve(String(opt.specs)),'utf8'));
else for(const mapId of list('maps','long-march,twin-span'))for(const difficulty of list('difficulties','easy,normal,hard'))for(const policy of list('policies',allPolicies.join(',')))for(const lane of policy==='one-lane'?(opt['one-lanes']==='starting'?[getMap(mapId).startingLane]:getMap(mapId).lanes.map((_,i)=>i)):[undefined])for(let k=0;k<Number(opt.seeds||8);k++)for(const playerSide of list('sides','0,1').map(Number))for(const order of list('orders','alternating,opening-flip'))for(const delay of list('delays','0').map(Number))specs.push({mapId,difficulty,policy,...(lane===undefined?{}:{lane}),seed:Number(opt['first-seed']||51001)+k,playerSide,order,delay});
const gamesPath=resolve(output,`${tag}-games.jsonl`),games=opt.resume&&existsSync(gamesPath)?readFileSync(gamesPath,'utf8').trim().split('\n').filter(Boolean).map(s=>JSON.parse(s)):[],seen=new Set(games.map(g=>g.id));
if(!opt.resume)writeFileSync(gamesPath,'');
writeFileSync(resolve(output,`${tag}-specs.json`),JSON.stringify(specs,null,2));
const begin=Date.now();
for(const spec of specs){if(seen.has(idOf(spec)))continue;const result=match(spec);games.push(result);appendFileSync(gamesPath,JSON.stringify(result)+'\n');seen.add(result.id);if(result.timeout||result.failures.length)console.error('FAILURE '+JSON.stringify({id:result.id,timeout:result.timeout,failures:result.failures}));if(games.length%16===0)console.error(JSON.stringify({completed:games.length,total:specs.length,wallSeconds:round((Date.now()-begin)/1000),latest:result.id,latestSeconds:result.seconds}));}
assert.equal(hash(readFileSync(enginePath)),engineHash,'Engine changed during audit');
const summary={...meta,...summarize(games),wallSeconds:round((Date.now()-begin)/1000)};writeFileSync(resolve(output,`${tag}-summary.json`),JSON.stringify(summary,null,2));console.log(JSON.stringify(summary.total,null,2));
if(summary.total.failures||summary.total.timeouts)process.exitCode=1;
