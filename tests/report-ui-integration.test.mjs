import { assertHistoricalEngineOracle, readHistoricalProduction } from './engine-validation-source.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {nextFocusIndex,spatialFocusIndex} from '../dist/controller.js';
const app=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
const focusSource=app.slice(app.indexOf('function controlIsVisible('),app.indexOf('function syncDialogs()'));
const downloadSource=app.slice(app.indexOf("$('resultReport').addEventListener('click'"),app.indexOf("$('start').onclick",app.indexOf("$('resultReport').addEventListener('click'")));
const revealSource=app.slice(app.indexOf('function revealBattleReport('),app.indexOf("$('lastResult').onclick"));
function control({hidden=false,rect=true,visibility='visible'}={}){return {closest:()=>hidden, getClientRects:()=>rect?[{}]:[], visibility};}
test('dialog controls exclude zero-size, inert/hidden and invisible controls but retain the report summary',()=>{
  const summary=control(),download=control({rect:false}),inert=control({hidden:true}),invisible=control({visibility:'hidden'}),primary=control(),inspect=control();
  const layer={querySelectorAll:()=>[summary,download,inert,invisible,primary,inspect],querySelector:()=>primary};
  const result=runInNewContext(focusSource+'\n({controls:dialogControls(layer),preferred:dialogDefaultFocus(layer)})',{layer,getComputedStyle:e=>({visibility:e.visibility})});
  assert.deepEqual([...result.controls],[summary,primary,inspect]);assert.equal(result.preferred,primary);
});
test('modal fallback never selects a hidden preferred control',()=>{
  const summary=control(),primary=control({rect:false}),layer={querySelectorAll:()=>[summary,primary],querySelector:()=>primary};
  assert.equal(runInNewContext(focusSource+'\ndialogDefaultFocus(layer)',{layer,getComputedStyle:e=>({visibility:e.visibility})}),summary);
  assert.match(app,/const target = dialogDefaultFocus\(next\)/);assert.match(app,/dialogDefaultFocus\(activeDialog\)\?\.focus/);
  assert.match(app,/const items = dialogControls\(activeDialog\)/);
});
function reportReveal(){
  const state={frames:[],focus:[],listener:null,capture:null,modalHidden:false,current:null};
  const summary={getBoundingClientRect:()=>({top:140}),focus:options=>state.focus.push(options)};
  const report={open:true,querySelector:()=>summary,matches:selector=>selector==='details.battle-report'};
  const body={scrollTop:50,scrollHeight:1000,clientHeight:300,getBoundingClientRect:()=>({top:40})};
  state.current=report;
  const elements={resultBody:body,resultModal:{classList:{contains:()=>state.modalHidden}},resultReport:{querySelector:()=>state.current,addEventListener:(name,listener,capture)=>{assert.equal(name,'toggle');state.listener=listener;state.capture=capture;}}};
  const reveal=runInNewContext(revealSource+'\nrevealBattleReport',{$:id=>elements[id],requestAnimationFrame:fn=>state.frames.push(fn)});
  return {state,report,body,reveal,flush:()=>{while(state.frames.length)state.frames.shift()();}};
}
test('opening a report aligns only the outer result scroller without stealing disclosure focus',()=>{
  const {state,report,body,flush}=reportReveal();
  assert.equal(state.capture,true);state.listener({target:report});assert.equal(body.scrollTop,50);flush();
  assert.equal(body.scrollTop,150);assert.deepEqual(state.focus,[]);
  state.listener({target:{open:true,matches:()=>false}});assert.equal(state.frames.length,0);
});
test('explicit reopening focuses summary without page scrolling and clamps the result scroll area',()=>{
  const {state,report,body,reveal,flush}=reportReveal();body.scrollTop=690;reveal(report,true);flush();
  assert.equal(body.scrollTop,700);assert.equal(state.focus.length,1);assert.equal(state.focus[0].preventScroll,true);
  body.scrollTop=-200;reveal(report);flush();assert.equal(body.scrollTop,0);
});
test('deferred report alignment ignores a closed, replaced or hidden result',()=>{
  for(const invalidate of [f=>{f.report.open=false;},f=>{f.state.current={};},f=>{f.state.modalHidden=true;}]){
    const f=reportReveal();f.reveal(f.report,true);invalidate(f);f.flush();assert.equal(f.body.scrollTop,50);assert.deepEqual(f.state.focus,[]);
  }
});
function download({protocol='http:',report={context:{id:'../unsafe/name',mode:'campaign'}},urlError=false,exportError=false,clickError=false}={}){
  const state={status:{textContent:''},created:0,clicked:0,removed:0,revoked:[],timers:[],blob:null,anchor:null};let callback;
  const context={lastBattleReport:report,$:()=>({addEventListener:(name,cb)=>{assert.equal(name,'click');callback=cb;},querySelector:()=>state.status}),
    location:{protocol},exportBattleReport:()=>{if(exportError)throw Error('Export refused');return JSON.stringify(report);},
    Blob,URL:{createObjectURL(blob){if(urlError)throw Error('Object URL unavailable');state.created++;state.blob=blob;return 'blob:local-report';},revokeObjectURL:url=>state.revoked.push(url)},
    document:{body:{append(){}},createElement:tag=>{assert.equal(tag,'a');state.anchor={click(){if(clickError)throw Error('Download blocked');state.clicked++;},remove(){state.removed++;}};return state.anchor;}},
    setTimeout:(fn,delay)=>{state.timers.push(delay);fn();},Date,
  };
  runInNewContext(downloadSource,context);callback({target:{closest:()=>true}});return state;
}
test('report download creates local JSON and claims only a started download, then cleans resources',async()=>{
  const result=download();assert.equal(result.created,1);assert.equal(result.clicked,1);assert.equal(result.removed,1);assert.deepEqual(result.revoked,['blob:local-report']);assert.deepEqual(result.timers,[10000]);
  assert.match(result.anchor.download,/^ironroot-report-[a-z0-9-]+-\d{4}-\d{2}-\d{2}\.json$/i);
  assert.equal(JSON.parse(await result.blob.text()).context.id,'../unsafe/name');
  assert.match(result.status.textContent,/download started/);assert.ok(!/saved|delivered|successful/i.test(result.status.textContent));
});
test('report export and URL failures never claim a started download',()=>{
  for(const options of [{exportError:true},{urlError:true},{protocol:'ironroot:'}]){const result=download(options);assert.equal(result.created,0);assert.equal(result.clicked,0);assert.ok(result.status.textContent.length);assert.ok(!/download started/.test(result.status.textContent));}
});
test('failed anchor activation cleans its URL and leaves a truthful error; absent report does nothing',()=>{
  const blocked=download({clickError:true});assert.equal(blocked.removed,1);assert.deepEqual(blocked.revoked,['blob:local-report']);assert.equal(blocked.status.textContent,'Download blocked');
  const absent=download({report:null});assert.equal(absent.created,0);assert.equal(absent.status.textContent,'');
});
test('historical engine/profile/backup/objective sources retain the frozen 0.10 oracle',()=>{
  const baseline=JSON.parse(readFileSync(new URL('../BASELINE_0_10.json',import.meta.url)));
  // Historical hashes remain immutable. Current behavior is exercised in legacy-runtime-parity and versioned codec/profile tests.
  return import('node:crypto').then(({createHash})=>{
    assertHistoricalEngineOracle();
    for(const file of ['dist/backup.js','dist/profile-session.js','dist/objectives.js','dist/campaign.js','dist/challenges.js'])
      assert.equal(createHash('sha256').update(readHistoricalProduction(file.replace('dist/',''))).digest('hex'),baseline.files[file],file);
  });
});

