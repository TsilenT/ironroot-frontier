import { Game, SPELL, DEFAULT_SKIRMISH_RULESET_ID } from '../../dist/engine.js';
import { FOG_RULESET_ID, observe } from '../../dist/fog.js';
import { FogRenderer, observationFacade, observationHUD, ObservationAudio, pointInObservation } from '../../dist/fog-view.js';
import { GameAudio } from '../../dist/audio.js';
import { PointerGuard } from './controls.js';

// This page owns only an in-memory battle. No app/profile/persistence imports.
const $ = id => document.getElementById(id);
const renderer = new FogRenderer($('battle'), $('minimap'));
const audio = new GameAudio({ muted: true });
const audioProjection = new ObservationAudio(), pointerGuard = new PointerGuard();
const ui = { paused: true, build: null, spell: false, selected: null, pointer: null, dragging: false };
let game = null, view = null, config = null, follow = false, modal = null, modalWasPaused = true;
let lastTime = performance.now(), lastHUD = -1, finished = false;

function notice(text) { $('notice').textContent = text; $('notice').title = text; }
function refresh() { if (game) view = observationFacade(observe(game, 0)); }
function invalidatePointer() { pointerGuard.invalidate(); ui.dragging = false; ui.pointer = null; }
function clearOrders() {
  invalidatePointer(); ui.build = null; ui.spell = false; ui.selected = null;
  $('buildMenu').classList.remove('active'); $('volley').classList.remove('active'); $('cancel').disabled = true; $('selection').hidden = true;
}
function canAct() { return !!view && !ui.paused && !modal && view.state.winner === null; }
function updatePause() {
  const ended = view?.state.winner !== null && !!view;
  $('pause').disabled = !game || ended; $('pause').textContent = ui.paused ? 'Resume' : 'Pause';
  $('pauseVeil').hidden = !game || (!ui.paused && !ended) || !!modal;
  $('pauseText').textContent = ended ? (view.state.winner === 0 ? 'Victory · full reveal' : view.state.winner === 1 ? 'Defeat · full reveal' : 'Draw · full reveal') : 'Paused';
  $('resume').hidden = ended;
  for (const id of ['buildMenu', 'volley', 'citadel']) $(id).disabled = !game || ended || ui.paused || !!modal;
  audio.setScene(!game ? 'menu' : ui.paused || document.hidden || modal ? 'paused' : ended ? view.state.winner === 0 ? 'victory' : 'defeat' : 'battle');
}
function setPaused(paused) {
  if (!game || modal || view.state.winner !== null) return;
  ui.paused = paused; clearOrders(); updatePause();
  notice(paused ? 'Paused. No orders are spent while paused.' : 'Battle resumed.');
}
function showModal(id) {
  if (modal) return;
  modal = $(id); modalWasPaused = ui.paused; ui.paused = true; invalidatePointer();
  updatePause(); modal.showModal();
}
function closeModal(resumeForOrder = false) {
  if (!modal) return;
  const dialog = modal; modal = null; dialog.close();
  // Closing a panel is never implicit permission to resume after an interruption.
  // Choosing a build is the only deliberate order-selection resume path.
  ui.paused = game ? modalWasPaused || resumeForOrder !== true : true;
  invalidatePointer(); updatePause();
  if (game && ui.paused) notice('Paused. Choose Resume when ready.');
}
for (const id of ['setup', 'buildDialog', 'citadelDialog', 'helpDialog']) {
  $(id).addEventListener('cancel', event => { event.preventDefault(); closeModal(); });
}

