import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const DIR='qa/citadel-options/',data=JSON.parse(readFileSync(DIR+'results.json')),rows=data.cases;
const kinds=['shot','regen','arrows','archery','hold'];
const outcome=c=>c.winner===null?'ongoing':c.winner==='draw'?'draw':c.winner===c.focal?'win':'loss';
const range=xs=>xs.length?[Math.min(...xs),Math.max(...xs)]:null;
const avg=xs=>xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:null;
const groups={};
for(const threat of ['all','swarm','siege','air']){groups[threat]={};for(const kind of kinds){
 const rs=rows.filter(c=>c.choice===kind&&(threat==='all'||c.threat===threat)),paid=rs.filter(c=>c.assigned.ok&&c.assigned.cost>0);
 groups[threat][kind]={assigned:rs.length,alive:rs.filter(c=>c.assigned.alive).length,timeEligible:rs.filter(c=>c.assigned.timeEligible).length,paid:paid.length,rejected:rs.filter(c=>!c.assigned.ok).map(c=>({id:c.id,...c.assigned})),outcomes:Object.fromEntries(['win','loss','ongoing','draw'].map(o=>[o,rs.filter(c=>outcome(c)===o).length])),timeRange:range(rs.map(c=>c.time)),terminalTimeRange:range(rs.filter(c=>!c.ongoing).map(c=>c.time)),healedRange:range(paid.map(c=>c.final.healed[c.focal])),meanHealed:avg(paid.map(c=>c.final.healed[c.focal])),noCitadelDamage:rs.filter(c=>c.firstDamage[c.focal]===null).length,noBaseShots:rs.filter(c=>c.baseShots[c.focal].primary===0).length,extraShotRange:range(rs.map(c=>c.baseShots[c.focal].extra)),incomingTotals:Object.fromEntries(['warrior','archer','siege','gryphon','wizard','rootwarden','unknown'].map(t=>[t,rs.reduce((a,c)=>a+(c.incoming[c.focal][t]??0),0)]))};
}}
const comparisons=[];
for(const c of rows.filter(c=>['shot','regen','arrows'].includes(c.choice))){
 const alternatives=rows.filter(x=>x.map===c.map&&x.threat===c.threat&&x.seed===c.seed&&x.focal===c.focal&&['archery','hold'].includes(x.choice));
 for(const a of alternatives){assert.equal(c.prehistoryHash,a.prehistoryHash);const maxTick=Math.min(c.final.tick,a.final.tick),tickList=[2400,3000,4200,7800,13800,18000,Math.floor(maxTick/100)*100];const common=[];
 for(const tick of [...new Set(tickList)].sort((a,b)=>a-b))if(tick>=1800&&tick<=maxTick){const x=c.trace.filter(s=>s.tick===tick).at(-1),y=a.trace.filter(s=>s.tick===tick).at(-1);if(x&&y)common.push({tick,time:tick*.05,upgrade:x,alternative:y});}
 comparisons.push({id:c.id,alternative:a.choice,threat:c.threat,choice:c.choice,paid:c.assigned.ok,outcome:outcome(c),alternativeOutcome:outcome(a),time:c.time,alternativeTime:a.time,bothTerminal:!c.ongoing&&!a.ongoing,terminalTimeDelta:!c.ongoing&&!a.ongoing?c.time-a.time:null,common});
 }}
const paired={};
for(const kind of ['shot','regen','arrows']){paired[kind]={};for(const alt of ['archery','hold']){
 const cs=comparisons.filter(c=>c.choice===kind&&c.alternative===alt);paired[kind][alt]={pairs:cs.length,paidPairs:cs.filter(c=>c.paid).length,changedOutcomes:cs.filter(c=>c.outcome!==c.alternativeOutcome).map(({common,...r})=>r),winInsteadOfLoss:cs.filter(c=>c.outcome==='win'&&c.alternativeOutcome==='loss').length,lossInsteadOfWin:cs.filter(c=>c.outcome==='loss'&&c.alternativeOutcome==='win').length,ongoingInsteadOfLoss:cs.filter(c=>c.outcome==='ongoing'&&c.alternativeOutcome==='loss').length,lossInsteadOfOngoing:cs.filter(c=>c.outcome==='loss'&&c.alternativeOutcome==='ongoing').length,bothLoss:cs.filter(c=>c.outcome==='loss'&&c.alternativeOutcome==='loss').length,bothLossDelayRange:range(cs.filter(c=>c.outcome==='loss'&&c.alternativeOutcome==='loss').map(c=>c.terminalTimeDelta)),bothWinTimeDeltaRange:range(cs.filter(c=>c.outcome==='win'&&c.alternativeOutcome==='win').map(c=>c.terminalTimeDelta))};
}}
const ongoing=rows.filter(c=>c.ongoing).map(c=>{const from=c.trace.find(t=>t.tick===12000),end=c.final;return {id:c.id,choice:c.choice,healed:c.final.healed[c.focal],hp:end.hp,window:from?{seconds:300,hpChange:end.hp.map((h,s)=>h-from.hp[s]),kills:end.kills.map((n,s)=>n-from.kills[s]),spawned:end.spawned.map((n,s)=>n-from.spawned[s]),healed:end.healed.map((n,s)=>n-from.healed[s]),damage:[0,1].map(s=>Object.values(end.incoming[s]).reduce((a,b)=>a+b,0)-Object.values(from.incoming[s]).reduce((a,b)=>a+b,0))}:null};});
const summary={sourceCommit:data.metadata.sourceCommit,totalGames:rows.length,sharedHistoryChoiceGroups:new Set(rows.map(c=>c.prehistoryHash)).size,groups,paired,ongoing,maxLedgerResidual:Math.max(...rows.flatMap(c=>c.ledgers.map(l=>l.maxResidual))),unknownIncoming:rows.reduce((n,c)=>n+c.incoming.reduce((n,d)=>n+(d.unknown??0),0),0)};
writeFileSync(DIR+'summary.json',JSON.stringify(summary,null,2)+'\n');
writeFileSync(DIR+'comparisons.json','[\n'+comparisons.map(c=>JSON.stringify(c)).join(',\n')+'\n]\n');
const cols=['id','paid','cost','gold_at_decision','hp_at_decision','outcome','seconds','first_damage','regen_restored','base_primary_shots','extra_shots','base_damage','base_kills','total_kills','focal_producers_final','focal_spawns','incoming_warrior','incoming_archer','incoming_siege','incoming_gryphon'];
const records=rows.map(c=>{const s=c.focal,b=c.baseShots[s];return [c.id,c.assigned.ok,c.assigned.cost,c.assigned.goldBefore,c.assigned.hpBefore,outcome(c),c.time,c.firstDamage[s]??'',c.final.healed[s],b.primary,b.extra,b.damage,b.kills,c.final.kills[s],c.final.sides[s].producers.length,c.spawned[s],...['warrior','archer','siege','gryphon'].map(t=>c.incoming[s][t]??0)];});
writeFileSync(DIR+'cases.csv',[cols,...records].map(a=>a.join(',')).join('\n')+'\n');
console.log(JSON.stringify({totalGames:summary.totalGames,sharedHistoryChoiceGroups:summary.sharedHistoryChoiceGroups,groups:summary.groups.all,paired:summary.paired,ongoing:summary.ongoing,maxLedgerResidual:summary.maxLedgerResidual,unknownIncoming:summary.unknownIncoming},null,2));
