/** Independent, read-only expansion review. No runtime mutation, free funds or forced waits.
 * Run: node qa/campaign-expansion-review.mjs [--seeds=733,91237,7281901,3940101199]
 *      [--routes=reference,mastery,counter,reverse,slow,lateIncome,noIncome] [--mission=ID]
 * JSON is written only to stdout. This is a policy diagnostic, not a human win-rate test.
 */
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {Game,BUILDINGS,UNITS} from '../dist/engine.js';
import {CAMPAIGN_MISSIONS,createCampaignMission,evaluateCampaignMission,getCampaignTargets,currentIncome} from '../dist/campaign.js';
import {campaignPolicy,campaignMasteryPolicy} from '../tests/campaign-policies.mjs';

const args=Object.fromEntries(process.argv.slice(2).map(s=>s.replace(/^--/,'').split('=')));
const seeds=(args.seeds||'733,91237,7281901,3940101199').split(',').map(Number);
assert.ok(seeds.every(n=>Number.isInteger(n)&&n>=0&&n<=0xffffffff));
const expectedEngine='e47a168c099c2a4e1f45b238d5224cb44a02433a7cff06adbfb87095c4d56bc7';
const digest=async file=>createHash('sha256').update(await readFile(new URL('../'+file,import.meta.url))).digest('hex');
const hashes={engine:await digest('dist/engine.js'),campaign:await digest('dist/campaign.js')};
assert.equal(hashes.engine,expectedEngine,'Review requires the frozen baseline engine.');
const missions=CAMPAIGN_MISSIONS.slice(12).filter(m=>!args.mission||m.id===args.mission);
const round=n=>Math.round(n*100)/100;
const alive=(g,side)=>g.state.buildings.filter(b=>b.side===side&&b.hp>0);
const routes={
  reference:{reference:true,start:0,period:1,cap:Infinity},
  mastery:{mastery:true,start:0,period:1,cap:Infinity},
  counter:{start:5,period:2,cap:1,incomeAt:12},
  reverse:{start:5,period:2,cap:1,incomeAt:12,reverse:true,rear:true},
  slow:{start:8,period:3,cap:1,incomeAt:12},
  lateIncome:{start:5,period:2,cap:1,incomeAt:65},
  noIncome:{start:5,period:2,cap:1,incomeAt:Infinity},
  screenFirst:{start:5,period:2,cap:1,incomeAt:12,screenFirst:true}
};
const selected=(args.routes||'reference,mastery,counter,reverse,slow,lateIncome,noIncome').split(',');
assert.ok(selected.every(r=>routes[r]));

/** Scores visible compositions, then pays for one useful action. No authored build list.
 * Initial lane requirements are remembered so a collapsing enemy production line does
 * not make the planner erase its own tactical plan. New visible air is also answered.
 */
