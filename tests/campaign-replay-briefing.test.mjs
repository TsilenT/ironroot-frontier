import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createContext,runInContext} from 'node:vm';
import * as campaign from '../dist/campaign.js';
import {createSaveSession,writeBattle} from '../dist/persistence.js';
const source=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
const section=(a,b)=>source.slice(source.indexOf(a),source.indexOf(b,source.indexOf(a)));
function harness({id='emberwatch',stars=2,removed=true}={}) {
  const nodes=new Map(),$=id=>{if(!nodes.has(id))nodes.set(id,{textContent:'',classList:{add(){},remove(){}},scrollIntoView(){}});return nodes.get(id);};
  const data=new Map([['battle','old checkpoint'],['progress','unchanged'],['history','unchanged'],['settings','unchanged'],['trials','unchanged']]);
  const faults={read:false,remove:false,set:false};
  const storage={read:key=>({ok:!faults.read,value:data.get(key)??null}),get:key=>data.get(key)??null,set(key,value){if(faults.set)return false;data.set(key,value);return true;},remove(key){if(faults.remove)return false;data.delete(key);return true;}};
  const battleSession=createSaveSession(storage,'battle');battleSession.claim();
  const completion=battleSession.captureResult();if(removed)assert.equal(completion.remove(),true);
  const game=campaign.createCampaignMission(id);game.state.bases[1].hp=0;
  let starts=0,titles=0;
  const c=createContext({...campaign,$,game,currentCampaign:id,currentChallenge:null,objectiveOutcome:{completed:true,stars},
    getCampaignOverview:campaign.getProgressionCampaignOverview,campaignProgress:campaign.createCampaignProgress(),battleSession,
    recoveryHold:null,profileGate:null,progressDirty:false,briefingRestart:null,mode:'campaign',selectedCampaign:id,selectedChapter:null,SAVE:'battle',writeBattle,
    syncProfileSafety(){},showRecoverySettings(){},persistProgress:()=>false,interruptMobileInput(){},
    showTitle(){titles++;c.started=false;},updateResume(){},start(candidate){starts++;c.game=candidate;c.started=true;}});
  runInContext(section("$('start').onclick =",'function showTitle('),c);
  runInContext(section("$('replayMission').onclick =", "$('resultMenu').onclick"),c);
  return {c,$,data,faults,counts:()=>({starts,titles}),domains:()=>JSON.stringify([...data].filter(([key])=>key!=='battle'))};
}
test('ended current and reopened last-result Replay return to briefing without saving or starting',()=>{
  for(const reopened of [false,true]){
    const h=harness(),before=h.c.game.serialize(),domains=h.domains();
    if(reopened){assert.equal(h.c.battleSession.remove(),true);h.c.mode='skirmish';}
    assert.equal(h.c.battleSession.status(),'current');h.$('replayMission').onclick();
    assert.deepEqual(h.counts(),{starts:0,titles:1});assert.equal(h.c.selectedCampaign,'emberwatch');
    assert.equal(h.data.has('battle'),false);assert.deepEqual(h.c.game.serialize(),before);assert.equal(h.domains(),domains);
    h.$('start').onclick();assert.equal(h.counts().starts,1);assert.equal(h.c.game.state.time,0);
    assert.equal(h.c.game.ruleset.id,'frontier-legacy');assert.equal(h.domains(),domains);
  }
});
for(const fault of ['stale','unavailable','remove','progress'])test(`Replay preserves retained result and domains when ${fault}`,()=>{
  const h=harness({removed:false}),before=h.c.game.serialize();
  if(fault==='stale')h.data.set('battle','newer checkpoint');
  if(fault==='unavailable')h.faults.read=true;
  if(fault==='remove')h.faults.remove=true;
  if(fault==='progress')h.c.progressDirty=true;
  const bytes=JSON.stringify([...h.data]);h.$('replayMission').onclick();
  assert.deepEqual(h.counts(),{starts:0,titles:0});assert.equal(h.c.briefingRestart,null);
  assert.deepEqual(h.c.game.serialize(),before);assert.equal(JSON.stringify([...h.data]),bytes);
  assert.match(h.$('resultRestartStatus').textContent,/checkpoint changed|could not be saved/);
});
for(const fault of ['stale','write'])test(`explicit Begin after Replay respects ${fault} fence`,()=>{
  const h=harness();h.$('replayMission').onclick();const candidate=h.c.briefingRestart;
  if(fault==='stale')h.data.set('battle','newer checkpoint');else h.faults.set=true;
  const bytes=JSON.stringify([...h.data]);h.$('start').onclick();
  assert.equal(h.counts().starts,0);assert.equal(h.c.briefingRestart,candidate);assert.equal(JSON.stringify([...h.data]),bytes);
  assert.match(h.$('briefingRestartStatus').textContent,/checkpoint changed|could not be saved/);
});
test('Replay eligibility still rejects nonfinal three-star and incomplete results',()=>{
  const h=harness({stars:3});h.$('replayMission').onclick();h.c.objectiveOutcome={completed:false,stars:1};h.$('replayMission').onclick();
  assert.deepEqual(h.counts(),{starts:0,titles:0});assert.equal(h.c.briefingRestart,null);
});
