// Intended only for a temporary candidate /__qa_readability/ mount. Never precache.
import {Renderer as Current} from '../render.js';
import {Game} from '../engine.js';
import {Renderer as Baseline} from './baseline-render.js';
import {createSyntheticScene} from './scenes.js';
const $=id=>document.getElementById(id);
const renderers=[new Baseline($('before'),$('beforeMini')),new Current($('after'),$('afterMini'))];
function draw() {
  try {
    const [width,height]=$('size').value.split(',').map(Number),phase=Number($('phase').value);
    const {game,ui,camera}=createSyntheticScene(Game,$('scene').value,phase),before=JSON.stringify(game.serialize());
    for(const r of renderers) {
      r.canvas.style.width=`${width}px`;r.canvas.style.height=`${height}px`;r.resize();
      if($('practice').checked)r.scale=Math.max(.12,height/game.map.height)*r.zoom;
      r.camera=camera;r.clampCamera();r.setTheme($('theme').value);r.reducedMotion=$('motion').checked;
      r.vfx.reset();r.vfx.setPreferences({quality:$('quality').value,reducedMotion:r.reducedMotion});
      r.vfx.update(game.state.effects,0);
      for(let elapsed=0;elapsed<phase-.00001;elapsed+=.05)r.vfx.update([],Math.min(.05,phase-elapsed));
      r.draw(game,ui,0);
    }
    const [a,b]=renderers;
    if(JSON.stringify(game.serialize())!==before)throw Error('Renderer changed the synthetic engine state.');
    if(a.camera!==b.camera||a.scale!==b.scale)throw Error('Camera/scale comparison differs.');
    document.body.classList.toggle('grey',$('grey').checked);
    $('rosterLabels').hidden=$('scene').value!=='roster';
    $('status').textContent=`Synthetic ${$('scene').value}: ${width} × ${height} CSS px; world scale ${a.scale.toFixed(4)}; camera ${a.camera.toFixed(1)}; ${game.state.units.length} troops. Engine-state bytes unchanged. Both particle counts: ${a.vfx.getStats().particles} / ${b.vfx.getStats().particles}. Frozen poses, no simulation running.`;
    $('error').textContent='';
  } catch(error) {$('error').textContent=`Comparison blocked: ${error.message}`;}
}
for(const control of document.querySelectorAll('select,input'))control.addEventListener('change',draw);
await document.fonts.ready;draw();
