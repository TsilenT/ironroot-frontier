import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {Game,MAPS} from '../dist/engine.js';
import {RULESETS,getRuleset,RIVER_BETWEEN_RULESET_ID,SHARED_CROSSING_RULESET_ID} from '../dist/rulesets.js';
import {RIVER_BETWEEN_CONTROL,CAMPAIGN_CONTROL,createCampaignControl,advanceCampaignControl,campaignControlEnded,campaignControlStatus,bridgeStatus,bridgeIncome} from '../dist/bridge-control.js';
import {validateBattleIdentity} from '../dist/battle-codec.js';
const rule=getRuleset(RIVER_BETWEEN_RULESET_ID),map=MAPS.classic;
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
const owner=(side=0)=>({owner:side,capturing:null,progress:0});
const troop=(side,lane,type='warrior')=>({side,type,hp:100,x:1600,y:map.lanes[lane]});
const advance=(c,units,dt)=>advanceCampaignControl(c,map,units,dt,rule.units,rule.campaignControl);
function game(time=62,held=60){const g=new Game({rulesetId:rule.id,ai:false});g.state.buildings=[];g.state.effects=[];g.state.time=time;g.tick=Math.round(time/.05);g.state.campaignControl.bridges=[owner(),owner(),owner(null)];g.state.campaignControl.heldSeconds=held;return g;}
const digest=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');

test('immutable compound rule is isolated from all published rule snapshots',()=>{
 assert.equal(digest(Object.fromEntries(Object.entries(RULESETS).filter(([id])=>!['frontier-campaign-long-screen','frontier-hammer-prototype','frontier-campaign-hammer-turns'].includes(id)&&id!=='frontier-campaign-salt-stores'&&id!=='frontier-campaign-archers-quay'&&id!==rule.id&&id!=='frontier-campaign-road-we-know'&&id!=='frontier-campaign-reed-beds'&&!id.startsWith('frontier-campaign-false-quiet-')))), 'abe214bcff857c20b2cd1a5a2589615de24151f98d71a7d95868d466d400738f');
 assert.deepEqual(rule.campaignControl,{...CAMPAIGN_CONTROL,timeLimit:600,endOnGoal:false});
 assert.equal(rule.campaignControl,RIVER_BETWEEN_CONTROL);assert.ok(Object.isFrozen(rule.campaignControl));
 assert.equal(rule.economy.policy,'legacy');assert.equal(rule.fog,undefined);assert.equal(rule.ai.policy,'legacy');assert.equal(rule.campaignOnly,true);
 assert.equal(CAMPAIGN_CONTROL.endOnGoal,undefined);assert.equal(CAMPAIGN_CONTROL.timeLimit,270);
 for(const mapId of ['twin-span','long-march','intro-one-road'])assert.throws(()=>new Game({rulesetId:rule.id,mapId}));
});

test('old seeded simulations are byte-for-byte unchanged',()=>{
 const expected={"frontier-campaign-shared-crossing":"04e0b4d985bc2134a4f88ee28af254b96a9197ae174009a4cd3a1bcc0bb14e75","frontier-campaign-citadel-open":"a833a64f59be1e93b428a29ab22755a4983b9fcc7fd3968e92b46be5cdf4a4bc","frontier-legacy":"b3be80a7fbc11750fda3838f8077cd3b5ae6871a02a85b7b74a7614e9d7581c2","frontier-citadel-bridge-open":"84632a425412da53ac83a9db61b13cf2712c0e0c0178a9ba21c1d15f0c6dc9eb"};
 for(const [id,hash] of Object.entries(expected)){const g=new Game({rulesetId:id,seed:719});for(let i=0;i<600;i++)g.update(.05);assert.equal(digest(g.serialize()),hash,id);}
});

test('partial captures credit only overlap; contest pauses, empty ownership persists, both sides capture',()=>{
 const c=createCampaignControl(map);c.bridges[0]={owner:null,capturing:0,progress:1.97};c.bridges[2]={owner:1,capturing:0,progress:1.98};
 near(advance(c,[troop(0,0),troop(0,2)],.05),.02);near(c.heldSeconds,.02);
 near(advance(c,[troop(1,2,'gryphon')],3),0);assert.equal(c.bridges[2].owner,0);
 near(advance(c,[troop(1,2)],1.9),0);assert.equal(c.bridges[2].capturing,1);
 near(advance(c,[],.1),.1);assert.deepEqual(c.bridges[2],owner());
 advance(c,[troop(1,2)],2);assert.deepEqual(c.bridges[2],owner(1));near(c.heldSeconds,.12);
 advance(c,[troop(0,1)],2.5);near(c.heldSeconds,.62);
});

