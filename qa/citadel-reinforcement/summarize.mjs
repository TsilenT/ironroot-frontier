import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const dir='qa/citadel-reinforcement/';
const data=JSON.parse(readFileSync(dir+'results.json')),rows=data.cases;
const mean=xs=>xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:null;
const median=xs=>xs.length?[...xs].sort((a,b)=>a-b)[Math.floor(xs.length/2)]:null;
const range=xs=>xs.length?[Math.min(...xs),Math.max(...xs)]:null;
const outcome=c=>c.winner===null?'ongoing':c.winner==='draw'?'draw':c.winner===c.focal?'win':'loss';
const groups={};
for(const group of ['primary','interaction']){
  groups[group]={};
  for(const choice of ['reinforce','archery','mint']){
    const cs=rows.filter(c=>c.group===group&&c.choice===choice),paid=cs.filter(c=>c.assigned.ok);
    groups[group][choice]={assigned:cs.length,aliveAtDecision:cs.filter(c=>c.assigned.alive).length,timeEligible:cs.filter(c=>c.assigned.timeEligible).length,affordable:cs.filter(c=>c.assigned.availableGold>=(choice==='archery'?175:190)).length,purchases:paid.length,rejections:cs.filter(c=>!c.assigned.ok).map(c=>({id:c.id,...c.assigned})),outcomes:Object.fromEntries(['win','loss','draw','ongoing'].map(o=>[o,cs.filter(c=>outcome(c)===o).length])),timeRange:range(cs.map(c=>c.time)),medianTime:median(cs.map(c=>c.time)),medianFirstDamage:median(cs.map(c=>c.firstDamage[c.focal]).filter(x=>x!==null)),purchasedOutcomes:Object.fromEntries(['win','loss','draw','ongoing'].map(o=>[o,paid.filter(c=>outcome(c)===o).length]))};
  }
}
const pairs=[];
for(const r of rows.filter(c=>c.choice==='reinforce')){
  const matches=rows.filter(c=>c.group===r.group&&c.map===r.map&&c.seed===r.seed&&c.matchup===r.matchup&&c.focal===r.focal);
  assert.equal(matches.length,3);assert.ok(matches.every(c=>c.prehistoryHash===r.prehistoryHash));
  const p={id:r.id.replace('/reinforce',''),group:r.group,reinforceOutcome:outcome(r),purchased:r.assigned.ok,repair:r.purchases[r.focal]?.repair??0,consumed:r.purchases[r.focal]?.consumed??0,backToPreHP:r.purchases[r.focal]?.backToPreHP??null,comparisons:[]};
  for(const c of matches.filter(c=>c.choice!=='reinforce')){
    const checkpoints=[];
    for(const label of ['decision-before','decision-plus-30','decision-plus-60','decision-plus-120']){
      const a=r.checkpoints.find(x=>x.label===label),b=c.checkpoints.find(x=>x.label===label);
      if(a&&b){assert.equal(a.tick,b.tick);checkpoints.push({label,time:a.time,reinforcement:{hp:a.hp,bridge:a.bridge,gold:a.gold,spawned:a.spawned,producerCounts:a.sides.map(s=>s.producers.length)},alternative:{hp:b.hp,bridge:b.bridge,gold:b.gold,spawned:b.spawned,producerCounts:b.sides.map(s=>s.producers.length)}});}
    }
    p.comparisons.push({choice:c.choice,outcome:outcome(c),timeDelta:r.time-c.time,reinforcementTerminalTime:r.time,alternativeTerminalTime:c.time,reinforcementFinalProducers:r.final.sides[r.focal].producers.length,alternativeFinalProducers:c.final.sides[c.focal].producers.length,reinforcementFinalSpawns:r.spawned[r.focal],alternativeFinalSpawns:c.spawned[c.focal],checkpoints});
  }
  pairs.push(p);
}
for(const group of ['primary','interaction']){
  const ps=pairs.filter(p=>p.group===group);
  groups[group].paired={cases:ps.length,purchased:ps.filter(p=>p.purchased).length,repairPositive:ps.filter(p=>p.purchased&&p.repair>0).length,full600Consumed:ps.filter(p=>p.purchased&&p.consumed>=599.999).length,unused600:ps.filter(p=>p.purchased&&p.consumed===0).length,purchasedConsumedRange:range(ps.filter(p=>p.purchased).map(p=>p.consumed)),compared:Object.fromEntries(['archery','mint'].map(choice=>{
    const cs=ps.map(p=>({r:p.reinforceOutcome,purchased:p.purchased,...p.comparisons.find(c=>c.choice===choice)}));
    return [choice,{changedOutcomes:cs.filter(c=>c.r!==c.outcome).length,reinforcementWinAlternativeLoss:cs.filter(c=>c.r==='win'&&c.outcome==='loss').length,reinforcementLossAlternativeWin:cs.filter(c=>c.r==='loss'&&c.outcome==='win').length,paidBothLoss:cs.filter(c=>c.purchased&&c.r==='loss'&&c.outcome==='loss').length,paidBothLossTimeDeltaRange:range(cs.filter(c=>c.purchased&&c.r==='loss'&&c.outcome==='loss').map(c=>c.timeDelta)),bothLoss:cs.filter(c=>c.r==='loss'&&c.outcome==='loss').length,bothLossTimeDeltas:cs.filter(c=>c.r==='loss'&&c.outcome==='loss').map(c=>c.timeDelta),timeDeltaRange:range(cs.map(c=>c.timeDelta)),medianTimeDelta:median(cs.map(c=>c.timeDelta))}];
  }))};
}
const symmetric=rows.filter(c=>c.group==='symmetric').map(c=>({id:c.id,map:c.map,seed:c.seed,policy:c.policy,winner:c.winner,time:c.time,ongoing:c.ongoing,purchases:c.purchases,reinforceAttempts:c.actions.filter(a=>a.method==='reinforce')}));
const summary={sourceCommit:data.sourceCommit,groups,symmetric,ledgerMaxResidual:Math.max(...rows.flatMap(c=>c.ledgers.map(l=>l.maxResidual))),paidBranchAttempts:rows.filter(c=>c.assigned?.ok).length,totalGames:rows.length};
writeFileSync(dir+'summary.json',JSON.stringify(summary,null,2)+'\n');
writeFileSync(dir+'paired-comparisons.json',JSON.stringify(pairs,null,2)+'\n');
const columns=['id','assigned_ok','decision_gold','repair','consumed','first_damage','time','winner','focal_outcome','producers0','producers1','spawns0','spawns1','bridge0','bridge1','ledger_error0','ledger_error1'];
const table=rows.map(c=>[c.id,c.assigned?.ok??'',c.assigned?.availableGold??'',c.purchases[c.focal]?.repair??'',c.purchases[c.focal]?.consumed??'',c.firstDamage[c.focal]??'',c.time,c.winner??'ongoing',c.focal===undefined?'n/a':outcome(c),...c.final.sides.map(s=>s.producers.length),...c.spawned,...c.ledgers.map(l=>l.bridge),...c.ledgers.map(l=>l.maxResidual)]);
writeFileSync(dir+'cases.csv',[columns,...table].map(a=>a.join(',')).join('\n')+'\n');
console.log(JSON.stringify(summary,null,2));
