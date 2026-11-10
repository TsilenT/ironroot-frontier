/** Pure read-only own-economy and objective labels. Never expose enemy treasury. */
import {campaignControlStatus,bridgeSummary} from '../../dist/bridge-control.js';
import {actualIncome} from '../salt-stores/economy.mjs';
export function buildingPresentation(game,b){
 if(!b||b.side!==0||b.hp<=0)return 'No owned building selected.';
 const income=b.type==='mint'?game.buildings.mint.income*(1+.5*(b.level-1)):0;
 return game.buildings[b.type].name+' · L'+b.level+' · '+Math.ceil(b.hp)+'/'+Math.ceil(b.maxHp)+' HP · Income '+income.toFixed(1)+'/sec · Upgrade '+(b.level<3?game.upgradeCost(b):'max')+' · Ordinary salvage '+Math.floor(b.invested*.5*b.hp/b.maxHp)+' gold';
}
export function nativePresentation(session){
 const g=session.game,s=g.state,c=campaignControlStatus(g);
 const time=Math.floor(s.time/60)+':'+String(Math.floor(s.time%60)).padStart(2,'0');
 const state=session.outcome.completed?'QA win: '+session.outcome.reason+'.':session.outcome.failed?'QA ended: '+session.outcome.reason+'.':session.paused?'Paused.':'Running; ordinary paid adaptive enemy.';
 return {status:'Seed '+session.seed+' · '+time+' / 10:00 · Your gold '+Math.floor(s.gold[0])+' · Income '+actualIncome(g,0).toFixed(1)+'/sec · Citadels '+Math.ceil(s.bases[0].hp)+' / '+Math.ceil(s.bases[1].hp)+' · '+state,
 goal:'Clear bridges '+c.count+' / '+c.required+' · Cumulative '+c.seconds.toFixed(1)+' / '+c.target+' sec · '+(c.complete?'Control goal met.':session.paused?'Paused.':c.advancing?'Earning road time.':'Road clock paused, earned time retained.')+' Alternative: enemy core. Normal escalation at 5:00.',
 roads:bridgeSummary(g)};
}
