import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../dist/engine.js';
import {startupHarness} from './mobile-startup-fixture.mjs';

for(const ownership of ['current','stale'])test(`verified restart keeps its ownership state when ${ownership}`,()=>{
  const h=startupHarness({width:1180,height:757}),retained=h.c.game;
  const candidate=new Game({difficulty:'easy',seed:732,ai:false});
  h.c.mode='skirmish';h.c.started=true;h.c.paused=true;
  h.c.battleSession.status=()=>ownership;
  h.c.start(candidate,null,null,{fresh:true});
  assert.equal(h.log.claims,0,'restart never claims an unrelated checkpoint');
  if(ownership==='stale'){
    assert.equal(h.c.game,retained,'ownership loss preserves the retained game object');
    assert.equal(h.c.paused,true);assert.equal(h.log.saves,0);
    assert.match(h.$('restartStatus').textContent,/checkpoint changed/);
  }else{
    assert.equal(h.c.game,candidate);assert.equal(h.c.paused,false);assert.equal(h.log.saves,1);
  }
});
