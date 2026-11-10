/** Production identity/mechanics slice; synthetic states, no rendered review. */
import test from 'node:test';import assert from 'node:assert/strict';
import {Game,getRuleset,supportsAutonomousAir} from '../dist/engine.js';
import {FINAL_CHAPTER_RULESETS,FINAL_CHAPTER_MAPS} from '../dist/final-chapter-identities.js';
import {supportsColossus,COLOSSUS,ENCOUNTER} from '../dist/colossus.js';
import {supportsFog,observe} from '../dist/fog.js';
const ID=FINAL_CHAPTER_RULESETS['the-last-engine'];
function blank(){const g=new Game({rulesetId:ID,difficulty:'hard',ai:false});g.state.buildings=[];g.state.effects=[];return g;}
test('five exact registered mechanic identities keep ordinary roster and owned maps; QA identities are not production',()=>{
 for(const id of Object.values(FINAL_CHAPTER_RULESETS)){const rules=getRuleset(id),g=new Game({rulesetId:id,mapId:FINAL_CHAPTER_MAPS[id]});assert.equal(g.ruleset,rules);assert.equal(supportsAutonomousAir(rules),true);assert.equal(Object.keys(rules.buildings).length,8);assert.equal(rules.qaOnly,undefined);for(const mapId of ['classic','long-march','twin-span'].filter(x=>x!==g.map.id))assert.throws(()=>new Game({rulesetId:id,mapId}));}
 for(const id of ['frontier-qa-colossus-aftermath','frontier-qa-colossus-core-race','frontier-qa-ch10-crossing'])assert.throws(()=>getRuleset(id));
 assert.equal(supportsColossus({...getRuleset(ID)}),false);assert.equal(COLOSSUS.hp,10000);assert.deepEqual(ENCOUNTER,{triggerHp:600,emergeTicks:60,pulseRadius:310,coreDamage:1200,approachSpeed:78,siegeBoundary:1600});
});
test('lethal core trigger remains running, permits living-side paid commands and preserves exact emergence/march restore',()=>{
 const g=blank();assert.deepEqual(Game.restore(g.serialize()).serialize(),g.serialize());g.state.bases[1].hp=0;g.update(.05);assert.equal(g.state.colossus.phase,'active');assert.equal(g.state.winner,null);assert.equal(g.state.units[0].hp,10000);assert.equal(g.canBuyCitadelOption('regen',1).ok,false);assert.equal(g.buyCitadelOption('regen',0).ok,true);assert.equal(g.build('barracks',830,g.map.lanes[1],0).ok,true);
 for(let i=0;i<64;i++){const r=Game.restore(g.serialize());g.update(.05);r.update(.05);assert.deepEqual(r.serialize(),g.serialize());}assert.ok(g.state.units.find(u=>u.type==='colossus').x<g.map.width-280);assert.equal(g.state.bases[1].hp,0);assert.equal(g.state.winner,null);
 const boss=g.state.units.find(u=>u.type==='colossus');g._damage(boss,boss.hp,0);g.update(.05);assert.equal(g.state.colossus.phase,'defeated');assert.equal(g.state.winner,0);assert.deepEqual(Game.restore(g.serialize()).serialize(),g.serialize());
});
test('production fog and Twin Span cumulative control retain their exact state contracts',()=>{
 const fog=new Game({rulesetId:FINAL_CHAPTER_RULESETS['no-fires-tonight']});assert.equal(supportsFog(fog.ruleset),true);assert.equal(observe(fog,0).state.buildings.filter(b=>b.side===1).length,0);assert.deepEqual(Game.restore(fog.serialize()).serialize(),fog.serialize());
 const crossing=new Game({rulesetId:FINAL_CHAPTER_RULESETS['carry-the-crossing'],mapId:'twin-span'});assert.equal(crossing.state.campaignControl.bridges.length,2);assert.equal(crossing.ruleset.campaignControl.timeLimit,600);assert.equal(crossing.state.bridgeControl,undefined);assert.deepEqual(Game.restore(crossing.serialize()).serialize(),crossing.serialize());assert.throws(()=>new Game({rulesetId:'frontier-campaign-leave-roads',mapId:'twin-span'}));
});
