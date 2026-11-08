import {supportsFog} from '../dist/fog.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { Game } from '../dist/engine.js';
import { supportsCitadelOptions } from '../dist/citadel-options.js';
import { decodeBattle, encodeBattle } from '../dist/battle-codec.js';
import { CHALLENGES, createChallenge } from '../dist/challenges.js';
import {
  CAMPAIGN_MISSIONS, ALL_CAMPAIGN_MISSIONS,
  createCampaignProgress,
  createCampaignMission,
  isMissionUnlocked,
} from '../dist/campaign.js';
const app = readFileSync(new URL('../dist/app.js', import.meta.url), 'utf8');
const fn = app.slice(
  app.indexOf('function updateResume()'),
  app.indexOf('\nupdateResume();', app.indexOf('function updateResume()')),
);
function exercise(data, progress = createCampaignProgress()) {
  const raw = JSON.stringify(data),
    elements = new Map(),
    starts = [],
    calls = [];
  for (const id of ['resumeSaved', 'saveStatus', 'start', 'exportUnreadableBattle'])
    elements.set(id, {
      textContent: '',
      classList: {
        values: new Map(),
        toggle(name, value) {
          this.values.set(name, value);
        },
      },
      after() {},
    });
  const storage = {
    get(key) {
      calls.push(['get', key]);
      return raw;
    },
    set() {
      throw Error('Resume must not write');
    },
    remove() {
      throw Error('Resume must not delete');
    },
  };
  runInNewContext(fn + '\nupdateResume();', {
    JSON, decodeBattle, supportsCitadelOptions, supportsFog, resumeProblem:null,
    $: (id) => elements.get(id),
    storage,
    SAVE: 'battle',
    Game,
    CHALLENGES,
    CAMPAIGN_MISSIONS: ALL_CAMPAIGN_MISSIONS,
    campaignProgress: progress,
    isMissionUnlocked,
    timeText: (t) => String(Math.floor(t)),
    start: (...args) => starts.push(args),
  });
  return {
    button: elements.get('resumeSaved'),
    warning: elements.get('saveStatus'),
    starts,
    calls,
    raw,
  };
}
test('actual Resume handler identifies every saved map and does not overwrite storage', () => {
  for (const mapId of ['classic', 'long-march', 'twin-span']) {
    const game = new Game({ mapId, ai: false });
    game.update(0.15);
    for (const data of [
      game.serialize(),
      {
        format: 'ironroot-save',
        version: 2,
        challengeId: null,
        campaignId: null,
        game: game.serialize(),
      },
    ]) {
      const result = exercise(data);
      assert.equal(result.button.classList.values.get('hidden'), false);
      assert.equal(result.warning.classList.values.get('hidden'), true);
      assert.match(
        result.button.textContent,
        new RegExp(
          mapId === 'classic' ? 'BATTLE' : game.map.name.toUpperCase(),
        ),
      );
      result.button.onclick();
      assert.equal(result.starts[0][0].map.id, mapId);
      assert.deepEqual(result.calls, [['get', 'battle']]);
    }
  }
});
test('actual Resume handler retains invalid map bytes and refuses authored nonclassic games', () => {
  const invalid = [];
  const source = new Game({ mapId: 'long-march', ai: false }).serialize();
  invalid.push({ ...source, mapId: 'unknown' });
  invalid.push({ ...source, mapRevision: 2 });
  invalid.push({ ...source, version: 1 });
  invalid.push({
    format: 'ironroot-save',
    version: 2,
    campaignId: 'emberwatch',
    challengeId: null,
    game: source,
  });
  invalid.push({
    format: 'ironroot-save',
    version: 2,
    campaignId: null,
    challengeId: CHALLENGES[0].id,
    game: source,
  });
  for (const data of invalid) {
    const before = JSON.stringify(data),
      result = exercise(data);
    assert.equal(result.button.classList.values.get('hidden'), true);
    assert.equal(result.warning.classList.values.get('hidden'), false);
    assert.match(result.warning.textContent, /could not be loaded/);
    assert.equal(result.raw, before);
    assert.equal(JSON.stringify(data), before);
    assert.deepEqual(result.calls, [['get', 'battle']]);
  }
});
test('actual Resume handler still admits the original unlocked Classic campaign envelope', () => {
  const game = createCampaignMission('emberwatch');
  const result = exercise({
    format: 'ironroot-save',
    version: 2,
    campaignId: 'emberwatch',
    challengeId: null,
    game: game.serialize(),
  });
  assert.equal(result.button.classList.values.get('hidden'), false);
  assert.match(result.button.textContent, /RESUME MISSION · EMBERWATCH ·/);
  result.button.onclick();
  assert.equal(result.starts[0][0].map.id, 'classic');
  assert.equal(result.starts[0][2], 'emberwatch');
});

