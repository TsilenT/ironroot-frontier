import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInContext, createContext } from 'node:vm';
import { BUILDINGS, buildBounds } from '../dist/engine.js';
import { createCampaignMission, CAMPAIGN_MISSIONS, isIntroMission, campaignScenarioForGame, getProgressionCampaignOverview, createCampaignProgress } from '../dist/campaign.js';
import { campaignBuildChoices, campaignTeaching, campaignCoach, guidancePointVisible, drawCampaignGuidance, CAMPAIGN_BUILD_INTRODUCTIONS } from '../dist/campaign-flow.js';
import { createInputScopeGuard } from '../dist/input-scope.js';
import { visibleViewportRect } from '../dist/mobile-battlefield.js';
const app = readFileSync(new URL('../dist/app.js', import.meta.url), 'utf8');
const section = (a, b) => app.slice(app.indexOf(a), app.indexOf(b, app.indexOf(a)));
const box = (left,top,width,height) => ({left,top,width,height,right:left+width,bottom:top+height});
// Executes the app's real shared controls in a narrow DOM fixture. This tests
// semantic integration, not CSS layout, actual touch or native-browser focus.
function harness() {
  const nodes = new Map(); let c;
  const $ = id => {
    if (!nodes.has(id)) {
      const classes = new Set();
      const node = {id, dataset:{}, style:{}, textContent:'', disabled:false, parentElement:null,
        rect:box(0,0,44,44), clip:'visible', attributes:{},
        classList:{contains:k=>classes.has(k),add:k=>classes.add(k),remove:k=>classes.delete(k),toggle(k,on){on?classes.add(k):classes.delete(k);}},
        setAttribute(k,v){this.attributes[k]=v;},
        insertBefore(child){child.parentNode=this;child.parentElement=this;},
        closest(selector){for(let e=this;e;e=e.parentElement)if((selector.includes('.hidden')&&e.classList.contains('hidden'))||(selector.includes('[inert]')&&e.inert))return e;return null;},
        contains(other){for(let e=other;e;e=e.parentElement)if(e===this)return true;return false;},
        getClientRects(){return this.closest('.hidden,[inert]') || ($('commandDeck').contains(this)&&!$('app').classList.contains('compact-build-open')) ? [] : [this.rect];},
        getBoundingClientRect(){return this.rect;},
        focus(){c.document.activeElement=this;},
        scrollIntoView(){this.rect=box(20,310,90,90);},
      }; nodes.set(id,node);
    }
    return nodes.get(id);
  };
  const cards=Object.keys(BUILDINGS).map(type=>{const n=$('card-'+type);n.dataset.type=type;n.parentElement=$('buildCards');return n;});
  $('buildCards').parentElement=$('commandDeck');$('buildCards').rect=box(10,300,290,105);$('buildCards').clip='auto';
  $('commandDeck').rect=box(0,180,320,230);
  for(const id of ['campaignCoach','coachTitle','coachText','allBuildings','toggleCoach'])$(id).parentElement=$('commandDeck');
  $('compactBuild').rect=box(5,420,55,44);$('home').rect=box(5,470,44,44);$('front').rect=box(270,470,44,44);$('battle').rect=box(0,72,320,250);
  $('app').classList.add('protected-compact');$('app').classList.add('protected-mobile');
  $('coachingModal').classList.add('hidden');
  const dialogLayers=[$('welcome'),$('settingsModal')];for(const layer of dialogLayers)layer.classList.add('hidden');
  c={$,BUILDINGS,buildBounds,campaignBuildChoices,campaignTeaching,campaignCoach,guidancePointVisible,visibleViewportRect,
    game:createCampaignMission('winter-stores'),currentCampaign:'winter-stores',expandedBuilds:false,resumedBattle:false,coachEnabled:true,coachingHold:false,
    viewportPause:{active:false},battleSafetyReason:null,started:true,paused:false,recoveryHold:null,profileGate:null,objectiveOutcome:null,follow:false,
    ui:{build:null,spell:false,selected:null},dialogLayers,inputScope:createInputScopeGuard('compact-battle:portrait'),
    document:{body:{},activeElement:null,querySelector:s=>s?.startsWith('[data-type=')?cards.find(n=>n.dataset.type===s.match(/"([^"]+)"/)[1]):s?.startsWith('#')?$(s.slice(1)):null,
      querySelectorAll:s=>s==='.build-card'?cards:s==='.coach-highlight'?[...nodes.values()].filter(n=>n.classList.contains('coach-highlight')):[]},
    window:{innerWidth:320,innerHeight:568},getComputedStyle:n=>({visibility:'visible',overflowX:n.clip,overflowY:'visible'}),
    renderer:{width:320,height:250,scale:.32,camera:450,snap:p=>p},
    updateSelection(){},sound(){},toast(){},syncProtectedLayout(){},syncInputScope(){c.inputScope.setScope($('app').classList.contains('compact-build-open')?'compact-build':'compact-battle:portrait');},
  };
  createContext(c);
  for (const code of [section('function controlIsVisible(','function dialogControls('),section('function canInteract()','function updateSelection()'),section('function updateCompactBuildControl()','function canFocusProtectedObjective()'),section('function activateBattlePoint(','function resetBattleGesture(')]) runInContext(code,c);
  c.updateCampaignDeck();
  return {c,$,cards,highlights:()=>c.document.querySelectorAll('.coach-highlight').map(n=>n.id)};
}

test('closed drawer guides the actual Build control, opening reveals the real suggested card',()=>{
  const h=harness();assert.deepEqual(h.highlights(),['compactBuild']);
  const before=h.c.game.serialize();h.c.setCompactBuildOpen(true);
  assert.deepEqual(h.highlights(),['card-mint']);
  assert.equal(h.$('card-mint').getClientRects().length,1);
  assert.deepEqual(h.c.game.serialize(),before);
});

