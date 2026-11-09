import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CAMPAIGN_PROGRESS_MISSIONS,CURRENT_CAMPAIGN_CHAPTERS,createCampaignProgress,createCampaignMission,createCampaignRestart,getCampaignTargets,evaluateCampaignMission} from '../dist/campaign.js';
import {refreshFog} from '../dist/fog.js';
import {installCanvas,makeRenderer} from './renderer-canvas.mjs';
import {Renderer} from '../dist/render.js';
import {FogRenderer} from '../dist/fog-view.js';
import {startupHarness} from './mobile-startup-fixture.mjs';
const ID='false-quiet';
function unlock(c){c.campaignProgress={...createCampaignProgress(),missions:Object.fromEntries(CAMPAIGN_PROGRESS_MISSIONS.filter(m=>m.id!=='the-archers-quay'&&(m.id!==ID)).map(m=>[m.id,{completed:true,stars:1,bestTime:60}]))};}
test('the actual app imports the one current chapter catalog; every playable mission has a theme',()=>{
 const source=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');assert.match(source,/CURRENT_CAMPAIGN_CHAPTERS as CAMPAIGN_CHAPTERS/);assert.doesNotMatch(source,/const CAMPAIGN_CHAPTERS = \[/);
 for(const mission of CAMPAIGN_PROGRESS_MISSIONS)assert.ok(CURRENT_CAMPAIGN_CHAPTERS.find(c=>c.id===mission.chapterId)?.theme,mission.id);
});
for(const variant of ['a','b'])for(const [width,height]of [[320,430],[390,650],[1180,768]])test(`actual ${variant} start, hidden fort HUD and restart at ${width}×${height}`,()=>{
 installCanvas();const {c,$}=startupHarness({width,height});unlock(c);c.renderer=makeRenderer(Renderer,width,398);c.ordinaryRenderer=c.renderer;c.FogRenderer=class{constructor(){return makeRenderer(FogRenderer,width,398);}};const g=createCampaignMission(ID,{variant}),initial=g.serialize();c.start(g,null,ID);c.updateHUD();
 assert.equal(c.currentCampaign,ID);assert.equal(c.started,true);assert.equal($('enemyHpText').textContent,'?');assert.equal(c.protectedControls.size,1);assert.match($('objectiveIdentity').textContent,/CHARTED FORT/);assert.match($('protectedTargets').attributes['aria-label'],/Middle Road Fort/);assert.doesNotMatch($('protectedTargets').attributes['aria-label'],/customs posts/);assert.match($('objectiveProgress').textContent,/0\/1 fort confirmed destroyed/);
 const control=[...c.protectedControls.values()][0];assert.match(control.health.textContent,/unknown/);const [target]=c.objectiveFocusTargets();assert.equal(target.percent,null);assert.equal(target.status,'charted');
 g.state.gold[1]=9999;g.state.bases[1].hp=100;for(const b of g.state.buildings.filter(v=>v.side===1)){b.hp=1;b.level=3;}refreshFog(g);c.refreshPresentation();c.updateHUD();assert.equal($('enemyHpText').textContent,'?');assert.equal(c.objectiveFocusTargets()[0].percent,null);
 const restarted=createCampaignRestart(g,ID);assert.deepEqual(restarted.serialize(),initial);c.start(restarted,null,ID);c.updateHUD();assert.equal(c.game.ruleset.id,g.ruleset.id);assert.equal($('enemyHpText').textContent,'?');assert.equal(c.objectiveFocusTargets()[0].status,'charted');
 const original=getCampaignTargets(restarted,ID)[0];restarted.state.buildings=restarted.state.buildings.filter(v=>v.id!==original.originalId);refreshFog(restarted);c.refreshPresentation();c.updateHUD();assert.equal(evaluateCampaignMission(restarted,ID).completed,true);assert.match($('protectedAlert').textContent,/original fort/);
});