function expansionProgress() {
  const progress = createCampaignProgress();
  for (const mission of CAMPAIGN_MISSIONS)
    progress.missions[mission.id] = {completed:true, stars:3, bestTime:mission.timeLimit};
  return progress;
}
test('actual Resume handler admits each unlocked expansion only on its declared map', () => {
  for (const mission of CAMPAIGN_MISSIONS.filter(m => m.mapId && m.mapId !== 'classic')) {
    const game = createCampaignMission(mission.id);
    const envelope = {format:'ironroot-save',version:2,campaignId:mission.id,challengeId:null,game:game.serialize()};
    const restored = exercise(envelope, expansionProgress());
    assert.equal(restored.button.classList.values.get('hidden'),false);
    assert.ok(restored.button.textContent.includes(`RESUME MISSION · ${mission.name.toUpperCase()} ·`));
    restored.button.onclick();
    assert.equal(restored.starts[0][0].map.id,mission.mapId);
    assert.equal(restored.starts[0][2],mission.id);
    assert.equal(exercise(envelope).button.classList.values.get('hidden'),true,'locked expedition rejected');
    for (const mapId of ['classic','long-march','twin-span'].filter(id=>id!==mission.mapId)) {
      const mismatch = {...envelope,game:new Game({mapId,ai:false}).serialize()};
      const result = exercise(mismatch, expansionProgress());
      assert.equal(result.button.classList.values.get('hidden'),true);
      assert.equal(result.warning.classList.values.get('hidden'),false);
      assert.equal(result.raw,JSON.stringify(mismatch));
      assert.deepEqual(result.calls,[['get','battle']]);
    }
  }
});

test('actual Resume handler names saved trials independently from the new-battle menu', () => {
  for (const trial of CHALLENGES) {
    const game = createChallenge(trial.id);
    const result = exercise({format:'ironroot-save',version:2,campaignId:null,challengeId:trial.id,game:game.serialize()});
    assert.equal(result.button.classList.values.get('hidden'), false);
    assert.ok(result.button.textContent.includes(`RESUME TRIAL · ${trial.name.toUpperCase()} ·`));
    result.button.onclick();
    assert.equal(result.starts[0][1],trial.id);
  }
});


test('new intro Resume labels name their authored mission without a skirmish sudden-death label',()=>{
  const progress=createCampaignProgress();progress.missions['first-watch']={completed:true,stars:2,bestTime:58};
  for(const id of ['first-watch','forked-road']){
    const game=createCampaignMission(id);for(let i=0;i<50;i++)game.update(.25);
    const snapshot=game.serialize(),envelope=encodeBattle(game,{kind:'campaign',id,revision:1},{campaignProgress:progress});
    const result=exercise(envelope,progress);
    assert.equal(result.button.classList.values.get('hidden'),false);
    assert.match(result.button.textContent,new RegExp('RESUME MISSION · '+(id==='first-watch'?'FIRST WATCH':'FORKED ROAD')+' · 12$'));
    assert.doesNotMatch(result.button.textContent,/SUDDEN DEATH|OPEN-ENDED/);
    result.button.onclick();assert.equal(result.starts[0][2],id);assert.deepEqual(result.starts[0][0].serialize(),snapshot);
    assert.equal(result.raw,JSON.stringify(envelope));assert.deepEqual(result.calls,[['get','battle']]);
  }
});
test('fresh versioned skirmish Resume labels retain their actual endgame selection',()=>{
  for(const rulesetId of ['frontier-rootwarden-open','frontier-rootwarden-timed','frontier-citadel-open','frontier-citadel-bridge-timed']){
    const game=new Game({rulesetId,ai:false}),result=exercise(encodeBattle(game));
    assert.ok(result.button.textContent.includes(game.ruleset.endgame.name.toUpperCase()));
    assert.equal(result.button.textContent.includes('CITADEL CHOICES'),supportsCitadelOptions(game.ruleset));
    result.button.onclick();assert.equal(result.starts[0][0].ruleset.id,rulesetId);
  }
});