function counterPolicy(mission,options){
  let plans;
  return g=>{
    const s=g.state,own=alive(g,0),enemy=alive(g,1),laneCount=g.map.lanes.length;
    const count=(type,lane)=>own.filter(b=>b.type===type&&b.lane===lane).length;
    if(!plans)plans=g.map.lanes.map((_,lane)=>{
      const b=enemy.filter(b=>b.lane===lane),n=type=>b.filter(x=>x.type===type).length;
      const air=n('aerie'),softToAir=n('foundry')+n('sanctum')>0&&!air&&!n('archery')&&!n('watchtower');
      return {air,softToAir,archery:air?Math.max(1,Math.ceil(air*.65)):softToAir?0:1,
        aerie:softToAir?2:0,barracks:softToAir?0:Math.max(1,Math.min(2,1+n('barracks'))),
        foundry:n('watchtower')?1:!softToAir&&n('barracks')?1:0};
    });
    const choices=[];
    const build=(type,lane,score,reason)=>{
      const xs=type==='mint'?[270,410,550,690]:options.rear?[1110,1250,970,830,690,550,410,270]:[1250,1110,970,830,690,550,410,270];
      const x=xs.find(x=>g.canBuild(type,x,g.map.lanes[lane]).ok||g.canBuild(type,x,g.map.lanes[lane]).reason.startsWith('Need '));
      if(x!==undefined)choices.push({score,lane,type,reason,run:()=>g.build(type,x,g.map.lanes[lane])});
    };
    for(let lane=0;lane<laneCount;lane++){
      const p=plans[lane],foes=s.units.filter(u=>u.side===1&&u.lane===lane),near=foes.filter(u=>u.x<1450);
      const airVisible=foes.some(u=>UNITS[u.type].flying)||enemy.some(b=>b.lane===lane&&b.type==='aerie');
      const archers=Math.max(p.archery,airVisible?(g.ai?2:1):0);
      if(count('archery',lane)<archers)build('archery',lane,(p.air||airVisible?210:105)/(count('archery',lane)+1)+near.filter(u=>UNITS[u.type].flying).length*4,'ranged coverage');
      if(count('aerie',lane)<p.aerie)build('aerie',lane,230/(count('aerie',lane)+1),'fly above siege and ground splash');
      if(count('barracks',lane)<p.barracks)build('barracks',lane,(options.screenFirst?190:145)/(count('barracks',lane)+1)+near.filter(u=>u.type==='warrior').length*3,'infantry screen');
      if(count('foundry',lane)<p.foundry)build('foundry',lane,85/(count('foundry',lane)+1),'structure pressure');
    }
    // React to dangerous nearby packs, but do not fire merely because a cooldown ends.
    const threats=s.units.filter(u=>u.side===1&&u.x<1200);
    const cluster=threats.map(u=>({u,n:threats.filter(v=>Math.hypot(v.x-u.x,v.y-u.y)<170).length})).sort((a,b)=>b.n-a.n)[0];
    if(cluster?.n>=4&&s.spellCooldown[0]===0)choices.push({score:300,lane:cluster.u.lane,type:'cast',reason:'nearby hostile pack',run:()=>g.cast(cluster.u.x,cluster.u.y)});
    const dangerous=threats.length>=4;
    if(s.time>=options.incomeAt&&!dangerous){
      const mines=own.filter(b=>b.type==='mint');
      const objectiveIncome=Math.max(0,...mission.objectives.filter(o=>o.type==='income').map(o=>o.amount),...mission.medals.filter(o=>o.type==='income').map(o=>o.amount));
      const incomeGoal=Math.max(12.5,objectiveIncome);
      if(mines.length<3)for(let lane=0;lane<laneCount;lane++)build('mint',lane,72-mines.filter(b=>b.lane===lane).length*2,'early sustainable income');
      else if(currentIncome(g)<incomeGoal){
        for(const b of mines.filter(b=>b.level<3))choices.push({score:52-b.level,lane:b.lane,type:'upgrade',reason:'income objective or medal',run:()=>g.upgrade(b.id)});
      }
    }
    // Once the counters exist, improve them rather than occupy every remaining site.
    for(const b of own.filter(b=>BUILDINGS[b.type].unit&&b.level<3)){
      const p=plans[b.lane],roleBonus=(b.type==='archery'&&p.air)||(b.type==='aerie'&&p.softToAir)?8:0;
      choices.push({score:40-b.level*5+roleBonus,lane:b.lane,type:'upgrade',reason:'veteran counter production',run:()=>g.upgrade(b.id)});
    }
    // After veteran production, a second screened siege line can break distant works.
    if(!choices.length)for(let lane=0;lane<laneCount;lane++){
      const ownLane=own.filter(b=>b.lane===lane&&BUILDINGS[b.type].unit);
      if(ownLane.length<5)build(count('barracks',lane)?'foundry':'barracks',lane,10,'late structure pressure');
    }
    choices.sort((a,b)=>b.score-a.score||(options.reverse?b.lane-a.lane:a.lane-b.lane));
    if(choices[0])return choices[0].run();
  };
}

