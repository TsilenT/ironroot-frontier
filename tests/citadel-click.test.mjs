import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createContext,runInContext} from 'node:vm';
import {supportsCitadelOptions} from '../dist/citadel-options.js';
import {Renderer} from '../dist/render.js';
import {FogRenderer,observationFacade} from '../dist/fog-view.js';
import {observe,FOG_SKIRMISH_RULESET_ID} from '../dist/fog.js';
import {Game} from '../dist/engine.js';
import {installCanvas,makeRenderer} from './renderer-canvas.mjs';

const scene = (width=390,height=244,rulesetId='frontier-citadel-open') => {
  installCanvas();
  const renderer=makeRenderer(Renderer,width,height),game=new Game({rulesetId,ai:false});
  renderer.camera=450;renderer.clampCamera();
  return {renderer,game,base:game.state.bases[0]};
};
test('home citadel picking covers flag, towers, gate and health, not nearby construction or enemy',()=>{
  for(const mapId of ['classic','long-march','twin-span']) {
    const {renderer}=scene(),game=new Game({mapId,rulesetId:'frontier-citadel-open',ai:false}),base=game.state.bases[0];
    for(const [x,y] of [[0,-145],[-57,-100],[57,-100],[0,20],[0,70],[0,87]])
      assert.ok(renderer.hitCitadel({x:base.x+x,y:base.y+y},game),`${mapId} ${x},${y}`);
    for(const point of [{x:270,y:450},{x:base.x,y:base.y-151},game.state.bases[1],{x:NaN,y:450}])
      assert.equal(renderer.hitCitadel(point,game),false);
    base.hp=0;assert.equal(renderer.hitCitadel(base,game),false);
  }
});
test('upgrade badge is visible, edge-clamped and clickable at desktop and phone sizes',()=>{
  for(const width of [320,390,844,1180]) {
    const {renderer,game,base}=scene(width),badge=renderer.citadelBadge(base,game);
    assert.equal(badge.label,'UPGRADES');
    const left=renderer.worldToScreen(base.x+badge.x-badge.width/2,base.y).x;
    const right=renderer.worldToScreen(base.x+badge.x+badge.width/2,base.y).x;
    assert.ok(left>=3.99);assert.ok(right<=width-3.99);
    for(const dx of [-badge.width/2,0,badge.width/2])
      assert.ok(renderer.hitCitadel({x:base.x+badge.x+dx,y:base.y+100},game));
    renderer.canvas.reset();renderer.drawBase(base,game);
    assert.ok(renderer.canvas.calls.some(c=>c[0]==='fillText'&&c[1]==='UPGRADES'));
    assert.equal(renderer.citadelBadge(game.state.bases[1],game),null);
  }
});
test('purchased badge keeps the actual status, legacy/ended/offscreen bases do not advertise upgrades',()=>{
  const {renderer,game,base}=scene();
  assert.ok(game.buyCitadelOption('arrows').ok);
  assert.equal(renderer.citadelBadge(base,game).label,'EXTRA ARROW');
  const legacy=new Game({ai:false});
  assert.equal(renderer.citadelBadge(legacy.state.bases[0],legacy),null);
  const fresh=new Game({rulesetId:'frontier-citadel-open',ai:false});fresh.state.winner=0;
  assert.equal(renderer.citadelBadge(fresh.state.bases[0],fresh),null);
  renderer.camera=game.map.width/2;
  assert.equal(renderer.citadelBadge(base,game),null);
});
test('citadel selection remains behind command guards and after explicit build/spell targeting',()=>{
  const app=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
  const block=app.slice(app.indexOf('function activateBattlePoint('),app.indexOf('function resetBattleGesture('));
  assert.ok(block.indexOf('!canInteract()')<block.indexOf('renderer.hitCitadel'));
  assert.ok(block.indexOf("battleSession.status() === 'stale'")<block.indexOf('renderer.hitCitadel'));
  assert.ok(block.indexOf('dialogLayers.some')<block.indexOf('renderer.hitCitadel'));
  assert.ok(block.indexOf('if (ui.build)')<block.indexOf('renderer.hitCitadel'));
  assert.ok(block.indexOf('else if (ui.spell)')<block.indexOf('renderer.hitCitadel'));
  assert.match(block,/citadelDialogSafe\(\) && renderer\.hitCitadel\(w, battleView\(\), 0\)/);
});

