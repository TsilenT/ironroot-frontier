import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {Game, RULESETS, getRuleset, FOG_RULESET_ID, FOG_SKIRMISH_RULESET_ID} from '../dist/engine.js';
import {CITADEL_OPTIONS, supportsCitadelOptions, citadelOptionStatus, chooseAICitadelOption} from '../dist/citadel-options.js';
import {encodeBattle, decodeBattle} from '../dist/battle-codec.js';
const campaignIds=['frontier-campaign-citadel-watch','frontier-campaign-citadel-fork','frontier-campaign-citadel-open','frontier-authored-citadel'];
const ids=['frontier-citadel-open','frontier-citadel-timed','frontier-citadel-bridge-open','frontier-citadel-bridge-timed'];
const near=(actual,expected,label='amount')=>assert.ok(Math.abs(actual-expected)<1e-7,`${label}: ${actual} != ${expected}`);
const clone=v=>JSON.parse(JSON.stringify(v));
function at(g,time){g.state.time=time;g.tick=Math.round(time/.05);g.state.overtime=time>=300;return g;}
// Isolated synthetic mechanism fixtures. Paid histories are exercised separately below.
function fixture(id=ids[0]){const g=at(new Game({ai:false,seed:91,rulesetId:id}),90);g.state.buildings=[];g.state.effects=[];return g;}
const steps=(g,n)=>{for(let i=0;i<n;i++)g.update(.05);};
const producers={warrior:'barracks',archer:'archery',siege:'foundry',gryphon:'aerie',rootwarden:'wardenLodge'};
function unit(g,side,type='archer',x=210,y=450){g._spawn({type:producers[type],side,x,y,lane:1,level:1});const u=g.state.units.at(-1);Object.assign(u,{x,y,lane:1,cooldown:20});return u;}
const record=(g,side=0)=>g.state.citadelOptions.sides[side];