// The original Chromium failure exposes nonempty rectangles even while a
// closed disclosure makes its descendants unfocusable. Keep those rectangles
// in this model instead of assuming the browser reports zero size.
function disclosureControls(){
  const make=(tag,id,parent=null,options={})=>{
    const element={tag,id,parentElement:parent,children:[],open:false,visibility:'visible',...options,
      closest(selector){
        for(let node=this;node;node=node.parentElement){
          if(selector==='details:not([open])'&&node.tag==='DETAILS'&&!node.open)return node;
          if(selector==='.hidden,[inert]'&&(node.hidden||node.inert))return node;
        }
        return null;
      },
      querySelector(selector){assert.equal(selector,':scope > summary');return this.children.find(child=>child.tag==='SUMMARY')||null;},
      contains(other){for(let node=other;node;node=node.parentElement)if(node===this)return true;return false;},
      getClientRects:()=>[{}],
    };
    parent?.children.push(element);return element;
  };
  const outer=make('DETAILS','report'),summary=make('SUMMARY','report-summary',outer),summaryChild=make('BUTTON','summary-action',summary);
  const content=make('DIV','report-body',outer),nested=make('DETAILS','samples',content);
  const nestedSummary=make('SUMMARY','samples-summary',nested),sample=make('BUTTON','sample-action',nested);
  const download=make('BUTTON','download',content),extraSummary=make('SUMMARY','not-first-summary',outer);
  const primary=make('BUTTON','playAgain'),menu=make('BUTTON','resultMenu'),inspect=make('BUTTON','inspectBattle');
  const candidates=[summary,summaryChild,nestedSummary,sample,download,extraSummary,primary,menu,inspect];
  const layer={querySelectorAll:()=>candidates,querySelector:()=>primary};
  return {outer,summary,summaryChild,nested,nestedSummary,sample,download,extraSummary,primary,menu,inspect,candidates,layer};
}
const padControlsSource=app.slice(app.indexOf('function padControls('),app.indexOf('function focusPadControl('));
for(const kind of ['dialog','controller'])test(`${kind} controls reject closed-details descendants even when Chromium exposes their rectangles`,()=>{
  const f=disclosureControls();
  const read=()=>[...runInNewContext(focusSource+'\n'+padControlsSource+'\n'+(kind==='dialog'?'dialogControls(layer)':'padControls({element:layer})'),{
    layer:f.layer,getComputedStyle:element=>({visibility:element.visibility}),
  })].map(element=>element.id);
  const footer=['playAgain','resultMenu','inspectBattle'];
  assert.deepEqual(read(),['report-summary','summary-action',...footer]);
  f.nested.open=true;
  assert.deepEqual(read(),['report-summary','summary-action',...footer],'an open inner disclosure is still hidden by a closed ancestor');
  f.outer.open=true;f.nested.open=false;
  assert.deepEqual(read(),['report-summary','summary-action','samples-summary','download','not-first-summary',...footer]);
  f.nested.open=true;
  assert.deepEqual(read(),f.candidates.map(element=>element.id));
  f.outer.open=false;
  assert.deepEqual(read(),['report-summary','summary-action',...footer],'closing an ancestor immediately removes its formerly visible descendants');
});

