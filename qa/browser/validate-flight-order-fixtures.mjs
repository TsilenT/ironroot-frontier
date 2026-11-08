import assert from 'node:assert/strict';
import {Game} from '../../dist/engine.js';
import {encodeBattle,decodeBattle} from '../../dist/battle-codec.js';
import {createBackup,parseBackup,BACKUP_STORAGE_KEYS as K} from '../../dist/backup.js';
import {CURRENT_PROFILE_PROTOCOL_VERSION} from '../../dist/profile-session.js';
import {flightFixture,flightCampaignFixture,staggeredFlightFixture,FLIGHT_RULES,HISTORICAL_FLIGHTLESS_RULES,AIR_PHASES} from './flight-order-fixtures.mjs';
// Current writer fence is additive; these fixtures still retain their historical battle identities.
assert.equal(CURRENT_PROFILE_PROTOCOL_VERSION,18);
let fixtures=0,continuations=0;
for(const rulesetId of FLIGHT_RULES)for(const mapId of ['classic','twin-span','long-march'])for(const side of [0,1])for(const phase of AIR_PHASES){
 const f=flightFixture({rulesetId,mapId,side,phase,home:1250});
 const a=Game.restore(f.envelope.game),b=decodeBattle(f.envelope).game;
 assert.equal(a.state.units.find(u=>u.id===f.unitId).airRoute.phase,phase);
 const bytes=JSON.stringify(f.envelope),backup=createBackup({getItem:key=>key===K.battle?bytes:null});
 assert.deepEqual(parseBackup(backup).data.battle,f.envelope);
 for(let i=0;i<80;i++){a.update(.05);b.update(.05);assert.deepEqual(a.serialize(),b.serialize());continuations++;}
 assert.doesNotThrow(()=>decodeBattle(encodeBattle(a)));fixtures++;
}
for(const rulesetId of [...FLIGHT_RULES,...HISTORICAL_FLIGHTLESS_RULES]){
 const f=flightFixture({rulesetId}),g=Game.restore(f.envelope.game),a=g.state.buildings.find(b=>b.id===f.aerieId);
 assert.equal(Object.hasOwn(a,'flightPlan'),FLIGHT_RULES.includes(rulesetId));fixtures++;
}
for(const revision of [1,2,3]){
 const f=flightCampaignFixture(revision);assert.equal(f.envelope.scenario?.revision??1,revision);
 assert.deepEqual(decodeBattle(f.envelope,{campaignProgress:f.progress}).game.serialize(),f.envelope.game);fixtures++;
}
{
 const f=staggeredFlightFixture(),a=decodeBattle(f.envelope).game,b=Game.restore(f.envelope.game);
 assert.equal(a.state.buildings.filter(b=>b.side===0&&b.type==='aerie').length,2);
 for(let i=0;i<80;i++){a.update(.05);b.update(.05);assert.deepEqual(a.serialize(),b.serialize());continuations++;}
 fixtures++;
}
console.log(`Validated ${fixtures} authored flight UI checkpoints, ${continuations} exact continuation comparisons, backup admission, historical revisions under profile protocol ${CURRENT_PROFILE_PROTOCOL_VERSION}.`);
