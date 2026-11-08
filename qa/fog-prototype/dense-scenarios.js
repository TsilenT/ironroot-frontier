/** Synthetic legal-site scenes only; never imported by the main app. */
import { Game, buildSites } from '../../dist/engine.js';
import { FOG_SKIRMISH_RULESET_ID, observe, refreshFog } from '../../dist/fog.js';
import { observationFacade } from '../../dist/fog-view.js';
export const DENSE_LAYOUTS = Object.freeze({
  common: [['watchtower',2090,450],['barracks',2230,450]],
  mixed: [['sanctum',1950,450],['archery',2090,450],['foundry',2230,450],['aerie',2370,450]],
  roads: [['sanctum',2090,260],['archery',2230,260],['watchtower',2090,450],['barracks',2230,450],['foundry',2090,640],['aerie',2230,640]],
  edge: [['sanctum',2510,260],['archery',2650,260]],
});
export const DENSE_STAGES = ['Current contacts','Sight lost','Hidden changes','Re-observed empty ground','Replacement observed','Replacement out of sight'];
export function denseScene(layout='mixed',stage=1){
 const sites=DENSE_LAYOUTS[layout];if(!sites||!Number.isInteger(stage)||stage<0||stage>=DENSE_STAGES.length)throw Error('Choose a synthetic dense scene.');
 const g=new Game({rulesetId:FOG_SKIRMISH_RULESET_ID,mapId:'classic',ai:false,seed:321});g.state.gold[1]=10000;const built=[];
 // Remove the default formation in this synthetic scene so only named sites are compared.
 for(const b of [...g.state.buildings])if(b.side===1)g.sell(b.id,1);
 const scouts=()=>sites.map(([,x,y])=>({id:g.nextId++,type:'warrior',side:0,x,y,lane:g.map.lanes.indexOf(y),hp:180,maxHp:180,level:1,flying:false,cooldown:0,attack:0}));
 for(const[type,x,y]of sites){if(!buildSites(g.map,1).some(p=>p.x===x&&p.y===y))throw Error('Not a snapped site.');const receipt=g.build(type,x,y,1);if(!receipt.ok)throw Error(receipt.reason);built.push(receipt.building);}
 g.state.units=scouts();g.state.time=125;refreshFog(g);
 if(stage>=1){g.state.units=[];g.state.time=130;refreshFog(g);}
 if(stage>=2){for(const b of built){g.upgrade(b.id,1);g.sell(b.id,1);}g.state.time=150;refreshFog(g);}
 if(stage>=3){g.state.units=scouts();g.state.time=160;refreshFog(g);}
 if(stage>=4){for(const[,x,y]of sites){const receipt=g.build('barracks',x,y,1);if(!receipt.ok)throw Error(receipt.reason);}g.state.time=170;refreshFog(g);}
 if(stage>=5){g.state.units=[];g.state.time=180;refreshFog(g);}
 g.state.effects=[];g.state.projectiles=[];return observationFacade(observe(g));
}
