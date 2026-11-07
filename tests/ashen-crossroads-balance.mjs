// Compact reproducible balance evidence; not a human-difficulty rating.
import {ROUTES,playRoads,assertRoute} from './ashen-crossroads-policies.mjs';
const rows=[];
for(const [route,{plan,lanes}] of Object.entries(ROUTES))for(const seed of [719,57,999])for(const cadence of [3,6])for(const delay of [0,6]){
  const result=playRoads({plan,seed,cadence,delay});assertRoute(result,lanes);
  const {time,targets,citadels,spent,gold}=result.summary;
  rows.push({route,seed,cadence,delay,time,standing:targets.find(t=>t.hp>0).hp,playerHp:citadels[0],enemyHp:citadels[1],spent,gold});
}
const range=values=>[Math.min(...values),Math.max(...values)];
const summary=Object.fromEntries(Object.keys(ROUTES).map(route=>{const runs=rows.filter(r=>r.route===route);return [route,{runs:runs.length,time:range(runs.map(r=>r.time)),spent:range(runs.map(r=>r.spent)),gold:range(runs.map(r=>r.gold)),standingHp:range(runs.map(r=>r.standing)),playerHp:range(runs.map(r=>r.playerHp)),enemyHp:range(runs.map(r=>r.enemyHp))}];}));
console.log(JSON.stringify({scope:'Legal paid simulation, chosen pair destroyed, third target and both citadels alive; not evidence of human difficulty',seeds:[719,57,999],cadences:[3,6],openingDelays:[0,6],summary,rows},null,2));