function startBattle(next) {
  closeModal(); config = { ...next };
  game = new Game({ difficulty: config.difficulty, seed: config.seed, mapId: 'classic', rulesetId: config.fog ? FOG_RULESET_ID : DEFAULT_SKIRMISH_RULESET_ID });
  clearOrders(); ui.paused = false; finished = false; follow = false; lastHUD = -1;
  renderer.resetObservation(); audioProjection.reset(); renderer.zoom = 1; renderer.setMap('classic'); renderer.resize(); renderer.camera = 600; renderer.clampCamera();
  refresh(); $('restart').disabled = false;
  $('modeLabel').textContent = `${config.fog ? 'Fog on · ' : 'Fog off · '}Classic · Open-ended · No bridge income`;
  updateHUD(true); updatePause(); audio.play('start');
  notice(config.fog ? 'Fog on. Build forward to extend sight. Volley needs a visible center.' : 'Fog off. Choose Build, then tap a site. Troops march automatically.');
}
$('start').addEventListener('click', () => {
  const seed = Number($('seed').value);
  if (!Number.isInteger(seed) || seed < 1 || seed > 4294967295) { notice('Choose a whole-number seed from 1 to 4294967295.'); $('seed').reportValidity(); return; }
  startBattle({ fog: $('fogEnabled').checked, difficulty: $('difficulty').value, seed });
});
$('restart').addEventListener('click', () => { if (config) startBattle(config); });
$('setupButton').addEventListener('click', () => showModal('setup'));
$('closeSetup').addEventListener('click', closeModal);
$('pause').addEventListener('click', () => setPaused(!ui.paused));
$('resume').addEventListener('click', () => setPaused(false));
$('help').addEventListener('click', () => showModal('helpDialog'));
$('closeHelp').addEventListener('click', closeModal);
$('cancel').addEventListener('click', () => { clearOrders(); notice('Order cancelled. No gold spent.'); });

function home() { follow = false; renderer.camera = 600; renderer.clampCamera(); }
function front() { if (view) { follow = true; renderer.camera = view.fog.frontX; renderer.clampCamera(); } }
function zoomBy(amount) { renderer.zoom = Math.max(.7, Math.min(1.7, renderer.zoom + amount)); renderer.resize(); invalidatePointer(); }
$('home').addEventListener('click', home); $('front').addEventListener('click', front);
$('zoomOut').addEventListener('click', () => zoomBy(-.15)); $('zoomIn').addEventListener('click', () => zoomBy(.15));
$('sound').addEventListener('click', async () => {
  const muted = !audio.muted;
  if (!muted && !await audio.unlock()) { notice('Sound is unavailable in this browser.'); return; }
  audio.setMuted(muted); $('sound').textContent = muted ? 'Sound off' : 'Sound on'; $('sound').setAttribute('aria-pressed', String(!muted));
});

$('buildMenu').addEventListener('click', () => {
  if (!canAct()) return;
  clearOrders(); const list = $('buildList'); list.replaceChildren();
  for (const [type, definition] of Object.entries(view.buildings)) {
    const button = document.createElement('button'); button.type = 'button'; button.dataset.building = type;
    const title = document.createElement('span'); title.textContent = `${definition.name} · ${definition.cost}`;
    const detail = document.createElement('small'); detail.textContent = definition.description;
    button.append(title, detail);
    button.addEventListener('click', () => {
      closeModal(true); clearOrders(); ui.build = type; $('buildMenu').classList.add('active'); $('cancel').disabled = false;
      notice(`${definition.name}: tap a site in your territory. Cost ${definition.cost} gold. Drag to pan; Cancel spends nothing.`);
    });
    list.append(button);
  }
  showModal('buildDialog');
});
$('closeBuild').addEventListener('click', closeModal);
$('volley').addEventListener('click', () => {
  if (!canAct()) return;
  clearOrders();
  if (view.state.spellCooldown[0] > 0) { notice(`Volley ready in ${Math.ceil(view.state.spellCooldown[0])} seconds.`); return; }
  if (view.state.gold[0] < SPELL.cost) { notice(`Need ${SPELL.cost} gold.`); return; }
  ui.spell = true; $('volley').classList.add('active'); $('cancel').disabled = false;
  notice(view.fog.enabled ? 'Volley: tap a visible center. Hidden centers are rejected without cost.' : 'Volley: tap a point on the field.');
});
$('citadel').addEventListener('click', () => {
  if (!canAct()) return;
  clearOrders(); const record = view.state.citadelOptions.sides[0], base = view.state.bases[0];
  $('citadelState').textContent = `Health ${Math.ceil(base.hp)} / ${base.maxHp}. ${record.choice === 'arrows' ? 'Extra Arrow chosen.' : record.choice === 'regen' ? 'Regeneration chosen.' : 'No choice yet.'}`;
  $('arrows').disabled = $('regen').disabled = !!record.choice || view.state.gold[0] < 190;
  showModal('citadelDialog');
});
for (const [id, choice] of [['arrows', 'arrows'], ['regen', 'regen']]) $(id).addEventListener('click', () => {
  // A choice is the dialog's one deliberate paid action; the battle is paused.
  if (!game || modal !== $('citadelDialog') || view.state.winner !== null) return;
  const result = game.buyCitadelOption(choice, 0); refresh(); closeModal(); notice(result.reason); updateHUD(true);
});
$('closeCitadel').addEventListener('click', closeModal);

