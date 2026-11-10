/** Reveal-only presentation. The campaign evaluator and engine own all outcomes. */
import {supportsColossus,COLOSSUS,ENCOUNTER} from './colossus.js';
export function lastEngineView(game){
 if(!supportsColossus(game?.ruleset)||game.state.colossus.phase==='armed')return null;
 const s=game.state,p=s.colossus,boss=s.units.find(u=>u.id===p.bossId&&u.hp>0),emerging=p.phase==='active'&&game.tick<p.triggeredAt+ENCOUNTER.emergeTicks;
 const mode=p.phase==='defeated'?'defeated':emerging?'emerging':boss.x>ENCOUNTER.siegeBoundary?'approach':'siege';
 const goal=s.winner==='draw'?'draw':s.bases[0].hp<=0?'lost':p.phase==='defeated'?(s.bases[1].hp<=0?'complete':'core'):s.bases[1].hp<=0?'boss':'both';
 const objective=goal==='draw'?'The Last Engine and both citadels fell. Draw.':goal==='lost'?'Your citadel fell. Mission failed.':goal==='complete'?'Enemy citadel and Last Engine destroyed. Your citadel survives. Mission complete.':goal==='core'?'Last Engine defeated. Destroy the enemy citadel; keep yours standing.':goal==='boss'?'Enemy citadel destroyed. Defeat the Last Engine; keep your citadel standing.':'Destroy the Last Engine AND enemy citadel; keep your citadel standing.';
 const threat=mode==='emerging'?'The Last Engine is emerging! A single blast cleared troops beside the enemy citadel; buildings and distant troops remain. It can already take damage.':mode==='approach'?'The Last Engine is charging across open ground. At midfield it slows to a siege march.':mode==='siege'?'The Last Engine is in siege march. Its broad body strikes nearby defenders and buildings across all three roads.':'The Last Engine has fallen.';
 const terminal=['complete','lost','draw'].includes(goal),hp=boss?.hp??0;
 const hudLabel=objective+(boss?` Engine ${Math.ceil(hp)}/${COLOSSUS.hp} HP · ${mode}`:'');
 const accessibleLabel=objective+(boss?` Last Engine health ${Math.ceil(hp)} of ${COLOSSUS.hp} HP. ${mode==='siege'?'Siege march':mode==='approach'?'Approaching midfield':'Emerging'}.`:'');
 const phaseMessage=mode==='emerging'?'The Last Engine is emerging and can take damage.':mode==='approach'?'The Last Engine is approaching midfield.':mode==='siege'?'The Last Engine is in siege march.':'The Last Engine is defeated.';
 const remaining=goal==='core'?'Destroy the enemy citadel; keep yours standing.':goal==='boss'?'Enemy citadel destroyed. Defeat the Engine; keep yours standing.':'Destroy it and the enemy citadel; keep yours standing.';
 return Object.freeze({name:'The Last Engine',mode,objective,hudLabel,accessibleLabel,announcementKey:mode+':'+goal,announcement:terminal?objective:phaseMessage+' '+remaining,description:terminal?objective:threat+' '+objective+' All three roads can attack its body. Volley can hit its body; rear production can replace losses. No extra deadline or forced citadel drain.',hp,maxHp:COLOSSUS.hp,focus:boss?Object.freeze({x:boss.x,y:boss.y}):null});
}