function verifyDisclosure(mission){
  const g=createCampaignMission(mission.id),lanes=g.map.lanes.length===2?['North','South']:['North','Middle','South'];
  const summary=side=>lanes.map((name,lane)=>{
    const actual=alive(g,side).filter(b=>b.lane===lane),groups=new Map();
    for(const b of actual){const label=`level-${b.level} ${BUILDINGS[b.type].name}`;groups.set(label,(groups.get(label)||0)+1);}
    return name+': '+([...groups].map(([label,n])=>`${n} × ${label}`).join(', ')||'no starting buildings');
  }).join('; ');
  assert.equal(mission.deployment.player,summary(0));assert.equal(mission.deployment.enemy,summary(1));
  assert.equal(g.state.gold[0],mission.startingGold);assert.equal(g.state.bases[0].hp,mission.startingHealth);
  assert.equal(g.state.gold[1],mission.enemyGold||0);assert.equal(g.ai,mission.ai);
  assert.equal(g.state.income[0],currentIncome(g));
  return {mission:mission.id,startingGold:g.state.gold,startingHP:g.state.bases.map(b=>b.hp),startingIncome:g.state.income,
    map:g.map.id,lanes:g.map.lanes.length,sitesPerSide:g.map.buildLimit,player:summary(0),enemy:summary(1),verified:true};
}