function selectedBuilding() { return view?.state.buildings.find(b => b.side === 0 && b.id === ui.selected); }
function updateSelection() {
  const b = selectedBuilding(); $('selection').hidden = !b;
  if (!b) { ui.selected = null; return; }
  const definition = view.buildings[b.type], cost = Math.round(definition.cost * (.7 + .35 * (b.level - 1)));
  const refund = Math.floor(b.invested * .5 * b.hp / b.maxHp);
  $('selectionText').textContent = `${definition.name} · Level ${b.level} · ${Math.ceil(b.hp)} HP`;
  $('upgrade').textContent = b.level >= 3 ? 'Max level' : `Upgrade · ${cost}`;
  $('upgrade').disabled = !canAct() || b.level >= 3 || view.state.gold[0] < cost;
  $('sell').textContent = `Sell · +${refund}`; $('sell').disabled = !canAct();
}
$('upgrade').addEventListener('click', () => {
  if (!canAct() || !selectedBuilding()) return;
  const result = game.upgrade(ui.selected, 0); refresh(); notice(result.ok ? 'Building upgraded.' : result.reason); updateHUD(true);
});
$('sell').addEventListener('click', () => {
  if (!canAct() || !selectedBuilding()) return;
  const result = game.sell(ui.selected, 0); refresh(); clearOrders(); notice(result.ok ? `Building sold. ${result.refund} gold returned.` : result.reason); updateHUD(true);
});

function worldPoint(event) {
  const rect = $('battle').getBoundingClientRect();
  return renderer.screenToWorld(event.clientX - rect.left, event.clientY - rect.top);
}
function activate(point) {
  if (!canAct()) return;
  if (ui.build) {
    // Exact released renderer snap, then the real paid engine operation.
    const site = renderer.snap(point), result = game.build(ui.build, site.x, site.y, 0);
    refresh(); if (result.ok) { clearOrders(); notice('Building placed. Troops train automatically.'); }
    else notice(result.reason);
  } else if (ui.spell) {
    // UI explains visibility; the engine independently validates the center.
    if (!pointInObservation(view, point.x, point.y)) { notice('Choose a visible Volley center. No gold or cooldown spent.'); return; }
    const result = game.cast(point.x, point.y, 0); refresh();
    if (result.ok) { clearOrders(); notice('Volley fired.'); } else notice(result.reason);
  } else {
    const nearest = view.state.buildings.filter(b => b.side === 0).sort((a, b) => Math.hypot(a.x - point.x, a.y - point.y) - Math.hypot(b.x - point.x, b.y - point.y))[0];
    ui.selected = nearest && Math.hypot(nearest.x - point.x, nearest.y - point.y) < 95 ? nearest.id : null;
    $('cancel').disabled = !ui.selected; updateSelection();
  }
  updateHUD(true);
}
$('battle').addEventListener('pointerdown', event => {
  if (event.button !== 0 || modal) return;
  pointerGuard.down(event.pointerId, event.clientX, event.clientY); $('battle').setPointerCapture(event.pointerId);
  ui.pointer = worldPoint(event);
});
$('battle').addEventListener('pointermove', event => {
  if (modal) return;
  const move = pointerGuard.move(event.pointerId, event.clientX, event.clientY);
  if (move.pan) { renderer.pan(move.pan); follow = false; }
  ui.dragging = move.dragged; ui.pointer = worldPoint(event);
});
$('battle').addEventListener('pointerup', event => {
  const commit = pointerGuard.up(event.pointerId, event.clientX, event.clientY); ui.dragging = false;
  if ($('battle').hasPointerCapture(event.pointerId)) $('battle').releasePointerCapture(event.pointerId);
  if (commit) activate(worldPoint(event));
});
for (const name of ['pointercancel', 'lostpointercapture']) $('battle').addEventListener(name, event => { pointerGuard.cancel(event.pointerId); ui.dragging = false; ui.pointer = null; });
$('battle').addEventListener('pointerleave', () => { if (!pointerGuard.press) ui.pointer = null; });
$('battle').addEventListener('wheel', event => { if (modal) return; event.preventDefault(); renderer.pan(-(Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY)); follow = false; invalidatePointer(); }, { passive: false });
$('minimap').addEventListener('click', event => {
  if (!view || modal) return;
  const rect = $('minimap').getBoundingClientRect(); renderer.camera = (event.clientX - rect.left) / rect.width * view.map.width; renderer.clampCamera(); follow = false; invalidatePointer();
});
$('minimap').addEventListener('keydown', event => {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key) || modal || !view) return;
  event.preventDefault(); event.stopPropagation(); follow = false;
  renderer.camera = event.key === 'Home' ? 0 : event.key === 'End' ? view.map.width : renderer.camera + (event.key === 'ArrowRight' ? 160 : -160); renderer.clampCamera();
});
window.addEventListener('keydown', event => {
  if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || modal) return;
  if (event.key === 'Escape') {
    event.preventDefault(); if (ui.build || ui.spell || ui.selected) { clearOrders(); notice('Order cancelled.'); }
    else setPaused(!ui.paused);
  } else if (event.target.closest('input,select,textarea,button')) return;
  else if (event.code === 'Space' && !event.repeat) { event.preventDefault(); setPaused(!ui.paused); }
  else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); renderer.pan(event.key === 'ArrowLeft' ? 70 : -70); follow = false; }
  else if (event.key.toLowerCase() === 'h') home();
  else if (event.key.toLowerCase() === 'f') front();
  else if (event.key === '+' || event.key === '=') zoomBy(.15);
  else if (event.key === '-') zoomBy(-.15);
});
function interrupted() {
  invalidatePointer();
  if (modal) modalWasPaused = true;
  else if (game && view.state.winner === null) setPaused(true);
}
window.addEventListener('blur', interrupted);
document.addEventListener('visibilitychange', () => { if (document.hidden) interrupted(); });
new ResizeObserver(() => { renderer.resize(); invalidatePointer(); }).observe($('battle'));

