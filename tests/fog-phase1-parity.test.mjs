import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fixture,versions} from './helpers/fog-performance-workloads.mjs';
const clone=v=>JSON.parse(JSON.stringify(v));
const games=(name='sparse',seed=57)=>[fixture(name,'phase1',seed),fixture(name,'current',seed)];
function equal([a,b],label){assert.deepEqual(b.serialize(),a.serialize(),label+' state/RNG');for(const side of [0,1])assert.deepEqual(versions.current.fog.observe(b,side),versions.phase1.fog.observe(a,side),label+' observation '+side);}
function action(pair,fn,label){const results=pair.map(fn);assert.deepEqual(clone(results[1]??null),clone(results[0]??null),label+' result');equal(pair,label);}
function restore(pair){return pair.map((g,i)=>versions[i?'current':'phase1'].Game.restore(g.serialize()));}

test('frozen phase1 performance oracle has the exact captured source hashes',()=>{
 const manifest=JSON.parse(readFileSync(new URL('./fixtures/fog-phase1/SOURCE.json',import.meta.url),'utf8'));assert.equal(manifest.phase1ManifestSha256,'5210aacd8b2ec3e53ea711ed5d5495d79bec6fe3eab10d3036eae71da37863d3');
 for(const [name,hash] of Object.entries(manifest.sha256))assert.equal(createHash('sha256').update(readFileSync(new URL('./fixtures/fog-phase1/'+name,import.meta.url))).digest('hex'),hash);
});

test('fresh event-audience scan exactly matches phase1 at boundaries, overlaps and after same-tick mutations',()=>{
 for(const kind of ['base','warrior','gryphon'])for(const side of [0,1]){
  const isolated=games('sparse'),radius=kind==='base'?360:kind==='gryphon'?420:320;
  for(const g of isolated){const observer=kind==='base'?g.state.bases[side]:g.state.units.find(u=>u.side===side&&u.type===kind);g.state.bases.forEach(b=>b.hp=0);g.state.buildings=[];g.state.units=[];observer.hp=1;if(kind!=='base'){observer.x=1600;observer.y=450;g.state.units.push(observer);}}
  const observer=kind==='base'?isolated[0].state.bases[side]:isolated[0].state.units[0],direction=side?-1:1;
  for(const delta of [-1e-7,0,1e-7])for(const [dx,dy] of [[radius+delta,0],[(radius+delta)*.6,(radius+delta)*.8]]){
   const x=observer.x+direction*dx,y=observer.y+dy,expected=delta>0?0:1<<side;
   assert.equal(versions.phase1.fog.eventAudience(isolated[0],x,y),expected,`${kind}/${side}/${delta} phase1 boundary`);
   assert.equal(versions.current.fog.eventAudience(isolated[1],x,y),expected,`${kind}/${side}/${delta} optimized boundary`);
  }
 }
 const pair=games('crowded_march'),radii=[320,360,420];
 for(const radius of radii)for(const side of [0,1])for(const delta of [-1e-7,0,1e-7]){
  const observer=pair[0].state.units.find(e=>e.side===side),points=[[observer.x+radius+delta,observer.y],[observer.x-radius-delta,observer.y],[observer.x+(radius+delta)*.6,observer.y+(radius+delta)*.8]];
  for(const [x,y] of points)assert.equal(versions.current.fog.eventAudience(pair[1],x,y),versions.phase1.fog.eventAudience(pair[0],x,y));
 }
 for(const [x,y] of [[NaN,0],[0,Infinity],[Infinity,Infinity],[-100,450],[0,0],[3200,900]])assert.equal(versions.current.fog.eventAudience(pair[1],x,y),versions.phase1.fog.eventAudience(pair[0],x,y));
 for(const [i,g] of pair.entries()){
  g.state.bases.forEach(b=>b.hp=0);g.state.buildings=[];g.state.units.forEach(u=>u.hp=0);
  const old=g.state.units[0];Object.assign(old,{hp:1,x:1600,y:450});
  assert.equal(versions[i?'current':'phase1'].fog.eventAudience(g,1920,450),1);g._damage(old,.25,1);assert.equal(old.hp,.75);g._damage(old,.75,1);assert.equal(versions[i?'current':'phase1'].fog.eventAudience(g,1920,450),0);
 }
 equal(pair,'same-tick last observer death');
});

