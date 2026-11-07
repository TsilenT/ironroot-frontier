import test from 'node:test';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {Game} from '../../dist/engine.js';
import {OptionGame,KINDS} from './prototype.mjs';
import {observe} from './observe.mjs';
const opts={optionsEnabled:true,ai:false,rulesetId:'frontier-air-local-open'};
const fixture=(timed=false)=>{const g=new OptionGame({...opts,rulesetId:timed?'frontier-air-local-timed':opts.rulesetId});g.state.buildings=[];g.tick=1800;g.state.time=90;return g;}; // Synthetic clock/no-production fixture, never a paid history.
const producer={warrior:'barracks',archer:'archery',siege:'foundry',gryphon:'aerie'};
function enemy(g,type='warrior',x=180,hp){g._spawn({type:producer[type],side:1,x:200,y:450,lane:1,level:1});const u=g.state.units.at(-1);u.x=x;u.y=450;u.cooldown=20;if(hp!==undefined)u.hp=u.maxHp=hp;return u;}
const advance=(g,n)=>{for(let i=0;i<n&&g.state.winner===null;i++)g.update(.05);};
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
test('all options pay equal normal cost, once per side, no immediate HP/rule change',()=>{
 for(const kind of KINDS){const g=fixture(),before=g.serialize();assert.ok(g.purchase(kind,0).ok);assert.ok(g.purchase(kind,1).ok);assert.equal(g.state.gold[0],230);assert.equal(g.state.gold[1],230);assert.deepEqual(g.state.bases,before.state.bases);const s=g.snapshot();for(const next of KINDS)assert.equal(g.purchase(next).code,'already-used');assert.deepEqual(g.snapshot(),s);}
});
test('insufficient/time/dead/ended/invalid/disabled/safety guard mutations rejected',()=>{
 const g=fixture(),reject=(code,kind='shot',side=0)=>{const s=g.snapshot();assert.equal(g.purchase(kind,side).code,code);assert.deepEqual(g.snapshot(),s);};
 g.tick=1799;g.state.time=89.95;reject('too-early');g.tick=1800;g.state.time=90;g.state.gold[0]=189.999;reject('insufficient-gold');g.state.gold[0]=190;
 reject('invalid-choice','faster');reject('invalid-choice','shot',2);g.state.bases[1].hp=0;reject('ended-or-dead');g.state.bases[1].hp=6000;g.state.winner=1;reject('ended-or-dead');g.state.winner=null;assert.ok(g.purchase('shot').ok);assert.equal(g.state.gold[0],0);
 const cap=fixture();cap.tick=cap.ruleset.limits.maxTick;cap.state.time=604800;assert.equal(cap.purchase('regen').code,'save-safety-limit');assert.equal(cap.update(.05).code,'save-safety-limit');
 assert.equal(new OptionGame({...opts,optionsEnabled:false}).purchase('shot').code,'disabled');
});
test('protected/bridge identity exclusion and strict snapshot admission/restore',()=>{
 for(const rulesetId of ['frontier-campaign-air-local','frontier-authored-air-local','frontier-bridge-open','frontier-legacy'])assert.throws(()=>new OptionGame({...opts,rulesetId}));
 assert.throws(()=>new OptionGame({...opts,mapId:'intro-one-road'}));
 const g=fixture();g.purchase('regen');g._damage(g.state.bases[0],1000,1);advance(g,300);const s=g.snapshot();assert.throws(()=>Game.restore(s));const r=OptionGame.restoreSnapshot(s);advance(g,100);advance(r,100);assert.deepEqual(r.snapshot(),g.snapshot());
 for(const mutate of [s=>s.extra=1,s=>delete s.enabled,s=>s.enabled=false,s=>s.purchases.push(null),s=>s.purchases[0].kind='faster',s=>s.purchases[0].healed=601,s=>s.purchases[0].time=89,s=>s.purchases[0].goldBefore=189,s=>s.purchases[0].tick=1800.5,s=>s.lastBaseDamage[0]=s.engine.state.time+1,s=>s.engine.state.extra=1,s=>s.engine.state.bases[0].maxHp=6600]){const bad=structuredClone(s);mutate(bad);assert.throws(()=>OptionGame.restoreSnapshot(bad));}
});
test('shot damage on each target class; extra arrow distinct target only; overtime preserved',()=>{
 const rows=[];
 for(const overtime of [false,true])for(const kind of ['none',...KINDS])for(const type of ['archer','warrior','siege','gryphon']){
  const g=fixture();if(kind!=='none')g.purchase(kind);const a=enemy(g,type),b=enemy(g,type,210);const hp=[a.hp,b.hp];if(overtime){g.tick=6000;g.state.time=300;}g.update(.05);
  const normal=overtime?18:32,primary=kind==='shot'?normal*1.25:normal,secondary=kind==='arrows'?normal*.5:0;close(hp[0]-a.hp,primary);close(hp[1]-b.hp,secondary);rows.push({overtime,kind,type,primary,secondary});
 }
 const one=fixture();one.purchase('arrows');const target=enemy(one);one.update(.05);assert.equal(target.hp,148);
 writeFileSync('qa/citadel-options/mechanism-shots.json',JSON.stringify({scope:'synthetic two-target damage fixtures',rows},null,2)+'\n');
});
test('second arrow uses nearest DIFFERENT living enemy strictly inside range; unchanged cadence',()=>{
 const g=fixture();g.purchase('arrows');const a=enemy(g,'warrior',180),b=enemy(g,'warrior',230),far=enemy(g,'warrior',420);far.cooldown=20;g._fire(g.state.bases[0],a,32,'tower');assert.equal(a.hp,148);assert.equal(b.hp,164);assert.equal(far.hp,180);
 const baseline=[];
 for(const kind of ['none','shot','arrows']){const f=fixture();if(kind!=='none')f.purchase(kind);enemy(f,'warrior',180,10000);enemy(f,'warrior',210,10000);const times=[],fire=f._baseShot.bind(f);f._baseShot=(a,t,d,e)=>{if(!e)times.push(f.state.time);return fire(a,t,d,e);};advance(f,200);if(kind==='none')baseline.push(...times);else assert.deepEqual(times,baseline);}
});
test('regen waits eight complete seconds after purchase and damage, continuous damage denies it',()=>{
 const g=fixture();g.state.bases[0].hp=5000;g.purchase('regen');advance(g,160);assert.equal(g.state.bases[0].hp,5000);g.update(.05);close(g.state.bases[0].hp,5000.15);
 g._damage(g.state.bases[0],20,1);const healed=g.purchases[0].healed;for(let i=0;i<800;i++){if(i%100===0)g._damage(g.state.bases[0],1,1);g.update(.05);}close(g.purchases[0].healed,healed);advance(g,240);assert.ok(g.purchases[0].healed>healed);
});
test('regen total cap, max HP, no resurrection or terminal healing, timed decay exclusion',()=>{
 const g=fixture();g.state.bases[0].hp=5000;g.purchase('regen');advance(g,6000);close(g.purchases[0].healed,600);close(g.state.bases[0].hp,5600);advance(g,6000);close(g.state.bases[0].hp,5600);
 const full=fixture();full.state.bases[0].hp=5999;full.purchase('regen');advance(full,400);close(full.state.bases[0].hp,6000);close(full.purchases[0].healed,1);
 const dead=fixture();dead.purchase('regen');dead.state.bases[0].hp=0;dead.update(.05);assert.equal(dead.state.bases[0].hp,0);assert.equal(dead.state.winner,1);
 const timed=fixture(true);timed.state.bases[0].hp=5000;timed.purchase('regen');timed.tick=8399;timed.state.time=419.95;advance(timed,40);assert.equal(timed.purchases[0].healed,0);assert.ok(timed.state.bases[0].hp<5000);
});
test('disabled parity with released engine during paid normal-AI actions',()=>{
 const options={ai:false,seed:91,mapId:'twin-span',rulesetId:'frontier-air-local-open'},a=new Game(options),b=new OptionGame(options);
 for(let t=0;t<4000&&a.state.winner===null;t++){if(t%100===0)for(const s of [0,1]){a._ai(s);b._ai(s);}a.update(.05);b.update(.05);assert.deepEqual(a.serialize(),b.serialize());}
});
test('observer records gross Volley cost and immediate/between-step bounties, no netting',()=>{
 const g=observe(fixture());enemy(g,'archer',500);enemy(g,'archer',510);enemy(g,'archer',520);
 assert.ok(g.cast(510,450,0).ok);assert.equal(g.state.gold[0],351);assert.equal(g.metrics.ledgers[0].spent,75);assert.equal(g.metrics.ledgers[0].bounty,6);assert.equal(g.metrics.actions.at(-1).grossCost,75);assert.equal(g.metrics.actions.at(-1).immediateBounty,6);g.update(.05);assert.equal(g.metrics.ledgers[0].bounty,6);
});
test('controlled long open/timed regeneration: interrupted and continuous attrition, no forced open end',()=>{
 const rows=[];
 for(const timed of [false,true])for(const pattern of ['continuous','interrupted']){
  const g=fixture(timed);g.purchase('regen');let budgetExhaustedAt=null;
  while(g.tick<36000&&g.state.winner===null){if((g.tick-1800)%(pattern==='continuous'?120:400)===0)g._damage(g.state.bases[0],pattern==='continuous'?10:30,1);g.update(.05);if(g.purchases[0].healed>=600)budgetExhaustedAt??=g.state.time;}
  if(pattern==='continuous')assert.equal(g.purchases[0].healed,0);if(!timed)assert.equal(g.state.winner,null);
  rows.push({timed,pattern,time:g.state.time,winner:g.state.winner,hp:g.state.bases.map(b=>b.hp),restored:g.purchases[0].healed,budgetExhaustedAt});
 }
 writeFileSync('qa/citadel-options/controlled-regen.json',JSON.stringify({scope:'synthetic no-production attrition fixtures; no paid-match claims',rows},null,2)+'\n');
});