function simulate(mission,seed,routeName){
  const options=routes[routeName];let g=createCampaignMission(mission.id);g.seed=seed;
  const policy=options.reference?campaignPolicy(mission.id):options.mastery?campaignMasteryPolicy(mission.id):counterPolicy(mission,options);
  const mines=new Map(),actions=[],investments=[],snapshots=[];
  let received=0,kills=0,spend=0,firstBaseHit=[null,null],lastOutcome,minHP=mission.startingHealth;
  for(const b of alive(g,0).filter(b=>b.type==='mint'))mines.set(b.id,{id:b.id,x:b.x,lane:b.lane,initial:true,receipts:0,deathAt:null});
  const targetHistory=new Map(getCampaignTargets(g,mission.id).map(t=>[t.originalId,{kind:t.kind,type:t.type,x:t.x,lane:t.lane,id:t.originalId,lostAt:null,attacksByType:{},lastDirectAttack:null}]));
  const observe=game=>{
    const original=game._fire;
    game._fire=function(attacker,target,damage,type){
      const tracked=targetHistory.get(target.id);
      if(tracked){tracked.attacksByType[attacker.type]=(tracked.attacksByType[attacker.type]||0)+1;tracked.lastDirectAttack={time:round(game.state.time),attacker:attacker.type,damage:round(damage)};}
      return original.call(this,attacker,target,damage,type);
    };
    return game;
  };
  observe(g);
  const cap=options.cap;
  for(let tick=0;tick<=mission.timeLimit*20+1;tick++){
    if(tick>=options.start*20&&(tick-options.start*20)%(options.period*20)===0){
      let remaining=cap;
      const originals=Object.fromEntries(['build','upgrade','cast'].map(name=>[name,g[name]]));
      for(const [name,original] of Object.entries(originals))g[name]=(...a)=>{
        if(remaining<=0)return {ok:false,reason:'Need another action window.'};
        const before=g.state.gold[0],beforeActionKills=g.state.stats.kills[0];
        const result=original.apply(g,a);
        if(result.ok){
          remaining--;const cost=before-g.state.gold[0]+(g.state.stats.kills[0]-beforeActionKills)*2,building=result.building;
          assert.ok(cost>0,'every successful player action spends ordinary gold');
          actions.push({time:round(g.state.time),name,cost,type:building?.type||'rally',id:building?.id,lane:building?.lane,x:building?.x,level:building?.level});spend+=cost;
          if(building?.type==='mint'){
            if(name==='build')mines.set(building.id,{id:building.id,x:building.x,lane:building.lane,initial:false,receipts:0,deathAt:null});
            investments.push({id:building.id,time:round(g.state.time),kind:name,level:building.level,cost,rate:name==='build'?2.5:1.25,receipts:0,paidBackAt:null});
          }
        }
        return result;
      };
      try{policy(g);}finally{for(const name of Object.keys(originals))delete g[name];}
    }
    const beforeHP=g.state.bases.map(b=>b.hp),beforeGold=g.state.gold[0],beforeKills=g.state.stats.kills[0];
    const liveMines=alive(g,0).filter(b=>b.type==='mint');
    for(const b of liveMines){const receipt=2.5*(1+.5*(b.level-1))*.05;mines.get(b.id).receipts+=receipt;
      for(const inv of investments.filter(i=>i.id===b.id)){inv.receipts+=inv.rate*.05;if(inv.paidBackAt===null&&inv.receipts>=inv.cost-1e-7)inv.paidBackAt=round(g.state.time+.05);}
    }
    g.update(.05);
    received+=g.state.gold[0]-beforeGold-(g.state.stats.kills[0]-beforeKills)*2;kills=g.state.stats.kills[0]*2;
    for(const record of mines.values())if(record.deathAt===null&&!alive(g,0).some(b=>b.id===record.id))record.deathAt=round(g.state.time);
    for(const t of getCampaignTargets(g,mission.id))if(!t.building&&targetHistory.get(t.originalId).lostAt===null)targetHistory.get(t.originalId).lostAt=round(g.state.time);
    for(let side=0;side<2;side++)if(firstBaseHit[side]===null&&g.state.bases[side].hp<beforeHP[side])firstBaseHit[side]=round(g.state.time);
    minHP=Math.min(minHP,g.state.bases[0].hp);
    lastOutcome=evaluateCampaignMission(g,mission.id);
    if(tick%400===399)snapshots.push({time:round(g.state.time),income:currentIncome(g),gold:round(g.state.gold[0]),bases:g.state.bases.map(b=>round(b.hp)),buildings:alive(g,0).length});
    if(lastOutcome.completed||lastOutcome.failed)break;
    if(tick%200===199)g=observe(Game.restore(g.serialize()));
  }
  Game.restore(g.serialize());
  const mineReceipts=[...mines.values()].reduce((n,m)=>n+m.receipts,0),baseIncome=g.state.time*5;
  assert.ok(Math.abs(received-baseIncome-mineReceipts)<.01,'income ledger reconciles');
  assert.ok(Math.abs(g.state.gold[0]-(mission.startingGold+received+kills-spend))<.01,'gold ledger reconciles');
  return {mission:mission.id,seed,route:routeName,completed:lastOutcome.completed,stars:lastOutcome.stars,time:round(g.state.time),label:lastOutcome.label,
    coreWin:g.state.winner===0,playerHP:round(g.state.bases[0].hp),enemyHP:round(g.state.bases[1].hp),minHP:round(minHP),income:currentIncome(g),
    firstBaseHit,baseRace:firstBaseHit.every(t=>t!==null),objectives:lastOutcome.objectives.map(o=>({id:o.id,type:o.type,met:o.met,value:round(o.value),target:o.target})),
    medals:lastOutcome.medals.map(m=>({id:m.id,earned:m.earned})),targets:[...targetHistory.values()],
    ledger:{spend:round(spend),gold:round(g.state.gold[0]),baseIncome:round(baseIncome),mineReceipts:round(mineReceipts),killBounty:kills},
    mines:[...mines.values()].map(m=>({...m,receipts:round(m.receipts)})),investments:investments.map(i=>({...i,receipts:round(i.receipts),net:round(i.receipts-i.cost)})),
    actions,snapshots};
}
const disclosure=missions.map(verifyDisclosure),results=[];
for(const mission of missions)for(const route of selected)for(const seed of seeds)results.push(simulate(mission,seed,route));
const summary=missions.flatMap(m=>selected.map(route=>{
  const runs=results.filter(r=>r.mission===m.id&&r.route===route),wins=runs.filter(r=>r.completed),range=key=>[Math.min(...runs.map(r=>r[key])),Math.max(...runs.map(r=>r[key]))];
  return {mission:m.id,route,runs:runs.length,clears:wins.length,threeStars:runs.filter(r=>r.stars===3).length,coreWins:runs.filter(r=>r.coreWin).length,
    winWithUnmetObjectives:wins.filter(r=>r.objectives.some(o=>!o.met)).length,winWithTargetsStanding:wins.filter(r=>r.targets.some(t=>t.kind==='destroy'&&t.lostAt===null)).length,
    baseRaces:runs.filter(r=>r.baseRace).length,seconds:range('time'),playerHP:range('playerHP'),income:range('income'),
    failures:runs.filter(r=>!r.completed).map(r=>({seed:r.seed,time:r.time,label:r.label,playerHP:r.playerHP,enemyHP:r.enemyHP,targets:r.targets}))};
}));
assert.equal(await digest('dist/engine.js'),hashes.engine);assert.equal(await digest('dist/campaign.js'),hashes.campaign,'Campaign changed during review.');
console.log(JSON.stringify({hashes,seeds,simulations:results.length,disclosure,summary,results},null,2));
