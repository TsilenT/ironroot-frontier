import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInContext} from 'node:vm';
import {buildBounds} from '../dist/engine.js';
import {createCampaignProgress} from '../dist/campaign.js';
import {recommendCampaignSite} from '../dist/campaign-flow.js';
import {startupHarness} from './mobile-startup-fixture.mjs';

function setup(options={},mission='winter-stores') {
  const h=startupHarness(options),{c}=h;
  if(mission==='roadside-watch')c.campaignProgress=createCampaignProgress();
  c.selectedCampaign=mission;c.buildBounds=buildBounds;c.renderer.snap=point=>point;
  for(const [start,end] of [['function selectBuild(','function cancel()'],['function activateBattlePoint(','function resetBattleGesture()']])
    runInContext(h.source.slice(h.source.indexOf(start),h.source.indexOf(end,h.source.indexOf(start))),c);
  c.document.hasFocus=()=>true;
  runInContext(h.source.slice(h.source.indexOf('function controllerScope()'),h.source.indexOf('function focusPadControl(')),c);
  c.start();h.$('coachingPlan').onclick();c.syncViewportSafety();
  // A real insertBefore can blur focused descendants. Model that specifically
  // for moving these controls, so focus assertions require app restoration.
  for(const id of ['campaignTeaching','protectedNavigation','commandDeck']){
    const parent=h.$(id),insert=parent.insertBefore;
    parent.insertBefore=function(child,next){
      const blur=child.id==='coachActions'&&child.contains(c.document.activeElement);
      insert.call(this,child,next);if(blur)c.document.activeElement=c.document.body;
    };
  }
  return h;
}
const visible=(h,id)=>!h.$(id).closest('.hidden')&&h.$(id).getClientRects().length>0;

for(const [width,height,insets] of [[320,430,{}],[320,430,{bottom:34}],[320,480,{bottom:34}],[320,568,{}],[390,650,{top:20,bottom:34}],[740,320,{left:21,right:21,bottom:21}],[844,390,{}]]){
  test(`Hide removes the full banner and gives its row back at ${width}x${height} ${JSON.stringify(insets)}`,()=>{
    const h=setup({width,height,insets}),{c,$}=h;
    assert.equal(c.viewportPause.active,false);
    const before=$('battle').getBoundingClientRect(),banner=$('campaignTeaching').getBoundingClientRect();
    const saved=c.game.serialize(),profile=structuredClone(c.campaignProgress),saves=h.log.saves;
    const show=$('toggleCoach'),resume=$('coachResume');show.focus();c.padHud=true;show.onclick();c.syncViewportSafety();
    assert.equal(c.coachEnabled,false);assert.equal(c.coachingHold,true);
    assert.equal($('campaignTeaching').classList.contains('hidden'),true);
    assert.equal($('campaignTeaching').getClientRects().length,0);
    assert.equal($('campaignCoach').getClientRects().length,0);
    assert.equal($('coachActions').parentNode,$('protectedNavigation'));
    assert.equal($('toggleCoach'),show);assert.equal($('coachResume'),resume);
    assert.equal(c.document.activeElement,show);assert.equal(c.padHud,true);assert.equal(c.controllerScope().mode,'menu');assert.ok(c.controlIsVisible(show));
    for(const id of ['coachNext','coachTitle','coachText'])assert.equal($(id).textContent,'');
    assert.equal(show.attributes['aria-label'],'Show hints');assert.equal(show.attributes['aria-pressed'],'false');
    assert.ok(visible(h,'toggleCoach'));assert.ok(visible(h,'coachResume'));
    assert.equal(c.viewportPause.active,false);
    assert.equal($('battle').getBoundingClientRect().height,before.height+banner.height);
    assert.deepEqual(c.game.serialize(),saved);assert.deepEqual(c.campaignProgress,profile);assert.equal(h.log.saves,saves);
    assert.equal(c.ui.coachSite,null);assert.equal(c.ui.coachBuilding,null);
    assert.equal(c.document.querySelectorAll('.coach-highlight').length,0);
    assert.ok(!h.log.measures.at(-1).some(r=>r.width<44||r.height<44));
    show.onclick();c.syncViewportSafety();
    assert.equal($('coachActions').parentNode,$('campaignTeaching'));
    assert.ok(visible(h,'campaignCoach'));assert.equal(c.document.activeElement,show);assert.equal(c.padHud,true);assert.equal(c.controllerScope().mode,'menu');assert.ok(c.controlIsVisible(show));
    assert.equal($('battle').getBoundingClientRect().height,before.height);
    assert.equal(c.coachingHold,true);assert.equal(c.viewportPause.active,false);
    // Repeated toggles remain state-only. The separate Start action releases planning.
    show.onclick();resume.onclick();c.updateHUD();c.syncViewportSafety();
    assert.equal(c.coachingHold,false);assert.equal(c.coachEnabled,false);
    assert.equal(visible(h,'coachResume'),false);assert.ok(visible(h,'toggleCoach'));
    assert.equal($('campaignTeaching').getClientRects().length,0);
    assert.equal(c.viewportPause.active,false);
  });
}