test('normal selection closes the drawer without spending; actual battlefield placement pays its normal cost',()=>{
  const h=harness(),before=h.c.game.state.gold[0];h.c.setCompactBuildOpen(true);h.c.selectBuild('mint');
  assert.equal(h.c.game.state.gold[0],before);assert.equal(h.$('app').classList.contains('compact-build-open'),false);
  assert.ok(!h.highlights().includes('card-mint'),'a hidden card cannot remain highlighted');
  const hint=campaignCoach(h.c.game,'winter-stores',h.c.ui);assert.ok(hint.site);
  h.c.activateBattlePoint(hint.site);
  assert.equal(h.c.game.state.gold[0],before-BUILDINGS.mint.cost);
  assert.equal(h.c.game.state.buildings.filter(b=>b.side===0&&b.type==='mint').length,3);
});

test('All buildings is reversible, preserves the drawer/focus, cancels hidden selection and invalidates held input',()=>{
  const h=harness();h.c.currentCampaign='forked-road';h.c.setCompactBuildOpen(true);
  h.$('allBuildings').onclick();assert.equal(h.cards.filter(n=>!n.classList.contains('hidden')).length,7);
  h.c.ui.build='foundry';
  const pointer={pointerId:9,pointerType:'touch',isPrimary:true};h.c.inputScope.pointerDown(pointer);
  const before=h.c.game.serialize();h.$('allBuildings').onclick();
  assert.equal(h.c.ui.build,null);assert.equal(h.$('app').classList.contains('compact-build-open'),true);
  assert.equal(h.c.document.activeElement,h.$('allBuildings'));
  assert.equal(h.c.inputScope.pointerEnd(pointer),true,'old release is suppressed');
  assert.equal(h.cards.filter(n=>!n.classList.contains('hidden')).length,4);
  assert.deepEqual(h.c.game.serialize(),before);
});

test('paused, hidden-hint and modal flows clear highlights/rings without mutating the battle',()=>{
  for(const block of [h=>h.c.paused=true,h=>h.c.coachEnabled=false,h=>h.$('settingsModal').classList.remove('hidden')]){
    const h=harness();const before=h.c.game.serialize();block(h);h.c.updateCampaignDeck();
    assert.deepEqual(h.highlights(),[]);assert.equal(h.c.ui.coachSite,null);assert.equal(h.c.ui.coachBuilding,null);
    assert.deepEqual(h.c.game.serialize(),before);
  }
});

test('scrolled/clipped cards are never highlighted and offscreen suggestions use the minimap',()=>{
  const h=harness();h.c.setCompactBuildOpen(true);h.$('card-mint').rect=box(400,310,90,90);h.c.updateCampaignDeck();
  assert.deepEqual(h.highlights(),[]);
  h.c.selectBuild('mint');h.c.renderer.camera=2200;h.c.updateCampaignDeck();
  assert.deepEqual(h.highlights(),['minimap']);
  const hint=campaignCoach(h.c.game,'winter-stores',h.c.ui);assert.equal(guidancePointVisible(h.c.renderer,h.c.game,hint.site),false);
  drawCampaignGuidance({...h.c.renderer,c:{save(){throw Error('Offscreen ring must not draw');}}},h.c.game,h.c.ui);
});

test('roster policy is isolated/frozen, unknown lesson IDs cannot inherit old three-road text, and low gold never promises a ring',()=>{
  assert.ok(Object.isFrozen(CAMPAIGN_BUILD_INTRODUCTIONS));
  for(const roster of Object.values(CAMPAIGN_BUILD_INTRODUCTIONS))assert.ok(Object.isFrozen(roster));
  const game=createCampaignMission('emberwatch');assert.equal(campaignCoach(game,'future-one-road-intro'),null);
  game.state.gold[0]=0;const hint=campaignCoach(game,'emberwatch',{build:'archery'});
  assert.equal(hint.site,undefined);assert.match(hint.text,/need 175 gold/);assert.doesNotMatch(hint.text,/gold ring/);
});

test('Continue/Back and optional replay retain the same authored mission and do not reset campaign records',()=>{
  const nodes=new Map(),$=id=>{if(!nodes.has(id))nodes.set(id,{classList:{contains:()=>false},focus(){focus.push(id);}});return nodes.get(id);};
  let starts=0,titles=[];const focus=[],c={$,currentCampaign:'emberwatch',currentChallenge:null,objectiveOutcome:{completed:true,stars:2},mode:'campaign',selectedCampaign:'emberwatch',selectedChapter:'',
    campaignProgress:{...createCampaignProgress(),missions:{emberwatch:{completed:true,stars:3,bestTime:10}}},CAMPAIGN_MISSIONS,isIntroMission,
    game:createCampaignMission('emberwatch'),campaignScenarioForGame,getCampaignOverview:getProgressionCampaignOverview,battleSession:{remove(){}},showTitle:o=>titles.push(o),start:()=>starts++};
  const before=JSON.stringify(c.campaignProgress);
  runInContext(section("$('playAgain').onclick", "$('inspectBattle').onclick"),createContext(c));
  $('replayMission').onclick();assert.equal(starts,1);assert.equal(c.selectedCampaign,'emberwatch');
  c.objectiveOutcome.stars=3;$('replayMission').onclick();assert.equal(starts,1,'no replay CTA at three stars');
  $('playAgain').onclick();assert.equal(c.selectedCampaign,'three-roads');assert.equal(titles.at(-1).focusStart,true);
  $('resultMenu').onclick();assert.equal(titles.at(-1).focusStart,true);
  assert.equal(JSON.stringify(c.campaignProgress),before);
});
