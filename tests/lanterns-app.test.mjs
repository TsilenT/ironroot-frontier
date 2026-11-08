import test from 'node:test';
import assert from 'node:assert/strict';
import {startupHarness} from './mobile-startup-fixture.mjs';
import {installCanvas,makeRenderer,digest} from './renderer-canvas.mjs';
import {Renderer} from '../dist/render.js';
import {FogRenderer} from '../dist/fog-view.js';
import {refreshFog} from '../dist/fog.js';
import {createCampaignProgress,getProgressionCampaignOverview,getCampaignTargets,evaluateCampaignMission} from '../dist/campaign.js';
const ID='lanterns-on-the-water';
function harness({priorOutcome=null,manualRefresh=true}={}){
 installCanvas();const h=startupHarness({width:1180,height:757}),{c,$}=h;
 c.campaignProgress=createCampaignProgress();
 for(const [i,m] of getProgressionCampaignOverview(c.campaignProgress).missions.entries()){if(m.id===ID)break;c.campaignProgress.missions[m.id]={completed:true,stars:1,bestTime:60+i};}
 c.renderer=makeRenderer(Renderer,1180,398);c.ordinaryRenderer=c.renderer;
 c.FogRenderer=class{constructor(){return makeRenderer(FogRenderer,1180,398);}};
 c.selectedCampaign=ID;c.objectiveOutcome=priorOutcome;c.start();c.viewportPause.clear();c.paused=false;
 for(const layer of c.dialogLayers)layer.classList.add('hidden');if(manualRefresh)c.refreshPresentation();return h;
}
function snapshot(h){
 const {c,$}=h;c.refreshPresentation();c.updateHUD();
 const rows=c.objectiveFocusTargets();c.ui.chartedTargets=rows;
 c.ui.targets=getCampaignTargets(c.game,ID).filter(t=>t.building).map(t=>t.originalId);
 const renderer=makeRenderer(FogRenderer,1180,398);renderer.camera=c.renderer.camera;renderer.setMap(c.game.map);renderer.canvas.reset();renderer.mini.reset();renderer.draw(c.battleView(),{...c.ui,paused:true},0);
 return {dom:['enemyHpText','objectiveIdentity','objectiveProgress','protectedAlert','battle','minimap'].map(id=>[id,$(id).textContent,{...$(id).attributes}]),cards:[...c.protectedControls].map(([id,v])=>[id,v.health.textContent,{...v.health.attributes},{...v.fill.style},v.fill.parentNode.style.visibility,v.button.disabled]),rows:JSON.parse(JSON.stringify(rows)),field:digest(renderer.canvas.calls),mini:digest(renderer.mini.calls)};
}
test('campaign chart cards, HUD, aria, field and minimap ignore hidden health, upgrades and economy',()=>{
 const h=harness(),{c,$}=h,g=c.game;const before=snapshot(h);
 assert.equal(c.protectedControls.size,2);assert.match($('objectiveIdentity').textContent,/FOG.*CHARTED/);
 assert.ok(before.rows.every(t=>t.percent===null&&t.status==='charted'));assert.equal($('enemyHpText').textContent,'?');
 for(const b of g.state.buildings.filter(b=>b.side===1)){b.hp=111;b.progress=.75;b.cooldown=2;if(b.type==='watchtower'){b.level=2;b.maxHp=1300;}}
 g.state.gold[1]=4321;g.state.income[1]=99;g.state.bases[1].hp=5321;refreshFog(g);
 assert.deepEqual(snapshot(h),before);
});
test('focusing a chart cancels placement and changes only camera, never sight or knowledge',()=>{
 const h=harness(),{c}=h,g=c.game;const target=c.objectiveFocusTargets()[0],before=g.serialize();
 c.ui.build='archery';c.ui.spell=true;c.follow=true;c.focusProtectedObjective(target.originalId);
 const half=c.renderer.width/(2*c.renderer.scale),middle=g.map.width/2;
 assert.equal(c.renderer.camera,half>=middle?middle:Math.max(half,Math.min(g.map.width-half,target.x)));
 const point=c.renderer.worldToScreen(target.x,target.y);assert.ok(point.x>=0&&point.x<=c.renderer.width);assert.equal(c.ui.build,null);assert.equal(c.ui.spell,false);assert.equal(c.follow,false);
 assert.deepEqual(g.serialize(),before);assert.equal(c.objectiveFocusTargets()[0].status,'charted');
});
test('dispatch reports an original loss outside sight without exposing remaining post or crediting a replacement',()=>{
 const h=harness(),{c,$}=h,g=c.game;const targets=getCampaignTargets(g,ID);const first=targets[0];
 snapshot(h);g.state.buildings=g.state.buildings.filter(b=>b.id!==first.originalId);refreshFog(g);snapshot(h);
 assert.match($('objectiveProgress').textContent,/1\/2 posts confirmed destroyed/);
 assert.match($('protectedAlert').textContent,/Dispatch confirms.*destroyed/);
 assert.equal(c.protectedControls.get(first.originalId).button.disabled,true);
 const second=c.objectiveFocusTargets().find(t=>t.originalId!==first.originalId);assert.equal(second.percent,null);assert.equal(second.status,'charted');
 g.state.gold[1]=1000;assert.ok(g.build(first.type,first.x,g.map.lanes[first.lane],1).ok);refreshFog(g);snapshot(h);
 assert.equal(c.objectiveFocusTargets().find(t=>t.originalId===first.originalId).status,'destroyed');
 assert.match($('objectiveProgress').textContent,/1\/2/);
});
test('objective-only completion reveals terminal field without mutating winner; pause and menus never do',()=>{
 const h=harness(),{c}=h,g=c.game;
 c.paused=true;c.refreshPresentation();assert.equal(c.battleView().fog.enabled,true);assert.equal(c.battleView().state.bases[1].hp,null);
 c.paused=false;const ids=new Set(getCampaignTargets(g,ID).map(t=>t.originalId));g.state.buildings=g.state.buildings.filter(b=>!ids.has(b.id));refreshFog(g);
 c.objectiveOutcome=evaluateCampaignMission(g,ID);assert.equal(c.objectiveOutcome.completed,true);assert.equal(g.state.winner,null);
 const before=g.serialize();c.refreshPresentation();assert.equal(c.battleView().fog.enabled,false);assert.equal(c.battleView().fog.revealed,true);assert.equal(c.battleView().state.bases[1].hp,6000);
 assert.deepEqual(g.serialize(),before);assert.equal(g.state.winner,null);
});

for(const priorOutcome of [{completed:true,failed:false},{completed:false,failed:true}])test(`first cached frame after ${priorOutcome.completed?'victory':'defeat'} cannot reveal a new campaign or fog skirmish`,()=>{
 const h=harness({priorOutcome,manualRefresh:false}),{c,$}=h;
 assert.equal(c.objectiveOutcome,null);assert.equal(c.battleView().fog.enabled,true);assert.equal(c.battleView().state.bases[1].hp,null);assert.equal($('enemyHpText').textContent,'?');
 assert.ok(c.objectiveFocusTargets().every(t=>t.percent===null&&t.status==='charted'));
 c.mode='skirmish';c.selectedMap='classic';c.selectedRuleset='frontier-air-local-open';$('skirmishFog').checked=true;$('skirmishBridgeIncome').checked=false;c.objectiveOutcome=priorOutcome;c.start();
 assert.equal(c.currentCampaign,null);assert.equal(c.objectiveOutcome,null);assert.equal(c.battleView().fog.enabled,true);assert.equal(c.battleView().state.bases[1].hp,null);assert.equal($('enemyHpText').textContent,'?');
 assert.equal(c.protectedControls.size,0);
});
