/** Paid synthetic routes: decisions read only the detached player observation. */
import { observe } from '../../dist/fog.js';
const b=(type,x,lane)=>({type,x,lane});
export const POLICY_IDS=Object.freeze(['scout-commit','forceful-middle','broad-pressure','idle']);
const descriptions={
  'scout-commit':'Buy warrior/archer probes on both outer roads, then commit screened siege to the less crowded observed road and subsequently the other. Invest in income after initial probes.',
  'forceful-middle':'Commit opening gold to central warriors, double siege and wizard support without waiting for enemy intelligence; contain side roads with ordinary archers.',
  'broad-pressure':'Spread inexpensive warrior/archer production across all roads, then buy income and ordinary upgrades. No siege, wizards, flyers or citadel purchase.',
  idle:'No commands after the authored starting camp.'
};
export function describePolicy(id){if(!POLICY_IDS.includes(id))throw new RangeError(`Unknown policy: ${id}`);return {id,description:descriptions[id],decisionSeconds:1,information:'Own state and currently visible enemy contacts only. No raw hidden state, outcome, forecast, seed access or free transactions.'};}
export function createPolicy(id){
  describePolicy(id);let nextDecision=0,commitLane=null,commitTime=null,commitIntel=null;
  return {id,report:()=>({commitLane,commitTime,commitIntel}),step(game){
    const view=observe(game,0),s=view.state;
    if(id==='idle'||s.winner!==null||s.time+1e-8<nextDecision)return;
    nextDecision=s.time+1;
    // Defensive Volley uses only visible contacts and an ordinary 75-gold payment.
    if(s.gold[0]>=150&&s.spellCooldown[0]<=0){
      const threats=s.units.filter(u=>u.side===1&&u.x<750);let target=null,best=3;
      for(const u of threats){const count=threats.filter(v=>Math.hypot(u.x-v.x,u.y-v.y)<game.ruleset.spell.radius).length;if(count>best){best=count;target=u;}}
      if(target)game.cast(target.x,target.y,0);
    }
    let plan,upgrade;
    if(id==='scout-commit'){
      if(commitLane===null){
        const contacts=s.units.filter(u=>u.side===1&&[0,2].includes(u.lane));
        const structures=s.buildings.filter(v=>v.side===1&&[0,2].includes(v.lane));
        if(contacts.length||structures.length){
          const score=lane=>contacts.filter(u=>u.lane===lane).length+structures.filter(v=>v.lane===lane).length;
          commitLane=score(0)<=score(2)?0:2;commitTime=s.time;commitIntel={visibleUnits:contacts.length,visibleStructures:structures.length};
        }
      }
      plan=[b('barracks',1250,0),b('barracks',1250,2),b('archery',1110,0),b('archery',1110,2),b('mint',270,0)];
      if(commitLane!==null){const other=2-commitLane;plan.push(b('foundry',970,commitLane),b('sanctum',690,commitLane),b('foundry',970,other),b('mint',270,2),b('sanctum',690,other),b('foundry',830,1),b('barracks',1250,1),b('archery',550,0),b('archery',550,2));}
      upgrade=['foundry','archery','barracks','sanctum','mint'];
    }else if(id==='forceful-middle'){
      plan=[b('barracks',1250,1),b('foundry',830,1),b('foundry',690,1),b('sanctum',550,1),b('archery',1110,0),b('archery',1110,2),b('mint',270,0),b('mint',270,2),b('barracks',1250,0),b('barracks',1250,2),b('sanctum',970,0),b('sanctum',970,2),b('archery',690,0),b('archery',690,2)];
      upgrade=['foundry','barracks','archery','sanctum','mint'];
    }else{
      plan=[...[0,1,2].map(l=>b('barracks',1250,l)),b('archery',1110,0),b('archery',1110,2),b('mint',270,0),b('mint',270,2),b('barracks',970,0),b('barracks',970,2),b('barracks',830,1),...[0,1,2].map(l=>b('archery',690,l)),...[0,1,2].map(l=>b('barracks',550,l))];
      upgrade=['barracks','archery','mint'];
    }
    const own=()=>observe(game,0).state.buildings.filter(v=>v.side===0);
    for(const item of plan){
      if(own().some(v=>Math.hypot(v.x-item.x,v.y-game.map.lanes[item.lane])<108))continue;
      if(!game.build(item.type,item.x,game.map.lanes[item.lane],0).ok)return;
    }
    if(id==='scout-commit'&&commitLane===null)return;
    const candidates=own().filter(v=>v.level<3&&upgrade.includes(v.type)).sort((a,b)=>a.level-b.level||upgrade.indexOf(a.type)-upgrade.indexOf(b.type)||b.x-a.x||a.lane-b.lane);
    if(candidates[0])game.upgrade(candidates[0].id,0);
  }};
}
