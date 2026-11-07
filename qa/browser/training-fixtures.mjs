// Explicitly synthetic persistence only. These bytes are not training state,
// played wins, natural lesson completions, or gameplay/balance evidence.
import assert from 'node:assert/strict';
import {Game} from '../../dist/engine.js';
import {BACKUP_STORAGE_KEYS,createBackup,parseBackup} from '../../dist/backup.js';
import {createCampaignProgress} from '../../dist/campaign.js';
export const TRAINING_PATH='/training.html';
export const PROFILE_DOMAINS=Object.values(BACKUP_STORAGE_KEYS);
export const PROFILE_MARKER='ironroot.profile.v1';
export const PROFILE_KEYS=[...PROFILE_DOMAINS,PROFILE_MARKER];
export const TRAINING_FILES=['training.html','training-app.js','training.css','training.js'];
export function trainingProfileFixture(){
  const game=new Game({mapId:'twin-span',seed:120012,ai:false});
  assert.equal(game.build('archery',550,560).ok,true);
  for(let tick=0;tick<120;tick++)game.update(.05);
  const progress=createCampaignProgress();
  progress.missions.emberwatch={completed:true,stars:2,bestTime:99};
  // Deliberate surrounding whitespace makes parse-and-reserialize detectable.
  const bytes=value=>' \n'+JSON.stringify(value,null,2)+'\n ';
  const values={
    [BACKUP_STORAGE_KEYS.campaign]:bytes(progress),
    [BACKUP_STORAGE_KEYS.trials]:bytes({shieldbreaker:{completed:true,bestTime:89}}),
    [BACKUP_STORAGE_KEYS.settings]:bytes({sound:false,music:false,sfx:false,volume:.3,reducedMotion:true,quality:'low'}),
    [BACKUP_STORAGE_KEYS.history]:bytes([{won:true,draw:false,challengeId:null,campaignId:null,difficulty:'normal',time:95,kills:7,built:3,date:'2026-11-06T00:00:00.000Z',mapId:'twin-span'}]),
    [BACKUP_STORAGE_KEYS.battle]:bytes({format:'ironroot-save',version:2,challengeId:null,campaignId:null,game:game.serialize()}),
    // Current ready profile for byte-preservation/retry tests, not a historical
    // client fixture. Protocol migration is covered in profile-upgrade.spec.mjs.
    [PROFILE_MARKER]:JSON.stringify({format:'ironroot-profile',version:4,epoch:'qa-training-isolation',phase:'ready'}),
  };
  const backup=parseBackup(createBackup({getItem:key=>values[key]??null},{createdAt:'2026-11-06T00:00:00.000Z'}));
  assert.equal(backup.data.battle.game.state.winner,null);
  assert.ok(backup.data.battle.game.state.time>0);
  assert.equal(Game.restore(backup.data.battle.game).map.id,'twin-span');
  return {values,backup};
}
