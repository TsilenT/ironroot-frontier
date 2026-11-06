import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import test from 'node:test';
import {Game,BUILDINGS,LANES} from '../dist/engine.js';
const baselineSource=await readFile(new URL('./fixtures/engine-v0.8.js',import.meta.url),'utf8');
const dataURL=source=>'data:text/javascript;base64,'+Buffer.from(source).toString('base64');
const baselineURL=dataURL(baselineSource);
const {Game:LegacyGame}=await import(baselineURL);
const serialized=g=>JSON.stringify(g.serialize());
const equal=(a,b,label)=>assert.equal(serialized(a),serialized(b),label);
const xs=[1250,1110,970,830,690,550,410,270];
function paidActions(g,turn){
  for(const side of [turn%2,1-turn%2]){
    const type=Object.keys(BUILDINGS)[turn%7],lane=Math.floor(turn/7)%3;
    for(const h of xs)if(g.build(type,side?3200-h:h,LANES[lane],side).ok)break;
    if(turn%4===0){const b=g.state.buildings.find(b=>b.side===side&&b.level<3);if(b)g.upgrade(b.id,side);}
    if(turn%11===4){const b=g.state.buildings.find(b=>b.side===side&&b.type==='mint');if(b)g.sell(b.id,side);}
    if(turn%3===0){const u=g.state.units.find(u=>u.side!==side);if(u)g.cast(u.x,u.y,side);}
  }
}
test('Classic oracle is the exact frozen 0.8 engine, with no descriptor serialization',()=>{
  assert.equal(createHash('sha256').update(baselineSource).digest('hex'),'0e94556092df4c5b74f6002bfb8e70fe8477b9e66363e17485b6c083373bd889');
  for(const difficulty of ['easy','normal','hard'])for(const seed of [0,1,57,999,4294967295])for(const ai of [false,true]){
    equal(new Game({difficulty,seed,ai}),new LegacyGame({difficulty,seed,ai}),'opening state');
    assert.deepEqual(Object.keys(new Game().serialize()),['version','difficulty','seed','ai','nextId','aiTimer','accumulator','tick','state']);
  }
});
test('Classic complete games retain byte-for-byte state, random calls, actions and both AI orientations',()=>{
  for(const difficulty of ['easy','normal','hard'])for(const seed of [1,57,999])for(const mode of ['automatic','dual']){
    let a=new Game({difficulty,seed,ai:mode==='automatic'}),b=new LegacyGame({difficulty,seed,ai:mode==='automatic'});
    for(let frame=0;frame<12000&&a.state.winner===null;frame++){
      if(frame%120===0){paidActions(a,frame/120);paidActions(b,frame/120);equal(a,b,`${difficulty}/${seed}/${mode}: paid actions ${frame}`);}
      if(mode==='dual'&&frame%140===0){for(const side of frame%280===0?[0,1]:[1,0]){a._ai(side);b._ai(side);}equal(a,b,'dual AI decisions');}
      const dt=frame%13===0?.017:frame%13===1?.083:.05;a.update(dt);b.update(dt);
      if(frame%100===0)equal(a,b,`${difficulty}/${seed}/${mode}: tick ${frame}`);
      if(frame%997===0){a=Game.restore(a.serialize());b=LegacyGame.restore(b.serialize());equal(a,b,'partial accumulator restore');}
    }
    assert.notEqual(a.state.winner,null);equal(a,b,`${difficulty}/${seed}/${mode}: terminal`);
  }
});
test('Classic overtime, full-frontier upgrades and simultaneous collapse retain complete state',()=>{
  for(const difficulty of ['easy','normal','hard'])for(const side of [0,1])for(const seed of [3,91]){
    const a=new Game({difficulty,seed,ai:false}),b=new LegacyGame({difficulty,seed,ai:false});
    for(const g of [a,b]){
      g.state.buildings=[];g.state.effects=[];g.state.time=299.5;g.state.gold=[100,100];
      for(const owner of [side,1-side])for(const y of LANES)for(const x of xs)g._place(x===1250?'foundry':'barracks',owner?3200-x:x,y,owner);
    }
    equal(a,b,'full 24-site setup');a._ai(side);b._ai(side);equal(a,b,'affordable full-frontier upgrade');
    for(let frame=0;frame<6100&&a.state.winner===null;frame++){
      if(frame%140===0){a._ai(1-side);b._ai(1-side);}a.update(.05);b.update(.05);
      if(frame%100===0)equal(a,b,'overtime/full-frontier state');
    }
    assert.notEqual(a.state.winner,null);equal(a,b,'overtime terminal state');
  }
  const a=new Game({ai:false}),b=new LegacyGame({ai:false});
  for(const g of [a,b]){g.state.buildings=[];g.state.effects=[];g.state.time=419.95;}
  for(let frame=0;frame<3600&&a.state.winner===null;frame++){a.update(.05);b.update(.05);if(frame%100===0)equal(a,b,'collapse');}
  assert.equal(a.state.winner,'draw');equal(a,b,'simultaneous collapse draw');
});
test('Classic historical non-grid placement and restore remain unchanged',()=>{
  const a=new Game({ai:false}),b=new LegacyGame({ai:false});
  for(const g of [a,b]){g.state.gold=[10000,10000];for(const side of [0,1])for(const [x,y] of [[200,180],[1200,310],[700,720],[1320,600]])assert.ok(g.build('barracks',side?3200-x:x,y,side).ok);}
  equal(a,b,'continuous rectangle');equal(Game.restore(a.serialize()),LegacyGame.restore(b.serialize()),'historical non-grid restore');
});
test('all 12 campaign factories and five trials retain identities, simulation and deadline outcomes',async()=>{
  for(const [file,list,factory,evaluate] of [['campaign','CAMPAIGN_MISSIONS','createCampaignMission','evaluateCampaignMission'],['challenges','CHALLENGES','createChallenge','evaluateChallenge']]){
    const current=await import(`../dist/${file}.js`);
    const authored=await readFile(new URL(file==='campaign'?'./fixtures/campaign-v0.9.js':`../dist/${file}.js`,import.meta.url),'utf8');
    if(file==='campaign')assert.equal(createHash('sha256').update(authored).digest('hex'),'8130181e93cd24a4cc0b73b33285892c48c4e29a6a8c5a0d1a39942eed5101b8','frozen original campaign oracle');
    const legacy=await import(dataURL(authored.replace("from './engine.js'",`from '${baselineURL}'`)));
    assert.equal(legacy[list].length,file==='campaign'?12:5);
    assert.deepEqual(current[list].filter(m=>(m.mapId||'classic')==='classic').map(m=>m.id),legacy[list].map(m=>m.id));
    for(const mission of legacy[list]){
      let a=current[factory](mission.id),b=legacy[factory](mission.id);equal(a,b,mission.id+' factory');assert.equal(a.map.id,'classic');
      for(let frame=0;frame<800;frame++){if(frame%120===0){paidActions(a,frame/120);paidActions(b,frame/120);}a.update(.05);b.update(.05);if(frame%100===0)equal(a,b,mission.id+' live state');}
      a=Game.restore(a.serialize());b=LegacyGame.restore(b.serialize());equal(a,b,mission.id+' restore');
      for(const elapsed of [mission.timeLimit-.05,mission.timeLimit]){a.state.time=b.state.time=elapsed;assert.deepEqual(current[evaluate](a,mission.id),legacy[evaluate](b,mission.id),mission.id+' deadline');}
    }
  }
});
test('Classic AI retains exact legacy arithmetic at adjacent floating-point threshold values',()=>{
  const adjacent=(value,direction)=>{const floats=new Float64Array([value]),bits=new BigUint64Array(floats.buffer);bits[0]+=BigInt(direction);return floats[0];};
  for(const difficulty of ['easy','normal','hard'])for(const side of [0,1])for(const distance of [550,1250,1450,1550,1650])for(const direction of [-1,0,1]){
    const threshold=side?3200-distance:distance,x=adjacent(threshold,direction),a=new Game({difficulty,ai:false,seed:92}),b=new LegacyGame({difficulty,ai:false,seed:92});
    for(const g of [a,b]){
      g.state.buildings=[];g.state.effects=[];g.state.time=60;g.state.gold[side]=distance===550?175:1000;
      for(const y of LANES){g._place('barracks',distance===550?x:side?1950:1250,y,side);if(distance!==550)g._place('archery',side?2090:1110,y,side);}
      g._place('barracks',side?1250:1950,260,1-side);
      if(distance!==550)for(let n=0;n<4;n++){const owner=1-side;g._spawn({type:'barracks',side:owner,x:x-(owner?-48:48),lane:0,level:1});g.state.units.at(-1).x=x;}
      g._ai(side);
    }
    equal(a,b,`${difficulty}/side ${side}/home threshold ${distance}/adjacent ${direction}`);
  }
});