test('fog home upgrades use detached own data while enemy health and choice remain hidden',()=>{
  installCanvas();
  const renderer=makeRenderer(FogRenderer,390,300),game=new Game({rulesetId:FOG_SKIRMISH_RULESET_ID,ai:false});
  renderer.camera=450;renderer.clampCamera();
  const view=observationFacade(observe(game,0)),base=view.state.bases[0];
  assert.equal(view.state.bases[1].hp,null);
  assert.equal(renderer.citadelBadge(base,view).label,'UPGRADES');
  assert.ok(renderer.hitCitadel(base,view,0));
  assert.equal(renderer.hitCitadel(view.state.bases[1],view,1),false);
  renderer.canvas.reset();renderer.drawBase(base,view);
  assert.ok(renderer.canvas.calls.some(c=>c[0]==='fillText'&&c[1]==='UPGRADES'));
  game.state.gold[1]=9000;game.state.bases[1].hp=500;game.buyCitadelOption('regen',1);
  assert.deepEqual(renderer.citadelBadge(base,view),renderer.citadelBadge(base,observationFacade(observe(game,0))));
});

test('real battlefield command opens only the own citadel and rejects every interrupted state',()=>{
  const source=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
  const section=(a,b)=>source.slice(source.indexOf(a),source.indexOf(b,source.indexOf(a)));
  const make=()=>{
    const {renderer,game,base}=scene();let opened=0;
    const c={renderer,game,supportsCitadelOptions,started:true,paused:false,coachingHold:false,firstBuildHold:false,
      recoveryHold:false,profileGate:false,objectiveOutcome:null,battleSafetyReason:null,
      document:{hidden:false},viewportPause:{active:false},battleSession:{status:()=> 'current'},
      ui:{build:null,spell:false},dialogLayers:[], $:id=>({classList:{contains:name=>id==='coachingModal'&&name==='hidden'}}),
      battleView:()=>game,refreshPresentation(){},supportsFog:()=>false,updateSelection(){},
      requestAnimationFrame(){},sound(){},showCitadelOptions(){opened++;c.paused=true;}};
    createContext(c);
    for(const [a,b] of [['function canInteract()','function selectBuild('],['function citadelDialogSafe()','function updateCitadelUI()'],['function activateBattlePoint(','function resetBattleGesture(']])
      runInContext(section(a,b),c);
    return {c,base,count:()=>opened};
  };
  const own=make();own.c.activateBattlePoint(own.base);assert.equal(own.count(),1);
  own.c.activateBattlePoint(own.base);assert.equal(own.count(),1,'repeated release cannot cross the new pause/dialog');
  const enemy=make();enemy.c.activateBattlePoint(enemy.c.game.state.bases[1]);assert.equal(enemy.count(),0);
  for(const interrupt of [c=>c.paused=true,c=>c.document.hidden=true,c=>c.coachingHold=true,
    c=>c.firstBuildHold=true,c=>c.recoveryHold=true,c=>c.profileGate=true,c=>c.viewportPause.active=true,
    c=>c.battleSafetyReason='limit',c=>c.game._limitFor=()=> 'limit',c=>c.game.state.winner=0,
    c=>c.objectiveOutcome={won:true},c=>c.battleSession.status=()=> 'stale',
    c=>c.dialogLayers=[{classList:{contains:()=>false}}]]) {
    const h=make();interrupt(h.c);h.c.activateBattlePoint(h.base);assert.equal(h.count(),0);
  }
});