test('new immutable identities preserve unit, building, economy and endgame definitions',()=>{
 assert.deepEqual(Object.values(RULESETS).filter(supportsCitadelOptions).map(r=>r.id),['frontier-campaign-empty-purse','frontier-campaign-wake-reserve','frontier-campaign-shared-watch','frontier-campaign-long-screen','frontier-campaign-hammer-turns','frontier-hammer-prototype','frontier-campaign-salt-stores','frontier-campaign-archers-quay','frontier-campaign-reed-beds','frontier-campaign-road-we-know','frontier-campaign-false-quiet-a','frontier-campaign-false-quiet-b','frontier-campaign-river-between','frontier-campaign-borrowed-ground','frontier-campaign-lanterns','frontier-campaign-one-signal','frontier-campaign-shared-crossing',FOG_RULESET_ID,FOG_SKIRMISH_RULESET_ID,...campaignIds,...ids]);
 const signal=getRuleset('frontier-campaign-one-signal');assert.equal(signal.revision,1);assert.equal(signal.campaignOnly,true);assert.ok(Object.isFrozen(signal));
 for(const k of ['units','buildings','spell','movement','combat','ai','endgame','economy','citadel','limits'])assert.deepEqual(signal[k],getRuleset('frontier-campaign-citadel-open')[k],`One Signal ${k}`);
 const signalGame=new Game({rulesetId:signal.id,ai:false});assert.deepEqual(Game.restore(signalGame.serialize()).serialize(),signalGame.serialize());
 const candidate=getRuleset(FOG_SKIRMISH_RULESET_ID);assert.equal(candidate.qaOnly,undefined);assert.equal(candidate.experimental,true);assert.equal(candidate.skirmishOnly,true);assert.equal(candidate.endgame.forcedDecay,false);assert.equal(candidate.economy.policy,'legacy');assert.equal(candidate.citadel,CITADEL_OPTIONS);assert.ok(Object.isFrozen(candidate)&&Object.isFrozen(candidate.fog));
 const fog=getRuleset(FOG_RULESET_ID);assert.equal(fog.qaOnly,true);assert.equal(fog.experimental,true);assert.equal(fog.skirmishOnly,true);assert.equal(fog.endgame.forcedDecay,false);assert.equal(fog.economy.policy,'legacy');assert.equal(fog.citadel,CITADEL_OPTIONS);assert.ok(Object.isFrozen(fog)&&Object.isFrozen(fog.fog));
 for(const k of ['units','buildings','spell','movement','endgame','economy','citadel'])assert.deepEqual(fog[k],getRuleset('frontier-citadel-open')[k]);
 assert.equal(new Game({rulesetId:FOG_RULESET_ID,mapId:'classic'}).map.id,'classic');
 for(const mapId of ['long-march','twin-span','intro-one-road','intro-two-road'])assert.throws(()=>new Game({rulesetId:FOG_RULESET_ID,mapId}),/fog requires Classic/);
 assert.deepEqual(CITADEL_OPTIONS,{policy:'citadel-choice-v1',cost:190,extraDamageMultiplier:.5,regenRate:3,regenDelay:8});
 for(const id of ids){const g=new Game({rulesetId:id}),off=getRuleset(id.includes('bridge')?id.replace('citadel-',''):id.replace('citadel','air-local'));
  assert.equal(g.ruleset.skirmishOnly,true);assert.ok(Object.isFrozen(g.ruleset));assert.ok(Object.isFrozen(g.ruleset.citadel));
  for(const k of ['units','buildings','spell','movement','endgame','economy'])assert.deepEqual(g.ruleset[k],off[k]);
  assert.throws(()=>{g.ruleset.citadel.cost=0;},TypeError);assert.throws(()=>new Game({rulesetId:id,mapId:'intro-one-road'}));
 }
 for(const [i,id] of campaignIds.entries()){const g=new Game({rulesetId:id,mapId:i<2?'intro-one-road':'classic',ai:false}),off=getRuleset(['frontier-campaign-watch','frontier-campaign-fork','frontier-campaign-air-local','frontier-authored-air-local'][i]);for(const k of ['units','buildings','spell','movement','endgame','economy'])assert.deepEqual(g.ruleset[k],off[k]);assert.deepEqual(Game.restore(g.serialize()).serialize(),g.serialize());}
 for(const r of Object.values(RULESETS).filter(r=>!supportsCitadelOptions(r))){const g=new Game({rulesetId:r.id,ai:false}),before=g.serialize();assert.equal(g.state.citadelOptions,undefined);assert.equal(g.buyCitadelOption('arrows').code,'citadel-disabled');assert.deepEqual(g.serialize(),before);}
});

test('one honest 190-gold purchase per side changes no health, income, production or cooldown',()=>{
 for(const kind of ['arrows','regen'])for(const side of [0,1]){const g=fixture(),base=g.state.bases[side];base.cooldown=.7;base.hp=4200;g.state.spellCooldown[side]=14;g.state.gold[side]=205;
  const before=g.serialize();assert.equal(g.canBuyCitadelOption(kind,side).ok,true);assert.equal(g.buyCitadelOption(kind,side).ok,true);
  near(g.state.gold[side],15);assert.deepEqual(g.state.bases,before.state.bases);assert.deepEqual(g.state.income,before.state.income);assert.deepEqual(g.state.buildings,before.state.buildings);assert.deepEqual(g.state.spellCooldown,before.state.spellCooldown);assert.equal(record(g,side).choice,kind);
  const purchased=g.serialize();assert.deepEqual(Game.restore(purchased).serialize(),purchased);for(const repeat of [kind,kind==='arrows'?'regen':'arrows'])assert.equal(g.buyCitadelOption(repeat,side).code,'citadel-already-chosen');
  assert.equal(g.sell(base.id,side).ok,false);assert.equal(g.upgrade(base.id,side).ok,false);assert.deepEqual(g.serialize(),purchased);
  assert.equal(g.buyCitadelOption(kind,1-side).ok,true);
 }
});

