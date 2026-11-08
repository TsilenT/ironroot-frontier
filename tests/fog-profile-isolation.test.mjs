import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,FOG_RULESET_ID} from '../dist/engine.js';
import {decodeBattle,encodeBattle,identityOf,validateBattleIdentity} from '../dist/battle-codec.js';
import {createBackup,parseBackup,restoreBackup} from '../dist/backup.js';
import {writeBattle} from '../dist/persistence.js';
function backend(){const data=new Map([['existing','preserve']]),operations=[];return {data,operations,getItem:k=>data.get(k)??null,setItem:(k,v)=>{operations.push(['set',k,v]);data.set(k,v);},removeItem:k=>{operations.push(['remove',k]);data.delete(k);}};}
const scenario={kind:'skirmish',id:'standard',revision:1};
const denied=error=>error.code==='qa-only-ruleset';

test('experimental identity rejects every ordinary codec entry while direct engine restore stays legal',()=>{
 const g=new Game({rulesetId:FOG_RULESET_ID,ai:false}),snapshot=g.serialize(),identity={ruleset:{id:g.ruleset.id,revision:1},map:{id:'classic',revision:1},scenario};
 assert.equal(g.ruleset.qaOnly,true);assert.deepEqual(Game.restore(snapshot).serialize(),snapshot);
 assert.throws(()=>identityOf(g),denied);assert.throws(()=>validateBattleIdentity(identity),denied);assert.throws(()=>encodeBattle(g),denied);
 const envelope={format:'ironroot-save',version:3,scenario,game:snapshot},before=structuredClone(envelope);
 assert.throws(()=>decodeBattle(envelope),denied);assert.throws(()=>decodeBattle(JSON.stringify(envelope)),denied);assert.deepEqual(envelope,before);assert.deepEqual(g.serialize(),snapshot);
});

test('normal profile write and backup import reject experimental fog before any storage mutation',()=>{
 const g=new Game({rulesetId:FOG_RULESET_ID,ai:false}),storage=backend(),before=[...storage.data];
 const write=writeBattle(storage,'battle',g);assert.equal(write,false);assert.deepEqual(storage.operations,[]);assert.deepEqual([...storage.data],before);
 const backup=JSON.parse(createBackup(backend(),{createdAt:'2026-11-08T00:00:00.000Z'}));backup.version=2;backup.data.battle={format:'ironroot-save',version:3,scenario,game:g.serialize()};
 const text=JSON.stringify(backup);assert.throws(()=>parseBackup(text),/experimental ruleset/);const result=restoreBackup(storage,text);assert.equal(result.ok,false);assert.deepEqual(storage.operations,[]);assert.deepEqual([...storage.data],before);
});

test('ordinary current Skirmish still round-trips through the untouched profile format',()=>{
 const g=new Game({rulesetId:'frontier-citadel-open',ai:false});assert.deepEqual(decodeBattle(encodeBattle(g)).game.serialize(),g.serialize());
});
