import {Game, SPELL} from './dist/engine.js';
import {Renderer} from './dist/render.js';
import {createColossusScenario} from './dist/colossus-scenario.js';

const $ = id => document.getElementById(id), renderer = new Renderer($('field'), $('mini'));
const ui = {paused: false, build: null, selected: null, pointer: null, dragging: false, spell: false};
let game, speed = 1, last = performance.now(), previousPhase = 'armed', staged = true;
const notice = text => { $('notice').textContent = text; };
const act = result => notice(result.ok ? result.reason || 'Done.' : result.reason || 'Action unavailable.');
function contract() {
  $('contract').textContent = $('mode').value === 'aftermath'
    ? 'Aftermath mode: the enemy citadel can die normally. A deployed boss must also die while your citadel survives. The fight continues after the enemy core falls.'
    : 'Core-race comparison: destroying the enemy citadel still ends the match, even if the boss is alive. This can cut the spectacle short.';
}
function controls() {
  $('builds').replaceChildren();
  for (const [type, d] of Object.entries(game.buildings)) {
    const button = document.createElement('button'); button.textContent = `${d.name} · ${d.cost}`; button.dataset.type = type;
    button.onclick = () => {ui.build = ui.build === type ? null : type; ui.spell = false; ui.selected = null; refreshCards(); notice(ui.build ? 'Choose a marked site in your territory.' : 'Build cancelled.');};
    $('builds').append(button);
  }
  const volley = document.createElement('button'); volley.dataset.type = 'volley'; volley.textContent = `Arrow volley · ${SPELL.cost}`;
  volley.onclick = () => {ui.spell = !ui.spell; ui.build = null; refreshCards(); notice(ui.spell ? 'Choose a point on the battlefield.' : 'Volley cancelled.');};
  $('builds').append(volley);
}
function refreshCards() {
  for (const button of $('builds').children) button.classList.toggle('active', button.dataset.type === (ui.spell ? 'volley' : ui.build));
}
function start(isStaged) {
  staged = isStaged; game = createColossusScenario({mode: $('mode').value, staged, seed: 101});
  ui.paused = false; ui.build = null; ui.selected = null; ui.spell = false; previousPhase = 'armed';
  $('pause').textContent = 'Pause'; renderer.camera = staged ? 2650 : 950; renderer.clampCamera();
  controls(); contract(); notice(staged ? 'Synthetic late-battle snapshot. The boss should emerge shortly.' : 'Fresh authored assault. Build and upgrade with ordinary gold.');
}
$('pause').onclick = () => {ui.paused = !ui.paused; $('pause').textContent = ui.paused ? 'Continue' : 'Pause';};
$('speed').onclick = () => {speed = speed === 1 ? 2 : 1; $('speed').textContent = `${speed}×`;};
$('staged').onclick = () => start(true); $('fresh').onclick = () => start(false);
$('mode').onchange = () => start(staged);
$('focus').onclick = () => {renderer.camera = game.state.units.find(u => u.type === 'colossus')?.x ?? game.state.bases[1].x; renderer.clampCamera();};
$('save').onclick = () => {try {sessionStorage.setItem('ironroot.colossus.lab.v1', JSON.stringify({mode: game.ruleset.id.endsWith('aftermath') ? 'aftermath' : 'core-race', staged, game: game.serialize()})); notice('Saved to this lab tab only.');} catch {notice('Lab save failed. The current battle is still open.');}};
$('load').onclick = () => {
  try {
    const saved = JSON.parse(sessionStorage.getItem('ironroot.colossus.lab.v1'));
    if (!saved || !['aftermath', 'core-race'].includes(saved.mode) || typeof saved.staged !== 'boolean' || saved.game?.rulesetId !== `frontier-qa-colossus-${saved.mode}`) throw Error('Bad lab envelope');
    const restored = Game.restore(saved.game); game = restored; staged = saved.staged; $('mode').value = saved.mode;
    previousPhase = game.state.colossus.phase; controls(); contract(); notice('Resumed the exact lab snapshot. No production profile was read.');
  } catch {notice('No compatible lab save. Existing bytes were left untouched.');}
};
$('upgrade').onclick = () => act(game.upgrade(ui.selected));
$('sell').onclick = () => {const result = game.sell(ui.selected); if (result.ok) ui.selected = null; act(result);};
$('regen').onclick = () => act(game.buyCitadelOption('regen'));
$('arrows').onclick = () => act(game.buyCitadelOption('arrows'));
let down = null;
const point = event => {const rect = $('field').getBoundingClientRect(); return renderer.screenToWorld(event.clientX - rect.left, event.clientY - rect.top);};
$('field').onpointerdown = event => {down = {x: event.clientX, y: event.clientY, camera: renderer.camera}; $('field').setPointerCapture(event.pointerId);};
$('field').onpointermove = event => {
  ui.pointer = point(event);
  if (down && Math.hypot(event.clientX - down.x, event.clientY - down.y) > 7) {ui.dragging = true; renderer.camera = down.camera - (event.clientX - down.x) / renderer.scale; renderer.clampCamera();}
};
$('field').onpointerup = event => {
  if (!down) return;
  if (!ui.dragging) {
    const p = point(event);
    if (ui.build) {const q = renderer.snap(p); act(game.build(ui.build, q.x, q.y));}
    else if (ui.spell) act(game.cast(p.x, p.y));
    else ui.selected = game.state.buildings.filter(b => b.side === 0 && b.hp > 0).find(b => Math.hypot(b.x - p.x, b.y - p.y) < 70)?.id ?? null;
  }
  down = null; ui.dragging = false;
};
$('field').onpointercancel = () => {down = null; ui.dragging = false;};
$('mini').onpointerdown = event => {const rect = $('mini').getBoundingClientRect(); renderer.camera = (event.clientX - rect.left) / rect.width * game.map.width; renderer.clampCamera();};
window.addEventListener('keydown', event => {
  if (/INPUT|SELECT|TEXTAREA/.test(event.target.tagName)) return;
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {event.preventDefault(); renderer.pan(event.key === 'ArrowLeft' ? 100 : -100);}
  if (event.key === 'Escape') {ui.build = null; ui.spell = false; ui.selected = null; refreshCards();}
});
window.addEventListener('resize', () => renderer.resize());
const media = matchMedia('(prefers-reduced-motion: reduce)');
media.addEventListener('change', () => {renderer.reducedMotion = media.matches; renderer.vfx.setPreferences({reducedMotion: media.matches});});
start(true);
function animate(now) {
  const dt = Math.min(.1, Math.max(0, (now - last) / 1000)); last = now;
  if (!ui.paused && game.state.winner === null) game.update(dt * speed);
  const s = game.state, phase = s.colossus, boss = s.units.find(u => u.type === 'colossus');
  if (phase.phase !== previousPhase) {
    if (phase.phase === 'active') {notice('THE LAST ENGINE. Every road can hit its body. It will not stop for defenders.'); renderer.camera = boss.x; renderer.clampCamera();}
    if (phase.phase === 'defeated') notice('The Last Engine has fallen.');
    previousPhase = phase.phase;
  }
  const result = s.winner === null ? '' : s.winner === 0 ? ' · VICTORY' : s.winner === 1 ? ' · DEFEAT' : ' · DRAW';
  $('status').textContent = `${Math.floor(s.time / 60)}:${Math.floor(s.time % 60).toString().padStart(2, '0')} · ${Math.floor(s.gold[0])} gold · Your citadel ${Math.ceil(s.bases[0].hp)} · Enemy ${Math.ceil(s.bases[1].hp)}${s.overtime ? ' · 5:00 escalation active' : ''}${result}`;
  $('bossbar').hidden = !boss;
  if (boss) {$('bosshp').value = boss.hp; $('bossnumber').textContent = `${Math.ceil(boss.hp).toLocaleString()} / 10,000`;}
  renderer.draw(game, ui, dt);
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
