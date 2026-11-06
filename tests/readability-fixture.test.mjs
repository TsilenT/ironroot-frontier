import { assertHistoricalEngineOracle, readHistoricalProduction } from './engine-validation-source.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {Renderer as Candidate} from '../dist/render.js';
import {Game} from '../dist/engine.js';
import {createSyntheticScene} from '../qa/readability/scenes.js';
import {installCanvas,makeRenderer} from './renderer-canvas.mjs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const hash=value=>createHash('sha256').update(value).digest('hex');
const manifest=JSON.parse(read('qa/readability/baseline-manifest.json'));

test('synthetic baseline has exact pinned provenance with only the documented two import substitutions',()=>{
  const frozen=JSON.parse(read('BASELINE_V012_FROZEN.json'));
  let original=read('qa/readability/baseline-render.js');
  assert.equal(hash(original),manifest.fixture['baseline-render.js']);
  for(const change of manifest.substitutions){assert.equal(original.split(change.to).length,2);original=original.replace(change.to,change.from);}
  assert.equal(hash(original),manifest.source['dist/render.js']);
  assert.equal(hash(read('qa/readability/baseline-vfx.js')),manifest.source['dist/vfx.js']);
  for(const [file,digest]of Object.entries(manifest.source))assert.equal(digest,frozen.files[file],file);
  // Reconstruct the original source only from historical production, never from the evolving engine.
  const frozenEngine=assertHistoricalEngineOracle();
  assert.equal(hash(frozenEngine),manifest.source['dist/engine.js']);
});

test('accepted historical clarity renderer and VFX retain their reviewed byte pins',()=>{
  // Current rendering now supports versioned rosters. active-roster-views tests
  // compare its legacy draw commands with this immutable accepted oracle.
  const reviewed=JSON.parse(read('qa/readability/reviewed-manifest.json'));
  for(const file of ['render.js','vfx.js'])
    assert.equal(hash(readFileSync(new URL('../qa/fixtures/accepted-clarity/'+file,import.meta.url))),reviewed.runtime.files[file],file);
  const runtime=readdirSync(new URL('../dist',import.meta.url));
  assert.ok(!runtime.some(name=>name.startsWith('__qa')||name.startsWith('baseline-')));
});

test('every synthetic scene is deterministic, bounded, both-team and labelled as non-played evidence',()=>{
  for(const mode of ['roster','dense','placement','occupied'])for(const phase of [.2,.45,.7]){
    const a=createSyntheticScene(Game,mode,phase),b=createSyntheticScene(Game,mode,phase);
    assert.deepEqual(a.game.serialize(),b.game.serialize());
    assert.equal(a.game.state.time,18);assert.ok(a.game.state.units.length<=140);
    for(const side of [0,1])assert.ok(a.game.state.units.filter(u=>u.side===side).length<=70);
    assert.ok(a.game.state.effects.length<=6);assert.ok(a.game.state.projectiles.length<=4);
    if(mode==='roster'||mode==='dense')for(const side of [0,1])assert.equal(new Set(a.game.state.units.filter(u=>u.side===side).map(u=>u.type)).size,5);
    if(a.ui.build)assert.equal(a.game.canBuild(a.ui.build,a.ui.pointer.x,a.ui.pointer.y).ok,mode==='placement');
  }
  const html=read('qa/readability/index.html'),script=read('qa/readability/fixture.js');
  assert.match(html,/synthetic/i);assert.match(html,/not played outcomes/);assert.match(html,/not device viewport/);
  assert.doesNotMatch(script,/localStorage|sessionStorage|fetch\(|serviceWorker|\.update\(dt/);
  assert.doesNotMatch(read('dist/service-worker.js'),/__qa_readability|baseline-render|scenes\.js/);
});

test('comparison feeds both renderers identical immutable scenes, sizes, cameras and effect settings',async()=>{
  let source=read('qa/readability/baseline-render.js');
  // Node-only loader mirrors the two browser mount routes. It does not write files.
  source=source.replace("'../engine.js'",JSON.stringify(new URL('../dist/engine.js',import.meta.url).href));
  source=source.replace("'./baseline-vfx.js'",JSON.stringify(new URL('../qa/readability/baseline-vfx.js',import.meta.url).href));
  const {Renderer:Baseline}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
  installCanvas();const renderers=[makeRenderer(Baseline),makeRenderer(Candidate)];
  for(const mode of ['roster','dense','placement','occupied'])for(const [width,height,practice] of [[320,220,false],[390,302,false],[844,240,false],[1180,757,false],[534,190,true]])for(const quality of ['low','high'])for(const motion of [false,true]){
    const {game,ui,camera}=createSyntheticScene(Game,mode,.45),before=game.serialize();
    for(const r of renderers){
      r.canvas.rect={width,height};r.resize();if(practice)r.scale=Math.max(.12,height/900);
      r.camera=camera;r.clampCamera();r.reducedMotion=motion;
      r.vfx.reset();r.vfx.setPreferences({quality,reducedMotion:motion});r.vfx.update(game.state.effects,0);
      for(let i=0;i<9;i++)r.vfx.update([],.05);
      r.canvas.reset();r.mini.reset();r.draw(game,ui,0);
      assert.deepEqual(game.serialize(),before);assert.equal(r.canvas.depth(),0);assert.equal(r.mini.depth(),0);
    }
    const[a,b]=renderers;assert.equal(a.camera,b.camera);assert.equal(a.scale,b.scale);
    assert.deepEqual(a.vfx.particles,b.vfx.particles);assert.deepEqual(a.mini.calls,b.mini.calls);
  }
});
