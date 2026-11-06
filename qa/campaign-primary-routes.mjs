/** Independent primary-route experiment. Uses only paid public Game actions.
 * node qa/campaign-primary-routes.mjs [--mission=river-charter|far-beacon]
 *   [--routes=NAME,...] [--seeds=733,91237,7281901,3940101199|authored]
 *   [--restoreEvery=10] (seconds, or 0 for uninterrupted control) [--requirePrimary]
 * Output is JSON on stdout. No server, browser, publication, or runtime writes.
 */
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {Game,BUILDINGS} from '../dist/engine.js';
import {CAMPAIGN_MISSIONS,createCampaignMission,evaluateCampaignMission,getCampaignTargets,currentIncome} from '../dist/campaign.js';
const args=Object.fromEntries(process.argv.slice(2).map(x=>x.replace(/^--/,'').split('=')));
const round=x=>Math.round(x*100)/100;
const hash=async file=>createHash('sha256').update(await readFile(new URL('../'+file,import.meta.url))).digest('hex');
const hashes={engine:await hash('dist/engine.js'),campaign:await hash('dist/campaign.js')};
assert.equal(hashes.engine,'e47a168c099c2a4e1f45b238d5224cb44a02433a7cff06adbfb87095c4d56bc7');
// Each desired building is [type,x,lane,level]. First unmet step gets one paid
// command per decision window. A destroyed desired building is rebuilt normally.
const economy=[['mint',270,0],['mint',270,1],['mint',410,0,2],['mint',270,0,2],['mint',270,1,2],['mint',410,0,3]];
const farEconomy=[['mint',270,0],['mint',270,2],['mint',410,1,2],['mint',270,0,2]];
const configurations={
  'river-walls':{mission:'river-charter',opening:[['archery',690,0,2],['watchtower',1250,0,3],['watchtower',1250,1,3]],economy},
  'river-rear-archers':{mission:'river-charter',opening:[['archery',690,0],['archery',550,0],['watchtower',1250,0,3],['watchtower',1250,1,3]],economy},
  'river-one-air':{mission:'river-charter',opening:[['aerie',550,0],['watchtower',1250,1,3]],economy},
  'river-one-air-wall':{mission:'river-charter',opening:[['aerie',550,0],['watchtower',1250,1,3],['watchtower',1250,0,3]],economy},
  ...Object.fromEntries([60,90,120,150].map(at=>['beacon-delay-'+at,{mission:'far-beacon',
    opening:[['watchtower',1250,0,3],['watchtower',1250,2,3],['aerie',270,1]],economy:farEconomy,offenseAt:at,
    offense:[['archery',1110,0,3],['archery',1110,2,3],['barracks',970,0,3],['barracks',970,2,3],['foundry',690,0,2],['foundry',690,2,2]]}]))
};
const seeds=args.seeds==='authored'?'authored':(args.seeds||'733,91237,7281901,3940101199').split(',').map(Number);
assert.ok(seeds==='authored'||seeds.every(x=>Number.isInteger(x)&&x>=0&&x<=0xffffffff));
const restoreSeconds=Number(args.restoreEvery??10);
assert.ok(Number.isFinite(restoreSeconds)&&restoreSeconds>=0&&Number.isInteger(restoreSeconds*20));
const selected=(args.routes||Object.keys(configurations).join(',')).split(',').filter(x=>!args.mission||configurations[x]?.mission===args.mission);
assert.ok(selected.length&&selected.every(x=>configurations[x]));
const alive=(g,side=0)=>g.state.buildings.filter(b=>b.side===side&&b.hp>0);
function policy(g,c){
  const desired=steps=>{
    for(const [type,x,lane,level=1] of steps){
      const b=alive(g).find(b=>b.type===type&&b.x===x&&b.lane===lane);
      if(!b)return {name:'build',args:[type,x,g.map.lanes[lane]],reason:'Maintain '+type+' at '+x+'/'+lane};
      if(b.level<level)return {name:'upgrade',args:[b.id],reason:'Improve '+type+' at '+x+'/'+lane};
    }
  };
  // Rally only nearby hostile packs. Never cast on a timer or inject damage.
  if(g.state.spellCooldown[0]===0&&g.state.gold[0]>=75){
    const foes=g.state.units.filter(u=>u.side===1&&u.x<1450);
    const pack=foes.map(u=>({u,n:foes.filter(v=>Math.hypot(v.x-u.x,v.y-u.y)<170).length})).sort((a,b)=>b.n-a.n)[0];
    if(pack?.n>=4)return {name:'cast',args:[pack.u.x,pack.u.y],reason:'Defend against nearby hostile pack'};
  }
  return desired(c.opening)||desired(c.economy)||(g.state.time+1e-7>=(c.offenseAt??Infinity)?desired(c.offense):undefined);
}
function run(name,seed){
  const c=configurations[name],m=CAMPAIGN_MISSIONS.find(m=>m.id===c.mission);
  let g=createCampaignMission(m.id);g.seed=seed; // Initialization only, before any tick.
  const actions=[],snapshots=[],investments=[],mineHistory=new Map(),targetHistory=new Map();
  for(const b of alive(g).filter(b=>b.type==='mint'))mineHistory.set(b.id,{id:b.id,x:b.x,lane:b.lane,initial:true,receipts:0,deathAt:null});
  for(const t of getCampaignTargets(g,m.id))targetHistory.set(t.originalId,{id:t.originalId,type:t.type,kind:t.kind,x:t.x,lane:t.lane,lostAt:null,firstDamageAt:null,minimumHP:t.building.hp,startingHP:t.building.hp});
  let received=0,spend=0,restores=0,minimumHP=g.state.bases[0].hp,outcome=evaluateCampaignMission(g,m.id);
  const firstHit=[null,null],restorationEvery=restoreSeconds*20,decisionEvery=40;
  while(!outcome.completed&&!outcome.failed){
    assert.equal(g.state.winner,null,'Never continue after engine victory');
    if(g.tick%decisionEvery===0){
      const op=policy(g,c);
      if(op){
        assert.ok(['build','upgrade','cast'].includes(op.name));
        const before=g.state.gold[0],killsBefore=g.state.stats.kills[0];
        const r=g[op.name](...op.args);
        if(r.ok){
          const cost=before-g.state.gold[0]+2*(g.state.stats.kills[0]-killsBefore),b=r.building;
          assert.ok(cost>0);spend+=cost;
          actions.push({time:round(g.state.time),name:op.name,args:op.args.map(x=>typeof x==='number'?round(x):x),reason:op.reason,cost,type:b?.type||'rally',id:b?.id,lane:b?.lane,x:b?.x,level:b?.level,goldAfter:round(g.state.gold[0])});
          if(b?.type==='mint'){
            if(op.name==='build')mineHistory.set(b.id,{id:b.id,x:b.x,lane:b.lane,initial:false,receipts:0,deathAt:null});
            investments.push({id:b.id,time:round(g.state.time),action:op.name,level:b.level,cost,rate:op.name==='build'?2.5:1.25,receipts:0,paidBackAt:null});
          }
        }
      }
    }
    const beforeGold=g.state.gold[0],beforeKills=g.state.stats.kills[0],beforeHP=g.state.bases.map(b=>b.hp);
    for(const b of alive(g).filter(b=>b.type==='mint')){
      mineHistory.get(b.id).receipts+=BUILDINGS.mint.income*(1+.5*(b.level-1))*.05;
      for(const inv of investments.filter(i=>i.id===b.id)){
        inv.receipts+=inv.rate*.05;
        if(inv.paidBackAt===null&&inv.receipts>=inv.cost-1e-7)inv.paidBackAt=round(g.state.time+.05);
      }
    }
    g.update(.05);received+=g.state.gold[0]-beforeGold-2*(g.state.stats.kills[0]-beforeKills);
    for(let i=0;i<2;i++)if(firstHit[i]===null&&g.state.bases[i].hp<beforeHP[i])firstHit[i]=round(g.state.time);
    minimumHP=Math.min(minimumHP,g.state.bases[0].hp);
    for(const record of mineHistory.values())if(record.deathAt===null&&!alive(g).some(b=>b.id===record.id))record.deathAt=round(g.state.time);
    for(const t of getCampaignTargets(g,m.id)){
      const record=targetHistory.get(t.originalId),hp=t.building?.hp||0;
      if(hp<record.startingHP&&record.firstDamageAt===null)record.firstDamageAt=round(g.state.time);
      record.minimumHP=Math.min(record.minimumHP,hp);
      if(!t.building&&record.lostAt===null)record.lostAt=round(g.state.time);
    }
    outcome=evaluateCampaignMission(g,m.id);
    if(g.tick%400===0||outcome.completed||outcome.failed)snapshots.push({time:round(g.state.time),gold:round(g.state.gold[0]),income:currentIncome(g),bases:g.state.bases.map(b=>round(b.hp)),protected:getCampaignTargets(g,m.id).filter(t=>t.kind==='protect').map(t=>({id:t.originalId,hp:round(t.building?.hp||0)})),sites:alive(g).length});
    if(restorationEvery&&g.tick%restorationEvery===0){const save=g.serialize();g=Game.restore(save);assert.deepEqual(g.serialize(),save);restores++;}
    assert.ok(g.state.time<=m.timeLimit+.051,'Normal endpoint must stop the run');
  }
  const end=g.serialize();assert.deepEqual(Game.restore(end).serialize(),end);
  const mineIncome=[...mineHistory.values()].reduce((n,m)=>n+m.receipts,0),baseIncome=g.state.time*5,bounty=g.state.stats.kills[0]*2;
  assert.ok(Math.abs(received-baseIncome-mineIncome)<.001,'Income ledger reconciles');
  assert.ok(Math.abs(g.state.gold[0]-(m.startingGold+received+bounty-spend))<.001,'Gold ledger reconciles');
  return {mission:m.id,route:name,seed,time:round(g.state.time),completed:outcome.completed,failed:outcome.failed,primary:outcome.completed&&outcome.objectives.every(o=>o.met),alternateCoreWin:outcome.completed&&outcome.objectives.some(o=>!o.met),coreWin:g.state.winner===0,stars:outcome.stars,label:outcome.label,income:currentIncome(g),playerHP:round(g.state.bases[0].hp),enemyHP:round(g.state.bases[1].hp),minimumHP:round(minimumHP),firstHit,restores,
    objectives:outcome.objectives.map(o=>({id:o.id,type:o.type,met:o.met,value:round(o.value),target:o.target})),
    targets:[...targetHistory.values()].map(t=>({...t,minimumHP:round(t.minimumHP)})),ledger:{start:m.startingGold,spend:round(spend),gold:round(g.state.gold[0]),baseIncome:round(baseIncome),mineIncome:round(mineIncome),killBounty:bounty},
    investments:investments.map(i=>({...i,receipts:round(i.receipts),net:round(i.receipts-i.cost)})),mines:[...mineHistory.values()].map(m=>({...m,receipts:round(m.receipts)})),actions,snapshots};
}
const results=[];
for(const name of selected){
  const chosenSeeds=seeds==='authored'?[CAMPAIGN_MISSIONS.find(m=>m.id===configurations[name].mission).seed]:seeds;
  for(const seed of chosenSeeds)results.push(run(name,seed));
}
if(Object.hasOwn(args,'requirePrimary'))for(const result of results){
  assert.ok(result.primary,`${result.route} seed ${result.seed} did not meet every primary objective`);
  assert.equal(result.coreWin,false,`${result.route} seed ${result.seed} must demonstrate a standing enemy citadel`);
}
const summary=selected.map(route=>{
  const runs=results.filter(r=>r.route===route),range=key=>[Math.min(...runs.map(r=>r[key])),Math.max(...runs.map(r=>r[key]))];
  return {route,mission:configurations[route].mission,runs:runs.length,primary:runs.filter(r=>r.primary).length,alternateCoreWins:runs.filter(r=>r.alternateCoreWin).length,failed:runs.filter(r=>r.failed).length,time:range('time'),income:range('income'),playerHP:range('playerHP'),enemyHP:range('enemyHP')};
});
assert.equal(await hash('dist/engine.js'),hashes.engine);assert.equal(await hash('dist/campaign.js'),hashes.campaign,'Campaign changed while testing');
console.log(JSON.stringify({hashes,seeds,restoreSeconds,configurations:Object.fromEntries(selected.map(k=>[k,configurations[k]])),simulations:results.length,summary,results},null,2));