test('gold, stale input, dead/end and safety boundaries reject without mutation',()=>{
 const cases=[
  ['insufficient-gold',g=>{g.state.gold[0]=189.999;}],['battle-ended',g=>{g.state.bases[0].hp=0;}],['battle-ended',g=>{g.state.bases[1].hp=0;}],
  ['battle-ended',g=>{g.state.winner=1;}],['save-safety-limit',g=>{g.tick=g.ruleset.limits.maxTick;}]
 ];
 for(const [code,edit] of cases){const g=fixture();edit(g);const before=g.serialize();assert.equal(g.buyCitadelOption('regen').code,code);assert.deepEqual(g.serialize(),before);}
 for(const [kind,side] of [['bad',0],['arrows',-1],['regen',2],['arrows','0']]){const g=fixture(),before=g.serialize();assert.equal(g.buyCitadelOption(kind,side).code,'invalid-citadel-choice');assert.deepEqual(g.serialize(),before);}
 const g=fixture();g.state.gold[0]=190;assert.equal(g.canBuyCitadelOption('arrows').ok,true);g.state.gold[0]-=1;assert.equal(g.buyCitadelOption('arrows').code,'insufficient-gold');g.state.gold[0]=190;assert.equal(g.buyCitadelOption('arrows').ok,true);near(g.state.gold[0],0);
 const natural=new Game({rulesetId:ids[0],ai:false});assert.equal(natural.buyCitadelOption('arrows').ok,true);assert.equal(record(natural).purchasedAt,0);assert.equal(record(natural).purchasedTick,0);
});

test('regeneration preserves pre-purchase damage, waits eight full seconds and resets only on actual damage',()=>{
 const g=fixture(),base=g.state.bases[0];at(g,88);g._damage(base,300,1);at(g,90);assert.equal(g.buyCitadelOption('regen').ok,true);near(base.hp,5700);near(record(g).lastDamageAt,88);near(citadelOptionStatus(g).regenWait,8);
 steps(g,160);near(base.hp,5700);assert.equal(citadelOptionStatus(g).regenWait,0);assert.equal(citadelOptionStatus(g).healingActive,true);steps(g,1);near(base.hp,5700.15);
 const previous=record(g).lastDamageAt;g.damageQueue=[];g._damage(base,25,1);assert.equal(record(g).lastDamageAt,previous);near(base.hp,5700.15);
 const queued=g.damageQueue;g.damageQueue=null;for(const hit of queued)g._damage(...hit);near(record(g).lastDamageAt,g.state.time);near(citadelOptionStatus(g).regenWait,8);assert.equal(citadelOptionStatus(g).healingActive,false);
 steps(g,160);near(base.hp,5675.15);steps(g,1);near(base.hp,5675.30);
 const damagedAt=record(g).lastDamageAt;g._damage(base,0,1);assert.equal(record(g).lastDamageAt,damagedAt);
 for(let i=0;i<40;i++){g._damage(base,.2,1);steps(g,20);}near(record(g).healedTotal,.3);
});

test('regeneration recurs beyond 600 HP, clamps at ordinary maximum and cannot resurrect',()=>{
 const g=fixture(),base=g.state.bases[0];g._damage(base,600,1);assert.ok(g.buyCitadelOption('regen').ok);steps(g,4160);near(base.hp,6000);near(record(g).healedTotal,600);assert.equal(citadelOptionStatus(g).healingActive,false);
 g._damage(base,150,1);steps(g,1160);near(base.hp,6000);near(record(g).healedTotal,750);steps(g,10);near(base.hp,6000);near(record(g).healedTotal,750);
 g._damage(base,6000,1);steps(g,1);assert.equal(g.state.winner,1);near(base.hp,0);const ended=g.serialize();steps(g,300);assert.deepEqual(g.serialize(),ended);
});

test('timed regeneration works before decay and stops exactly when native decay is active; open play keeps it',()=>{
 for(const id of ['frontier-citadel-open','frontier-citadel-timed']){const g=fixture(id),base=g.state.bases[0];g._damage(base,300,1);g.buyCitadelOption('regen');at(g,419.95);steps(g,1);near(g.state.time,420);near(base.hp,5700.15);assert.equal(citadelOptionStatus(g).decayActive,false);
  steps(g,1);if(id.endsWith('timed')){near(base.hp,5700.15-.05*(20+.05*.3));near(record(g).healedTotal,.15);assert.equal(citadelOptionStatus(g).healingActive,false);assert.equal(citadelOptionStatus(g).decayActive,true);}
  else{near(base.hp,5700.3);near(record(g).healedTotal,.3);assert.equal(citadelOptionStatus(g).healingActive,true);}
 }
});

