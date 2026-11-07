/** Bounded authored campaign smoke, not a balance sweep or human difficulty claim.
 * Run: node tests/automatic-air-campaign-smoke.mjs
 * Writes only docs/AUTOMATIC_AIR_CAMPAIGN_SMOKE.json.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {Game} from '../dist/engine.js';
import * as campaign from '../dist/campaign.js';
import {supportsAutonomousAir} from '../dist/autonomous-air.js';
import {encodeBattle, decodeBattle} from '../dist/battle-codec.js';
import {campaignPolicy} from './campaign-policies.mjs';
import {onboardingReferencePolicy} from './onboarding-campaign-policies.mjs';

const root=new URL('../',import.meta.url),started=Date.now();
const files=['dist/engine.js','dist/rulesets.js','dist/autonomous-air.js','dist/campaign.js','dist/campaign-flow.js','dist/campaign-onboarding.js','dist/battle-codec.js','tests/campaign-policies.mjs','tests/onboarding-campaign-policies.mjs','tests/automatic-air-campaign-smoke.mjs'];
const hashes=()=>Object.fromEntries(files.map(file=>[file,createHash('sha256').update(readFileSync(new URL(file,root))).digest('hex')]));
const beforeHashes=hashes();
const round=value=>+value.toFixed(3);
function run(id,progress){
  const mission=campaign.getCampaignLaunchMission(id,progress),opening=campaign.isOnboardingMission(id);
  let game=campaign.createProgressionCampaignMission(id,progress);
  const initial=game.serialize(),scenario=campaign.campaignScenarioForGame(game,id);
  const policy=opening?onboardingReferencePolicy(id):campaignPolicy(id);
  const auto=supportsAutonomousAir(game.ruleset);
  assert.equal(auto,Object.keys(game.buildings).length===8);
  assert.equal(scenario.revision,auto?4:1);
  let paidActions=0,grossSpend=0,restores=0,continuations=0,airLocks=0,offRoadFlyers=0;
  const purchased={};let outcome;
  for(let tick=0;tick<(mission.timeLimit+1)*20;tick++){
    // Opening policies get reading time and one paid action every five seconds.
    if(tick%(opening?100:20)===0&&(!opening||game.state.time>=10-1e-7)){
      let remaining=opening?1:Infinity;
      const originals=Object.fromEntries(['build','upgrade','cast'].map(name=>[name,game[name]]));
      for(const [name,original] of Object.entries(originals))game[name]=(...args)=>{
        if(remaining<=0)return {ok:false,reason:'Need another action window.'};
        const gold=game.state.gold[0],kills=game.state.stats.kills[0];
        const expected=name==='build'?game.buildings[args[0]].cost:name==='upgrade'
          ?game.upgradeCost(game.state.buildings.find(b=>b.id===args[0])):game.ruleset.spell.cost;
        const result=original.apply(game,args);
        if(result.ok){
          const bounty=name==='cast'?2*(game.state.stats.kills[0]-kills):0;
          assert.equal(gold-game.state.gold[0]+bounty,expected,`${id}: ${name} pays the normal cost`);
          assert.ok(game.state.gold[0]>=0);remaining--;paidActions++;grossSpend+=expected;
          if(name==='build')purchased[args[0]]=(purchased[args[0]]||0)+1;
        }
        return result;
      };
      try{policy(game);}finally{for(const name of Object.keys(originals))delete game[name];}
    }
    game.update(.05);
    outcome=campaign.evaluateCampaignMission(game,id);
    for(const unit of game.state.units)if(game.units[unit.type]?.flying){
      assert.equal(Object.hasOwn(unit,'airRoute'),false);
      if(unit.airTargetId!==null&&unit.airTargetId!==undefined)airLocks++;
      if(Math.abs(unit.y-game.map.lanes[unit.lane])>8)offRoadFlyers++;
    }
    if(outcome.completed||outcome.failed)break;
    if(tick%200===0){
      const envelope=encodeBattle(game,scenario,{campaignProgress:progress});
      const restored=decodeBattle(JSON.stringify(envelope),{campaignProgress:progress}).game;
      assert.deepEqual(restored.serialize(),game.serialize());restores++;
      const direct=Game.restore(game.serialize()),resumed=Game.restore(restored.serialize());
      for(let n=0;n<3;n++){direct.update(.05);resumed.update(.05);}
      assert.deepEqual(resumed.serialize(),direct.serialize());continuations++;
      assert.deepEqual(campaign.createCampaignRestart(restored,id).serialize(),initial);
      game=restored;
    }
  }
  assert.ok(outcome.completed||outcome.failed,`${id}: authored outcome settles by its deadline`);
  assert.ok(paidActions>0&&grossSpend>0&&restores>0);
  return {game,outcome,summary:{id,scenarioRevision:scenario.revision,rulesetId:game.ruleset.id,mapId:game.map.id,
    seed:mission.seed,policy:opening?'onboarding-reference/5-second-single-action':'campaign-reference/1-second',
    won:outcome.completed,stars:outcome.stars,seconds:round(game.state.time),citadelHP:round(game.state.bases[0].hp),
    label:outcome.label,paidActions,grossSpend,purchased,restores,continuations,airLockSamples:airLocks,offRoadFlyerSamples:offRoadFlyers}};
}

let progress=campaign.createCampaignProgress();
const progression=[];
for(const mission of [...campaign.ONBOARDING_MISSIONS,...campaign.CAMPAIGN_MISSIONS]){
  const result=run(mission.id,progress);progression.push(result.summary);
  process.stderr.write(`${mission.id}: ${result.outcome.completed?'win':'loss'}, ${result.summary.seconds}s, ${result.summary.stars} stars\n`);
  if(!result.outcome.completed)break; // Preserve a failure instead of inventing prerequisites.
  progress=campaign.recordCampaignResult(progress,mission.id,result.game);
}
const replays=progress.missions['shield-at-the-fork']?campaign.ONBOARDING_MISSIONS.slice(0,2).map(m=>run(m.id,progress).summary):[];
const finalHashes=hashes(),changed=files.filter(file=>beforeHashes[file]!==finalHashes[file]);
assert.deepEqual(changed,[],'simulation inputs remain unchanged during the smoke');
const overview=campaign.getProgressionCampaignOverview(progress);
const report={format:'ironroot-automatic-air-campaign-smoke',version:1,generatedAt:new Date().toISOString(),durationSeconds:round((Date.now()-started)/1000),
  scope:'One authored-seed paid reference route through nineteen current campaign missions, plus full-roster replays of the first two openings. Original formation, HP, gold and objectives; no synthetic unlocks or free commands. Playable battle restore and exact authored restart every ten seconds. Three-tick deterministic continuation probes. This is bounded scripted evidence, not a large balance sweep, human difficulty claim, browser certification or deployment.',
  sourceHashes:beforeHashes,summary:{cleared:overview.cleared,total:overview.total,stars:overview.stars,
    paidActions:[...progression,...replays].reduce((n,r)=>n+r.paidActions,0),grossSpend:[...progression,...replays].reduce((n,r)=>n+r.grossSpend,0),
    restores:[...progression,...replays].reduce((n,r)=>n+r.restores,0),replayWins:replays.filter(r=>r.won).length,
    failures:[...progression,...replays].filter(r=>!r.won).map(r=>({id:r.id,label:r.label}))},progression,replays,finalProgress:progress};
writeFileSync(new URL('docs/AUTOMATIC_AIR_CAMPAIGN_SMOKE.json',root),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report.summary,null,2));
