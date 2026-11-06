// Temporary candidate /__qa_combat_feedback/ mount only. Never precache.
import { Renderer as Current } from '../render.js';
import { Game } from '../engine.js';
import { Renderer as Baseline } from './baseline-render.js';
import { createCombatScene } from './scenes.js';
const $ = id => document.getElementById(id);
const renderers = [new Baseline($('before'), $('beforeMini')), new Current($('after'), $('afterMini'))];
function draw() {
  try {
    const [width, height] = $('size').value.split(',').map(Number);
    const elapsed = Number($('elapsed').value);
    const { game, ui, camera } = createCombatScene(Game, {
      mode: $('scene').value, role: $('role').value, side: $('side').value, event: $('event').value, elapsed,
    });
    const before = JSON.stringify(game.serialize()), state = JSON.stringify(game.state), seed = game.seed;
    for (const r of renderers) {
      r.canvas.style.width = `${width}px`; r.canvas.style.height = `${height}px`; r.resize();
      if ($('practice').checked) r.scale = Math.max(.12, height / game.map.height) * r.zoom;
      r.camera = camera; r.clampCamera(); r.setTheme($('theme').value); r.reducedMotion = $('motion').checked;
      r.vfx.reset(); r.vfx.setPreferences({ quality: $('quality').value, reducedMotion: r.reducedMotion });
      r.draw(game, ui, 0);
    }
    const [a, b] = renderers;
    if (JSON.stringify(game.serialize()) !== before || JSON.stringify(game.state) !== state || game.seed !== seed)
      throw Error('Renderer changed the synthetic state or RNG.');
    if (a.camera !== b.camera || a.scale !== b.scale) throw Error('Camera/scale comparison differs.');
    document.body.classList.toggle('grey', $('grey').checked);
    $('rosterLabels').hidden = $('scene').value !== 'roster';
    $('status').textContent = `Synthetic ${$('scene').value}: ${width} × ${height} CSS px; scale ${a.scale.toFixed(4)}; camera ${a.camera.toFixed(1)}; ${game.state.units.length} troops. ${Math.round(elapsed * 1000)} ms after contact. State and RNG unchanged. Frozen poses, no simulation running.`;
    $('error').textContent = '';
  } catch (error) { $('error').textContent = `Comparison blocked: ${error.message}`; }
}
for (const control of document.querySelectorAll('select,input')) control.addEventListener('change', draw);
$('step').addEventListener('click', () => {
  const elapsed = $('elapsed'); elapsed.selectedIndex = (elapsed.selectedIndex + 1) % elapsed.options.length; draw();
});
await document.fonts.ready; draw();
