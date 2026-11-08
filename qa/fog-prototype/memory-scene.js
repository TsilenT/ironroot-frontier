import { FogRenderer } from '../../dist/fog-view.js';
import { MEMORY_STAGES, memoryScene, describeMemoryScene, memoryTime } from './memory-scenarios.js';
import { PointerGuard } from './controls.js';
const $ = id => document.getElementById(id);
const renderer = new FogRenderer($('memoryBattle'), $('memoryMinimap'));
const gesture = new PointerGuard();
let stage = 0, view = memoryScene(0), paused = true, last = performance.now();
for (const [i, label] of MEMORY_STAGES.entries()) { const option = document.createElement('option'); option.value = i; option.textContent = `${i + 1}. ${label}`; $('stage').append(option); }
function updateDescription() {
  $('stage').value = String(stage); $('stageTitle').textContent = `${stage + 1}. ${MEMORY_STAGES[stage]}`;
  $('sceneTag').textContent = `Synthetic · ${MEMORY_STAGES[stage]} · ${memoryTime(view.state.time)}`;
  $('previous').disabled = stage === 0; $('next').disabled = stage === MEMORY_STAGES.length - 1;
  $('observation').replaceChildren(...describeMemoryScene(view).map(text => { const li = document.createElement('li'); li.textContent = text; return li; }));
}
function setStage(index) { stage = index; view = memoryScene(stage); renderer.resetObservation(); gesture.invalidate(); updateDescription(); }
function camera(x) { renderer.camera = x; renderer.clampCamera(); gesture.invalidate(); }
$('stage').addEventListener('change', () => setStage(Number($('stage').value)));
$('previous').addEventListener('click', () => setStage(Math.max(0, stage - 1)));
$('next').addEventListener('click', () => setStage(Math.min(MEMORY_STAGES.length - 1, stage + 1)));
$('animation').addEventListener('click', () => { paused = !paused; $('animation').textContent = paused ? 'Animation paused' : 'Pause animation'; $('animation').setAttribute('aria-pressed', String(paused)); });
$('sceneCamera').addEventListener('click', () => camera(1900));
$('homeCamera').addEventListener('click', () => camera(600));
$('enemyCamera').addEventListener('click', () => camera(3000));
$('memoryMinimap').addEventListener('click', event => { const rect = $('memoryMinimap').getBoundingClientRect(); camera((event.clientX - rect.left) / rect.width * view.map.width); });
$('memoryBattle').addEventListener('pointerdown', event => { if (event.button !== 0) return; gesture.down(event.pointerId, event.clientX, event.clientY); $('memoryBattle').setPointerCapture(event.pointerId); });
$('memoryBattle').addEventListener('pointermove', event => { const move = gesture.move(event.pointerId, event.clientX, event.clientY); if (move.pan) renderer.pan(move.pan); });
$('memoryBattle').addEventListener('pointerup', event => { gesture.up(event.pointerId, event.clientX, event.clientY); if ($('memoryBattle').hasPointerCapture(event.pointerId)) $('memoryBattle').releasePointerCapture(event.pointerId); });
for (const name of ['pointercancel', 'lostpointercapture']) $('memoryBattle').addEventListener(name, event => gesture.cancel(event.pointerId));
for (const id of ['memoryBattle', 'memoryMinimap']) $(id).addEventListener('keydown', event => { if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return; event.preventDefault(); renderer.pan(event.key === 'ArrowLeft' ? 100 : -100); });
new ResizeObserver(() => { renderer.resize(); gesture.invalidate(); }).observe($('memoryBattle'));
renderer.camera = 1900; renderer.clampCamera(); updateDescription();
function frame(now) { const dt = Math.min(.1, (now - last) / 1000); last = now; renderer.draw(view, { paused, selected: null, build: null, spell: false, pointer: null }, dt); requestAnimationFrame(frame); }
requestAnimationFrame(frame);
