import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,RULESETS,getRuleset,DEFAULT_SKIRMISH_RULESET_ID,FOG_RULESET_ID,FOG_SKIRMISH_RULESET_ID} from '../dist/engine.js';
import {RULESETS as Phase1Rules} from './fixtures/fog-phase1/rulesets.js';
import {FOG,supportsFog,observe,refreshFog} from '../dist/fog.js';
const clone=v=>JSON.parse(JSON.stringify(v));
const mechanics=r=>Object.fromEntries(['units','buildings','spell','combat','ai','economy','movement','endgame','limits','citadel'].map(k=>[k,r[k]]));
const identityFreeSave=g=>{const {rulesetId,...rest}=g.serialize();return rest;};
const identityFreeView=(g,side)=>{const {ruleset,...rest}=observe(g,side);return rest;};
const oldIDs=Object.keys(Phase1Rules);

test('candidate is a distinct frozen fog identity; every existing identity including QA is unchanged',()=>{
 assert.equal(FOG_SKIRMISH_RULESET_ID,'frontier-fog-skirmish-open');assert.notEqual(FOG_SKIRMISH_RULESET_ID,FOG_RULESET_ID);
 assert.deepEqual(Object.keys(RULESETS).filter(id=>id!==FOG_SKIRMISH_RULESET_ID&&id!=='frontier-campaign-shared-crossing'&&id!=='frontier-campaign-one-signal'&&id!=='frontier-campaign-lanterns'&&id!=='frontier-campaign-borrowed-ground'&&id!=='frontier-campaign-river-between'),oldIDs);
 const signal=getRuleset('frontier-campaign-one-signal');assert.equal(signal.revision,1);assert.equal(signal.campaignOnly,true);assert.equal(supportsFog(signal),false);assert.deepEqual(mechanics(signal),mechanics(getRuleset('frontier-campaign-citadel-open')));
 for(const id of oldIDs)assert.deepEqual(RULESETS[id],Phase1Rules[id],id+' immutable definition');
 const candidate=getRuleset(FOG_SKIRMISH_RULESET_ID),qa=getRuleset(FOG_RULESET_ID),ordinary=getRuleset(DEFAULT_SKIRMISH_RULESET_ID);
 assert.equal(candidate.revision,1);assert.equal(candidate.experimental,true);assert.equal(candidate.skirmishOnly,true);assert.equal(candidate.qaOnly,undefined);assert.equal(qa.qaOnly,true);
 assert.ok(Object.isFrozen(candidate)&&Object.isFrozen(candidate.fog));assert.equal(candidate.fog,FOG);assert.deepEqual(mechanics(candidate),mechanics(qa));assert.deepEqual(mechanics(candidate),mechanics(ordinary));
 assert.equal(candidate.endgame.forcedDecay,false);assert.equal(candidate.economy.policy,'legacy');assert.equal(candidate.campaignOnly,undefined);assert.equal(candidate.authoredOnly,undefined);assert.equal(candidate.citadel.cost,190);
 assert.equal(DEFAULT_SKIRMISH_RULESET_ID,'frontier-citadel-open');assert.equal(supportsFog(new Game({rulesetId:DEFAULT_SKIRMISH_RULESET_ID}).ruleset),false);
 assert.throws(()=>{candidate.fog.flyerRadius=999;},TypeError);assert.throws(()=>{candidate.endgame.forcedDecay=true;},TypeError);
});

test('fog recognition requires exact registry objects, one of three IDs, revision and policy',()=>{
 assert.deepEqual(Object.values(RULESETS).filter(supportsFog).map(r=>r.id),['frontier-campaign-lanterns',FOG_RULESET_ID,FOG_SKIRMISH_RULESET_ID]);
 for(const id of ['frontier-campaign-lanterns',FOG_RULESET_ID,FOG_SKIRMISH_RULESET_ID]){
  const r=getRuleset(id);assert.equal(supportsFog(r),true);
  for(const forged of [{...r},Object.freeze({...r}),Object.create(r),{id,revision:1,fog:FOG},{...r,id:'arbitrary-fog'},{...r,revision:2},{...r,fog:{...FOG,policy:'future-fog'}}])assert.equal(supportsFog(forged),false);
 }
 for(const value of [null,undefined,false,{},'frontier-fog-skirmish-open',{fog:FOG},getRuleset(DEFAULT_SKIRMISH_RULESET_ID)])assert.equal(supportsFog(value),false);
});