test('extra arrow retains primary cadence/range and hits a distinct nearest living target at half damage',()=>{
 for(const side of [0,1])for(const overtime of [false,true])for(const type of ['warrior','siege','gryphon']){
  const g=fixture();if(overtime)at(g,300);g.buyCitadelOption('arrows',side);const base=g.state.bases[side],dir=side?-1:1;
  const nearest=unit(g,1-side,type,base.x+dir*70),next=unit(g,1-side,type,base.x+dir*100),third=unit(g,1-side,type,base.x+dir*150),dead=unit(g,1-side,'archer',base.x+dir*50);dead.hp=0;
  const before=[nearest.hp,next.hp,third.hp],fired=[],fire=g._fire.bind(g);g._fire=(...args)=>{fired.push(args);return fire(...args);};steps(g,1);
  const primary=overtime?18:32;near(nearest.hp,before[0]-primary);near(next.hp,before[1]-primary/2);near(third.hp,before[2]);near(base.cooldown,1.15);assert.equal(record(g,side).extraShots,1);
  const shots=fired.filter(a=>a[0]===base);assert.deepEqual(shots.map(a=>[a[1].id,a[2],!!a[4]]),[[nearest.id,primary,false],[next.id,primary/2,true]]);
  const extra=g.state.projectiles.find(p=>p.citadelExtra);assert.ok(extra);assert.equal(extra.targetAir,type==='gryphon');assert.equal(extra.sourceAir,false);steps(g,22);assert.equal(record(g,side).extraShots,1);steps(g,1);assert.equal(record(g,side).extraShots,2);
 }
});

test('one target never receives the extra arrow; strict range excludes 310 and accepts inside',()=>{
 const alone=fixture();alone.buyCitadelOption('arrows');const u=unit(alone,1,'siege',210);steps(alone,1);near(u.hp,208);assert.equal(record(alone).extraShots,0);assert.equal(alone.state.projectiles.filter(p=>p.citadelExtra).length,0);
 for(const distance of [310,310-1e-6]){const g=fixture();g.buyCitadelOption('arrows');unit(g,1,'archer',180);const edge=unit(g,1,'archer',110+distance);unit(g,0,'archer',500);steps(g,1);assert.equal(record(g).extraShots,distance===310?0:1);near(edge.hp,distance===310?65:49);}
});

test('frame-snapshot target eligibility and applied damage preserve fair simultaneous kills/bounties',()=>{
 for(const reverse of [false,true]){const g=fixture();g.buyCitadelOption('arrows');const primary=unit(g,1,'archer',180),secondary=unit(g,1,'archer',240),friendly=unit(g,0,'archer',250);primary.hp=10;secondary.hp=10;friendly.cooldown=0;
  if(reverse){g.state.units.reverse();g.tick++;g.state.time+=.05;}
  const before=g.state.gold[0],shots=[],fire=g._fire.bind(g);g._fire=(...args)=>{if(args[0]===g.state.bases[0])shots.push(args[1].id);return fire(...args);};steps(g,1);
  assert.deepEqual(shots,[primary.id,secondary.id]);assert.equal(record(g).extraShots,1);assert.equal(g.state.stats.kills[0],2);near(g.state.stats.damage[0],20);near(g.state.gold[0]-before,4.25);
  assert.equal(g.state.units.includes(primary),false);assert.equal(g.state.units.includes(secondary),false);
 }
});

test('full projectile display budget does not cancel either native damage or the extra shot',()=>{
 const g=fixture();g.buyCitadelOption('arrows');const first=unit(g,1,'siege',180),second=unit(g,1,'siege',240);
 const p={x:110,y:450,sx:110,sy:450,tx:180,ty:450,side:0,type:'tower',sourceAir:false,targetAir:false,life:.28,maxLife:.28};g.state.projectiles=Array.from({length:256},()=>({...p}));steps(g,1);
 near(first.hp,208);near(second.hp,224);assert.equal(g.state.projectiles.length,256);assert.equal(record(g).extraShots,1);
});

