import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const app=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
const focusSource=app.slice(app.indexOf('function dialogControls('),app.indexOf('function syncDialogs()'));
const downloadSource=app.slice(app.indexOf("$('resultReport').addEventListener('click'"),app.indexOf("$('start').onclick",app.indexOf("$('resultReport').addEventListener('click'")));
const revealSource=app.slice(app.indexOf('function revealBattleReport('),app.indexOf("$('lastResult').onclick"));
function control({hidden=false,rect=true,visibility='visible'}={}){return {closest:()=>hidden, getClientRects:()=>rect?[{}]:[], visibility};}
test('dialog controls exclude closed details, inert/hidden and invisible controls but retain the report summary',()=>{
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
test('engine and existing save/profile/backup/objective modules are byte-identical to frozen0.10',()=>{
  const baseline=JSON.parse(readFileSync(new URL('../BASELINE_0_10.json',import.meta.url)));
  // Exact comparison uses the independently frozen copy's hashes, not a new oracle.
  return import('node:crypto').then(({createHash})=>{
    for(const file of ['dist/engine.js','dist/persistence.js','dist/backup.js','dist/profile-session.js','dist/objectives.js','dist/campaign.js','dist/challenges.js'])
      assert.equal(createHash('sha256').update(readFileSync(new URL('../'+file,import.meta.url))).digest('hex'),baseline.files[file],file);
  });
});
