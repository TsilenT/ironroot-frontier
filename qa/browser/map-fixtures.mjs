// Synthetic, engine-valid persistence fixtures. They are not human-played matches.
import assert from 'node:assert/strict';
import {Game, MAPS} from '../../dist/engine.js';
import {createBackup, parseBackup, BACKUP_STORAGE_KEYS} from '../../dist/backup.js';
import {CHALLENGES} from '../../dist/challenges.js';
import {CAMPAIGN_MISSIONS} from '../../dist/campaign.js';

export const MAP_IDS=Object.keys(MAPS);
export const NEW_MAP_IDS=MAP_IDS.filter(id=>id!=='classic');
export const SAVE=BACKUP_STORAGE_KEYS.battle;
export const HISTORY=BACKUP_STORAGE_KEYS.history;
export function mapFixture(mapId,{built=false,victory=false}={}) {
  const game=new Game({mapId,seed:909,ai:false,difficulty:'hard'});
  if(built)assert.equal(game.build('archery',550,game.map.lanes.at(-1)).ok,true);
  if(victory){game.state.time=421;game.state.overtime=true;game.state.bases[1].hp=.01;}
  const data=game.serialize();
  assert.equal(Game.restore(data).map.id,mapId);
  return {format:'ironroot-save',version:2,challengeId:null,campaignId:null,game:data};
}
export function mapBackup(mapId) {
  const values={[SAVE]:JSON.stringify(mapFixture(mapId,{built:true}))};
  const text=createBackup({getItem:key=>values[key]??null},{createdAt:'2026-11-06T12:00:00.000Z'});
  return {text,backup:parseBackup(text)};
}
export function authoredMap(mapId,mode) {
  const battle=mapFixture(mapId);
  let mission;
  if(mode==='campaign'){battle.campaignId='emberwatch';mission=CAMPAIGN_MISSIONS.find(m=>m.id===battle.campaignId);}
  else if(mode==='challenges'){mission=CHALLENGES[0];battle.challengeId=mission.id;}
  else throw new Error('Unknown authored mode: '+mode);
  // Match ordinary authored rules so rejection specifically exercises the
  // nonclassic map, rather than a difficulty/AI mismatch masking it.
  battle.game.difficulty=mission.difficulty;battle.game.ai=mission.ai===true;
  Game.restore(battle.game);
  return battle;
}
export function invalidMapFixtures() {
  const variants=[];
  const change=(name,mapId,mutate)=>{
    const envelope=mapFixture(mapId);mutate(envelope.game);
    assert.throws(()=>Game.restore(envelope.game),undefined,name);
    variants.push({name,envelope});
  };
  change('unknown map','long-march',game=>{game.mapId='unpublished-map';});
  change('future revision','long-march',game=>{game.mapRevision=999;});
  change('missing map identity','long-march',game=>{delete game.mapId;});
  change('Long March wrong right base','long-march',game=>{game.state.bases[1].x=3090;});
  change('Twin Span phantom third lane','twin-span',game=>{game.state.buildings[0].lane=2;game.state.buildings[0].y=640;});
  change('Twin Span off-site building','twin-span',game=>{game.state.buildings[0].x=420;});
  return variants;
}
