/** Reveal-only presentation. The campaign evaluator and engine own all outcomes. */
import {supportsColossus,COLOSSUS,ENCOUNTER} from './colossus.js';
export function lastEngineView(game){
 if(!supportsColossus(game?.ruleset)||game.state.colossus.phase==='armed')return null;
 const s=game.state,p=s.colossus,boss=s.units.find(u=>u.id===p.bossId&&u.hp>0),emerging=p.phase==='active'&&game.tick<p.triggeredAt+ENCOUNTER.emergeTicks;
 const mode=p.phase==='defeated'?'defeated':emerging?'emerging':boss.x>ENCOUNTER.siegeBoundary?'approach':'siege';
 const objective=p.phase==='defeated'?'Last Engine defeated. Destroy the enemy citadel; keep yours standing.':s.bases[1].hp<=0?'Enemy citadel destroyed. Defeat the Last Engine; keep your citadel standing.':'Destroy the Last Engine AND enemy citadel; keep your citadel standing.';
 const threat=mode==='emerging'?'The Last Engine is emerging! A single blast cleared troops beside the enemy citadel; buildings and distant troops remain. It can already take damage.':mode==='approach'?'The Last Engine is charging across open ground. At midfield it slows to a siege march.':mode==='siege'?'The Last Engine is in siege march. Its broad body strikes nearby defenders and buildings across all three roads.':'The Last Engine has fallen.';
 return Object.freeze({name:'The Last Engine',mode,objective,description:threat+' '+objective+' All three roads can attack its body. Volley can hit its body; rear production can replace losses. No extra deadline or forced citadel drain.',hp:boss?.hp??0,maxHp:COLOSSUS.hp,focus:boss?Object.freeze({x:boss.x,y:boss.y}):null});
}
