import {signalProtectionSummary} from '../dist/campaign-presentation.js';
import {createProtectedObjectiveMonitor} from '../dist/protected-objectives.js';
import {isProtectedCampaignBuilding} from '../dist/protected-objectives.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {runInNewContext} from 'node:vm';
import {readFileSync} from 'node:fs';
import {airBuildingDescription} from '../dist/flight-orders-view.js';
import {buildingUpgradeView} from '../dist/building-upgrade-view.js';
import {armyCapacityView} from '../dist/strategy-feedback-view.js';
import {BUILDINGS,UNITS,upgradeCost} from '../dist/engine.js';
import {CAMPAIGN_MISSIONS,createCampaignMission,getCampaignMission,campaignScenarioForGame} from '../dist/campaign.js';
const app=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
const selection=app.slice(app.indexOf('function updateSelection()'),app.indexOf("\n$('upgrade').onclick",app.indexOf('function updateSelection()')));

test('actual building details round both HP values without changing upgraded campaign state',()=>{
  let checked=0;
  for(const mission of CAMPAIGN_MISSIONS){
    const game=createCampaignMission(mission.id),before=JSON.stringify(game.serialize());
    for(const b of game.state.buildings.filter(b=>b.side===0&&b.level>1)){
      const elements=new Map();
      const $=id=>{if(!elements.has(id))elements.set(id,{textContent:'',innerHTML:'',disabled:false,classList:{toggle(){},contains(){return false;}}});return elements.get(id);};
      runInNewContext(selection+'\nupdateSelection();',{$,game,currentCampaign:mission.id,isProtectedCampaignBuilding,currentSignalProtection:()=>signalProtectionSummary(getCampaignMission(mission.id,campaignScenarioForGame(game,mission.id).revision),createProtectedObjectiveMonitor(game,mission.id).read(),game.state.time),battleView:()=>game,airBuildingDescription,buildingUpgradeView,armyCapacityView,ui:{selected:b.id,protectedTargets:[]},BUILDINGS,UNITS,upgradeCost,paused:false,iconSVG:()=>''});
      assert.ok($('selectionStats').innerHTML.startsWith(`<span>♥ ${Math.ceil(b.hp)} / ${Math.ceil(b.maxHp)}</span>`),mission.id+'/'+b.type);
      assert.ok(!/\d\.\d{5,}/.test($('selectionStats').innerHTML));
      checked++;
    }
    assert.equal(JSON.stringify(game.serialize()),before,'rendering must not round combat values');
  }
  assert.ok(checked>=15,'exercise real upgraded authored buildings');
});