test('hiding first-build hints does not start time or replace the paid first-barracks trigger',()=>{
  const h=setup({width:320,height:430,insets:{bottom:34}},'roadside-watch'),{c,$}=h;
  const before=c.game.serialize();$('toggleCoach').onclick();c.syncViewportSafety();
  assert.equal(c.coachingHold,true);assert.equal(c.firstBuildHold,true);assert.equal(visible(h,'coachResume'),false);
  assert.deepEqual(c.game.serialize(),before);assert.equal(c.viewportPause.active,false);
  const site=recommendCampaignSite(c.game,'barracks').site;
  c.selectBuild('barracks');c.activateBattlePoint(site);c.updateHUD();c.syncViewportSafety();
  assert.equal(c.game.state.gold[0],before.state.gold[0]-c.game.buildings.barracks.cost);
  assert.equal(c.game.state.buildings.filter(b=>b.side===0&&b.type==='barracks').length,1);
  assert.equal(c.coachingHold,false);assert.equal(c.firstBuildHold,false);assert.equal(c.coachEnabled,false);
  assert.equal($('campaignTeaching').getClientRects().length,0);assert.ok(visible(h,'toggleCoach'));
  assert.equal(c.viewportPause.active,false);
});

test('hidden controls survive rotations and keep the existing viewport safety latch',()=>{
  const h=setup({width:320,height:430}),{c,$}=h;$('toggleCoach').onclick();
  const show=$('toggleCoach'),start=$('coachResume'),saved=c.game.serialize();
  for(const [width,height] of [[740,320],[390,650],[320,430]]){
    h.resize(width,height);
    assert.equal(c.viewportPause.active,false);assert.equal(c.coachEnabled,false);assert.equal(c.coachingHold,true);
    assert.equal($('toggleCoach'),show);assert.equal($('coachResume'),start);
    assert.ok(visible(h,'toggleCoach'));assert.ok(visible(h,'coachResume'));
    assert.equal($('campaignTeaching').getClientRects().length,0);assert.deepEqual(c.game.serialize(),saved);
  }
  h.resize(320,330);assert.equal(c.viewportPause.blocked,true);assert.equal(c.paused,true);
  h.resize(320,430);assert.equal(c.viewportPause.blocked,false);assert.equal(c.paused,true);
  c.pause(false);assert.equal(c.paused,true);c.pause(false,{explicit:true});
  assert.equal(c.paused,false);assert.equal(c.coachingHold,false);assert.equal(c.coachEnabled,false);
});

test('collapsed layout has no replacement status, banner background, or reserved teaching track',()=>{
  const html=readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');
  const css=readFileSync(new URL('../dist/styles.css',import.meta.url),'utf8');
  const app=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
  assert.doesNotMatch(html+css+app,/coachRailStatus|coach-rail-status|Hints hidden\. Battle continues\./);
  assert.match(html,/<div id="coachActions" class="deck-tools teaching-actions">/);
  assert.match(css,/\.app\.protected-mobile\.mobile-coaching\.coach-collapsed \{ --mobile-teaching: 0px; \}/);
  assert.match(app,/teaching\.classList\.toggle\('hidden', collapsed \|\|/);
  assert.match(app,/regions:.*teaching && !\$\('app'\)\.classList\.contains\('coach-collapsed'\)/);
});


test('Resume typography repair is scoped to its existing collapsed short-portrait target',()=>{
  const css=readFileSync(new URL('../dist/styles.css',import.meta.url),'utf8');
  const rule=css.match(/\.protected-mobile\.protected-short-portrait\.coach-collapsed #coachResume \{([^}]*)\}/)?.[1];
  assert.ok(rule);assert.match(rule,/min-width: 44px/);
  assert.match(rule,/padding-inline: 0/);assert.match(rule,/font-family: var\(--display\)/);
  assert.match(rule,/font-size: 14px/);assert.match(rule,/letter-spacing: normal/);
  // Native browser character bounds, not this source check, establish ink fit.
});


test('Build/Close/Cancel typography uses the same narrow repair without changing target size',()=>{
  const css=readFileSync(new URL('../dist/styles.css',import.meta.url),'utf8');
  const rule=css.match(/\.protected-mobile\.protected-short-portrait\.coach-collapsed \.protected-navigation \.compact-build \{([^}]*)\}/)?.[1];
  assert.ok(rule);assert.match(rule,/width: 44px/);assert.match(rule,/padding-inline: 0/);
  assert.match(rule,/font-family: var\(--display\)/);assert.match(rule,/font-size: 14px/);
  assert.match(rule,/letter-spacing: normal/);
  // Full label containment and separation from Show require native ink checks.
});
