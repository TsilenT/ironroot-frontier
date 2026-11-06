import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {BUILDINGS,UNITS,upgradeCost} from '../dist/engine.js';
import {CAMPAIGN_MISSIONS,createCampaignMission} from '../dist/campaign.js';
const app=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
const selection=app.slice(app.indexOf('function updateSelection()'),app.indexOf("\n$('upgrade').onclick",app.indexOf('function updateSelection()')));
const reveal=app.slice(app.indexOf('function revealCampaignChapter()'),app.indexOf('\nfunction renderCampaign()',app.indexOf('function revealCampaignChapter()')));

test('actual building details round both HP values without changing upgraded campaign state',()=>{
  let checked=0;
  for(const mission of CAMPAIGN_MISSIONS){
    const game=createCampaignMission(mission.id),before=JSON.stringify(game.serialize());
    for(const b of game.state.buildings.filter(b=>b.side===0&&b.level>1)){
      const elements=new Map();
      const $=id=>{if(!elements.has(id))elements.set(id,{textContent:'',innerHTML:'',disabled:false,classList:{toggle(){}}});return elements.get(id);};
      runInNewContext(selection+'\nupdateSelection();',{$,game,ui:{selected:b.id,protectedTargets:[]},BUILDINGS,UNITS,upgradeCost,paused:false,iconSVG:()=>''});
      assert.ok($('selectionStats').innerHTML.startsWith(`<span>♥ ${Math.ceil(b.hp)} / ${Math.ceil(b.maxHp)}</span>`),mission.id+'/'+b.type);
      assert.ok(!/\d\.\d{5,}/.test($('selectionStats').innerHTML));
      checked++;
    }
    assert.equal(JSON.stringify(game.serialize()),before,'rendering must not round combat values');
  }
  assert.ok(checked>=15,'exercise real upgraded authored buildings');
});

function chapterReveal({mode='campaign',width=280,scrollLeft=0,frame={left:20,right:300},item={left:600,right:739},active=true}={}){
  let otherAccess=false;
  const strip={clientWidth:width,scrollLeft,querySelector:selector=>{assert.equal(selector,'.active');return active?{getBoundingClientRect:()=>item,focus(){throw Error('No focus movement');},scrollIntoView(){throw Error('No parent/page scrolling');}}:null;},getBoundingClientRect:()=>frame};
  runInNewContext(reveal+'\nrevealCampaignChapter();',{mode,$:id=>{if(id!=='campaignChapters')otherAccess=true;return strip;}});
  assert.equal(otherAccess,false);return strip.scrollLeft;
}
test('active campaign chapter is revealed horizontally without page scrolling or focus movement',()=>{
  assert.equal(chapterReveal(),439);
  assert.equal(chapterReveal({scrollLeft:400,item:{left:-80,right:59}}),300);
  assert.equal(chapterReveal({scrollLeft:100,item:{left:50,right:189}}),100);
});
test('chapter reveal does nothing for hidden, noncampaign or unselected strips',()=>{
  for(const value of [{mode:'skirmish'},{width:0},{active:false}])assert.equal(chapterReveal({...value,scrollLeft:123}),123);
  assert.match(app,/requestAnimationFrame\(revealCampaignChapter\)/);
  assert.match(app,/new ResizeObserver\(revealCampaignChapter\)\.observe\(\$\('campaignChapters'\)\)/);
});