test('AI chooses honestly before ordinary spending, for either side and only in the disclosed situations',()=>{
 for(const side of [0,1])for(const kind of ['arrows','regen']){const g=fixture(),base=g.state.bases[side];g.state.gold[side]=190;
  if(kind==='arrows'){const dir=side?-1:1;unit(g,1-side,'archer',base.x+dir*70);unit(g,1-side,'archer',base.x+dir*120);}else{at(g,82);g._damage(base,150,1-side);at(g,90);}
  assert.equal(chooseAICitadelOption(g,side),kind);g._ai(side);assert.equal(record(g,side).choice,kind);near(g.state.gold[side],0);g._ai(side);near(g.state.gold[side],0);
 }
 const g=fixture();g._damage(g.state.bases[0],150,1);assert.equal(chooseAICitadelOption(g,0),null);at(g,97.95);assert.equal(chooseAICitadelOption(g,0),null);at(g,98);assert.equal(chooseAICitadelOption(g,0),'regen');g.state.gold[0]=189;assert.equal(chooseAICitadelOption(g,0),null);
 const timed=fixture('frontier-citadel-timed');timed.state.bases[0].hp-=150;at(timed,420.05);assert.equal(chooseAICitadelOption(timed,0),null);
 const healthy=fixture();assert.equal(chooseAICitadelOption(healthy,0),null);healthy.state.gold[0]=140;healthy._ai(0);assert.equal(record(healthy).choice,null);assert.ok(healthy.state.gold[0]<140,'AI keeps ordinary spending and does not reserve for a citadel choice');
});

test('strict metadata admission rejects cross-mode, unknown, impossible, mistyped and reset effect data',()=>{
 const g=fixture();g.buyCitadelOption('regen');const data=g.serialize(),mutations=[
  d=>{delete d.state.citadelOptions;},d=>{d.state.citadelOptions.extra=true;},d=>{d.state.citadelOptions.sides.pop();},
  d=>{d.state.citadelOptions.sides[0].unknown=0;},d=>{delete d.state.citadelOptions.sides[0].lastDamageAt;},
  d=>{d.state.citadelOptions.sides[0].choice='damage';},d=>{d.state.citadelOptions.sides[0].purchasedAt=89;},d=>{d.state.citadelOptions.sides[0].purchasedTick=1799;},
  d=>{d.state.citadelOptions.sides[0].lastDamageAt=91;},d=>{d.state.citadelOptions.sides[0].healedTotal=.01;},d=>{d.state.citadelOptions.sides[0].extraShots=1;},
  d=>{d.state.citadelOptions.sides[1].purchasedAt=90;},d=>{d.state.citadelOptions.sides[1].healedTotal=-1;},d=>{d.state.citadelOptions.sides[1].extraShots=.5;},
  d=>{d.state.citadelOptions.sides[0].choice=null;},d=>{d.mapId='intro-one-road';}
 ];
 for(const mutate of mutations){const bad=clone(data);mutate(bad);assert.throws(()=>Game.restore(bad));assert.throws(()=>decodeBattle(bad));}
 for(const rulesetId of ['frontier-air-local-open','frontier-bridge-open','frontier-campaign-air-local','frontier-authored-air-local']){const bad=new Game({rulesetId,ai:false}).serialize();bad.state.citadelOptions=clone(data.state.citadelOptions);assert.throws(()=>Game.restore(bad));}
 for(const version of [1,2]){const bad=new Game({mapId:version===1?'classic':'twin-span'}).serialize();bad.state.citadelOptions=clone(data.state.citadelOptions);assert.throws(()=>Game.restore(bad));}
});

