import test from 'node:test';
import assert from 'node:assert/strict';
import {Renderer} from '../dist/render.js';
import {Game} from '../dist/engine.js';
import {installCanvas,makeRenderer} from './renderer-canvas.mjs';
test('citadel status badge fits either visible battlefield edge and stays absent for an offscreen base',()=>{
  installCanvas();
  for(const width of [320,667,844,1180])for(const side of [0,1])for(const choice of ['arrows','regen']){
    const r=makeRenderer(Renderer,width,244),g=new Game({rulesetId:'frontier-citadel-open',ai:false});
    g.state.time=90;g.tick=1800;assert.ok(g.buyCitadelOption(choice,side).ok);
    r.camera=side?g.map.width-450:450;r.clampCamera();r.canvas.reset();r.drawBase(g.state.bases[side],g);
    const badge=r.canvas.calls.find(c=>c[0]==='fillText'&&/^(REGEN|EXTRA ARROW)/.test(c[1]));assert.ok(badge);
    const center=r.worldToScreen(g.state.bases[side].x+badge[2],450).x;
    const paintedWidth=(r.c.measureText(badge[1]).width+14)*r.scale;
    assert.ok(center-paintedWidth/2>=3.99);assert.ok(center+paintedWidth/2<=width-3.99);
    if(width!==320)continue;
    r.camera=g.map.width/2;r.canvas.reset();r.drawBase(g.state.bases[side],g);
    assert.equal(r.canvas.calls.some(c=>c[0]==='fillText'&&/^(REGEN|EXTRA ARROW)/.test(c[1])),false);
  }
});
