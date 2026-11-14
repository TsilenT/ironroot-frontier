/**
 * Synthetic production UI checkpoints only: not paid routes, natural victories,
 * balance evidence, or prototype experiments. No browser game-state hooks.
 * Loads only the caller's current dist modules and round-trips the real codec.
 */
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
export async function dynamicCampaignCheckpoint(distRoot, missionId, state) {
  const base=distRoot instanceof URL?distRoot:pathToFileURL(distRoot.replace(/\/$/,'')+'/');
  const c=await import(new URL('campaign.js',base));
  const {encodeBattle,decodeBattle}=await import(new URL('battle-codec.js',base));
  const {minorReserveStatus}=await import(new URL('minor-reserve.js',base));
  const {lastEngineView}=await import(new URL('final-chapter-view.js',base));
  const {refreshFog}=await import(new URL('fog.js',base));
  const progress=c.createCampaignProgress(),missions=c.getProgressionCampaignOverview(progress).missions;
  const index=missions.findIndex(m=>m.id===missionId);assert.ok(index>=0,'known production mission');
  for(const m of missions.slice(0,index))progress.missions[m.id]={completed:true,stars:1,bestTime:120};
  const game=c.createProgressionCampaignMission(missionId,progress);
  const targets=()=>c.getCampaignTargets(game,missionId);
  if(missionId==='the-last-engine'){
    game._damage(game.state.bases[1],game.state.bases[1].hp-600,0);game.update(.05);
    if(state==='core-first'){game._damage(game.state.bases[1],600,0);game.update(.05);}
    else if(state==='boss-first'){const boss=game.state.units.find(u=>u.type==='colossus');game._damage(boss,boss.hp,0);game.update(.05);}
    else if(['approach','siege'].includes(state)){for(let n=0;n<1000&&lastEngineView(game).mode!==state;n++)game.update(.05);assert.equal(lastEngineView(game).mode,state);}
    else assert.ok(['both','emerging'].includes(state),'known finale fixture state');
  }else if(missionId==='wake-the-reserve'){
    if(state!=='armed'){
      const post=game.state.buildings.find(b=>b.id===minorReserveStatus(game).postId);game._damage(post,post.hp,0);game.update(.05);
      if(state==='queued'){
        const factory=game.state.buildings.find(b=>b.side===1&&game.buildings[b.type].unit);assert.ok(factory);
        while(game.state.units.filter(u=>u.side===1).length<70)game._spawn(factory);
      }
      if(['released','queued'].includes(state))for(let n=0;n<130;n++)game.update(.05);
    }
    assert.equal(minorReserveStatus(game).phase,state==='queued'?'arriving':state==='released'?'complete':state);
  }else if(state==='last-signal-critical'){
    assert.equal(missionId,'one-signal-is-enough');const t=targets();game.state.buildings=game.state.buildings.filter(b=>b.id!==t[0].originalId);
    const b=game.state.buildings.find(b=>b.id===t[1].originalId);game._damage(b,b.hp*.8,1);game.update(.05);
  }else if(state==='protected-critical'){
    const protectedTargets=targets().filter(t=>t.kind==='protect');assert.ok(protectedTargets.length);
    for(const t of protectedTargets){const b=game.state.buildings.find(b=>b.id===t.originalId);game._damage(b,b.hp*.8,1);}game.update(.05);
  }else if(state==='last-seen'){
    const target=targets().find(t=>t.kind==='destroy'),b=target.building;assert.ok(b);
    const factory=game.state.buildings.find(x=>x.side===0&&game.buildings[x.type].unit);assert.ok(factory);
    const previous=game.nextId;game._spawn(factory);const scout=game.state.units.find(u=>u.id>=previous&&u.side===0);assert.ok(scout);
    // Explicit synthetic scouting positions; production refresh records and
    // retires visibility, rather than injecting fog memories or guessed HP.
    scout.x=b.x-50;scout.y=b.y;refreshFog(game);game.update(.05);
    scout.x=game.state.bases[0].x;scout.y=game.state.bases[0].y;refreshFog(game);game.update(.05);
  }else if(state==='cleared-first'){
    const t=targets().filter(x=>x.kind==='destroy');assert.ok(t.length>1,'one cleared target leaves an active production mission');
    const b=t[0].building;game._damage(b,b.hp,0);game.update(.05);
  }else throw new Error('Unknown fixture state: '+state);
  const battle=encodeBattle(game,c.campaignScenarioForGame(game,missionId),{campaignProgress:progress});
  assert.deepEqual(decodeBattle(battle,{campaignProgress:progress}).game.serialize(),game.serialize());
  return {missionId,state,progress,game,battle,synthetic:'production Game/codec-valid prepared UI checkpoint; not a natural paid route',
    observation:{time:game.state.time,engineMode:lastEngineView(game)?.mode,reservePhase:minorReserveStatus(game)?.phase},
    values:{'ironroot.campaign.v1':JSON.stringify(progress),'ironroot.battle.v1':JSON.stringify(battle)}};
}
