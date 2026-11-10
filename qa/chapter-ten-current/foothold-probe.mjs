/** Single fixed-seed ordinary paid route; outputs observations to stdout only. */
import {pathToFileURL} from 'node:url';
import {FOOTHOLD,createFoothold,advanceFoothold,evaluateFoothold,footholdTargets,serializeFoothold,restoreFoothold} from './foothold.mjs';
export function runFootholdProbe({policy='outer-screen'}={}){
 if(!['outer-screen','adaptive'].includes(policy))throw Error('Unknown foothold probe policy');
 const e=createFoothold({seed:101}),g=e.game,s=g.state;
 const r={scenario:{id:FOOTHOLD.id,revision:FOOTHOLD.revision,parentRuleset:g.ruleset.id},seed:101,policy:policy==='adaptive'?'Native Hard side-0 adaptive purchases every 5 seconds. Up to three normal paid purchase attempts plus ordinary citadel/Volley choices; no one-command cap or human-speed claim.':'Outer-road infantry/ranged, middle coverage, then screened outer siege. One successful paid command per two seconds, including defensive Volley.',
  startingGold:[...s.gold],startingHP:s.bases.map(b=>b.hp),startingIncome:[...s.income],startingInvestment:[0,1].map(side=>s.buildings.filter(b=>b.side===side).reduce((n,b)=>n+b.invested,0)),
  spending:[0,0],grossIncome:[0,0],actions:[],losses:[],firstContact:null,firstCoreDamage:[null,null],minimumPlayerHP:s.bases[0].hp};
 for(const method of ['build','upgrade','cast','buyCitadelOption']){
  const original=g[method];g[method]=function(...args){
   const side=method==='build'?(args[3]??0):method==='cast'?(args[2]??0):(args[1]??0),before=s.gold[side],kills=s.stats.kills[side];
   const result=original.apply(this,args);if(result.ok){const cost=before-s.gold[side]+2*(s.stats.kills[side]-kills);r.spending[side]+=cost;r.actions.push({seconds:s.time,side,method,type:result.building?.type??(method==='cast'?'volley':args[0]),cost});}return result;
  };
 }
 const damage=g._damage;g._damage=function(target,amount,side){const before=target.hp;damage.call(this,target,amount,side);
  if(target.hp<before){if(r.firstContact===null)r.firstContact=s.time;if(target.type==='base'&&r.firstCoreDamage[target.side]===null)r.firstCoreDamage[target.side]=s.time;
   if(target.hp<=0&&Object.hasOwn(g.buildings,target.type))r.losses.push({seconds:s.time,side:target.side,type:target.type,id:target.id,invested:target.invested,lane:target.lane});
  }
 };
 const plan=[['barracks',1250,0],['barracks',1250,2],['archery',1110,0],['archery',1110,2],['barracks',1250,1],['archery',1110,1],['foundry',970,0],['foundry',970,2],['mint',270,0],['mint',270,2],['sanctum',550,0],['sanctum',550,2]];
 let next=0;
 while(!evaluateFoothold(e).completed&&!evaluateFoothold(e).failed){
  if(s.time+1e-8>=next&&policy==='adaptive'){next+=5;g._ai(0);}
  else if(s.time+1e-8>=next){next+=2;let acted=false;
   if(s.spellCooldown[0]<=0&&s.gold[0]>=150){const threats=s.units.filter(u=>u.side===1&&u.hp>0&&u.x<900);const target=threats.find(u=>threats.filter(v=>Math.hypot(v.x-u.x,v.y-u.y)<g.ruleset.spell.radius).length>=4);if(target)acted=g.cast(target.x,target.y).ok;}
   if(!acted){const item=plan.find(([,x,lane])=>!s.buildings.some(b=>b.side===0&&b.hp>0&&Math.hypot(b.x-x,b.y-g.map.lanes[lane])<108));
    if(item)g.build(item[0],item[1],g.map.lanes[item[2]]);
    else {const target=s.buildings.filter(b=>b.side===0&&b.level<3).sort((a,b)=>a.level-b.level||a.id-b.id)[0];if(target)g.upgrade(target.id);}
   }
  }
  for(const side of [0,1])r.grossIncome[side]+=.05*(5+s.buildings.filter(b=>b.side===side&&b.type==='mint'&&b.hp>0).reduce((n,b)=>n+2.5*(1+.5*(b.level-1)),0));
  advanceFoothold(e,.05);r.minimumPlayerHP=Math.min(r.minimumPlayerHP,s.bases[0].hp);
 }
 Object.assign(r,{outcome:evaluateFoothold(e),seconds:s.time,finalHP:s.bases.map(b=>b.hp),finalGold:[...s.gold],posts:footholdTargets(e).map(t=>({name:t.name,destroyed:!t.building,remainingHP:t.building?.hp??0})),kills:[...s.stats.kills]});
 r.ledgerError=[0,1].map(side=>r.startingGold[side]+r.grossIncome[side]+2*s.stats.kills[side]-r.spending[side]-s.gold[side]);
 const restored=restoreFoothold(serializeFoothold(e));r.restoreExact=JSON.stringify(restored.game.serialize())===JSON.stringify(g.serialize());
 const round=(_,v)=>typeof v==='number'?Math.round(v*1e5)/1e5:v;
 return JSON.parse(JSON.stringify(r,round));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(JSON.stringify(runFootholdProbe({policy:process.argv[2]??'outer-screen'}),null,2));