test('sparse, crowded marching and crowded combat maintain exact phase1 states and observations',()=>{
 for(const workload of ['sparse','crowded_march','crowded_combat'])for(const seed of [1,57,754]){
  let pair=games(workload,seed);equal(pair,workload+' initial');
  for(let i=0;i<100;i++){pair.forEach(g=>g.update(i%7===0?.1:.05));equal(pair,`${workload}/${seed}/${i}`);if(i===39||i===79){pair=restore(pair);equal(pair,'restore');}}
 }
});

test('bounded paid AI/action/restore scripts retain phase1 serialized RNG and observation parity',()=>{
 for(const difficulty of ['normal','hard'])for(const seed of [1,754]){
  let pair=['phase1','current'].map(v=>new versions[v].Game({rulesetId:versions[v].rulesetId,difficulty,seed,ai:true}));
  for(let i=0;i<650;i++){
   if(i%70===0)action(pair,g=>{g._ai(0);return null;},'paid own AI');
   if(i===40)action(pair,g=>g.build('archery',690,260,0),'paid build');
   if(i===100)action(pair,g=>g.upgrade(g.state.buildings.find(b=>b.side===0).id,0),'paid upgrade');
   if(i===200)action(pair,g=>g.buyCitadelOption('arrows',0),'paid citadel');
   if(i%130===90)action(pair,g=>g.cast(110,450,0),'visible Volley');
   if(i===230)action(pair,g=>g.sell(g.state.buildings.find(b=>b.side===0).id,0),'paid sell');
   pair.forEach(g=>g.update(.05));equal(pair,`${difficulty}/${seed}/${i}`);
   if(i===249||i===499){pair=restore(pair);equal(pair,'paid restore');}
  }
 }
});

test('same-tick spawn/move/death/build/sell/Volley and event saturation retain phase1 audiences',()=>{
 let pair=games('sparse');
 action(pair,g=>{g._spawn({type:'aerie',side:0,x:1950,y:450,lane:1,level:1});return null;},'same-tick spawn');
 action(pair,g=>{const u=g.state.units.at(-1);u.x=2300;u.y=450;g._effect(2680,450,'hit',1);return null;},'same-tick scout move and event');
 action(pair,g=>{g._damage(g.state.units.at(-1),1,1);return null;},'nonlethal observer damage');
 action(pair,g=>{g._damage(g.state.units.at(-1),1e4,1);return null;},'lethal observer damage');
 action(pair,g=>g.build('watchtower',1250,450,0),'same-tick construction');
 action(pair,g=>g.cast(1500,450,0),'same-tick visible-edge Volley');
 action(pair,g=>g.sell(g.state.buildings.find(b=>b.side===0&&b.type==='watchtower').id,0),'same-tick sale');
 action(pair,g=>{for(let i=0;i<700;i++)g._effect(i%2?3090:110,450,'hit',i%2,.2);return null;},'independent event-budget saturation');
 pair.forEach((g,i)=>versions[i?'current':'phase1'].fog.refreshFog(g));pair=restore(pair);equal(pair,'saturation restore');
 for(let i=0;i<20;i++){pair.forEach(g=>g.update(.05));equal(pair,'post-saturation step');}
});

test('queued simultaneous lethal/overkill hits preserve pre-death audiences and resolution order',()=>{
 for(const reversed of [false,true]){
  const pair=games('sparse');for(const g of pair){g.state.buildings=[];g.state.effects=[];g.state.units=[];
   for(const side of [0,1]){g._spawn({type:'barracks',side,x:side?1720:1400,y:450,lane:1,level:1});Object.assign(g.state.units.at(-1),{x:side?1720:1400,y:450});}
   g.state.effects=[];
  }
  action(pair,g=>{const units=reversed?[...g.state.units].reverse():g.state.units;g.damageQueue=[];g._damage(units[0],units[0].hp,1-units[0].side);g._damage(units[1],units[1].hp,1-units[1].side);g._damage(units[0],999,1-units[0].side);const queue=g.damageQueue;g.damageQueue=null;for(const hit of queue)g._damage(...hit);return null;},'queue resolution');
  for(const g of pair){assert.equal(g.state.effects[0].fogSeen,3);assert.equal(g.state.effects[1].fogSeen,reversed?1:2);assert.deepEqual(g.state.stats.kills,[1,1]);}
 }
});
