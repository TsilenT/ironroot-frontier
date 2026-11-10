/** Source regression only: isolated synthetic units, not a natural Road attempt. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,getRuleset,supportsAutonomousAir} from '../dist/engine.js';
import {LEAVE_ROADS_RULESET_ID} from '../dist/rulesets.js';
import {createCampaignMission,createProgressionCampaignMission,createCampaignProgress,CAMPAIGN_PROGRESS_MISSIONS,campaignScenarioForGame} from '../dist/campaign.js';
import {encodeBattle,decodeBattle} from '../dist/battle-codec.js';
const ID='leave-no-road-closed';
const progress=()=>({...createCampaignProgress(),missions:Object.fromEntries(CAMPAIGN_PROGRESS_MISSIONS.filter(m=>m.id!=='three-minutes-more'&&m.id!==ID).map(m=>[m.id,{completed:true,stars:1,bestTime:60}]))});
function registered(game){
 assert.equal(game.ruleset,getRuleset(LEAVE_ROADS_RULESET_ID));
 assert.equal(supportsAutonomousAir(game.ruleset),true);
}
test('actual Road factories bind the registered autonomous-air object, not an equal descriptor clone',()=>{
 for(const game of [createCampaignMission(ID),createProgressionCampaignMission(ID,progress())]){
  registered(game);
  const clone={...game.ruleset};assert.deepEqual(clone,game.ruleset);
  assert.equal(supportsAutonomousAir(clone),false);
 }
});
function syntheticChase(){
 const game=createProgressionCampaignMission(ID,progress());registered(game);
 // Isolate this interaction from the authored army. No change to production
 // source, rules, seed, purse or objective; delay AI only inside this fixture.
 game.state.buildings=[];game.state.units=[];game.state.effects=[];
 game.state.income=[5,5];game.aiTimer=30;
 // Native spawn initializes real unit fields. Placement is explicitly synthetic.
 game._spawn({type:'aerie',side:0,lane:0,x:1452,level:1});
 const flyer=game.state.units.at(-1);flyer.y=game.map.lanes[0];
 game._spawn({type:'wardenLodge',side:1,lane:1,x:1628,level:1});
 const target=game.state.units.at(-1);target.y=game.map.lanes[1];
 assert.equal(flyer.airTargetId,null);
 const targetHP=target.hp;
 game.update(.05);
 // This exercises the identity gate inside _step, not descriptor equality alone.
 assert.equal(flyer.airTargetId,target.id);assert.ok(flyer.y>game.map.lanes[0]);
 assert.equal(target.hp,targetHP,'perception must not deal remote damage');
 game.update(.017);assert.ok(game.accumulator>0);
 return {game,flyerId:flyer.id,targetId:target.id,targetHP};
}
for(const codec of ['engine','battle'])test(`synthetic registered Road flyer chase survives ${codec} restore and physical combat`,()=>{
 const {game,flyerId,targetId,targetHP}=syntheticChase(),snapshot=game.serialize();
 const restored=codec==='engine'?Game.restore(snapshot):decodeBattle(encodeBattle(game,campaignScenarioForGame(game,ID),{campaignProgress:progress()}),{campaignProgress:progress()}).game;
 registered(restored);assert.deepEqual(restored.serialize(),snapshot);
 assert.equal(restored.state.units.find(u=>u.id===flyerId).airTargetId,targetId);
 for(let tick=0;tick<80;tick++){
  game.update(.05);restored.update(.05);assert.deepEqual(restored.serialize(),game.serialize());
 }
 const flyer=restored.state.units.find(u=>u.id===flyerId),target=restored.state.units.find(u=>u.id===targetId);
 assert.equal(flyer.airTargetId,targetId);assert.ok(flyer.y>restored.map.lanes[0]+30);
 assert.ok(target.hp<targetHP,'ordinary bounded chase reaches physical attack range');
 assert.equal(flyer.hp,flyer.maxHp,'ground-only target cannot damage air');
 assert.deepEqual(restored.state.bases.map(b=>b.hp),[6000,6000]);
 assert.ok(restored.state.time<5,'synthetic interaction is bounded, not a mission route');
});