test('extra projectile field is admitted only for the opted-in bought-arrow tower and survives restoration',()=>{
 const g=fixture();g.buyCitadelOption('arrows');unit(g,1,'siege',180);unit(g,1,'siege',240);steps(g,1);const data=g.serialize();assert.deepEqual(Game.restore(data).serialize(),data);
 for(const mutate of [p=>{p.citadelExtra=false;},p=>{p.citadelExtra=1;},p=>{p.type='archer';},p=>{p.sx=270;},p=>{p.sy=260;},p=>{p.side=1;}]){const bad=clone(data);mutate(bad.state.projectiles.find(p=>p.citadelExtra));assert.throws(()=>Game.restore(bad));}
 const resetCounter=clone(data);resetCounter.state.citadelOptions.sides[0].extraShots=0;assert.throws(()=>Game.restore(resetCounter));
 const unchosen=clone(data);unchosen.state.citadelOptions.sides[0]={choice:null,purchasedAt:null,purchasedTick:null,lastDamageAt:null,healedTotal:0,extraShots:0};assert.throws(()=>Game.restore(unchosen));
 const old=new Game({rulesetId:'frontier-air-local-open'}).serialize();old.state.projectiles=[clone(data.state.projectiles.find(p=>p.citadelExtra))];assert.throws(()=>Game.restore(old));
 const restored=decodeBattle(encodeBattle(g)).game;steps(g,100);steps(restored,100);assert.deepEqual(restored.serialize(),g.serialize());
});

test('bridge interaction keeps exact native receipts separate from purchase spending and restore',()=>{
 for(const timed of [false,true]){const id=`frontier-citadel-bridge-${timed?'timed':'open'}`,g=fixture(id);g.state.bridgeControl.bridges[0].owner=0;
  const control=clone(g.state.bridgeControl),before=g.state.gold[0];assert.ok(g.buyCitadelOption('regen').ok);assert.deepEqual(g.state.bridgeControl,control);near(g.state.gold[0],before-190);
  steps(g,20);near(g.state.bridgeControl.earned[0],.5/3);near(g.state.gold[0],before-190+5+.5/3);assert.deepEqual(Game.restore(g.serialize()).serialize(),g.serialize());
  const off=fixture(id.replace('citadel-',''));off.state.bridgeControl.bridges[0].owner=0;steps(off,20);assert.deepEqual(g.state.bridgeControl,off.state.bridgeControl);
 }
});

// Golden states generated from unchanged main 5ec1f967a1c8c8f9861f68b8fef3cf99c4fa460d.
// Legal native paid AI actions every 100 ticks on both sides; hash full saves at ticks 1000/2000/4000.
const baseline=[
 ['frontier-air-local-open','classic',['3f7740741dbde9484ea6cf4758d4c2c7451ea3851775d6e8e786399859026fe8','2fa4db3d3fb51a7c7ccdb9256d6ed1ef47703e29f4fb1121959605f9e0b6ec0d','e501c16abc47d7683bb44f56446e94f00e96b85eb52095cb5f2b8a5c81099940']],
 ['frontier-air-local-timed','twin-span',['27c980b3fa8defaeac8151bac58cfb686e3eaed70119dc9b13639531145f3cc8','2d63435a9f742793c9a1963587389b12c98b22517c4d996e98968334f9f09a11','7359b7e07d04df4746907215493eced7ae0a19169b586022b5b36e1cd18dde4e']],
 ['frontier-bridge-open','classic',['1e11027528d518e4fc0d0925a42688706eff121cd78a308c3b468b2228496428','ef44ba4997e7fd4cca73763a82317c37abf1d34d7c9412fa760062061d078ee4','a3353aae2971a18c53ff6713167420a15b302ee668f675f1d0f668a582969185']],
 ['frontier-bridge-timed','twin-span',['422b98a28c03477d266b716df0e594818cf55bb8f3f7b03fe281986011ef19a9','2b480e7b6d0b7d01497874f05f9ad33d60359b3414b2240fd46a6188845af21b','edc5404163781566b74b0090b58c22d0bb2757223ddd4d868d5fb1530b0c8114']]
];
test('disabled-mode deterministic paid histories match released main byte for byte, bridge separately',()=>{
 for(const [rulesetId,mapId,expected] of baseline){const g=new Game({ai:false,seed:91,rulesetId,mapId}),hashes=[];
  for(let i=0;i<4000;i++){if(i%100===0)for(const side of [0,1])g._ai(side);g.update(.05);if([999,1999,3999].includes(i))hashes.push(createHash('sha256').update(JSON.stringify(g.serialize())).digest('hex'));}
  assert.deepEqual(hashes,expected,`${rulesetId} ${mapId}`);
 }
});