test('Down navigation crosses result footer controls and reaches the visible report instead of a hidden summary',()=>{
  const f=disclosureControls(),document={activeElement:f.primary};
  const candidates=[f.summary,f.nestedSummary,f.download,f.primary,f.menu,f.inspect];
  f.layer.querySelectorAll=()=>candidates;
  const rects=[{x:0,y:100,width:200,height:60},{x:0,y:1200,width:200,height:40},
    {x:0,y:1300,width:200,height:44},{x:0,y:200,width:200,height:44},
    {x:0,y:260,width:90,height:44},{x:110,y:260,width:90,height:44}];
  for(const [index,element] of candidates.entries()){
    element.getBoundingClientRect=()=>rects[index];element.matches=()=>false;element.scrollIntoView=()=>{};
    element.focus=()=>{
      // Model native focus refusal independently from the production filter.
      for(let ancestor=element.parentElement;ancestor;ancestor=ancestor.parentElement){
        if(ancestor.tag==='DETAILS'&&!ancestor.open&&ancestor.children[0]!==element)return;
      }
      document.activeElement=element;
    };
  }
  const navigation=app.slice(app.indexOf('function padControls('),app.indexOf('function controllerBack('));
  const navigate=runInNewContext(focusSource+'\n'+navigation+'\ncontrollerNavigate',{
    document,getComputedStyle:element=>({visibility:element.visibility}),nextFocusIndex,spatialFocusIndex,
  });
  const seen=[document.activeElement.id];
  for(let step=0;step<3;step++){
    navigate('down',{element:f.layer});seen.push(document.activeElement.id);
  }
  assert.deepEqual(seen,['playAgain','resultMenu','inspectBattle','report-summary']);
});
