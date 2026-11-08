/** One ordinary paid command per five simulated seconds. No outcome/seed lookahead. */
export const POLICY_IDS=Object.freeze(['keep-support','keep-mass','selective-salvage','greedy-mines','idle']);
const plans=Object.freeze({
 'keep-support':[['foundry',410,0],['foundry',410,2],['sanctum',690,1]],
 'keep-mass':[['barracks',410,0],['barracks',410,2],['archery',690,1]],
 'selective-salvage':[['barracks',1250,0],['barracks',1250,2],['foundry',410,0],['foundry',410,2],['sanctum',690,1]],
 'greedy-mines':[['barracks',1250,0],['barracks',1250,2],['mint',410,0],['mint',410,2],['archery',690,1]],
});
const descriptions={
 'keep-support':'Keep all inherited structures. Use the three empty rear plots for two siege foundries and central wizard support, then upgrade.',
 'keep-mass':'Keep all inherited structures. Add ordinary warriors and archers at the three rear plots, then upgrade. No siege, wizard, flyer, Rootwarden or citadel purchase.',
 'selective-salvage':'Salvage only the two outer towers, replacing them with forward barracks. Fill the rear plots with siege and wizard support, then upgrade.',
 'greedy-mines':'Salvage the outer towers for forward barracks, but use both outer rear plots for extra mines instead of combat support.',
 idle:'Make no commands after the inherited camp.'
};
export function describePolicy(id){if(!POLICY_IDS.includes(id))throw new RangeError('Unknown Borrowed Ground policy: '+id);return {id,description:descriptions[id],decisionSeconds:5,maxCommandsPerDecision:1,information:'Own state and visible fog-free battlefield only. No hidden forecasts, seed-dependent choices, free transactions or health edits.'};}
export function createPolicy(id){
 describePolicy(id);let nextDecision=0,initialized=false,salvage=[];const report={commands:0,salvaged:[],upgrades:0,rearBuilds:0,forwardBuilds:0};
 return {id,report:()=>structuredClone(report),step(g){
  const s=g.state;if(id==='idle'||s.winner!==null||s.time+1e-8<nextDecision)return;
  nextDecision=s.time+5;
  if(!initialized){initialized=true;if(['selective-salvage','greedy-mines'].includes(id))salvage=s.buildings.filter(b=>b.side===0&&b.type==='watchtower'&&b.lane!==1).map(b=>b.id);}
  // Selling is also one command, and no later replacement is automatically sold.
  while(salvage.length){const target=salvage.shift();if(!s.buildings.some(b=>b.id===target&&b.hp>0))continue;const r=g.sell(target);if(r.ok){report.commands++;report.salvaged.push({id:target,refund:r.refund,time:s.time});}return;}
  if(s.gold[0]>=150&&s.spellCooldown[0]<=0){const foes=s.units.filter(u=>u.side===1&&u.x<800);let target=null,best=3;for(const u of foes){const count=foes.filter(v=>Math.hypot(v.x-u.x,v.y-u.y)<170).length;if(count>best){target=u;best=count;}}if(target){if(g.cast(target.x,target.y).ok)report.commands++;return;}}
  for(const [type,x,lane]of plans[id]){if(s.buildings.some(b=>b.side===0&&b.x===x&&b.lane===lane&&b.hp>0))continue;const r=g.build(type,x,g.map.lanes[lane]);if(r.ok){report.commands++;if(x===1250)report.forwardBuilds++;else report.rearBuilds++;}return;}
  const order=['keep-mass','greedy-mines'].includes(id)?['barracks','archery','mint','watchtower']:['foundry','archery','barracks','sanctum','mint','watchtower'];
  const candidates=s.buildings.filter(b=>b.side===0&&b.level<3&&b.hp>0).sort((a,b)=>a.level-b.level||order.indexOf(a.type)-order.indexOf(b.type)||b.x-a.x||a.lane-b.lane);
  if(candidates[0]&&g.upgrade(candidates[0].id).ok){report.commands++;report.upgrades++;}
 }};
}