test('candidate constructor and engine restore reject unsupported maps/revisions and injected combinations',()=>{
 const g=new Game({rulesetId:FOG_SKIRMISH_RULESET_ID,ai:false}),saved=g.serialize();assert.deepEqual(Game.restore(saved).serialize(),saved);
 for(const mapId of ['long-march','twin-span','intro-one-road','intro-two-road']){
  assert.throws(()=>new Game({rulesetId:FOG_SKIRMISH_RULESET_ID,mapId}),/fog requires Classic/);
  const bad=clone(saved);bad.mapId=mapId;assert.throws(()=>Game.restore(bad));
 }
 for(const options of [{rulesetRevision:2},{mapRevision:2}])assert.throws(()=>new Game({rulesetId:FOG_SKIRMISH_RULESET_ID,...options}));
 for(const mutate of [d=>{d.scenario={kind:'campaign',id:'first-watch',revision:1};},d=>{d.state.bridgeControl={};},d=>{d.ruleset={fog:true};},d=>{d.endgame='timed';},d=>{d.rulesetId='frontier-citadel-timed';},d=>{d.rulesetId='frontier-citadel-bridge-open';},d=>{delete d.state.fog;},d=>{d.rulesetRevision=2;}]){const bad=clone(saved);mutate(bad);const before=clone(bad);assert.throws(()=>Game.restore(bad));assert.deepEqual(bad,before);}
 for(const rulesetId of ['frontier-citadel-timed','frontier-citadel-bridge-open','frontier-campaign-citadel-open']){const bad=new Game({rulesetId}).serialize();bad.rulesetId=FOG_SKIRMISH_RULESET_ID;assert.throws(()=>Game.restore(bad),'no implicit knowledge migration');}
});

test('new candidate engine preserves QA paid commands, RNG, AI, contacts and restored continuation',()=>{
 for(const difficulty of ['normal','hard'])for(const seed of [1,754]){
  let a=new Game({rulesetId:FOG_RULESET_ID,difficulty,seed,ai:true}),b=new Game({rulesetId:FOG_SKIRMISH_RULESET_ID,difficulty,seed,ai:true});
  for(let i=0;i<650;i++){
   if(i%80===0){a._ai(0);b._ai(0);}
   if(i===100){assert.deepEqual(b.buyCitadelOption('arrows'),a.buyCitadelOption('arrows'));}
   if(i%140===90){assert.deepEqual(b.cast(110,450),a.cast(110,450));}
   a.update(.05);b.update(.05);
   assert.deepEqual(identityFreeSave(b),identityFreeSave(a),`${difficulty}/${seed}/${i}`);
   if(i%20===0)for(const side of [0,1])assert.deepEqual(identityFreeView(b,side),identityFreeView(a,side));
   if(i===249||i===499){a=Game.restore(a.serialize());b=Game.restore(b.serialize());}
  }
  assert.equal(a.serialize().rulesetId,FOG_RULESET_ID);assert.equal(b.serialize().rulesetId,FOG_SKIRMISH_RULESET_ID);
 }
});

test('candidate memory round-trips and fresh restart retains identity with empty knowledge',()=>{
 const g=new Game({rulesetId:FOG_SKIRMISH_RULESET_ID,ai:false,seed:57});g._spawn({type:'aerie',side:0,x:2050,y:450,lane:1,level:1});const scout=g.state.units.at(-1);Object.assign(scout,{x:2050,y:450});const enemy=g._place('watchtower',2300,450,1);refreshFog(g);
 assert.ok(g.state.fog.sides[0].structures.some(m=>m.id===enemy.id));scout.x=1000;refreshFog(g);const stale=clone(observe(g).fog.memories);assert.ok(g.upgrade(enemy.id,1).ok);assert.deepEqual(observe(g).fog.memories,stale);
 const saved=g.serialize(),resumed=Game.restore(saved);assert.deepEqual(resumed.serialize(),saved);assert.deepEqual(observe(resumed).fog.memories,stale);
 const restarted=new Game({rulesetId:g.ruleset.id,mapId:g.map.id,seed:57,ai:false});assert.equal(restarted.ruleset.id,FOG_SKIRMISH_RULESET_ID);assert.deepEqual(restarted.state.fog.sides.map(r=>r.structures),[[],[]]);assert.deepEqual(restarted.state.citadelOptions.sides.map(r=>r.choice),[null,null]);assert.equal(restarted.state.time,0);
});