function updateHUD(force = false) {
  if (!view || (!force && Math.floor(view.state.time * 4) === lastHUD)) return;
  lastHUD = Math.floor(view.state.time * 4); const model = observationHUD(view);
  $('gold').textContent = `Gold ${model.gold}`; $('gold').title = `Income ${model.income.toFixed(1)} per second`;
  $('homeHP').textContent = `Home ${model.homeHP}`; $('enemyHP').textContent = `Enemy ${model.enemyHP === null ? 'HP unknown' : model.enemyHP}`;
  $('clock').textContent = model.time; $('accessibleState').textContent = model.description;
  $('battle').setAttribute('aria-describedby', 'accessibleState'); $('minimap').setAttribute('aria-valuenow', String(Math.round(renderer.camera)));
  $('minimap').setAttribute('aria-valuetext', `Camera ${Math.round(renderer.camera)}. ${model.description}`);
  $('volley').textContent = model.cooldown > 0 ? `Volley · ${model.cooldown}s` : 'Volley · 75';
  $('front').setAttribute('aria-pressed', String(follow)); updateSelection();
}
function frame(now) {
  const dt = Math.min(.1, Math.max(0, (now - lastTime) / 1000)); lastTime = now;
  if (game) {
    if (!ui.paused && !modal && !document.hidden && view.state.winner === null) {
      const result = game.update(dt);
      if (result?.ok === false) { ui.paused = true; clearOrders(); notice(result.reason); updatePause(); }
      refresh();
    }
    if (follow) { renderer.camera = view.fog.frontX; renderer.clampCamera(); }
    if (view.state.winner !== null && !finished) {
      finished = true; clearOrders(); $('modeLabel').textContent = 'Battle ended · Full-information reveal'; updatePause();
      notice('Battle ended. The field now reveals both armies. New / restart opens another battle.');
    }
    const sound = audioProjection.update(view, { camera: renderer.camera, width: renderer.width, scale: renderer.scale, paused: ui.paused || !!modal || document.hidden });
    audio.setIntensity(sound.intensity);
    for (const event of sound.sounds) audio.play(event.name, event);
    renderer.draw(view, { ...ui, paused: ui.paused || !!modal }, dt); updateHUD();
  }
  requestAnimationFrame(frame);
}
showModal('setup'); requestAnimationFrame(frame);