test('goal caps credit but keeps ownership, contest, capture, economy and AI live',()=>{
 const g=game(62,59.98);const gold=g.state.gold[0];g.update(.25);
 near(g.state.time,62.25);near(g.state.campaignControl.heldSeconds,60);assert.equal(campaignControlEnded(g),false);near(g.state.gold[0]-gold,1.25);assert.deepEqual(bridgeIncome(g),[0,0]);assert.equal(g.state.bridgeControl,undefined);
 const c=g.state.campaignControl;advance(c,[troop(1,0)],1);assert.equal(c.bridges[0].capturing,1);advance(c,[troop(1,0)],1);assert.deepEqual(c.bridges[0],owner(1));
 advance(c,[troop(0,2,'gryphon')],3);assert.equal(c.bridges[2].owner,null);assert.equal(c.heldSeconds,60);
 g.state.units=[troop(1,1,'gryphon')];assert.equal(bridgeStatus(g)[1].blocked,true);assert.equal(campaignControlStatus(g).count,0);assert.equal(campaignControlStatus(g).complete,true);assert.equal(campaignControlStatus(g).advancing,false);
 const ai=game();ai.ai=true;ai.aiTimer=0;let calls=0;ai._ai=()=>calls++;ai.update(.05);assert.equal(calls,1);
 const old=new Game({rulesetId:SHARED_CROSSING_RULESET_ID});old.state.time=62;old.tick=1240;old.state.campaignControl.heldSeconds=60;const snapshot=old.serialize();old.update(.25);assert.deepEqual(old.serialize(),snapshot);
});

test('600 second boundary and cores remain terminal, including after control cap',()=>{
 for(const held of [59.95,60]){const g=game(599.95,held);g.update(.25);near(g.state.time,600);near(g.state.campaignControl.heldSeconds,60);assert.equal(campaignControlEnded(g),true);const ended=g.serialize();g.update(.25);g._step(.05);assert.deepEqual(g.serialize(),ended);assert.deepEqual(Game.restore(ended).serialize(),ended);}
 for(const side of [0,1]){const g=game();g.state.bases[side].hp=0;assert.equal(campaignControlEnded(g),true);const ended=g.serialize();g.update(.05);assert.deepEqual(g.serialize(),ended);}
});

test('capped goal saves continue deterministically with no extra state or relaxed time admission',()=>{
 const g=game(),restored=Game.restore(g.serialize());for(let i=0;i<35;i++){g.update(.137);restored.update(.137);}assert.deepEqual(restored.serialize(),g.serialize());
 const valid=g.serialize();for(const corrupt of [s=>s.state.campaignControl.heldSeconds=60.01,s=>s.state.campaignControl.heldSeconds=-1,s=>s.state.campaignControl.extra=1,s=>s.state.campaignControl.earned=[0,0],s=>s.state.time=600.05,s=>s.state.time+=.01,s=>s.tick++,s=>s.mapId='long-march',s=>s.rulesetId='frontier-citadel-open',s=>s.state.campaignControl.bridges[0].progress=2,s=>s.rulesetRevision=2]){const bad=structuredClone(valid);corrupt(bad);assert.throws(()=>Game.restore(bad),String(corrupt));}
});

test('identity-only history admission requires exact scenario, Classic and immutable ruleset',()=>{
 const valid={ruleset:{id:rule.id,revision:1},map:{id:'classic',revision:1},scenario:{kind:'campaign',id:'a-river-between-us',revision:1}};
 assert.deepEqual(validateBattleIdentity(valid),valid);
 for(const edit of [v=>v.scenario={kind:'skirmish',id:'standard',revision:1},v=>v.scenario.id='shared-crossing',v=>v.scenario.revision=2,v=>v.ruleset.id=SHARED_CROSSING_RULESET_ID,v=>v.ruleset.id='frontier-campaign-citadel-open',v=>v.ruleset.revision=2,v=>v.map.id='long-march',v=>v.map.revision=2]){const bad=structuredClone(valid);edit(bad);assert.throws(()=>validateBattleIdentity(bad),String(edit));}
});
