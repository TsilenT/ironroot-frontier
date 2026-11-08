/** Reproducible ordinary-price routes; at most one command per five seconds. */
export const POLICY_IDS=Object.freeze(['north-first','crossings-first','infantry-routes','north-only','idle']);
const plans={
 'north-first':[['barracks',1250,0],['foundry',970,0],['sanctum',690,0],['archery',690,2],['barracks',1250,2]],
 'crossings-first':[['barracks',1250,2],['sanctum',970,2],['foundry',690,1],['archery',690,2],['barracks',1250,0],['foundry',970,0],['sanctum',690,0]],
 'infantry-routes':[['barracks',1250,0],['archery',970,0],['barracks',690,0],['barracks',1250,2],['archery',690,2],['sanctum',970,2]],
 'north-only':[['barracks',1250,0],['foundry',970,0],['sanctum',690,0]],
};
export function describePolicy(id){if(!POLICY_IDS.includes(id))throw new RangeError('Unknown policy');return {id,plan:plans[id]??[],opening:id==='north-first'?'Build and upgrade north for40 seconds before funding the second route.':'Fund listed positions in order, then upgrade.',decisionSeconds:5,maxCommandsPerDecision:1,information:'Visible ordinary state only; no seed/outcome lookahead, free grants or edits. Casts and salvage count as commands.'};}
export function createPolicy(id){describePolicy(id);let next=0;const report={commands:0,builds:0,upgrades:0,casts:0};return {report:()=>({...report}),step(g){const s=g.state;if(id==='idle'||s.time+1e-8<next||s.winner!==null)return;next=s.time+5;
 if(s.gold[0]>=150&&s.spellCooldown[0]<=0){const foes=s.units.filter(u=>u.side===1&&u.x<1100);let target=null,best=4;for(const u of foes){const count=foes.filter(v=>Math.hypot(v.x-u.x,v.y-u.y)<170).length;if(count>best){best=count;target=u;}}if(target){if(g.cast(target.x,target.y).ok){report.commands++;report.casts++;}return;}}
 for(const [index,[type,x,lane]] of plans[id].entries()){if(id==='north-first'&&index>=3&&s.time<40)break;if(s.buildings.some(b=>b.side===0&&b.hp>0&&b.x===x&&b.lane===lane))continue;if(g.build(type,x,g.map.lanes[lane]).ok){report.commands++;report.builds++;}return;}
 const priorities=['foundry','sanctum','barracks','archery','mint','watchtower'];const candidates=s.buildings.filter(b=>b.side===0&&b.hp>0&&b.level<3&&(!['north-only','north-first'].includes(id)||id==='north-first'&&s.time>=40||b.lane===0)).sort((a,b)=>a.level-b.level||priorities.indexOf(a.type)-priorities.indexOf(b.type)||a.lane-b.lane);if(candidates[0]&&g.upgrade(candidates[0].id).ok){report.commands++;report.upgrades++;}
 }};}
